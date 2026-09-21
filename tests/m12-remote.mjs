import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const required = (name) => { const value = process.env[name]?.trim(); assert.ok(value, `${name} is required`); return value; };
const base = required("QA_BASE_URL"), connectionString = required("DATABASE_URL");
assert.equal(process.env.VERCEL_TARGET, "develop", "M12 certification is develop-only");
assert.equal(process.env.DEMO_MODE, "true", "M12 certification requires DEMO_MODE=true");
assert.match(new URL(base).hostname, /vercel\.app$/i);
const marker = `M12-${process.env.GITHUB_RUN_ID ?? "local"}-${process.env.GITHUB_RUN_ATTEMPT ?? "0"}-${randomUUID().slice(0, 8)}`;
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: headers });
const page = await context.newPage();
const errors = []; let checkpoint = "startup";
page.on("pageerror", (error) => errors.push(error.message.slice(0, 300)));
page.on("console", (message) => { if (message.type() === "error" && !/tree hydrated/i.test(message.text())) errors.push(message.text().slice(0, 300)); });

async function open(route) { const response = await page.goto(new URL(route, base).toString(), { waitUntil: "networkidle", timeout: 60_000 }); assert.equal(response?.status(), 200, route); await page.locator("main").waitFor(); }
async function switchTo(name) { await open("/"); const select = page.getByLabel(/^(Persona demo|Visualizza come)$/); const value = await select.locator("option").evaluateAll((options, expected) => options.find((option) => option.textContent?.includes(expected))?.value, name); assert.ok(value); await select.selectOption(value); await page.getByText(name, { exact: true }).last().waitFor(); }
async function waitFor(read, predicate, label, timeout = 300_000) { const started = Date.now(); do { const value = await read(); if (predicate(value)) return value; await new Promise((resolve) => setTimeout(resolve, 1000)); } while (Date.now() - started < timeout); assert.fail(`${label} did not converge`); }
const text = (product, suffix, overrides = "") => Buffer.from(`Scheda tecnica\nTitolo: ${marker} ${suffix}\nProduttore: ${product.manufacturer ?? "M12 Industries"}\nCodice produttore: ${product.manufacturerSku}\nMateriale: nitrile\nAQL: 1,5\nSpessore: 0,10 mm\nDimensioni: M\nUso previsto: protezione professionale\nEN 455\nRevisione: 1\n${overrides}`, "utf8");

