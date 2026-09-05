import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const required = (name) => { const value = process.env[name]?.trim(); assert.ok(value, `${name} is required`); return value; };
const base = required("QA_BASE_URL");
const connectionString = required("DATABASE_URL");
assert.equal(process.env.VERCEL_TARGET, "develop", "remote lifecycle certification is develop-only");
assert.equal(process.env.DEMO_MODE, "true", "remote lifecycle certification requires DEMO_MODE=true");
assert.match(new URL(base).hostname, /vercel\.app$/i, "QA_BASE_URL must be an immutable Vercel deployment");

const marker = `M11.5-${process.env.GITHUB_RUN_ID ?? "local"}-${process.env.GITHUB_RUN_ATTEMPT ?? "0"}-${randomUUID().slice(0, 8)}`;
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: headers });
const browserErrors = [];
const createdRequisitionIds = [];
let originalCartLines = [];
let lucia;
let facilityId;
let selectedProduct;
let limitedProduct;
let favoriteBefore = null;
let favoriteProductId = null;
let checkpoint = "startup";

page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("tree hydrated")) browserErrors.push(message.text().slice(0, 300)); });
page.on("pageerror", (error) => browserErrors.push(error.message.slice(0, 300)));

async function open(route, expectedStatus = 200) {
  const response = await page.goto(new URL(route, base).toString(), { waitUntil: "networkidle", timeout: 60_000 });
  assert.equal(response?.status(), expectedStatus, `GET ${route}`);
  if (expectedStatus === 200) await page.locator("main").waitFor();
  return response;
}

async function switchTo(name) {
  await open("/");
  const select = page.getByLabel(/^(Persona demo|Visualizza come)$/);
  const value = await select.locator("option").evaluateAll((options, expected) => options.find((option) => option.textContent?.includes(expected))?.value, name);
  assert.ok(value, `persona ${name}`);
  await select.selectOption(value);
  await page.getByText(name, { exact: true }).last().waitFor();
}

async function assertNoOverflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, `horizontal overflow at ${new URL(page.url()).pathname}`);
}

async function certifyRoutes(name, allowed, denied) {
  await switchTo(name);
  for (const route of allowed) { await open(route); await assertNoOverflow(); }
  for (const route of denied) {
    const response = await page.goto(new URL(route, base).toString(), { waitUntil: "networkidle", timeout: 60_000 });
    assert.ok([200, 404].includes(response?.status() ?? 0), `denied GET ${route} has an explicit response`);
    await page.getByRole("heading", { name: "This view is outside your current role or scope." }).waitFor();
    assert.equal(new URL(page.url()).pathname, route, `denied direct route remains bounded at ${route}`);
  }
}

async function clearCart() {
  const cart = await db.cart.findUnique({ where: { userId_facilityId: { userId: lucia.id, facilityId } }, include: { lines: true } });
  if (!originalCartLines.length && cart) originalCartLines = cart.lines.map(({ canonicalProductId, supplierOfferId, quantity }) => ({ canonicalProductId, supplierOfferId, quantity }));
  if (cart) await db.cartLine.deleteMany({ where: { cartId: cart.id } });
}

async function addSelectedProduct(quantity) {
  await open(`/products/${selectedProduct.id}`);
  const form = page.locator(`form:has(input[name="offerId"][value="${selectedProduct.offer.id}"])`);
  assert.equal(await form.count(), 1, "selected offer is actionable in Product 360");
  await form.locator('input[name="quantity"]').fill(String(quantity));
  await form.getByRole("button", { name: "Aggiungi al carrello" }).click();
  await page.waitForURL(/\/cart\?added=1/, { timeout: 60_000 });
}

