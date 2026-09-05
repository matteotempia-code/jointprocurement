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
async function recordLinks(path, filter) {
  await open(`${path}?filtro=${filter}`);
  return page.getByRole("link", { name: /^Riga \d+$/ }).evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")).filter(Boolean))]);
}
async function firstDecidableRecord(path, filter, button) {
  for (const href of await recordLinks(path, filter)) {
    await open(href);
    if (await page.getByRole("button", { name: button }).count()) return href;
  }
  throw new Error(`Nessun record ${filter} con azione ${button}`);
}
let jobPath;
let checkpoint = "startup";
try {
  checkpoint = "unauthorized-role";
  await switchTo("Lucia Ferri");
  await open("/imports");
  assert.match(await page.locator("main").innerText(), /outside your current role|fuori dal perimetro/i);
  await switchTo("Giulia Bianchi");
  checkpoint = "xlsx-upload";
  await open("/imports/new");
  await page.getByTestId("import-file").setInputFiles("demo-imports/listino-alfa-medical-2028.xlsx");
  await page.getByRole("combobox", { name: /^Fornitore/ }).selectOption({ label: "Alfa Medical" });
  await page.getByRole("button", { name: "Carica e interpreta" }).click();
  await page.waitForURL((url) => /^\/imports\/(?!new(?:\/|$))[^/]+$/.test(url.pathname), { timeout: 60_000 });
  jobPath = new URL(page.url()).pathname;
  checkpoint = "xlsx-initial-counts";
  const initial = await counts();
  assert.ok(initial.total > 0 && initial.attention > 0, JSON.stringify(initial));

  // No selection must fail visibly and leave persisted counters untouched.
  await page.locator("select[name=bulkAction]").selectOption("IGNORE");
  await page.getByRole("button", { name: "Applica decisione" }).click();
  const decisionError = page.locator('.error[role="alert"]');
  await decisionError.waitFor();
  assert.match(await decisionError.innerText(), /Seleziona almeno una riga/i);
  assert.deepEqual(await counts(), initial);

  // Confirm an existing-product match on the supplied review fixture.
  const confirmJobPath = process.env.QA_CONFIRM_JOB_PATH ?? jobPath;
  const confirmHref = await firstDecidableRecord(confirmJobPath, "attention", "Conferma associazione");
  await open(`${confirmJobPath}?filtro=attention`);
  const beforeConfirm = await counts();
  await open(confirmHref);
  await page.getByRole("button", { name: "Conferma associazione" }).click();
  await page.waitForURL((url) => url.pathname === confirmJobPath);
  const afterConfirm = await counts();
  assert.equal(afterConfirm.total, beforeConfirm.total);
  assert.equal(afterConfirm.attention, beforeConfirm.attention - 1);
  await open(confirmHref);
  assert.match(await page.locator("main").innerText(), /Confermato/i);
  await page.reload({ waitUntil: "networkidle" });
  assert.match(await page.locator("main").innerText(), /Confermato/i);

  // Machine reprocessing must not overwrite a persisted human decision.
  await open(`${confirmJobPath}/mapping`);
  await page.getByRole("button", { name: "Ripristina mapping automatico" }).click();
  const reprocessError = page.locator('.error[role="alert"]');
  await reprocessError.waitFor();
  assert.match(await reprocessError.innerText(), /decisioni umane/i);
  await open(confirmHref);
  assert.match(await page.locator("main").innerText(), /Confermato/i);

  // Confirm a new-product decision. Creation itself remains publication-gated.
  const newJobPath = process.env.QA_NEW_JOB_PATH ?? jobPath;
  const newHref = (await recordLinks(newJobPath, "new"))[0];
  assert.ok(newHref, "new-product record");
  await open(newHref);
  const createButton = page.getByRole("button", { name: "Conferma nuovo prodotto" });
  if (await createButton.count()) {
    await page.getByRole("combobox", { name: /Categoria/i }).selectOption({ label: "DPI" });
    await createButton.click();
    await page.waitForURL((url) => url.pathname === newJobPath);
    await open(newHref);
  }
  assert.match(await page.locator("main").innerText(), /Nuovo prodotto confermato/i);
  await page.reload({ waitUntil: "networkidle" });
  assert.match(await page.locator("main").innerText(), /Nuovo prodotto confermato/i);

  // Single-row ignore through the bulk form.
  const decisionJobPath = process.env.QA_DECISION_JOB_PATH ?? jobPath;
  await open(`${decisionJobPath}?filtro=attention`);
  const beforeIgnore = await counts();
  await page.locator('input[name="recordId"]').first().check();
  await page.locator("select[name=bulkAction]").selectOption("IGNORE");
  await page.getByRole("button", { name: "Applica decisione" }).click();
  await page.waitForURL(/batch=1/);
  const afterIgnore = await counts();
  assert.equal(afterIgnore.attention, beforeIgnore.attention - 1);
  assert.equal(afterIgnore.ignored, beforeIgnore.ignored + 1);

  // Multi-row decision and persisted counters.
  await open(`${decisionJobPath}?filtro=attention`);
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
  checkpoint = "admin-readback";
  await open("/imports");
  assert.match(await page.locator("main").innerText(), /Importazioni/i);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: "PASS", jobPath, initial, afterConfirm, afterIgnore, afterMulti }));
} catch (error) {
  const safeMessage = (error instanceof Error ? error.message : String(error)).replace(/https?:\/\/\S+/g, "[url]").slice(0, 500);
  if (process.env.GITHUB_ACTIONS === "true") console.error(`::error title=Remote Smart Import ${checkpoint}::${safeMessage}`);
  throw error;
} finally {
  await browser.close();
}
