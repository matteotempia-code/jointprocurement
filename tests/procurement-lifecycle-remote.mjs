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
const databaseTarget = new URL(connectionString);
const databaseProjectRef = /^postgres\.([a-z0-9]+)$/.exec(decodeURIComponent(databaseTarget.username))?.[1] ?? "unknown";
console.log(JSON.stringify({ status: "DATABASE_TARGET", connectionSource: "DATABASE_URL", projectRef: databaseProjectRef }));
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
const FIXTURE = Object.freeze({
  prefix: "CERT-M11-LIFECYCLE",
  categoryId: "cert_m11_lifecycle_category",
  supplierId: "cert_m11_lifecycle_supplier",
  priceListId: "cert_m11_lifecycle_price_list",
  normalProductId: "cert_m11_lifecycle_product_normal",
  limitedProductId: "cert_m11_lifecycle_product_limited",
  normalOfferId: "cert_m11_lifecycle_offer_normal",
  limitedOfferId: "cert_m11_lifecycle_offer_limited",
  limitId: "cert_m11_lifecycle_limit",
});
let originalCartLines = [];
let lucia;
let facilityId;
let selectedProduct;
let limitedProduct;
let favoriteBefore = null;
let favoriteProductId = null;
let checkpoint = "startup";
let lastActionStatus = 0;
let lastActionFailure = "none";

page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("tree hydrated")) browserErrors.push(message.text().slice(0, 300)); });
page.on("pageerror", (error) => browserErrors.push(error.message.slice(0, 300)));
page.on("response", (response) => {
  if (response.request().method() === "POST" && new URL(response.url()).origin === new URL(base).origin) lastActionStatus = response.status();
});
page.on("requestfailed", (request) => {
  if (request.method() === "POST" && new URL(request.url()).origin === new URL(base).origin) lastActionFailure = request.failure()?.errorText?.replace(/[^A-Za-z0-9_. -]/g, "").slice(0, 80) || "unknown";
});

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
  const action = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).origin === new URL(base).origin);
  await select.selectOption(value);
  const response = await action;
  assert.ok(response.ok(), `persona ${name}: switch action`);
  await page.waitForLoadState("networkidle");
  await page.locator(".identity b", { hasText: name }).waitFor();
}

async function assertNoOverflow() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false, `horizontal overflow at ${new URL(page.url()).pathname}`);
}