try {
  checkpoint = "fixture-selection";
  const limits = await db.procurementLimit.findMany({ where: { active: true }, select: { canonicalProductId: true, categoryId: true } });
  const excludedProducts = limits.flatMap((limit) => limit.canonicalProductId ? [limit.canonicalProductId] : []);
  const excludedCategories = limits.flatMap((limit) => limit.categoryId ? [limit.categoryId] : []);
  const product = await db.canonicalProduct.findFirstOrThrow({ where: { active: true, id: { notIn: excludedProducts }, categoryId: { notIn: excludedCategories }, manufacturerSku: { not: null }, offers: { some: { active: true, normalizedUnitPrice: { not: null }, supplier: { active: true } } } }, include: { category: true } });
  await switchTo("Giulia Bianchi");

  checkpoint = "large-batch";
  await open("/technical-documents");
  const files = Array.from({ length: 100 }, (_, index) => ({ name: `${marker}-technical-${String(index).padStart(3, "0")}.txt`, mimeType: "text/plain", buffer: text(product, `Documento ${index}`) }));
  await page.locator('input[name="files"]').setInputFiles(files);
  await page.getByLabel(/Usa Procurement AI/).uncheck();
  const started = Date.now();
  await page.getByRole("button", { name: "Carica e analizza" }).click();
  await page.getByText(/Acquisiti|Analizzati|Lotto/).waitFor({ timeout: 30_000 });
  assert.ok(Date.now() - started < 30_000, "the browser receives observable progress promptly");
  const batch = await waitFor(
    () => db.technicalDocumentBatch.findFirst({ where: { createdBy: { name: "Giulia Bianchi" }, createdAt: { gte: new Date(started - 5_000) } }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    (value) => value && ["COMPLETED", "PARTIAL"].includes(value.status) && value.completedFiles + value.failedFiles === 100,
    "100-document durable batch",
  );
  assert.equal(batch.totalFiles, 100);
  assert.equal(batch.items.length, 100);
  assert.equal(batch.failedFiles, 0);
  assert.ok(batch.items.every((item) => ["COMPLETED", "REVIEW_REQUIRED", "NEEDS_OCR"].includes(item.status)));
  assert.equal(new Set(batch.items.map((item) => item.sourceDocumentId)).size, 100, "each file has one source locator");
  assert.ok(batch.items.every((item) => item.attempts === 1), "no duplicate processing");

  checkpoint = "negative-ingestion-matrix";
  await open("/technical-documents");
  const negativeStarted = new Date();
  await page.locator('input[name="files"]').setInputFiles([
    { name: `${marker}-image-only.png`, mimeType: "image/png", buffer: Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from(marker)]) },
    { name: `${marker}-malformed.pdf`, mimeType: "application/pdf", buffer: Buffer.from(`this is not a PDF ${marker}`) },
    { name: `${marker}-duplicate.txt`, mimeType: "text/plain", buffer: files[0].buffer },
  ]);
  await page.getByLabel(/Usa Procurement AI/).uncheck();
  await page.getByRole("button", { name: "Carica e analizza" }).click();
  const negativeBatch = await waitFor(
    () => db.technicalDocumentBatch.findFirst({ where: { createdAt: { gte: negativeStarted } }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    (value) => value && ["PARTIAL", "FAILED"].includes(value.status) && value.items.every((item) => ["FAILED", "NEEDS_OCR", "COMPLETED", "REVIEW_REQUIRED"].includes(item.status)),
    "partial failure batch",
  );
  assert.equal(negativeBatch.totalFiles, 3);
  assert.equal(negativeBatch.items.length, 2, "checksum duplicate does not create another source");
  assert.equal(negativeBatch.items.filter((item) => item.status === "NEEDS_OCR").length, 1, "image-only content requires OCR");
  const failedItem = negativeBatch.items.find((item) => item.status === "FAILED");
  assert.ok(failedItem);
  assert.equal(failedItem.attempts, failedItem.maxAttempts, "transient retry budget is exhausted before surfacing failure");
  await open("/technical-documents");
  await page.getByRole("button", { name: "Riprova elementi falliti" }).first().click();
  const retried = await waitFor(
    () => db.technicalDocumentBatchItem.findUnique({ where: { id: failedItem.id } }),
    (value) => value?.status === "FAILED" && value.attempts === value.maxAttempts,
    "operator retry",
  );
  assert.match(retried.lastError ?? "", /pdf|format|document/i);

  checkpoint = "profile-and-many-to-one";
  const associations = await db.technicalDocumentProductAssociation.count({ where: { canonicalProductId: product.id, technicalDocument: { batchId: batch.id } } });
  assert.equal(associations, 100);
  const state = await db.productTechnicalState.findUnique({ where: { organizationId_canonicalProductId: { organizationId: batch.organizationId, canonicalProductId: product.id } } });
  assert.ok(state);
  await open(`/products/${product.id}`);
  await page.getByText("Evidenze tecniche", { exact: true }).first().waitFor();

  checkpoint = "real-openai";
  await open("/technical-documents");
  const aiStarted = new Date();
  let aiCall;
  for (let attempt = 1; attempt <= 3 && !aiCall; attempt += 1) {
    const attemptStarted = new Date();
    await page.locator('input[name="files"]').setInputFiles({ name: `${marker}-openai-${attempt}.txt`, mimeType: "text/plain", buffer: text(product, `OpenAI classification ${attempt}`, "Valid from: 2026-01-01\nValid until: 2028-12-31") });
    await page.getByRole("button", { name: "Carica e analizza" }).click();
    await waitFor(() => db.technicalDocumentBatch.findFirst({ where: { createdAt: { gte: attemptStarted }, aiEnabled: true }, orderBy: { createdAt: "desc" } }), (value) => value && ["COMPLETED", "PARTIAL"].includes(value.status), `AI batch ${attempt}`);
    const call = await waitFor(() => db.procurementAICall.findFirst({ where: { operation: "TECHNICAL_DOCUMENT", createdAt: { gte: attemptStarted } }, orderBy: { createdAt: "desc" } }), Boolean, `OpenAI invocation ${attempt}`, 180_000);
    if (call.resultState === "SUCCEEDED") aiCall = call;
    else await open("/technical-documents");
  }
  assert.ok(aiCall, `OpenAI did not return a validated result after 3 invocations since ${aiStarted.toISOString()}`);
  assert.equal(aiCall.provider, "OPENAI");

  checkpoint = "authorization";
  await switchTo("Lucia Ferri");
  await open("/technical-documents");
  await page.getByRole("heading", { name: "This view is outside your current role or scope." }).waitFor();
  await switchTo("Giulia Bianchi");
  await open("/technical-documents");
  assert.equal(errors.filter((message) => !/server components/i.test(message)).length, 0, errors.join(" | "));
  console.log(JSON.stringify({ status: "PASS", marker, batch: { total: batch.totalFiles, completed: batch.completedFiles, failed: batch.failedFiles }, negativeBatch: { partialFailure: true, needsOcr: true, duplicate: true, retry: true }, associationCount: associations, productTechnicalStatus: state.status, openAI: { provider: aiCall.provider, model: aiCall.model, resultState: aiCall.resultState }, authorization: true }));
} catch (error) {
  const directory = path.join(process.cwd(), "artifacts", "remote-certification"); await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `m12-${checkpoint}.png`), fullPage: true }).catch(() => undefined);
  const safe = (error instanceof Error ? error.message : String(error)).replace(/https?:\/\/\S+/g, "[url]").replace(/\s+/g, " ").slice(0, 600);
  if (process.env.GITHUB_ACTIONS === "true") console.error(`::error title=M12 ${checkpoint}::${safe}`);
  throw error;
} finally {
  await context.close(); await browser.close(); await db.$disconnect();
}
