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

async function open(route) { const response = await page.goto(new URL(route, base), { waitUntil: "networkidle", timeout: 60_000 }); assert.equal(response?.status(), 200, route); await page.locator("main").waitFor(); }
async function switchTo(name) { await open("/"); const select = page.getByLabel(/^(Persona demo|Visualizza come)$/); const value = await select.locator("option").evaluateAll((options, expected) => options.find((option) => option.textContent?.includes(expected))?.value, name); assert.ok(value); await select.selectOption(value); await page.getByText(name, { exact: true }).last().waitFor(); }
async function waitFor(read, predicate, label, timeout = 300_000) { const started = Date.now(); do { const value = await read(); if (predicate(value)) return value; await new Promise((resolve) => setTimeout(resolve, 1000)); } while (Date.now() - started < timeout); assert.fail(`${label} did not converge`); }
const text = (product, suffix, overrides = "") => Buffer.from(`Scheda tecnica\nTitolo: ${marker} ${suffix}\nProduttore: ${product.manufacturer ?? "M12 Industries"}\nCodice produttore: ${product.manufacturerSku}\nMateriale: nitrile\nAQL: 1,5\nSpessore: 0,10 mm\nDimensioni: M\nUso previsto: protezione professionale\nEN 455\nRevisione: 1\n${overrides}`, "utf8");

try {
  checkpoint = "fixture-selection";
  const product = await db.canonicalProduct.findFirstOrThrow({ where: { active: true, manufacturerSku: { not: null }, offers: { some: { active: true, normalizedUnitPrice: { not: null }, supplier: { active: true } } } }, include: { category: true } });
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
  await page.locator('input[name="files"]').setInputFiles({ name: `${marker}-openai.txt`, mimeType: "text/plain", buffer: text(product, "OpenAI classification", "Validità dal: 2026-01-01\nValidità al: 2028-12-31") });
  await page.getByRole("button", { name: "Carica e analizza" }).click();
  const aiBatch = await waitFor(() => db.technicalDocumentBatch.findFirst({ where: { createdAt: { gte: aiStarted }, aiEnabled: true }, orderBy: { createdAt: "desc" } }), (value) => value && ["COMPLETED", "PARTIAL"].includes(value.status), "AI batch");
  const aiCall = await waitFor(() => db.procurementAICall.findFirst({ where: { organizationId: aiBatch.organizationId, operation: "TECHNICAL_DOCUMENT", createdAt: { gte: aiStarted } }, orderBy: { createdAt: "desc" } }), (value) => value?.resultState === "SUCCEEDED", "OpenAI technical call", 180_000);
  assert.equal(aiCall.provider, "OPENAI");

  checkpoint = "authorization";
  await switchTo("Lucia Ferri");
  await open("/technical-documents");
  await page.getByRole("heading", { name: "This view is outside your current role or scope." }).waitFor();
  await switchTo("Giulia Bianchi");
  await open("/technical-documents");
  assert.equal(errors.filter((message) => !/server components/i.test(message)).length, 0, errors.join(" | "));
  console.log(JSON.stringify({ status: "PASS", marker, batch: { total: batch.totalFiles, completed: batch.completedFiles, failed: batch.failedFiles }, associationCount: associations, productTechnicalStatus: state.status, openAI: { provider: aiCall.provider, model: aiCall.model, resultState: aiCall.resultState }, authorization: true }));
} catch (error) {
  const directory = path.join(process.cwd(), "artifacts", "remote-certification"); await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `m12-${checkpoint}.png`), fullPage: true }).catch(() => undefined);
  const safe = (error instanceof Error ? error.message : String(error)).replace(/https?:\/\/\S+/g, "[url]").replace(/\s+/g, " ").slice(0, 600);
  if (process.env.GITHUB_ACTIONS === "true") console.error(`::error title=M12 ${checkpoint}::${safe}`);
  throw error;
} finally {
  await context.close(); await browser.close(); await db.$disconnect();
}