async function waitForDb(read, predicate, label, timeoutMs = 15_000) {
  const started = Date.now();
  let value;
  do {
    value = await read();
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() - started < timeoutMs);
  assert.fail(`${label}: persisted state did not converge (last=${JSON.stringify(value)})`);
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

async function ensureLifecycleFixtures(organizationId, userId) {
  const category = await db.category.upsert({
    where: { code: FIXTURE.prefix },
    create: { id: FIXTURE.categoryId, code: FIXTURE.prefix, name: "Certification lifecycle category" },
    update: { name: "Certification lifecycle category" },
  });
  await db.technicalEvidenceRequirement.upsert({
    where: { organizationId_categoryId_requirementType_label: { organizationId, categoryId: category.id, requirementType: "DOCUMENT", label: "CERT M11 technical sheet" } },
    create: { organizationId, categoryId: category.id, requirementType: "DOCUMENT", documentType: "TECHNICAL_SHEET", label: "CERT M11 technical sheet", required: true, validityRequired: true, active: true },
    update: { documentType: "TECHNICAL_SHEET", required: true, validityRequired: true, active: true },
  });
  const supplier = await db.supplier.upsert({
    where: { vatNumber: "ITCERTM110000001" },
    create: { id: FIXTURE.supplierId, name: "CERT M11 Lifecycle Supplier", vatNumber: "ITCERTM110000001", active: true },
    update: { name: "CERT M11 Lifecycle Supplier", active: true },
  });
  await db.priceList.upsert({
    where: { id: FIXTURE.priceListId },
    create: { id: FIXTURE.priceListId, name: "CERT M11 Lifecycle Price List", supplierId: supplier.id, active: true, version: 1, publishedByUserId: userId, publishedAt: new Date() },
    update: { supplierId: supplier.id, active: true, publishedByUserId: userId },
  });
  const products = [
    { id: FIXTURE.normalProductId, name: "CERT M11 Normal Product", sku: "CERT-M11-NORMAL", ean: "9900000000011", offerId: FIXTURE.normalOfferId, price: 12 },
    { id: FIXTURE.limitedProductId, name: "CERT M11 Limited Product", sku: "CERT-M11-LIMITED", ean: "9900000000028", offerId: FIXTURE.limitedOfferId, price: 15 },
  ];
  for (const fixture of products) {
    await db.canonicalProduct.upsert({
      where: { id: fixture.id },
      create: { id: fixture.id, name: fixture.name, description: `${FIXTURE.prefix} deterministic fixture`, manufacturer: "Certification Industries", manufacturerSku: fixture.sku, ean: fixture.ean, uom: "EA", purchaseUom: "PACK", unitsPerPackage: 1, categoryId: category.id, active: true },
      update: { name: fixture.name, categoryId: category.id, manufacturer: "Certification Industries", manufacturerSku: fixture.sku, ean: fixture.ean, active: true },
    });
    await db.supplierOffer.upsert({
      where: { id: fixture.offerId },
      create: { id: fixture.offerId, supplierId: supplier.id, canonicalProductId: fixture.id, priceListId: FIXTURE.priceListId, supplierSku: fixture.sku, unitPrice: fixture.price, normalizedUnitPrice: fixture.price, moq: 1, taxRate: 22, preferred: true, active: true, availabilityStatus: "IN_STOCK" },
      update: { supplierId: supplier.id, canonicalProductId: fixture.id, priceListId: FIXTURE.priceListId, unitPrice: fixture.price, normalizedUnitPrice: fixture.price, moq: 1, preferred: true, active: true, availabilityStatus: "IN_STOCK" },
    });
    const sourceId = `${fixture.id}_source`, documentId = `${fixture.id}_document`, versionId = `${fixture.id}_version`;
    await db.sourceDocument.upsert({
      where: { id: sourceId },
      create: { id: sourceId, organizationId, uploadedByUserId: userId, originalFilename: `${fixture.sku}.txt`, mimeType: "text/plain", fileSize: 128, checksum: `${fixture.id}_sha256`, sourceType: "TXT", documentKind: "OTHER", storagePath: `certification/${fixture.sku}.txt`, storageProvider: "fixture", status: "PROCESSED", metadata: { certificationFixture: FIXTURE.prefix } },
      update: { organizationId, uploadedByUserId: userId, status: "PROCESSED", metadata: { certificationFixture: FIXTURE.prefix } },
    });
    await db.technicalDocument.upsert({
      where: { id: documentId },
      create: { id: documentId, organizationId, familyKey: fixture.sku.toLowerCase(), documentType: "TECHNICAL_SHEET", title: `${fixture.name} technical sheet`, manufacturer: "Certification Industries", status: "READY" },
      update: { organizationId, documentType: "TECHNICAL_SHEET", status: "READY" },
    });
    await db.technicalDocumentVersion.upsert({
      where: { id: versionId },
      create: { id: versionId, technicalDocumentId: documentId, sourceDocumentId: sourceId, versionNumber: 1, revision: "CERT-1", validFrom: new Date("2020-01-01T00:00:00Z"), validUntil: new Date("2100-01-01T00:00:00Z"), checksum: `${fixture.id}_sha256`, extractedMetadata: { certificationFixture: FIXTURE.prefix, manufacturerSku: fixture.sku }, interpretationProvider: "CERTIFICATION_FIXTURE", confidence: 1, status: "READY" },
      update: { validUntil: new Date("2100-01-01T00:00:00Z"), status: "READY" },
    });
    await db.technicalDocument.update({ where: { id: documentId }, data: { currentVersionId: versionId } });
    await db.technicalDocumentProductAssociation.upsert({
      where: { technicalDocumentId_canonicalProductId: { technicalDocumentId: documentId, canonicalProductId: fixture.id } },
      create: { technicalDocumentId: documentId, canonicalProductId: fixture.id, associationType: "MANUFACTURER_SKU_EXACT", confidence: 1, status: "MANUALLY_CONFIRMED", evidence: [`SKU ${fixture.sku}`, FIXTURE.prefix], explanation: "Dedicated certification evidence", decisionSource: "CERTIFICATION_FIXTURE", confirmedByUserId: userId, confirmedAt: new Date() },
      update: { confidence: 1, status: "MANUALLY_CONFIRMED", confirmedByUserId: userId, confirmedAt: new Date(), rejectedAt: null },
    });
    await db.productTechnicalState.upsert({
      where: { organizationId_canonicalProductId: { organizationId, canonicalProductId: fixture.id } },
      create: { organizationId, canonicalProductId: fixture.id, status: "COMPLETE", completenessPercent: 100, evidenceFingerprint: `${FIXTURE.prefix}:${fixture.id}:CERT-1` },
      update: { status: "COMPLETE", completenessPercent: 100, missingCount: 0, conflictCount: 0, expiredCount: 0, evaluatedAt: new Date(), evidenceFingerprint: `${FIXTURE.prefix}:${fixture.id}:CERT-1` },
    });
  }
  await db.procurementLimit.upsert({
    where: { id: FIXTURE.limitId },
    create: { id: FIXTURE.limitId, organizationId, facilityId, canonicalProductId: FIXTURE.limitedProductId, limitType: "QUANTITY", periodStart: new Date("2020-01-01T00:00:00Z"), periodEnd: new Date("2100-01-01T00:00:00Z"), maximumQuantity: 1, quantityUom: "EA", active: true },
    update: { organizationId, facilityId, canonicalProductId: FIXTURE.limitedProductId, categoryId: null, limitType: "QUANTITY", periodStart: new Date("2020-01-01T00:00:00Z"), periodEnd: new Date("2100-01-01T00:00:00Z"), maximumQuantity: 1, active: true },
  });
}

async function addSelectedProduct(quantity) {
  await open(`/products/${selectedProduct.id}`);
  const form = page.locator(`form:has(input[name="offerId"][value="${selectedProduct.offer.id}"])`);
  assert.equal(await form.count(), 1, "selected offer is actionable in Product 360");
  await form.locator('input[name="quantity"]').fill(String(quantity));
  await form.getByRole("button", { name: "Aggiungi al carrello" }).click();
  await waitForDb(
    () => db.cartLine.findFirst({ where: { cart: { userId: lucia.id, facilityId }, supplierOfferId: selectedProduct.offer.id }, select: { quantity: true } }),
    (line) => Number(line?.quantity) === quantity,
    "cart add",
  );
  await open("/cart");
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
  const requests = await db.purchaseRequisition.findMany({ where: { OR: [{ id: { in: createdRequisitionIds } }, { justification: { startsWith: marker } }] }, include: { purchaseOrders: { include: { lines: true, receipts: { include: { lines: true } } } } } });
  const requestIds = requests.map(({ id }) => id);
  const poIds = requests.flatMap((request) => request.purchaseOrders.map(({ id }) => id));
  const poLineIds = requests.flatMap((request) => request.purchaseOrders.flatMap((order) => order.lines.map(({ id }) => id)));
  const receiptIds = requests.flatMap((request) => request.purchaseOrders.flatMap((order) => order.receipts.map(({ id }) => id)));
  const receiptLineIds = requests.flatMap((request) => request.purchaseOrders.flatMap((order) => order.receipts.flatMap((receipt) => receipt.lines.map(({ id }) => id))));
  await db.$transaction(async (tx) => {
    if (poLineIds.length || receiptLineIds.length) await tx.qualityIssue.deleteMany({ where: { OR: [{ purchaseOrderLineId: { in: poLineIds } }, { receiptLineId: { in: receiptLineIds } }] } });
    if (receiptIds.length) await tx.receipt.deleteMany({ where: { id: { in: receiptIds } } });
    if (poIds.length) await tx.purchaseOrder.deleteMany({ where: { id: { in: poIds } } });
    if (requestIds.length) {
      await tx.auditEvent.deleteMany({ where: { OR: [{ entityId: { in: requestIds } }, { entityId: { in: poIds } }, { entityId: { in: poLineIds } }, { entityId: { in: receiptIds } }, { entityId: { in: receiptLineIds } }] } });
      await tx.purchaseRequisition.deleteMany({ where: { id: { in: requestIds } } });
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
  lucia = await db.user.findFirstOrThrow({ where: { name: "Lucia Ferri" }, include: { assignments: { where: { active: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 1 } } });
  facilityId = lucia.assignments[0].scopeId;
  assert.ok(facilityId && lucia.assignments[0].scopeType === "FACILITY");
  const organizationId = lucia.assignments[0].organizationId;
  await ensureLifecycleFixtures(organizationId, lucia.id);
  const [normalTechnicalState, limitedTechnicalState, normalLimitCount] = await Promise.all([
    db.productTechnicalState.findUnique({ where: { organizationId_canonicalProductId: { organizationId, canonicalProductId: FIXTURE.normalProductId } } }),
    db.productTechnicalState.findUnique({ where: { organizationId_canonicalProductId: { organizationId, canonicalProductId: FIXTURE.limitedProductId } } }),
    db.procurementLimit.count({
      where: {
        organizationId,
        facilityId,
        active: true,
        periodStart: { lte: new Date() },
        periodEnd: { gte: new Date() },
        OR: [{ canonicalProductId: FIXTURE.normalProductId }, { categoryId: FIXTURE.categoryId }],
      },
    }),
  ]);
  assert.equal(normalTechnicalState?.status, "COMPLETE");
  assert.equal(limitedTechnicalState?.status, "COMPLETE");
  assert.equal(normalLimitCount, 0);
  const technicallyPurchasable = { none: { organizationId: lucia.assignments[0].organizationId, status: { not: "COMPLETE" } } };
  const product = await db.canonicalProduct.findFirstOrThrow({
    where: { id: FIXTURE.normalProductId, active: true, technicalStates: technicallyPurchasable, procurementLimits: { none: { facilityId, active: true, periodStart: { lte: new Date() }, periodEnd: { gte: new Date() } } }, offers: { some: { id: FIXTURE.normalOfferId, active: true, preferred: true } } },
    include: { offers: { where: { active: true, preferred: true }, orderBy: { unitPrice: "asc" }, take: 1 } },
    orderBy: { name: "asc" },
  });
  selectedProduct = { id: product.id, offer: product.offers[0] };
  assert.ok(selectedProduct.offer);
  const activeLimit = await db.procurementLimit.findFirstOrThrow({
    where: { id: FIXTURE.limitId, organizationId, facilityId, canonicalProductId: FIXTURE.limitedProductId, active: true, periodStart: { lte: new Date() }, periodEnd: { gte: new Date() } },
  });
  assert.equal(activeLimit.canonicalProductId, FIXTURE.limitedProductId);
  const limited = await db.canonicalProduct.findFirstOrThrow({
    where: {
      active: true,
      technicalStates: technicallyPurchasable,
      id: FIXTURE.limitedProductId,
      procurementLimits: { some: { id: activeLimit.id, facilityId, active: true } },
      offers: { some: { id: FIXTURE.limitedOfferId, active: true, preferred: true } },
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
  checkpoint = "favorites-product-open";
  await open(`/products/${product.id}`);
  await page.getByRole("heading", { name: product.name, exact: true }).waitFor();
  checkpoint = "favorites-toggle";
  favoriteBefore = await db.favorite.count({ where: { userId: lucia.id, facilityId, canonicalProductId: product.id } });
  favoriteProductId = product.id;
  lastActionStatus = 0;
  lastActionFailure = "none";
  const favoriteAction = page.getByRole("button", { name: /preferiti/i });
  assert.equal(await favoriteAction.count(), 1, "Product 360 exposes one favorite action for the active scope");
  await favoriteAction.click();
  await waitForDb(
    () => db.favorite.count({ where: { userId: lucia.id, facilityId, canonicalProductId: product.id } }),
    (count) => count !== favoriteBefore,
    "favorite toggle",
  );
  checkpoint = "lists-index-open";
  await open("/liste");
  checkpoint = "lists-create-open";
  await page.getByText("Nuova lista", { exact: true }).click();
  await page.locator('.phase2-create-popover input[name="name"]').fill(`${marker} riordino`);
  checkpoint = "lists-create-submit";
  await page.locator(".phase2-create-popover form").getByRole("button", { name: "Crea lista" }).click();
  await page.waitForURL(/\/liste\/[^/?]+\?creata=1/, { timeout: 60_000 });
  const listId = new URL(page.url()).pathname.split("/").at(-1);
  assert.ok(await db.shoppingList.findUnique({ where: { id: listId } }));
  checkpoint = "lists-product-reopen";
  await open(`/products/${product.id}`);
  checkpoint = "lists-product-menu";
  await page.getByLabel(`Altre azioni per ${product.name}`, { exact: true }).click();
  checkpoint = "lists-add-product";
  await page.getByRole("button", { name: `${marker} riordino`, exact: true }).click();
  await waitForDb(
    () => db.shoppingListItem.count({ where: { shoppingListId: listId, canonicalProductId: product.id } }),
    (count) => count === 1,
    "shopping-list item",
  );

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
  const correlated = await db.purchaseRequisition.findFirst({ where: { justification: { startsWith: marker } }, orderBy: { createdAt: "desc" }, select: { _count: { select: { approvals: true, purchaseOrders: true } } } }).catch(() => null);
  const favoriteAfterFailure = favoriteBefore === null ? null : await db.favorite.count({ where: { userId: lucia.id, facilityId, canonicalProductId: favoriteProductId } }).catch(() => null);
  const mutationPersisted = favoriteBefore === null || favoriteAfterFailure === null ? "unknown" : favoriteAfterFailure !== favoriteBefore ? "persisted" : "not-persisted";
  const browserFailure = browserErrors.at(-1)?.replace(/[^A-Za-z0-9_. -]/g, "").slice(0, 100) || "none";
  const diagnostic = JSON.stringify({ path: new URL(page.url()).pathname, requestFound: Boolean(correlated), approvalCount: correlated?._count.approvals ?? 0, purchaseOrderCount: correlated?._count.purchaseOrders ?? 0, actionStatus: lastActionStatus, mutationPersisted });
  if (process.env.GITHUB_ACTIONS === "true") console.error(`::error title=Remote lifecycle ${checkpoint}-${lastActionStatus}-${mutationPersisted}-${lastActionFailure}-${browserFailure}::${safe} | ${diagnostic}`);
  throw error;
} finally {
  await cleanup().catch((error) => console.error("REMOTE_LIFECYCLE_CLEANUP_FAILED", error instanceof Error ? error.name : "unknown"));
  await browser.close();
  await db.$disconnect();
}