async function submitRequest(quantity, scenario) {
  await clearCart();
  await switchTo("Lucia Ferri");
  await addSelectedProduct(quantity);
  await page.reload({ waitUntil: "networkidle" });
  const cartLine = await db.cartLine.findFirst({ where: { cart: { userId: lucia.id, facilityId } }, select: { quantity: true } });
  assert.equal(Number(cartLine?.quantity), quantity, `${scenario}: cart quantity persists`);
  const justification = `${marker} ${scenario}`;
  await page.locator('#checkout-submit textarea[name="justification"]').fill(justification);
  await page.getByRole("button", { name: "Invia richiesta" }).click();
  await page.waitForURL(/\/requisitions\/[^/?]+\?created=1/, { timeout: 60_000 });
  const id = new URL(page.url()).pathname.split("/").at(-1);
  createdRequisitionIds.push(id);
  const request = await db.purchaseRequisition.findUnique({ where: { id }, include: { lines: true, approvals: true, purchaseOrders: { include: { lines: true } } } });
  assert.ok(request, `${scenario}: requisition persisted`);
  assert.equal(request.justification, justification);
  assert.equal(Number(request.lines[0].quantity), quantity);
  await page.reload({ waitUntil: "networkidle" });
  assert.match(await page.locator("main").innerText(), new RegExp(request.requisitionNumber));
  return request;
}

async function decide(approvalId, decision, note = "") {
  await switchTo("Andrea Riva");
  await open(`/approvals/${approvalId}`);
  if (note) await page.locator('#approval-decision textarea[name="note"]').fill(note);
  const labels = { APPROVED: "Approva", REJECTED: "Rifiuta", CLARIFICATION_REQUESTED: "Chiedi chiarimenti" };
  await page.getByRole("button", { name: labels[decision], exact: true }).click();
  await page.waitForURL(/\/approvals\?decision=/, { timeout: 60_000 });
  const approval = await db.approvalRequest.findUniqueOrThrow({ where: { id: approvalId }, include: { requisition: { include: { purchaseOrders: true } } } });
  assert.equal(approval.status, decision);
  return approval;
}

async function receive(poId, mode) {
  await switchTo("Lucia Ferri");
  await open(`/orders/${poId}/receive`);
  const fields = page.locator('input[name^="received-"]');
  assert.ok(await fields.count(), `${mode}: receivable lines`);
  if (mode === "partial") {
    const max = Number(await fields.first().getAttribute("max"));
    assert.ok(max >= 2, "partial receipt needs at least two units");
    await fields.first().fill(String(Math.max(1, Math.floor(max / 2))));
  }
  if (mode === "issue") {
    const fieldset = page.locator("fieldset").first();
    await fieldset.locator("details summary").click();
    await fieldset.locator('select[name^="issue-"]').selectOption("DAMAGED");
    await fieldset.locator('select[name^="severity-"]').selectOption("HIGH");
    await fieldset.locator('input[name^="affected-"]').fill("1");
    await fieldset.locator('input[name^="issueNote-"]').fill(`${marker} collo danneggiato`);
  }
  await page.getByRole("button", { name: "Conferma tutto come ordinato" }).click();
  await page.waitForURL(new RegExp(`/orders/${poId}\\?received=1`), { timeout: 60_000 });
  return db.purchaseOrder.findUniqueOrThrow({ where: { id: poId }, include: { receipts: { include: { lines: { include: { qualityIssues: true } } } }, lines: { include: { receiptLines: true } } } });
}

