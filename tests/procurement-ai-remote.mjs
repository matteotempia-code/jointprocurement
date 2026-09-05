import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const required = (name) => {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required`);
  return value;
};

const base = required("QA_BASE_URL");
const connectionString = required("DATABASE_URL");
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
  : {};
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: headers });

async function open(route) {
  const response = await page.goto(new URL(route, base).toString(), { waitUntil: "networkidle", timeout: 60_000 });
  assert.equal(response?.status(), 200, `GET ${route}`);
}

async function switchTo(name) {
  await open("/");
  const select = page.getByLabel(/^(Persona demo|Visualizza come)$/);
  const value = await select.locator("option").evaluateAll(
    (options, expected) => options.find((option) => option.textContent?.includes(expected))?.value,
    name,
  );
  assert.ok(value, `persona ${name}`);
  await select.selectOption(value);
  await page.getByText(name, { exact: true }).last().waitFor();
}

async function fixture(vatNumber) {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date("2026-09-05T00:00:00.000Z");
  workbook.modified = workbook.created;
  const sheet = workbook.addWorksheet("Listino certificazione AI");
  sheet.addRow(["Alfa Medical S.r.l."]);
  sheet.addRow([`Partita IVA: ${vatNumber ?? "non indicata"}`]);
  sheet.addRow(["Validità: 01/09/2026 - 31/12/2026"]);
  sheet.addRow(["Pagamento: bonifico 60 giorni data fattura"]);
  sheet.addRow(["Ordine minimo: 150 EUR; franco porto: 500 EUR; trasporto: 18 EUR; consegna: 4 giorni"]);
  sheet.addRow([]);
  sheet.addRow(["Codice", "Descrizione", "Confezione", "Pezzi", "UM", "Prezzo"]);
  sheet.addRow(["AI-CERT-001", "Guanto nitrile senza polvere M", "CF 100", 100, "PZ", 7.9]);
  // Deliberately incomplete packaging: the normal ingest must route exactly
  // this row through Procurement AI row interpretation.
  sheet.addRow(["AI-CERT-AMB", "Detergente professionale concentrato formato da verificare", "", "", "", 12.4]);
  const bytes = await workbook.xlsx.writeBuffer();
  return { name: "certificazione-procurement-ai.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(bytes) };
}

let checkpoint = "startup";
let createdJobId;
try {
  checkpoint = "supplier-fixture";
  const supplier = await db.supplier.findFirst({ where: { name: { contains: "Alfa Medical", mode: "insensitive" } }, select: { vatNumber: true } });
  assert.ok(supplier, "synthetic certification supplier exists");

  checkpoint = "runtime-status";
  await switchTo("Giulia Bianchi");
  await open("/imports/new");
  const runtimeStatus = page.locator(".provider-runtime-status");
  await assert.doesNotReject(() => runtimeStatus.getByText("AI status: OPENAI", { exact: true }).waitFor());
  const statusText = await runtimeStatus.innerText();
  assert.doesNotMatch(statusText, /non configurato|nessun invio esterno|disabilitat/i);
  const displayedModel = statusText.match(/modello\s+([^\s.]+)/i)?.[1];
  assert.ok(displayedModel, "OpenAI model is displayed in the runtime status");

  await page.getByTestId("import-file").setInputFiles(await fixture(supplier.vatNumber));
  // Leave supplier unselected so the normal document-context call must also
  // produce the source-backed supplier proposal used by the review UI.
  checkpoint = "new-import";
  await page.getByRole("button", { name: "Carica e interpreta" }).click();
  await page.waitForURL((url) => /^\/imports\/(?!new(?:\/|$))[^/]+$/.test(url.pathname), { timeout: 90_000 });
  const jobId = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1);
  assert.ok(jobId, "new ImportJob URL");
  createdJobId = jobId;

  checkpoint = "database-proof";
  const job = await db.importJob.findUnique({
    where: { id: jobId },
    select: {
      interpretationProvider: true,
      providerModel: true,
      externalProcessing: true,
      status: true,
      summary: true,
      _count: { select: { records: true, procurementAICalls: true } },
      procurementAICalls: { select: { resultState: true, provider: true, model: true, operation: true }, orderBy: { createdAt: "asc" } },
    },
  });
  assert.ok(job, "new ImportJob persisted");
  assert.equal(job.interpretationProvider, "OPENAI");
  assert.equal(job.externalProcessing, true);
  assert.equal(job.providerModel, displayedModel);
  assert.ok(job._count.records >= 2, "fixture rows persisted");
  assert.ok(job._count.procurementAICalls >= 1, "ProcurementAICall persisted");
  assert.ok(job.procurementAICalls.some((call) => call.operation === "DOCUMENT_CONTEXT" && call.resultState === "SUCCEEDED"), "successful document-context call");
  assert.ok(job.procurementAICalls.some((call) => call.operation === "ROW_INTERPRETATION"), "ambiguous row reached Procurement AI");
  assert.ok(job.procurementAICalls.every((call) => call.provider === "OPENAI" && call.model === displayedModel), "provider/model telemetry matches runtime UI");

  const summary = job.summary ?? {};
  assert.ok(summary && typeof summary === "object" && !Array.isArray(summary));
  assert.ok(summary.aiSupplierSuggestion && typeof summary.aiSupplierSuggestion === "object", "AI supplier proposal persisted for review");
  assert.ok(Array.isArray(summary.aiCommercialConditions) && summary.aiCommercialConditions.length > 0, "AI commercial conditions persisted for review");
  assert.match(await page.locator("main").innerText(), /OPENAI|Interpretazione AI/i);

  console.log(JSON.stringify({
    status: "PASS",
    uiState: "OPENAI",
    provider: job.interpretationProvider,
    externalProcessing: job.externalProcessing,
    model: job.providerModel,
    aiCalls: job.procurementAICalls.length,
    operations: [...new Set(job.procurementAICalls.map((call) => call.operation))],
    successfulCalls: job.procurementAICalls.filter((call) => call.resultState === "SUCCEEDED").length,
    supplierProposal: Boolean(summary.aiSupplierSuggestion),
    commercialConditionCount: summary.aiCommercialConditions.length,
    records: job._count.records,
  }));
} catch (error) {
  const runtimeStatus = await page.locator(".provider-runtime-status").innerText().catch(() => "status unavailable");
  const safeStatus = runtimeStatus.replace(/\s+/g, " ").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 300);
  const safeMessage = (error instanceof Error ? error.message : String(error)).replace(/https?:\/\/\S+/g, "[url]").replace(/\s+/g, " ").slice(0, 400);
  const jobDiagnostic = createdJobId ? await db.importJob.findUnique({
    where: { id: createdJobId },
    select: {
      status: true,
      interpretationProvider: true,
      providerModel: true,
      externalProcessing: true,
      totalRecords: true,
      reviewRequiredRecords: true,
      procurementAICalls: { select: { provider: true, model: true, operation: true, resultState: true, errorCode: true } },
    },
  }).catch(() => null) : null;
  if (process.env.GITHUB_ACTIONS === "true") {
    console.error(`::error title=Procurement AI remote ${checkpoint}::${safeMessage} | UI: ${safeStatus} | DB: ${JSON.stringify(jobDiagnostic)}`);
  }
  throw error;
} finally {
  await browser.close();
  await db.$disconnect();
}
