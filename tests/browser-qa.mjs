import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const base = process.env.QA_BASE_URL ?? "http://localhost:3000";
const artifacts = "artifacts/visual-qa-hardening";
await mkdir(artifacts, { recursive: true });

let localServer;
async function isExpectedApp() {
  try {
    const response = await fetch(base);
    return response.ok && (await response.text()).includes("Joint Procurement");
  } catch {
    return false;
  }
}
if (!(await isExpectedApp())) {
  const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm run dev"] : ["run", "dev"];
  localServer = spawn(command, args, { cwd: process.cwd(), stdio: "ignore", windowsHide: true });
  for (let attempt = 0; attempt < 60 && !(await isExpectedApp()); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!(await isExpectedApp())) {
    localServer.kill();
    throw new Error(`Joint Procurement OS non disponibile su ${base}. Verificare che la porta non sia occupata da un’altra applicazione.`);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("tree hydrated")) errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

async function open(path = "/") {
  const response = await page.goto(new URL(path, base).toString(), { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`GET ${path}: HTTP ${response?.status() ?? "nessuna risposta"}`);
  await page.getByRole("link", { name: /Joint Procurement/ }).first().waitFor();
}

async function switchTo(name) {
  await open("/");
  const switcher = page.getByLabel("Visualizza come", { exact: true });
  await switcher.waitFor();
  const value = await switcher.locator("option").evaluateAll(
    (options, expected) => options.find((option) => option.textContent?.includes(expected))?.value,
    name,
  );
  if (!value) throw new Error(`Persona demo non disponibile: ${name}`);
  await switcher.selectOption(value);
  await page.waitForLoadState("networkidle");
  await page.getByText(name, { exact: true }).last().waitFor();
  if (await switcher.inputValue() !== value) throw new Error(`Role switch non persistito per ${name}`);
}

async function shot(name, fullPage = true) {
  await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage });
}

async function expectText(text) {
  await page.getByText(text, { exact: false }).first().waitFor();
}

async function firstTableLink() {
  const link = page.getByRole("table").first().getByRole("link").first();
  await link.waitFor();
  return link;
}

try {
  await switchTo("Lucia Ferri");
  await expectText("Cosa ti serve oggi");
  await expectText("Budget disponibile");
  await shot("01-rsa-home");

  await page.getByPlaceholder(/Cerca un prodotto o descrivi/i).fill("Guanto nitrile senza polvere M");
  await page.getByPlaceholder(/Cerca un prodotto o descrivi/i).press("Enter");
  await expectText(/prodott[oi] trovat[oi]/i);
  await shot("02-catalogo");

  await page.getByRole("link", { name: /Guanto nitrile senza polvere M/ }).first().click();
  await expectText("Offerta convenzionata");
  await expectText("Storico prezzi");
  await expectText("Alternative commerciali");
  await shot("03-product-360");
  await page.getByRole("link", { name: "Confronta", exact: true }).last().click();
  await expectText("Confronto prodotti");
  await shot("03b-confronto-prodotti");
  await page.goBack({ waitUntil: "networkidle" });

  await page.getByRole("button", { name: /Salva nei preferiti|Rimuovi dai preferiti/ }).click();
  await open("/preferiti");
  await expectText("Catalogo personale");
  await shot("04-preferiti");

  await open("/liste");
  await expectText("Ordine settimanale igiene");
  await shot("05-liste");
  await page.getByRole("button", { name: /Aggiungi tutto/i }).first().click();
  await expectText("Impatto sul budget");
  await shot("06-carrello");

  await open("/richieste");
  await expectText("Richieste d’acquisto");
  await expectText("Non trovi il prodotto");
  await shot("07-richieste");

  await open("/orders");
  await expectText("Operatività ordini");
  await (await firstTableLink()).click();
  await expectText("Ordine al fornitore");
  await shot("08-po-detail");

  await open("/consegne");
  await expectText("Consegne");
  await shot("09-consegne");
  await open("/budget");
  await expectText("Forecast fine periodo");
  await shot("10-budget");
  await open("/non-conformita");
  await expectText("Non conformità");
  await shot("11-non-conformita");

  await switchTo("Andrea Riva");
  await expectText("Cosa richiede attenzione");
  await open("/facilities");
  if (await page.getByText("Villa Serena", { exact: true }).count()) throw new Error("Area Manager vede una struttura fuori scope");
  await open("/approvals");
  await shot("12-approvazioni");
  const approvalLinks = page.getByRole("table").first().getByRole("link");
  if (await approvalLinks.count()) {
    await approvalLinks.first().click();
    await expectText("Cockpit di approvazione");
    await shot("12b-approval-cockpit");
  }

  await switchTo("Giulia Bianchi");
  await expectText("Coda operativa");
  await shot("13-procurement-control-center");
  await open("/suppliers");
  await shot("14-fornitori");
  await (await firstTableLink()).click();
  await expectText("Fornitore 360");
  await shot("15-supplier-360");
  await open("/categorie");
  await expectText("Gestione categorie");
  await page.getByRole("link", { name: /spesa osservata.*Prodotti.*Fornitori.*Budget/is }).first().click();
  await expectText("Opportunità di prezzo");
  await shot("16-category-360");
  await open("/compare");
  await shot("17-confronto-prezzi");

  await switchTo("Marco Villa");
  await open("/deleghe");
  await expectText("Deleghe di approvazione");

  await switchTo("Elena Conti");
  await expectText("Impegni e ricezioni");

  await switchTo("Davide Romano");
  await open("/control-tower");
  await shot("18-control-tower");

  await page.setViewportSize({ width: 390, height: 844 });
  await switchTo("Lucia Ferri");
  await shot("19-mobile-home");
  await open("/catalog?q=guanto");
  await shot("20-mobile-catalog");
  await page.getByRole("link", { name: /Guanto nitrile/ }).first().click();
  await expectText("Offerta convenzionata");
  await shot("21-mobile-product");
  await open("/cart");
  await page.getByRole("button", { name: "Invia richiesta d’acquisto" }).scrollIntoViewIfNeeded();
  await shot("22-mobile-cart", false);
  await open("/consegne");
  await shot("23-mobile-consegne");
  const receiveLinks = page.getByRole("link", { name: "Registra ricezione" });
  if (await receiveLinks.count()) {
    await receiveLinks.first().click();
    await expectText("Registra consegna");
    await shot("24-mobile-ricezione");
  }
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error("Overflow orizzontale mobile");
  }

  if (errors.length) throw new Error(`Errori console browser:\n${errors.join("\n")}`);
  console.log("BROWSER QA PASS: 6 personas, scope Area, viste desktop/mobile e workflow operativi.");
} finally {
  await browser.close();
  localServer?.kill();
}