async function cleanup() {
  if (!lucia || !facilityId) return;
  const requests = await db.purchaseRequisition.findMany({ where: { id: { in: createdRequisitionIds } }, include: { purchaseOrders: { include: { lines: true, receipts: { include: { lines: true } } } } } });
  const poIds = requests.flatMap((request) => request.purchaseOrders.map(({ id }) => id));
  const poLineIds = requests.flatMap((request) => request.purchaseOrders.flatMap((order) => order.lines.map(({ id }) => id)));
  const receiptIds = requests.flatMap((request) => request.purchaseOrders.flatMap((order) => order.receipts.map(({ id }) => id)));
  const receiptLineIds = requests.flatMap((request) => request.purchaseOrders.flatMap((order) => order.receipts.flatMap((receipt) => receipt.lines.map(({ id }) => id))));
  await db.$transaction(async (tx) => {
    if (poLineIds.length || receiptLineIds.length) await tx.qualityIssue.deleteMany({ where: { OR: [{ purchaseOrderLineId: { in: poLineIds } }, { receiptLineId: { in: receiptLineIds } }] } });
    if (receiptIds.length) await tx.receipt.deleteMany({ where: { id: { in: receiptIds } } });
    if (poIds.length) await tx.purchaseOrder.deleteMany({ where: { id: { in: poIds } } });
    if (createdRequisitionIds.length) {
      await tx.auditEvent.deleteMany({ where: { OR: [{ entityId: { in: createdRequisitionIds } }, { entityId: { in: poIds } }, { entityId: { in: poLineIds } }, { entityId: { in: receiptIds } }, { entityId: { in: receiptLineIds } }] } });
      await tx.purchaseRequisition.deleteMany({ where: { id: { in: createdRequisitionIds } } });
    }
    if (favoriteBefore !== null) {
      await tx.favorite.deleteMany({ where: { userId: lucia.id, facilityId, canonicalProductId: favoriteProductId } });
      if (favoriteBefore > 0) await tx.favorite.create({ data: { userId: lucia.id, facilityId, canonicalProductId: favoriteProductId } });
    }
    await tx.shoppingList.deleteMany({ where: { userId: lucia.id, name: { startsWith: marker } } });
    const cart = await tx.cart.upsert({ where: { userId_facilityId: { userId: lucia.id, facilityId } }, create: { userId: lucia.id, facilityId }, update: {} });
    await tx.cartLine.deleteMany({ where: { cartId: cart.id } });
    if (originalCartLines.length) await tx.cartLine.createMany({ data: originalCartLines.map((line) => ({ cartId: cart.id, ...line })) });
  });
}

