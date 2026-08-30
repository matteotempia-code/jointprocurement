import { access, copyFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const qaPort = process.env.QA_PORT ?? "3107";
const base = process.env.QA_BASE_URL ?? `http://localhost:${qaPort}`;
const artifacts = "artifacts/final-mvp-review";
const styleArtifacts = "artifacts/style-audit";
const uxArtifacts = "artifacts/ux-final-review";
const smartImportArtifacts = "artifacts/smart-import-review";
const smartImportUxArtifacts = "artifacts/smart-import-ux-final";
await mkdir(artifacts, { recursive: true });
await mkdir(styleArtifacts, { recursive: true });
await mkdir(uxArtifacts, { recursive: true });
await mkdir(smartImportArtifacts, { recursive: true });
await mkdir(smartImportUxArtifacts, { recursive: true });

let localServer;
async function isExpectedApp() {
  try { const response = await fetch(base); return response.ok && (await response.text()).includes("Joint Procurement"); }
  catch { return false; }
}
if (!(await isExpectedApp())) {
  const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", `npx next dev -p ${qaPort}`] : ["run", "dev", "--", "-p", qaPort];
  localServer = spawn(command, args, { cwd: process.cwd(), stdio: "ignore", windowsHide: true });
  for (let attempt = 0; attempt < 90 && !(await isExpectedApp()); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 500));
  if (!(await isExpectedApp())) throw new Error(`Joint Procurement OS non disponibile su ${base}.`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const browserErrors = [];
page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("tree hydrated")) browserErrors.push(message.text()); });
page.on("pageerror", (error) => browserErrors.push(error.message));

