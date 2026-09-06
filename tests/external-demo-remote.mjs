import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const required = (name) => { const value = process.env[name]?.trim(); assert.ok(value, `${name} is required`); return value; };
const base = required("QA_BASE_URL"), connectionString = required("DATABASE_URL");
assert.equal(process.env.VERCEL_TARGET, "develop", "external-demo certification is develop-only");
assert.equal(process.env.DEMO_MODE, "true", "external-demo certification requires DEMO_MODE=true");
assert.match(new URL(base).hostname, /vercel\.app$/i, "QA_BASE_URL must be an immutable Vercel deployment");

const marker = `M11.6-${process.env.GITHUB_RUN_ID ?? "local"}-${process.env.GITHUB_RUN_ATTEMPT ?? "0"}-${randomUUID().slice(0, 8)}`;
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: headers });
const browserErrors = [];
let checkpoint = "startup", warningBudgetId, createdRequestId;
page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("tree hydrated")) browserErrors.push(message.text().slice(0, 300)); });
page.on("pageerror", (error) => browserErrors.push(error.message.slice(0, 300)));

async function open(route) {
  const response = await page.goto(new URL(route, base).toString(), { waitUntil: "networkidle", timeout: 60_000 });
  assert.equal(response?.status(), 200, `GET ${route}`);
  await page.locator("main").waitFor();
}
async function switchTo(name) {
  await open("/");
  const select = page.getByLabel(/^(Persona demo|Visualizza come)$/);
  const value = await select.locator("option").evaluateAll((options, expected) => options.find((option) => option.textContent?.includes(expected))?.value, name);
  assert.ok(value, `persona ${name}`);
  await select.selectOption(value);
  await page.getByText(name, { exact: true }).last().waitFor();
}
async function waitForDb(read, predicate, label, timeoutMs = 20_000) {
  const started = Date.now(); let value;
  do { value = await read(); if (predicate(value)) return value; await new Promise((resolve) => setTimeout(resolve, 250)); } while (Date.now() - started < timeoutMs);
  assert.fail(`${label}: state did not converge`);
}

