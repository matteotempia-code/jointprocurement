import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";

const port = process.env.QA_PORT ?? "3114";
const base = `http://localhost:${port}`;
const output = path.join(process.cwd(), "artifacts", "tomorrow-price-list-readiness");
await mkdir(output, { recursive: true });
let server;
async function ready() { try { const response = await fetch(base); return response.ok && (await response.text()).includes("Joint Procurement"); } catch { return false; } }
if (!(await ready())) {
  server = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `npx next start -p ${port}`], { cwd: process.cwd(), stdio: "ignore", windowsHide: true });
  for (let attempt = 0; attempt < 120 && !(await ready()); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 500));
  if (!(await ready())) throw new Error("Applicazione non disponibile per la prova browser.");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
async function open(route) { const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle" }); if (!response?.ok()) throw new Error(`${route}: HTTP ${response?.status()}`); }
async function switchTo(name) { await open("/"); const selector = page.getByLabel(/^(Persona demo|Visualizza come)$/); const value = await selector.locator("option").evaluateAll((options, expected) => options.find((option) => option.textContent?.includes(expected))?.value, name); if (!value) throw new Error(`Persona non trovata: ${name}`); await selector.selectOption(value); await page.waitForLoadState("networkidle"); await page.getByText(name, { exact: true }).last().waitFor(); }
async function screenshot(name) { await page.screenshot({ path: path.join(output, name), fullPage: true }); }

async function uploadAndPublish({ fixture, supplier, label, existingId }) {
  if (existingId) await open(`/imports/${existingId}`);
  else {
    await open("/imports/new");
    if (!(await page.getByTestId("import-file").count())) throw new Error(`Upload non disponibile: ${await page.locator("main").innerText()}`);
    await page.getByTestId("import-file").setInputFiles(path.join(process.cwd(), "demo-imports", fixture));
    // Prima lista senza associazione esplicita: prova suggerimento + conferma umana.
    await page.getByRole("button", { name: "Carica e interpreta" }).click();
    await page.waitForLoadState("networkidle");
  }
  const confirmation = page.getByRole("heading", { name: "A quale fornitore appartiene il documento?" });
  if (await confirmation.count()) {
    const select = page.getByLabel("Fornitore").last();
    const selectedText = await select.locator("option:checked").textContent();
    if (!selectedText?.includes(supplier)) await select.selectOption({ label: supplier });
    await screenshot(`${label}-supplier-confirmation.png`);
    await page.getByRole("button", { name: "Conferma fornitore" }).click();
    await page.waitForLoadState("networkidle");
  }
  const jobId = page.url().match(/\/imports\/([^/?]+)/)?.[1] ?? existingId;
  await open(`/imports/${jobId}?filtro=attention`);
  for (let pass = 0; pass < 1; pass += 1) {
    const attention = page.locator('input[name="recordId"]'); const count = await attention.count();
    if (!count) break;
    for (const checkbox of await attention.all()) await checkbox.check();
    await page.getByLabel("Azione multipla", { exact: true }).selectOption("ACCEPT_RECOMMENDED");
    await Promise.all([page.waitForURL(/batch=/), page.locator(".bulk-review-bar").getByRole("button", { name: "Applica" }).click()]);
    await open(`/imports/${jobId}?filtro=attention`);
  }
  for (let decision = 0; decision < 100; decision += 1) {
    await open(`/imports/${jobId}?filtro=attention`);
    const recordHref = await page.locator('table tbody a[href*="/records/"]').first().getAttribute("href");
    if (!recordHref) break;
    await open(recordHref);
    const confirm = page.getByRole("button", { name: "Conferma associazione" });
    if (!(await confirm.count())) throw new Error(`${label}: record incerto senza candidato confermabile (${recordHref}).`);
    await confirm.click(); await page.waitForLoadState("networkidle");
  }
  await open(`/imports/${jobId}`);
  const approve = page.locator(".bulk-review-action button");
  if (await approve.count()) await Promise.all([page.waitForURL(/alta=approvata/), approve.click()]);
  await screenshot(`${label}-review.png`);
  await open(`/imports/${jobId}/summary`);
  const publish = page.getByRole("button", { name: "Pubblica importazione" });
  if (await publish.count()) { await publish.click(); await page.getByRole("dialog").getByRole("button", { name: "Pubblica", exact: true }).click(); await page.waitForLoadState("networkidle"); await open(`/imports/${jobId}/summary`); }
  await page.getByText(/offerte pubblicate/i).first().waitFor();
  await screenshot(`${label}-published.png`);
  return jobId;
}

try {
  await switchTo("Giulia Bianchi");
  const resume = process.argv.slice(2);
  const alfa = await uploadAndPublish({ fixture: "listino-alfa-medical-2027.xlsx", supplier: "Alfa Medical", label: "01-alfa-xlsx", existingId: resume[0] });
  const care = await uploadAndPublish({ fixture: "offerta-caresupply-sporca.csv", supplier: "CareSupply", label: "02-caresupply-csv", existingId: resume[1] });
  await open("/categorie");
  const category = await page.locator('main a[href^="/categorie/"]').first().getAttribute("href");
  if (!category) throw new Error("Nessuna categoria navigabile.");
  await open(category);
  await screenshot("03-category-to-suppliers-products.png");
  const product = await page.locator('#opportunita a[href^="/products/"]').first().getAttribute("href");
  if (!product) throw new Error("Nessun prodotto confrontabile dalla categoria.");
  await open(product);
  const rows = await page.getByRole("table", { name: "Confronto offerte fornitori" }).locator("tbody tr").count();
  if (rows < 2) throw new Error(`Confronto cross-supplier insufficiente: ${rows} righe.`);
  await screenshot("04-same-product-supplier-comparison.png");
  const report = { alfaImportId: alfa, careSupplyImportId: care, comparisonRows: rows, browserErrors: errors };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
  if (server) server.kill();
}