async function open(path = "/") {
  const response = await page.goto(new URL(path, base).toString(), { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`GET ${path}: HTTP ${response?.status() ?? "nessuna risposta"}`);
  await page.locator("main").waitFor();
}
async function switchTo(name) {
  await open("/");
  const switcher = page.getByLabel("Visualizza come", { exact: true });
  const value = await switcher.locator("option").evaluateAll((options, expected) => options.find((option) => option.textContent?.includes(expected))?.value, name);
  if (!value) throw new Error(`Persona demo non disponibile: ${name}`);
  await switcher.selectOption(value);
  await page.waitForLoadState("networkidle");
  await page.getByText(name, { exact: true }).last().waitFor();
}
async function shot(filename, fullPage = true) { await page.screenshot({ path: `${artifacts}/${filename}`, fullPage }); }
async function expectText(text) { await page.getByText(text, { exact: false }).first().waitFor(); }
async function expectItalianCore() {
  const visible = await page.locator("body").innerText();
  for (const forbidden of ["Request summary", "Budget impact", "Quick actions", "Needs attention", "Supplier Directory", "Download PDF", "Add to cart"]) {
    if (visible.includes(forbidden)) throw new Error(`Copy inglese visibile: ${forbidden} (${page.url()})`);
  }
}
async function assertNoOverflow() {
  const overflow = await page.evaluate(() => {
    if (document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1) return [];
    return [...document.querySelectorAll("body *")].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1;
    }).slice(0, 8).map((element) => ({
      element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${[...element.classList].map((name) => `.${name}`).join("")}`,
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right),
      width: Math.round(element.getBoundingClientRect().width),
    }));
  });
  if (overflow.length) throw new Error(`Overflow orizzontale: ${page.url()} ${JSON.stringify(overflow)}`);
}

const generated = [];
async function capture(filename, fullPage = true) { await expectItalianCore(); await assertNoOverflow(); await shot(filename, fullPage); generated.push(filename); }
const styleGenerated = [];
async function captureStyle(filename, fullPage = true) { await expectItalianCore(); await assertNoOverflow(); await page.screenshot({ path: `${styleArtifacts}/${filename}`, fullPage }); styleGenerated.push(filename); }
const uxGenerated = [];
async function captureUx(filename, fullPage = false) { await expectItalianCore(); await assertNoOverflow(); await page.screenshot({ path: `${uxArtifacts}/${filename}`, fullPage }); uxGenerated.push(filename); }
const smartImportGenerated = [];
async function captureSmartImport(filename, fullPage = true) { await expectItalianCore(); await assertNoOverflow(); await page.screenshot({ path: `${smartImportArtifacts}/${filename}`, fullPage }); smartImportGenerated.push(filename); }
const smartImportUxGenerated = [];
async function captureSmartImportUx(filename, fullPage = true) { await expectItalianCore(); await assertNoOverflow(); await page.screenshot({ path: `${smartImportUxArtifacts}/${filename}`, fullPage }); smartImportUxGenerated.push(filename); }

try {
  await switchTo("Lucia Ferri");
  await expectText("Cosa ti serve oggi");
  await capture("01-home-rsa.png");
  await captureStyle("01-shell-desktop.png", false);
  await captureStyle("02-home-rsa.png");
  const importDenied = await page.goto(new URL("/imports", base).toString(), { waitUntil: "networkidle" });
  const importWorkspaceVisible = await page.getByRole("heading", { name: "Importazioni", exact: true }).count();
  if (importDenied?.status() !== 404 && importWorkspaceVisible) throw new Error("Un RSA Director può accedere alle Importazioni.");

  await open("/catalog?q=guanto");
  await expectText(/prodott[oi] trovat[oi]/i);
  if (!await page.locator('[role="img"][aria-label^="Immagine dimostrativa di"]').count()) throw new Error("Immagine prodotto assente dal catalogo");
  const productLink = page.getByRole("link", { name: /Guanto nitrile senza polvere M/i }).first();
  const productHref = await productLink.getAttribute("href");
  const favoriteAdd = page.getByRole("button", { name: /Aggiungi .* ai preferiti/i }).first();
  if (await favoriteAdd.count()) { await favoriteAdd.click(); await page.waitForLoadState("networkidle"); }
  await capture("02-catalogo.png");
  await captureStyle("03-catalogo.png");
  await captureUx("01-catalogo-row-desktop.png");
  await page.locator("summary").filter({ hasText: "Altre azioni" }).first().click();
  await captureUx("03-add-to-list-dialog.png");

  await open(productHref);
  await expectText("Offerta convenzionata");
  if (!await page.locator('[role="img"][aria-label^="Immagine dimostrativa di"]').count()) throw new Error("Immagine prodotto assente da Prodotto 360");
  await page.locator("summary").filter({ hasText: "Altre azioni" }).first().click();
  const compareHref = await page.getByRole("link", { name: "Confronta offerte" }).first().getAttribute("href");
  await page.locator("summary").filter({ hasText: "Altre azioni" }).first().click();
  await capture("03-product-360.png");
  await captureStyle("04-product-360.png");
  await captureUx("05-product-hero.png");

  await open("/preferiti");
  await expectText("Catalogo personale");
  await capture("04-preferiti.png");
  await page.getByRole("button", { name: /Aggiungi al carrello/i }).first().click();
  await page.waitForLoadState("networkidle");

  await open("/liste");
  await capture("05-liste.png");
  const seededList = page.locator("article").filter({ hasText: "Dotazione mensile assistenza" });
  const existingListHref = await seededList.getByRole("link", { name: /^Apri$/i }).getAttribute("href");
  await open(existingListHref);
  await capture("06-dettaglio-lista.png");
  await captureUx("04-list-detail.png");
  await page.getByRole("button", { name: /Aggiungi tutto al carrello/i }).click();
  await page.waitForLoadState("networkidle");

  await open("/cart");
  await expectText("Impatto sul budget");
  await capture("07-carrello.png");
  const savedListName = "Lista QA browser";
  await page.getByPlaceholder("Nome della nuova lista").fill(savedListName);
  await page.getByRole("button", { name: "Salva carrello come lista" }).click();
  await page.waitForLoadState("networkidle");
  await expectText(savedListName);

  await open("/richieste");
  await capture("08-richieste.png");
  const requestHref = await page.getByRole("link", { name: /^PR-/ }).first().getAttribute("href");
  await open(requestHref);
  await capture("09-dettaglio-richiesta.png");

  await open("/orders");
  await capture("12-ordini.png");
  const orderHref = await page.getByRole("link", { name: /^PO-/ }).first().getAttribute("href");
  await open(orderHref);
  await capture("13-po-detail.png");
  await page.getByRole("button", { name: "Crea lista da questo ordine" }).click();
  await page.waitForLoadState("networkidle");
  await expectText("Riordino PO-");

  await open("/consegne");
  await capture("14-consegne.png");
  const receiveHref = await page.getByRole("link", { name: "Registra ricezione" }).first().getAttribute("href");
  await open(receiveHref);
  await expectText("Registra consegna");
  await capture("15-ricezione.png");
  await open("/non-conformita");
  await capture("16-non-conformita.png");
  await open("/budget");
  await capture("17-budget.png");

  await open(compareHref);
  await expectText("Confronto prodotti");
  await capture("22-confronto-prodotti.png");

  await switchTo("Andrea Riva");
  await open("/approvals");
  await capture("10-approvazioni-inbox.png");
  const approvalHref = await page.getByRole("link", { name: /^PR-/ }).first().getAttribute("href");
  await open(approvalHref);
  await expectText("Cockpit di approvazione");
  await capture("11-approval-cockpit.png");
  await captureStyle("06-approval-cockpit.png");
  await page.locator(".approval-actions").scrollIntoViewIfNeeded();
  await captureUx("07-approval-decision.png");
  await open("/facilities");
  if (await page.getByText("Villa Serena", { exact: true }).count()) throw new Error("Area Manager vede una struttura fuori scope");

  await switchTo("Giulia Bianchi");
  await expectText("Coda operativa");
  await capture("18-procurement-control-center.png");
  await captureStyle("07-procurement-control-center.png");
  await captureUx("08-control-center-queue.png");
  await open("/suppliers");
  await capture("19-fornitori.png");
  const supplierHref = await page.getByRole("table").getByRole("link").first().getAttribute("href");
  await open(supplierHref);
  await expectText("Fornitore 360");
  await capture("20-supplier-360.png");
  await captureStyle("05-supplier-360.png");
  await captureUx("06-supplier-kpis.png");
  await open("/categorie");
  const categoryHref = await page.getByRole("link", { name: /spesa osservata/i }).first().getAttribute("href");
  await open(categoryHref);
  await capture("21-categoria-360.png");

  // Smart Import: real files, persistent staging, human review and publish.
  await open("/imports");
  await expectText("Importazioni");
  await captureSmartImport("01-import-home.png");
  await expectText("Da gestire");
  await captureSmartImportUx("01-import-work-queue.png");
  await open("/imports/new");
  await captureSmartImport("02-new-import.png");
  await page.getByTestId("import-file").setInputFiles("demo-imports/listino-alfa-medical-2027.xlsx");
  await page.getByRole("combobox", { name: /^Fornitore/ }).selectOption({ label: "Alfa Medical" });
  await captureSmartImport("03-uploaded-document.png");
  await page.getByRole("button", { name: "Carica e interpreta" }).click();
  await page.waitForURL((url) => /^\/imports\/(?!new(?:\/|$))[^/]+$/.test(url.pathname), { timeout: 60_000 });
  const firstImportUrl = new URL(page.url());
  const firstImportPath = firstImportUrl.pathname;
  await expectText("Revisione per eccezione");
  await captureSmartImport("05-interpretation-preview.png");
  await captureSmartImportUx("02-import-detail-action-first.png", false);
  await captureSmartImportUx("20-provider-status.png", false);
  await open(`${firstImportPath}/mapping`);
  await expectText("Mapping delle colonne");
  await captureSmartImport("04-column-mapping.png");
  await captureSmartImportUx("03-column-mapping-refined.png");
  await open(`${firstImportPath}?filtro=ready`);
  await captureSmartImport("06-review-exceptions.png");
  const firstRecordHref = await page.getByRole("link", { name: "Riga 1", exact: true }).first().getAttribute("href");
  await open(firstRecordHref);
  await expectText("Dato interpretato");
  await captureSmartImport("07-record-review.png");
  await captureSmartImport("08-match-candidates.png", false);
  await captureSmartImportUx("06-record-review-compact.png", false);
  await captureSmartImportUx("07-provenance-collapsed.png");
  await page.locator("details.provenance-disclosure summary").click();
  await captureSmartImportUx("08-provenance-expanded.png");
  await captureSmartImportUx("09-match-recommended.png", false);
  await captureSmartImportUx("10-match-differences.png", false);
  await open(firstImportPath);
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get("alta") === "approvata", { timeout: 60_000 }),
    page.getByRole("button", { name: "Conferma tutte le proposte affidabili" }).click(),
  ]);
  await open(`${firstImportPath}/summary`);
  await captureSmartImport("11-import-summary.png");
  await captureSmartImport("12-publish-ready.png", false);
  await captureSmartImportUx("13-publish-summary.png");
  const publishButton = page.getByRole("button", { name: "Pubblica importazione" });
  if (!await publishButton.isEnabled()) throw new Error("Il primo import pulito non è pubblicabile dopo la conferma dei match alti.");
  await publishButton.click();
  await page.getByRole("dialog").waitFor();
  await captureSmartImportUx("14-publish-confirm.png", false);
  await Promise.all([page.waitForURL(/pubblicato=/, { timeout: 60_000 }), page.getByRole("dialog").getByRole("button", { name: "Pubblica", exact: true }).click()]);
  await open(`${firstImportPath}/summary`);
  await expectText("Importazione completata");
  await captureSmartImport("13-import-completed.png");
  await captureSmartImportUx("15-publish-result.png");
  await open(`${firstImportPath}/changes`);
  await captureSmartImport("14-price-list-change-analysis.png");
  await captureSmartImport("15-price-intelligence.png", false);
  await captureSmartImportUx("16-price-intelligence-summary.png");
  await open(`${firstImportPath}/changes?tipo=increases&ordine=increase`);
  await captureSmartImportUx("17-price-intelligence-filtered.png");

  await open("/imports/new");
  await page.getByTestId("import-file").setInputFiles("demo-imports/listino-alfa-medical-2028.xlsx");
  await page.getByRole("combobox", { name: /^Fornitore/ }).selectOption({ label: "Alfa Medical" });
  await captureSmartImport("16-second-version-upload.png");
  await page.getByRole("button", { name: "Carica e interpreta" }).click();
  await page.waitForURL((url) => /^\/imports\/(?!new(?:\/|$))[^/]+$/.test(url.pathname), { timeout: 60_000 });
  const secondImportPath = new URL(page.url()).pathname;
  await open(`${secondImportPath}/changes`);
  await captureSmartImport("17-old-vs-new.png");
  await captureSmartImport("18-price-increase-detail.png", false);
  await captureSmartImportUx("19-old-vs-new-summary.png");
  await open(`${secondImportPath}/changes?tipo=packaging`);
  await captureSmartImportUx("18-packaging-change.png");
  await open(`${secondImportPath}?filtro=attention&eccezione=PACKAGE_CHANGE`);
  const packagingRow = page.locator("tr", { hasText: "Cambio confezione" }).first();
  const packagingHref = await packagingRow.getByRole("link", { name: /^Riga / }).getAttribute("href");
  await open(packagingHref);
  await captureSmartImport("19-packaging-change-review.png");
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get("review") === "1", { timeout: 60_000 }),
    page.getByRole("button", { name: "Conferma associazione" }).first().click(),
  ]);
  await open(`${secondImportPath}?filtro=nuovi`);
  const newProductHref = await page.getByRole("link", { name: /Schermo facciale antiappannamento/i }).first().getAttribute("href");
  await open(newProductHref);
  await captureSmartImport("09-new-product-review.png");
  await captureSmartImportUx("11-new-product-compact.png");
  await page.getByRole("combobox", { name: /Categoria/i }).selectOption({ label: "DPI" });
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get("nuovo") === "confermato", { timeout: 60_000 }),
    page.getByRole("button", { name: "Conferma nuovo prodotto" }).click(),
  ]);

  await open("/imports");
  const dirtyImportHref = await page.getByRole("link", { name: "offerta-caresupply-sporca.csv" }).first().getAttribute("href");
  await open(dirtyImportHref);
  await captureSmartImportUx("04-exceptions-first.png");
  await captureSmartImportUx("05-bulk-review.png", false);
  const nonComparableRow = page.locator("tr", { hasText: "Non confrontabile" }).first();
  const nonComparableHref = await nonComparableRow.getByRole("link", { name: /^Riga / }).getAttribute("href");
  await open(nonComparableHref);
  await captureSmartImport("10-non-comparable.png");
  await captureSmartImportUx("12-non-comparable-action.png");

  await switchTo("Marco Villa");
  await open("/organization");
  await capture("24-organizzazione-admin.png");
  await switchTo("Elena Conti");
  await expectText("Impegni e ricezioni");
  await switchTo("Davide Romano");
  await open("/control-tower");
  await capture("23-executive-control-tower.png");
  await captureUx("09-executive-above-fold.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await switchTo("Lucia Ferri");
  await expectText("Cosa ti serve oggi");
  await capture("25-home-rsa-mobile.png");
  await open("/catalog?q=guanto");
  await capture("26-catalogo-mobile.png");
  await captureStyle("08-catalogo-mobile.png");
  await captureUx("02-catalogo-card-mobile.png");
  await open(productHref);
  await capture("27-product-mobile.png");
  await open("/preferiti");
  await capture("28-preferiti-mobile.png");
  await open("/liste");
  await capture("29-liste-mobile.png");
  await open("/cart");
  await capture("30-carrello-mobile.png");
  await captureUx("10-cart-mobile-sticky-action.png");
  await open("/consegne");
  await capture("31-consegne-mobile.png");
  await open(receiveHref);
  await capture("32-ricezione-mobile.png");
  await switchTo("Andrea Riva");
  await open("/approvals");
  await capture("33-approvazioni-mobile.png");

  await switchTo("Giulia Bianchi");
  await switchTo("Marco Villa");
  await switchTo("Elena Conti");
  await switchTo("Davide Romano");

  const expected = Array.from({ length: 33 }, (_, index) => `${String(index + 1).padStart(2, "0")}-`).length;
  if (generated.length !== expected) throw new Error(`Screenshot generati ${generated.length}/33`);
  for (const filename of generated) await access(`${artifacts}/${filename}`);
  const canonicalStyleViews = new Map([
    ["01-shell-desktop.png", "01-home-rsa.png"],
    ["02-home-rsa.png", "01-home-rsa.png"],
    ["03-catalogo.png", "02-catalogo.png"],
    ["04-product-360.png", "03-product-360.png"],
    ["05-supplier-360.png", "20-supplier-360.png"],
    ["06-approval-cockpit.png", "11-approval-cockpit.png"],
    ["07-procurement-control-center.png", "18-procurement-control-center.png"],
    ["08-catalogo-mobile.png", "26-catalogo-mobile.png"],
  ]);
  for (const [target, source] of canonicalStyleViews) await copyFile(`${artifacts}/${source}`, `${styleArtifacts}/${target}`);
  if (styleGenerated.length !== 8) throw new Error(`Screenshot style audit generati ${styleGenerated.length}/8`);
  for (const filename of styleGenerated) await access(`${styleArtifacts}/${filename}`);
  if (uxGenerated.length !== 10) throw new Error(`Screenshot UX finali generati ${uxGenerated.length}/10`);
  for (const filename of uxGenerated) await access(`${uxArtifacts}/${filename}`);
  if (smartImportGenerated.length !== 19) throw new Error(`Screenshot Smart Import generati ${smartImportGenerated.length}/19`);
  for (const filename of smartImportGenerated) await access(`${smartImportArtifacts}/${filename}`);
  if (smartImportUxGenerated.length !== 20) throw new Error(`Screenshot Smart Import UX generati ${smartImportUxGenerated.length}/20`);
  for (const filename of smartImportUxGenerated) await access(`${smartImportUxArtifacts}/${filename}`);
  if (browserErrors.length) throw new Error(`Errori console browser:\n${browserErrors.join("\n")}`);
  console.log(`BROWSER QA PASS: 6 personas, flussi core e Smart Import reale, scope, ${generated.length} screenshot finali, ${styleGenerated.length} style audit, ${uxGenerated.length} UX finali e ${smartImportGenerated.length} Smart Import verificati.`);
  console.log(generated.join("\n"));
  console.log(styleGenerated.join("\n"));
  console.log(uxGenerated.join("\n"));
  console.log(smartImportGenerated.join("\n"));
  console.log(smartImportUxGenerated.join("\n"));
} finally {
  await browser.close();
  localServer?.kill();
}