try {
  checkpoint = "fixture-selection";
  lucia = await db.user.findFirstOrThrow({ where: { name: "Lucia Ferri" }, include: { assignments: { where: { active: true }, take: 1 } } });
  facilityId = lucia.assignments[0].scopeId;
  assert.ok(facilityId && lucia.assignments[0].scopeType === "FACILITY");
  const limits = await db.procurementLimit.findMany({ where: { facilityId, active: true }, select: { canonicalProductId: true, categoryId: true } });
  const excludedProducts = limits.flatMap((limit) => limit.canonicalProductId ? [limit.canonicalProductId] : []);
  const excludedCategories = limits.flatMap((limit) => limit.categoryId ? [limit.categoryId] : []);
  const product = await db.canonicalProduct.findFirstOrThrow({
    where: { active: true, id: { notIn: excludedProducts }, categoryId: { notIn: excludedCategories }, offers: { some: { active: true, preferred: true } } },
    include: { offers: { where: { active: true, preferred: true }, orderBy: { unitPrice: "asc" }, take: 1 } },
    orderBy: { name: "asc" },
  });
  selectedProduct = { id: product.id, offer: product.offers[0] };
  assert.ok(selectedProduct.offer);
  const activeLimit = await db.procurementLimit.findFirstOrThrow({
    where: { facilityId, active: true, periodStart: { lte: new Date() }, periodEnd: { gte: new Date() } },
  });
  const limited = await db.canonicalProduct.findFirstOrThrow({
    where: {
      active: true,
      ...(activeLimit.canonicalProductId ? { id: activeLimit.canonicalProductId } : { categoryId: activeLimit.categoryId ?? undefined }),
      offers: { some: { active: true, preferred: true } },
    },
    include: { offers: { where: { active: true, preferred: true }, take: 1 } },
  });
  limitedProduct = { id: limited.id, offer: limited.offers[0] };
  assert.ok(limitedProduct.offer, "active procurement limit has an actionable preferred offer");

  checkpoint = "persona-routes";
  await certifyRoutes("Lucia Ferri", ["/", "/catalog", `/products/${product.id}`, "/preferiti", "/liste", "/cart", "/richieste", "/orders", "/consegne", "/budget", "/non-conformita"], ["/imports", "/approvals", "/organization"]);
  await certifyRoutes("Andrea Riva", ["/", "/approvals", "/facilities", "/budget", "/consegne", "/non-conformita", `/products/${product.id}`], ["/imports", "/organization", "/cart"]);
  await certifyRoutes("Giulia Bianchi", ["/", "/approvals", "/products", "/categorie", "/suppliers", "/price-lists", "/imports", "/compare", "/orders", "/non-conformita", "/budget"], ["/organization", "/cart"]);
  await certifyRoutes("Marco Villa", ["/", "/organization", "/users", "/deleghe", "/products", "/categorie", "/suppliers", "/imports"], ["/cart", "/approvals", "/orders"]);
  await certifyRoutes("Elena Conti", ["/"], ["/cart", "/approvals", "/imports", "/organization", "/control-tower"]);
  await certifyRoutes("Davide Romano", ["/", "/control-tower"], ["/cart", "/approvals", "/imports", "/organization"]);

  checkpoint = "favorites-and-lists";
  await switchTo("Lucia Ferri");
  await open(`/products/${product.id}`);
  favoriteBefore = await db.favorite.count({ where: { userId: lucia.id, facilityId, canonicalProductId: product.id } });
  favoriteProductId = product.id;
  await page.getByRole("button", { name: favoriteBefore ? "Salvato nei preferiti" : "Salva nei preferiti" }).click();
  await page.waitForLoadState("networkidle");
  assert.notEqual(await db.favorite.count({ where: { userId: lucia.id, facilityId, canonicalProductId: product.id } }), favoriteBefore);
  await open("/liste");
  await page.getByText("Nuova lista", { exact: true }).click();
  await page.locator('.phase2-create-popover input[name="name"]').fill(`${marker} riordino`);
  await page.locator(".phase2-create-popover form").getByRole("button", { name: "Crea lista" }).click();
  await page.waitForURL(/\/liste\/[^/?]+\?creata=1/, { timeout: 60_000 });
  const listId = new URL(page.url()).pathname.split("/").at(-1);
  assert.ok(await db.shoppingList.findUnique({ where: { id: listId } }));
  await open(`/products/${product.id}`);
  await page.getByRole("button", { name: `Altre azioni per ${product.name}` }).click();
  await page.getByRole("button", { name: `${marker} riordino`, exact: true }).click();
  await page.waitForLoadState("networkidle");
  assert.equal(await db.shoppingListItem.count({ where: { shoppingListId: listId, canonicalProductId: product.id } }), 1);

  const unitGross = Number(selectedProduct.offer.unitPrice) * (1 + Number(selectedProduct.offer.taxRate) / 100);
  const autoQuantity = Math.max(2, Number(selectedProduct.offer.moq));
  const approvalQuantity = Math.max(autoQuantity, Math.ceil(16_000 / unitGross));

  checkpoint = "auto-approved";
  const auto = await submitRequest(autoQuantity, "AUTO");
  assert.equal(auto.policyDecision, "AUTO_APPROVE");
  assert.equal(auto.status, "APPROVED");
  assert.ok(auto.purchaseOrders.length);
  const autoReceived = await receive(auto.purchaseOrders[0].id, "full");
  assert.equal(autoReceived.status, "RECEIVED");

  checkpoint = "approval-required";
  const approvalRequest = await submitRequest(approvalQuantity, "APPROVE");
  assert.equal(approvalRequest.policyDecision, "AREA_MANAGER_APPROVAL");
  assert.equal(approvalRequest.approvals[0].approverUserId, (await db.user.findFirstOrThrow({ where: { name: "Andrea Riva" } })).id);
  const approved = await decide(approvalRequest.approvals[0].id, "APPROVED");
  assert.equal(approved.requisition.status, "APPROVED");
  assert.ok(approved.requisition.purchaseOrders.length);

  checkpoint = "partial-receipt";
  let partial = await receive(approved.requisition.purchaseOrders[0].id, "partial");
  assert.equal(partial.status, "PARTIALLY_RECEIVED");
  partial = await receive(partial.id, "full");
  assert.equal(partial.status, "RECEIVED");

  checkpoint = "clarification";
  const clarificationRequest = await submitRequest(approvalQuantity, "CLARIFY");
  await decide(clarificationRequest.approvals[0].id, "CLARIFICATION_REQUESTED", `${marker} specificare fabbisogno`);
  await switchTo("Lucia Ferri");
  await open(`/requisitions/${clarificationRequest.id}`);
  await page.locator('textarea[name="answer"]').fill(`${marker} fabbisogno confermato`);
  await page.getByRole("button", { name: "Rispondi e reinvia" }).click();
  await page.waitForURL(/clarification=answered/, { timeout: 60_000 });
  const clarified = await db.purchaseRequisition.findUniqueOrThrow({ where: { id: clarificationRequest.id }, include: { approvals: { orderBy: { requestedAt: "desc" } } } });
  assert.equal(clarified.status, "PENDING_APPROVAL");
  assert.equal(clarified.approvals[0].status, "PENDING");
  const clarificationApproved = await decide(clarified.approvals[0].id, "APPROVED");

  checkpoint = "receipt-issue";
  const issueOrder = clarificationApproved.requisition.purchaseOrders[0];
  assert.ok(issueOrder);
  const withIssue = await receive(issueOrder.id, "issue");
  assert.equal(withIssue.status, "ISSUE");
  assert.ok(withIssue.receipts.flatMap((receipt) => receipt.lines.flatMap((line) => line.qualityIssues)).length);

  checkpoint = "rejection";
  const rejectionRequest = await submitRequest(approvalQuantity, "REJECT");
  const rejected = await decide(rejectionRequest.approvals[0].id, "REJECTED", `${marker} motivazione insufficiente`);
  assert.equal(rejected.requisition.status, "REJECTED");
  assert.equal(rejected.requisition.purchaseOrders.length, 0);

  checkpoint = "procurement-limit-boundary";
  const regularProduct = selectedProduct;
  selectedProduct = limitedProduct;
  const boundaryRequest = await submitRequest(1_000_000, "LIMIT");
  selectedProduct = regularProduct;
  assert.equal(boundaryRequest.policyDecision, "PROCUREMENT_APPROVAL");
  assert.match(boundaryRequest.policyExplanation, /limite operativo/i);
  assert.ok(boundaryRequest.approvals.length, "limit exception creates a governed approval request");

  checkpoint = "analytics";
  await switchTo("Giulia Bianchi");
  for (const route of ["/", "/suppliers", "/categorie", `/products/${product.id}`, "/compare", "/non-conformita"]) { await open(route); await assertNoOverflow(); }
  await switchTo("Davide Romano"); await open("/control-tower"); await assertNoOverflow();
  await switchTo("Elena Conti"); await open("/"); assert.match(await page.locator("main").innerText(), /riconciliazione fatture.*non sono ancora operativi/is);

  checkpoint = "responsive-runtime";
  await page.setViewportSize({ width: 1920, height: 1080 });
  await switchTo("Lucia Ferri"); await open("/catalog"); await assertNoOverflow();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/catalog", "/preferiti", "/liste", "/cart", "/richieste", "/orders", "/consegne", "/non-conformita"]) { await open(route); await assertNoOverflow(); }
  await switchTo("Andrea Riva"); await open("/approvals"); await assertNoOverflow();

  assert.deepEqual(browserErrors, [], browserErrors.join(" | "));
  console.log(JSON.stringify({ status: "PASS", marker, personas: 6, lifecycle: { autoApproval: true, approval: true, clarification: true, rejection: true, partialReceipt: true, nonconformity: true }, views: { product: true, supplier: true, category: true, controlCenter: true, executive: true, financeReadOnly: true } }));
} catch (error) {
  const directory = path.join(process.cwd(), "artifacts", "remote-certification");
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, "procurement-lifecycle-failure.png"), fullPage: true }).catch(() => undefined);
  const safe = (error instanceof Error ? error.message : String(error)).replace(/https?:\/\/\S+/g, "[url]").replace(/\s+/g, " ").slice(0, 600);
  if (process.env.GITHUB_ACTIONS === "true") console.error(`::error title=Remote lifecycle ${checkpoint}::${safe}`);
  throw error;
} finally {
  await cleanup().catch((error) => console.error("REMOTE_LIFECYCLE_CLEANUP_FAILED", error instanceof Error ? error.name : "unknown"));
  await browser.close();
  await db.$disconnect();
}
