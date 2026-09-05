import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
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
async function databaseDiagnostic() {
  if (!process.env.DATABASE_URL || !jobPath) return { available: false };
  const jobId = jobPath.split("/").filter(Boolean).at(-1);
  try {
    const [{ PrismaPg }, clientModule] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const PrismaClient = clientModule.PrismaClient ?? clientModule.default?.PrismaClient;
    if (!PrismaClient) return { available: false, reason: "PrismaClient unavailable" };
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
    try {
      const job = await db.importJob.findUnique({
        where: { id: jobId },
        select: {
          status: true, errorMessage: true, totalRecords: true, reviewRequiredRecords: true,
          publishableRecords: true, interpretationProvider: true, externalProcessing: true,
          sourceDocument: { select: { storageProvider: true, storageBucket: true, storageObjectKey: true } },
          _count: { select: { records: true } },
        },
      });
      if (!job) return { available: true, jobFound: false };
      const groups = await db.importedRecord.groupBy({ by: ["status"], where: { importJobId: jobId }, _count: { _all: true } });
      return {
        available: true, jobFound: true, status: job.status,
        error: job.errorMessage?.slice(0, 300) ?? null,
        totalRecords: job.totalRecords, reviewRequiredRecords: job.reviewRequiredRecords,
        publishableRecords: job.publishableRecords, persistedRecords: job._count.records,
        interpretationProvider: job.interpretationProvider, externalProcessing: job.externalProcessing,
        storage: {
          provider: job.sourceDocument.storageProvider,
          bucketPresent: Boolean(job.sourceDocument.storageBucket),
          objectKeyPresent: Boolean(job.sourceDocument.storageObjectKey),
        },
        groups: Object.fromEntries(groups.map((group) => [group.status, group._count._all])),
      };
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : null;
    return { available: false, reason: error instanceof Error ? error.name : "unknown diagnostic error", code };
  }
}
async function captureFailureEvidence() {
  const directory = path.join(process.cwd(), "artifacts", "remote-certification");
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, "smart-import-failure.png"), fullPage: true }).catch(() => undefined);
  const alerts = await page.locator('[role="alert"], .error, .warning').allInnerTexts().catch(() => []);
  return {
    urlPath: new URL(page.url()).pathname,
    title: await page.title().catch(() => "unavailable"),
    alerts: alerts.map((value) => value.replace(/\s+/g, " ").slice(0, 300)).slice(0, 5),
    reviewToolbarPresent: await page.locator(".review-toolbar").count(),
    selectableRecordCount: await page.locator('input[name="recordId"]').count(),
    database: await databaseDiagnostic(),
  };
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
async function uploadAndVerify({ file, supplier, checkpointName }) {
  checkpoint = checkpointName;
  await open("/imports/new");
  await page.getByTestId("import-file").setInputFiles(file);
  await page.getByRole("combobox", { name: /^Fornitore/ }).selectOption({ label: supplier });
  await page.getByRole("button", { name: "Carica e interpreta" }).click();
  await page.waitForURL((url) => /^\/imports\/(?!new(?:\/|$))[^/]+$/.test(url.pathname), { timeout: 60_000 });
  const path = new URL(page.url()).pathname;
  const result = await counts();
  assert.ok(result.total > 0, `${checkpointName}: no persisted records`);
  return { path, counts: result };
}
function docxFixture() {
  const zip = new AdmZip();
  zip.addFile("[Content_Types].xml", Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'));
  zip.addFile("_rels/.rels", Buffer.from('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'));
  zip.addFile("word/document.xml", Buffer.from('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>sku;descrizione;prezzo;pezzi</w:t></w:r></w:p><w:p><w:r><w:t>REMOTE-DOCX-1;Guanto nitrile demo;2,50;100</w:t></w:r></w:p></w:body></w:document>'));
  return { name: "remote-certification.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: zip.toBuffer() };
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
  checkpoint = "xlsx-empty-bulk-decision";
  await page.locator("select[name=bulkAction]").selectOption("IGNORE");
  await page.getByRole("button", { name: "Applica decisione" }).click();
  const decisionError = page.locator('.error[role="alert"]');
  await decisionError.waitFor();
  assert.match(await decisionError.innerText(), /Seleziona almeno una riga/i);
  assert.deepEqual(await counts(), initial);

  // Confirm an existing-product match on the supplied review fixture.
  checkpoint = "xlsx-confirm-match";
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
  checkpoint = "xlsx-human-decision-guard";
  await open(`${confirmJobPath}/mapping`);
  await page.getByRole("button", { name: "Ripristina mapping automatico" }).click();
  const reprocessError = page.locator('.error[role="alert"]');
  await reprocessError.waitFor();
  assert.match(await reprocessError.innerText(), /decisioni umane/i);
  await open(confirmHref);
  assert.match(await page.locator("main").innerText(), /Confermato/i);

  // Confirm a new-product decision. Creation itself remains publication-gated.
  checkpoint = "xlsx-new-product";
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
  checkpoint = "xlsx-single-ignore";
  const decisionJobPath = process.env.QA_DECISION_JOB_PATH ?? jobPath;
  // Earlier decisions may legitimately exhaust the attention queue. Use the
  // still-pending high-confidence queue for independent bulk-decision proof.
  await open(`${decisionJobPath}?filtro=ready`);
  const beforeIgnore = await counts();
  await page.locator('input[name="recordId"]').first().check();
  await page.locator("select[name=bulkAction]").selectOption("IGNORE");
  await page.getByRole("button", { name: "Applica decisione" }).click();
  await page.waitForURL(/batch=1/);
  const afterIgnore = await counts();
  assert.equal(afterIgnore.ready, beforeIgnore.ready - 1);
  assert.equal(afterIgnore.ignored, beforeIgnore.ignored + 1);

  // Multi-row decision and persisted counters.
  checkpoint = "xlsx-multi-decision";
  await open(`${decisionJobPath}?filtro=ready`);
  const beforeMulti = await counts();
  const boxes = page.locator('input[name="recordId"]');
  assert.ok(await boxes.count() >= 2, "two compatible rows for bulk decision");
  await boxes.nth(0).check(); await boxes.nth(1).check();
  await page.locator("select[name=bulkAction]").selectOption("NON_COMPARABLE");
  await page.getByRole("button", { name: "Applica decisione" }).click();
  await page.waitForURL(/batch=2/);
  const afterMulti = await counts();
  assert.equal(afterMulti.ready, beforeMulti.ready - 2);
  assert.equal(afterMulti.nonComparable, beforeMulti.nonComparable + 2);
  await page.reload({ waitUntil: "networkidle" });
  assert.deepEqual(await counts(), afterMulti);

  checkpoint = "xlsx-publish";
  await open(jobPath);
  const confirmAll = page.getByRole("button", { name: "Conferma tutte le proposte affidabili" });
  if (await confirmAll.count()) {
    await confirmAll.click();
    await page.waitForURL((url) => url.pathname === jobPath);
  }
  await open(`${jobPath}/summary`);
  await page.getByRole("button", { name: "Pubblica importazione" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Pubblica", exact: true }).click();
  await page.waitForURL((url) => url.pathname === jobPath && url.searchParams.has("pubblicato"), { timeout: 60_000 });
  await open(`${jobPath}/summary`);
  assert.match(await page.locator("main").innerText(), /Importazione completata|offerte pubblicate/i);
  assert.ok(await page.getByRole("link", { name: "Apri listino" }).count(), "published price-list link");
  await open(confirmHref);
  assert.match(await page.locator("main").innerText(), /Provenienza|Riga \d+|Documento/i);

  const csv = await uploadAndVerify({ file: "demo-imports/offerta-caresupply-sporca.csv", supplier: "CareSupply", checkpointName: "csv-upload" });
  const docx = await uploadAndVerify({ file: docxFixture(), supplier: "Alfa Medical", checkpointName: "docx-upload" });
  const pdf = await uploadAndVerify({ file: "demo-imports/listino-medika-testuale.pdf", supplier: "Medika Network", checkpointName: "pdf-upload" });

  await switchTo("Marco Villa");
  checkpoint = "admin-readback";
  await open("/imports");
  assert.match(await page.locator("main").innerText(), /Importazioni/i);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: "PASS", jobPath, initial, afterConfirm, afterIgnore, afterMulti, formats: { csv, docx, pdf } }));
} catch (error) {
  const safeMessage = (error instanceof Error ? error.message : String(error)).replace(/https?:\/\/\S+/g, "[url]").slice(0, 500);
  const evidence = await captureFailureEvidence().catch(() => ({ unavailable: true }));
  if (process.env.GITHUB_ACTIONS === "true") console.error(`::error title=Remote Smart Import ${checkpoint}::${safeMessage} | ${JSON.stringify(evidence).slice(0, 1800)}`);
  throw error;
} finally {
  await browser.close();
}
