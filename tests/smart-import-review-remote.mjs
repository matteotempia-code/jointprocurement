import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.QA_BASE_URL;
if (!base) throw new Error("QA_BASE_URL is required and must target the Vercel develop deployment.");
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: headers });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

async function open(path) {
  const response = await page.goto(new URL(path, base).toString(), { waitUntil: "networkidle", timeout: 60_000 });
  assert.equal(response?.status(), 200, `GET ${path}`);
}
async function switchTo(name) {
  await open("/");
  const select = page.getByLabel(/^(Persona demo|Visualizza come)$/);
  const value = await select.locator("option").evaluateAll((options, expected) => options.find((option) => option.textContent?.includes(expected))?.value, name);
  assert.ok(value, `persona ${name}`);
  await select.selectOption(value);
  await page.getByText(name, { exact: true }).last().waitFor();
}
async function counts() {
  const text = await page.locator(".review-toolbar nav").innerText();
  const read = (label) => Number(text.match(new RegExp(`${label}\\s+(\\d+)`, "i"))?.[1] ?? -1);
  return { attention: read("Da verificare"), ready: read("Pronte"), newProducts: read("Nuovi prodotti"), nonComparable: read("Non confrontabili"), ignored: read("Ignorate"), total: read("Tutte") };
}
async function recordLinks(filter) {
  await open(`${jobPath}?filtro=${filter}`);
  return page.getByRole("link", { name: /^Riga \d+$/ }).evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")).filter(Boolean))]);
}
async function firstDecidableRecord(filter, button) {
  for (const href of await recordLinks(filter)) {
    await open(href);
    if (await page.getByRole("button", { name: button }).count()) return href;
  }
  throw new Error(`Nessun record ${filter} con azione ${button}`);
}

let jobPath;
try {
  await switchTo("Lucia Ferri");
  await open("/imports");
  assert.match(await page.locator("main").innerText(), /outside your current role|fuori dal perimetro/i);
  await switchTo("Giulia Bianchi");
  await open("/imports/new");
  await page.getByTestId("import-file").setInputFiles("demo-imports/listino-alfa-medical-2028.xlsx");
  await page.getByRole("combobox", { name: /^Fornitore/ }).selectOption({ label: "Alfa Medical" });
  await page.getByRole("button", { name: "Carica e interpreta" }).click();
  await page.waitForURL((url) => /^\/imports\/[^/]+$/.test(url.pathname), { timeout: 60_000 });
  jobPath = new URL(page.url()).pathname;
  const initial = await counts();
  assert.ok(initial.total > 0 && initial.attention > 0, JSON.stringify(initial));

  // No selection must fail visibly and leave persisted counters untouched.
  await page.locator("select[name=bulkAction]").selectOption("IGNORE");
  await page.getByRole("button", { name: "Applica decisione" }).click();
  await page.getByRole("alert").waitFor();
  assert.match(await page.getByRole("alert").innerText(), /Seleziona almeno una riga/i);
  assert.deepEqual(await counts(), initial);

  // Confirm one proposed/existing match through the record decision UI.
  await firstDecidableRecord("attention", "Conferma associazione");
  const beforeConfirm = initial;
  await page.getByRole("button", { name: "Conferma associazione" }).click();
  await page.waitForURL((url) => url.pathname === jobPath);
  const afterConfirm = await counts();
  assert.equal(afterConfirm.attention, beforeConfirm.attention - 1);
  await page.reload({ waitUntil: "networkidle" });
  assert.deepEqual(await counts(), afterConfirm);

  // Confirm a new-product decision. Creation itself remains publication-gated.
  const newHref = (await recordLinks("new"))[0];
  assert.ok(newHref, "new-product record");
  await open(newHref);
  await page.getByRole("combobox", { name: /Categoria/i }).selectOption({ label: "DPI" });
  await page.getByRole("button", { name: "Conferma nuovo prodotto" }).click();
  await page.waitForURL((url) => url.pathname === jobPath);
  await open(newHref);
  assert.match(await page.locator("main").innerText(), /Nuovo prodotto confermato/i);
  await page.reload({ waitUntil: "networkidle" });
  assert.match(await page.locator("main").innerText(), /Nuovo prodotto confermato/i);

  // Single-row ignore through the bulk form.
  await open(`${jobPath}?filtro=attention`);
  const beforeIgnore = await counts();
  await page.locator('input[name="recordId"]').first().check();
  await page.locator("select[name=bulkAction]").selectOption("IGNORE");
  await page.getByRole("button", { name: "Applica decisione" }).click();
  await page.waitForURL(/batch=1/);
  const afterIgnore = await counts();
  assert.equal(afterIgnore.attention, beforeIgnore.attention - 1);
  assert.equal(afterIgnore.ignored, beforeIgnore.ignored + 1);

  // Multi-row decision and persisted counters.
  await open(`${jobPath}?filtro=attention`);
  const beforeMulti = await counts();
  const boxes = page.locator('input[name="recordId"]');
  assert.ok(await boxes.count() >= 2, "two compatible rows for bulk decision");
  await boxes.nth(0).check(); await boxes.nth(1).check();
  await page.locator("select[name=bulkAction]").selectOption("NON_COMPARABLE");
  await page.getByRole("button", { name: "Applica decisione" }).click();
  await page.waitForURL(/batch=2/);
  const afterMulti = await counts();
  assert.equal(afterMulti.attention, beforeMulti.attention - 2);
  assert.equal(afterMulti.nonComparable, beforeMulti.nonComparable + 2);
  await page.reload({ waitUntil: "networkidle" });
  assert.deepEqual(await counts(), afterMulti);

  await switchTo("Marco Villa");
  await open("/imports");
  assert.match(await page.locator("main").innerText(), /Importazioni/i);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: "PASS", jobPath, initial, afterConfirm, afterIgnore, afterMulti }));
} finally {
  await browser.close();
}