try {
  checkpoint = "fixtures";
  const lucia = await db.user.findFirstOrThrow({ where: { name: "Lucia Ferri" }, include: { assignments: { where: { active: true }, take: 1 } } });
  const facilityId = lucia.assignments[0].scopeId;
  assert.ok(facilityId && lucia.assignments[0].scopeType === "FACILITY");
  const limits = await db.procurementLimit.findMany({ where: { facilityId, active: true }, select: { canonicalProductId: true, categoryId: true } });
  const product = await db.canonicalProduct.findFirstOrThrow({ where: { active: true, id: { notIn: limits.flatMap((limit) => limit.canonicalProductId ? [limit.canonicalProductId] : []) }, categoryId: { notIn: limits.flatMap((limit) => limit.categoryId ? [limit.categoryId] : []) }, offers: { some: { active: true, preferred: true } } }, include: { offers: { where: { active: true, preferred: true }, orderBy: { unitPrice: "asc" }, take: 1 } }, orderBy: { name: "asc" } });
  const offer = product.offers[0]; assert.ok(offer);
  const cart = await db.cart.upsert({ where: { userId_facilityId: { userId: lucia.id, facilityId } }, create: { userId: lucia.id, facilityId }, update: {} });
  await db.cartLine.deleteMany({ where: { cartId: cart.id } });

  checkpoint = "budget-warning";
  const current = new Date(), budget = await db.budget.findFirstOrThrow({ where: { facilityId, status: "ACTIVE", periodStart: { lte: current }, periodEnd: { gte: current } } });
  warningBudgetId = randomUUID();
  await db.budget.create({ data: { id: warningBudgetId, organizationId: budget.organizationId, facilityId, periodStart: budget.periodStart, periodEnd: budget.periodEnd, approvedAmount: 1000000, actualAmount: 1000000, status: "ACTIVE" } });
  await switchTo("Lucia Ferri");
  await open(`/products/${product.id}`);
  const buy = page.locator(`form:has(input[name="offerId"][value="${offer.id}"])`);
  await buy.locator('input[name="quantity"]').fill(String(Math.max(2, Number(offer.moq))));
  await buy.getByRole("button", { name: "Aggiungi al carrello" }).click();
  await waitForDb(() => db.cartLine.count({ where: { cartId: cart.id } }), (count) => count === 1, "cart add");
  await open("/cart");
  await page.locator('#checkout-submit textarea[name="justification"]').fill("Riordino programmato per continuità assistenziale");
  await page.getByRole("button", { name: "Invia richiesta" }).click();
  await page.waitForURL(/\/requisitions\/[^/?]+\?created=1/, { timeout: 60_000 });
  createdRequestId = new URL(page.url()).pathname.split("/").at(-1);
  const request = await db.purchaseRequisition.findUniqueOrThrow({ where: { id: createdRequestId }, include: { purchaseOrders: true } });
  const evaluation = request.policyEvaluation;
  assert.ok(Array.isArray(evaluation.rules) && evaluation.rules.includes("BUDGET_WARNING"), "warning is persisted in policy evaluation");
  assert.notEqual(request.policyDecision, "PROCUREMENT_APPROVAL", "budget warning does not block the request");
  await db.budget.delete({ where: { id: warningBudgetId } }); warningBudgetId = undefined;
  assert.ok(request.purchaseOrders.length, "warning request continues to a purchase order");

  checkpoint = "invalid-attachment";
  const poId = request.purchaseOrders[0].id;
  await open(`/orders/${poId}/receive`);
  const beforeReceipts = await db.receipt.count({ where: { purchaseOrderId: poId } });
  await page.locator('input[name="receiptAttachments"]').setInputFiles({ name: "allegato-non-valido.exe", mimeType: "application/octet-stream", buffer: Buffer.from("not executable") });
  await page.getByRole("button", { name: "Conferma tutto come ordinato" }).click();
  await page.waitForURL(new RegExp(`/orders/${poId}/receive\\?error=invalid-attachment`), { timeout: 60_000 });
  await page.getByRole("alert").getByText(/Allegato non valido/).waitFor();
  assert.equal(await db.receipt.count({ where: { purchaseOrderId: poId } }), beforeReceipts, "invalid upload creates no receipt");
  assert.equal(await db.operationalAttachment.count({ where: { receipt: { purchaseOrderId: poId } } }), 0, "invalid upload creates no attachment locator");

  checkpoint = "valid-attachments";
  await open(`/orders/${poId}/receive`);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  await page.locator('input[name="receiptAttachments"]').setInputFiles([
    { name: "documento-consegna.png", mimeType: "image/png", buffer: png },
    { name: "documento-consegna.png", mimeType: "image/png", buffer: png },
  ]);
  const fieldset = page.locator("fieldset").first();
  await fieldset.locator("details summary").click();
  await fieldset.locator('select[name^="issue-"]').selectOption("DAMAGED");
  await fieldset.locator('select[name^="severity-"]').selectOption("MEDIUM");
  await fieldset.locator('input[name^="affected-"]').fill("1");
  await fieldset.locator('input[name^="issueNote-"]').fill("Imballo danneggiato alla consegna");
  await fieldset.locator('input[name^="issueAttachments-"]').setInputFiles({ name: "evidenza-non-conformita.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Conferma tutto come ordinato" }).click();
  await page.waitForURL(new RegExp(`/orders/${poId}\\?received=1`), { timeout: 60_000 });
  const receipt = await db.receipt.findFirstOrThrow({ where: { purchaseOrderId: poId }, orderBy: { receivedAt: "desc" }, include: { attachments: true, lines: { include: { qualityIssues: { include: { attachments: true } } } } } });
  assert.equal(receipt.attachments.length, 2, "duplicate evidence is stored as two explicit immutable uploads");
  assert.ok(receipt.attachments.every((item) => item.storageProvider === "supabase" && item.storageObjectKey && item.checksum), "receipt locators are cloud-backed");
  const issue = receipt.lines.flatMap((line) => line.qualityIssues)[0]; assert.ok(issue);
  assert.equal(issue.attachments.length, 1, "NC evidence linked");
  assert.equal(issue.attachments[0].storageProvider, "supabase");
  await open(`/orders/${poId}?tab=documents`);
  await page.getByText("documento-consegna.png", { exact: true }).first().waitFor();
  const attachmentResponse = await page.request.get(new URL(`/attachments/${receipt.attachments[0].id}`, base).toString(), { headers });
  assert.equal(attachmentResponse.status(), 200, "authorized attachment readback");
  assert.equal(Buffer.compare(Buffer.from(await attachmentResponse.body()), png), 0, "downloaded evidence bytes match");

  checkpoint = "admin-read-only";
  await switchTo("Marco Villa");
  for (const route of ["/organization", "/users", "/deleghe", "/suppliers", "/products", "/categorie"]) {
    await open(route);
    assert.equal(await page.locator('button:has-text("Crea"), button:has-text("Elimina"), button:has-text("Salva")').count(), 0, `${route} honestly exposes no unsupported CRUD`);
  }

  checkpoint = "negative-boundaries";
  await switchTo("Lucia Ferri");
  await open("/cart");
  assert.equal(await page.getByRole("button", { name: "Invia richiesta" }).count(), 0, "empty cart cannot be submitted");
  await open(`/orders/${poId}/receive`);
  await page.getByRole("heading", { name: "This view is outside your current role or scope." }).waitFor();
  const missing = await page.goto(new URL(`/orders/${randomUUID()}`, base).toString(), { waitUntil: "networkidle" });
  assert.ok([200, 404].includes(missing?.status() ?? 0));
  await page.getByRole("heading", { name: "This view is outside your current role or scope." }).waitFor();
  await switchTo("Davide Romano");
  await open("/cart");
  await page.getByRole("heading", { name: "This view is outside your current role or scope." }).waitFor();

  const criticalErrors = browserErrors.filter((message) => !/Unsupported file type|not valid|server components/i.test(message));
  assert.deepEqual(criticalErrors, [], criticalErrors.join(" | "));
  console.log(JSON.stringify({ status: "PASS", marker, attachment: { receipt: 2, nonconformity: 1, readback: true }, admin: "READ_ONLY_HONEST", budgetWarning: true, negative: { invalidAttachment: true, emptyCart: true, repeatedReceipt: true, invalidId: true, unauthorizedRoute: true } }));
} catch (error) {
  const directory = path.join(process.cwd(), "artifacts", "remote-certification"); await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, "external-demo-failure.png"), fullPage: true }).catch(() => undefined);
  const safe = (error instanceof Error ? error.message : String(error)).replace(/https?:\/\/\S+/g, "[url]").replace(/\s+/g, " ").slice(0, 600);
  if (process.env.GITHUB_ACTIONS === "true") console.error(`::error title=External demo ${checkpoint}::${safe}`);
  throw error;
} finally {
  if (warningBudgetId) await db.budget.deleteMany({ where: { id: warningBudgetId } }).catch(() => undefined);
  await browser.close(); await db.$disconnect();
}
