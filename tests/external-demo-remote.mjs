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
const cleanup = { legalEntityIds: [], userIds: [], delegationIds: [], supplierIds: [], productIds: [], categoryIds: [], requisitionIds: [], purchaseOrderIds: [], shoppingListIds: [], cartLineIds: [] };
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
  const product = await db.canonicalProduct.findFirstOrThrow({ where: { active: true, id: { notIn: limits.flatMap((limit) => limit.canonicalProductId ? [limit.canonicalProductId] : []) }, categoryId: { notIn: limits.flatMap((limit) => limit.categoryId ? [limit.categoryId] : []) }, offers: { some: { active: true, preferred: true, supplier: { active: true }, OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] } } }, include: { offers: { where: { active: true, preferred: true, supplier: { active: true }, OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] }, orderBy: { unitPrice: "asc" }, take: 1 } }, orderBy: { name: "asc" } });
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

  checkpoint = "admin-crud";
  await switchTo("Marco Villa");
  const adminName = marker.slice(-20);
  await open("/organization"); await page.getByText("Nuova entita legale", { exact: true }).click(); await page.locator('.admin-crud-panel input[name="name"]').fill(`Entita ${adminName}`); await page.getByRole("button", { name: "Crea entita" }).click(); await page.waitForURL(/esito=salvata/);
  const legalEntity = await db.legalEntity.findFirstOrThrow({ where: { name: `Entita ${adminName}` } }); cleanup.legalEntityIds.push(legalEntity.id); await open("/organization"); const entityDetails = page.locator("details", { hasText: `Entita ${adminName}` }).first(); await entityDetails.locator('input[name="name"]').fill(`Entita aggiornata ${adminName}`); await entityDetails.getByRole("button", { name: "Aggiorna" }).click(); await page.waitForURL(/esito=salvata/); assert.ok(await db.legalEntity.findFirst({ where: { id: legalEntity.id, name: `Entita aggiornata ${adminName}` } })); await open("/organization"); await page.locator("details", { hasText: `Entita aggiornata ${adminName}` }).first().getByRole("button", { name: "Elimina vuota" }).click(); await page.waitForURL(/esito=salvata/); assert.equal(await db.legalEntity.count({ where: { id: legalEntity.id } }), 0); cleanup.legalEntityIds=[];

  await open("/users"); await page.getByText("Nuovo utente", { exact: true }).click(); const userForm=page.locator(".admin-crud-panel form"); await userForm.locator('input[name="name"]').fill(`Utente ${adminName}`); await userForm.locator('input[name="email"]').fill(`m117-${adminName.toLowerCase()}@demo.local`); await userForm.getByRole("button", { name: "Crea utente" }).click(); await page.waitForURL(/esito=salvato/); const createdUser=await db.user.findUniqueOrThrow({where:{email:`m117-${adminName.toLowerCase()}@demo.local`},include:{assignments:true}});cleanup.userIds.push(createdUser.id); await open(`/users?q=${encodeURIComponent(createdUser.email)}`); const userRow=page.locator("tr",{hasText:createdUser.email});await userRow.getByText("Modifica",{exact:true}).click();await userRow.locator('input[name="name"]').fill(`Utente aggiornato ${adminName}`);await userRow.getByRole("button",{name:"Salva"}).click();await page.waitForURL(/esito=salvato/);assert.ok(await db.user.findFirst({where:{id:createdUser.id,name:`Utente aggiornato ${adminName}`}}));await open(`/users?q=${encodeURIComponent(createdUser.email)}`);await page.locator("tr",{hasText:createdUser.email}).getByText("Modifica",{exact:true}).click();await page.locator("tr",{hasText:createdUser.email}).getByRole("button",{name:"Disattiva"}).click();await page.waitForURL(/esito=salvato/);assert.equal(await db.userAssignment.findFirstOrThrow({where:{id:createdUser.assignments[0].id}}).then(x=>x.active),false);

  const people=await db.user.findMany({where:{name:{in:["Andrea Riva","Giulia Bianchi"]}}});assert.equal(people.length,2);await open("/deleghe");await page.getByText("Nuova delega",{exact:true}).click();const delegationForm=page.locator(".admin-crud-panel form");await delegationForm.locator('select[name="delegatorId"]').selectOption({label:"Andrea Riva"});await delegationForm.locator('select[name="delegateId"]').selectOption({label:"Giulia Bianchi"});const from=new Date(Date.now()+40*86400000),until=new Date(Date.now()+50*86400000);await delegationForm.locator('input[name="validFrom"]').fill(from.toISOString().slice(0,10));await delegationForm.locator('input[name="validUntil"]').fill(until.toISOString().slice(0,10));await delegationForm.getByRole("button",{name:"Crea delega"}).click();await page.waitForURL(/esito=salvata/);const delegation=await db.approvalDelegation.findFirstOrThrow({where:{delegatorId:people.find(x=>x.name==="Andrea Riva").id,delegateId:people.find(x=>x.name==="Giulia Bianchi").id,validFrom:{gte:new Date(from.toISOString().slice(0,10))}}});cleanup.delegationIds.push(delegation.id);await open("/deleghe");const delegationRow=page.locator("tr",{hasText:"Andrea Riva"}).filter({hasText:"Giulia Bianchi"}).last();await delegationRow.getByText("Modifica",{exact:true}).click();await delegationRow.getByRole("button",{name:"Disattiva"}).click();await page.waitForURL(/esito=salvata/);assert.equal((await db.approvalDelegation.findUniqueOrThrow({where:{id:delegation.id}})).active,false);

  await open("/categorie");await page.getByText("Nuova categoria",{exact:true}).click();const categoryForm=page.locator(".admin-crud-panel form");const categoryCode=`Z${randomUUID().replaceAll("-","").slice(0,7).toUpperCase()}`;await categoryForm.locator('input[name="code"]').fill(categoryCode);await categoryForm.locator('input[name="name"]').fill(`Categoria ${adminName}`);await categoryForm.getByRole("button",{name:"Crea categoria"}).click();await page.waitForURL(/esito=salvata/);const category=await db.category.findUniqueOrThrow({where:{code:categoryCode}});cleanup.categoryIds.push(category.id);
  await open("/products");await page.getByText("Nuovo prodotto",{exact:true}).click();const productForm=page.locator(".admin-crud-panel form");await productForm.locator('input[name="name"]').fill(`Prodotto ${adminName}`);await productForm.locator('select[name="categoryId"]').selectOption(category.id);await productForm.getByRole("button",{name:"Crea prodotto"}).click();await page.waitForURL(/esito=salvato/);const adminProduct=await db.canonicalProduct.findFirstOrThrow({where:{name:`Prodotto ${adminName}`,categoryId:category.id}});cleanup.productIds.push(adminProduct.id);await open(`/products?q=${encodeURIComponent(adminProduct.name)}`);const productRow=page.locator("tr",{hasText:adminProduct.name});await productRow.getByText("Modifica",{exact:true}).click();await productRow.locator('input[name="name"]').fill(`Prodotto aggiornato ${adminName}`);await productRow.getByRole("button",{name:"Salva"}).click();await page.waitForURL(/esito=salvato/);await open(`/products?q=${encodeURIComponent(`Prodotto aggiornato ${adminName}`)}`);await page.locator("tr",{hasText:`Prodotto aggiornato ${adminName}`}).getByText("Modifica",{exact:true}).click();await page.locator("tr",{hasText:`Prodotto aggiornato ${adminName}`}).getByRole("button",{name:"Disattiva"}).click();await page.waitForURL(/esito=salvato/);assert.equal((await db.canonicalProduct.findUniqueOrThrow({where:{id:adminProduct.id}})).active,false);
  await open("/suppliers");await page.getByText("Nuovo fornitore",{exact:true}).click();const supplierForm=page.locator(".admin-crud-panel form");const vat=`IT9${Date.now().toString().slice(-10)}`;await supplierForm.locator('input[name="name"]').fill(`Fornitore ${adminName}`);await supplierForm.locator('input[name="vatNumber"]').fill(vat);await supplierForm.getByRole("button",{name:"Crea fornitore"}).click();await page.waitForURL(/esito=salvato/);const adminSupplier=await db.supplier.findUniqueOrThrow({where:{vatNumber:vat}});cleanup.supplierIds.push(adminSupplier.id);await open(`/suppliers?q=${encodeURIComponent(adminSupplier.name)}`);const supplierRow=page.locator("tr",{hasText:adminSupplier.name});await supplierRow.getByText("Modifica",{exact:true}).click();await supplierRow.locator('input[name="name"]').fill(`Fornitore aggiornato ${adminName}`);await supplierRow.getByRole("button",{name:"Salva"}).click();await page.waitForURL(/esito=salvato/);await open(`/suppliers?q=${encodeURIComponent(`Fornitore aggiornato ${adminName}`)}`);await page.locator("tr",{hasText:`Fornitore aggiornato ${adminName}`}).getByText("Modifica",{exact:true}).click();await page.locator("tr",{hasText:`Fornitore aggiornato ${adminName}`}).getByRole("button",{name:"Disattiva"}).click();await page.waitForURL(/esito=salvato/);assert.equal((await db.supplier.findUniqueOrThrow({where:{id:adminSupplier.id}})).active,false);

  checkpoint = "duplicate-approval-and-stale-form";
  const andrea=await db.user.findFirstOrThrow({where:{name:"Andrea Riva"},include:{assignments:{where:{active:true},take:1}}}),costCenter=await db.costCenter.findFirstOrThrow({where:{facilityId}}),edgeReqId=randomUUID(),edgeApprovalId=randomUUID();cleanup.requisitionIds.push(edgeReqId);
  await db.purchaseRequisition.create({data:{id:edgeReqId,requisitionNumber:`PR-EDGE-${randomUUID().slice(0,8)}`,requesterId:lucia.id,organizationId:lucia.assignments[0].organizationId,facilityId,costCenterId:costCenter.id,status:"PENDING_APPROVAL",subtotal:10,taxTotal:2.2,total:12.2,justification:"Certificazione idempotenza",policyDecision:"AREA_APPROVAL",policyExplanation:"Fixture DEV M11.7",policyEvaluation:{rules:["CERTIFICATION"]},budgetBefore:1000,budgetAfter:987.8,submittedAt:new Date(),lines:{create:{canonicalProductId:product.id,supplierOfferId:offer.id,descriptionSnapshot:product.name,supplierSnapshot:"Supplier certification",supplierSkuSnapshot:offer.supplierSku,quantity:1,unitPrice:10,normalizedUnitPrice:offer.normalizedUnitPrice,taxRate:22,lineTotal:10}},approvals:{create:{id:edgeApprovalId,approverUserId:andrea.id,approverAssignmentId:andrea.assignments[0].id,status:"PENDING",level:1,reason:"Certificazione doppia decisione"}}}});
  await switchTo("Andrea Riva");const stalePage=await browser.newPage({viewport:{width:1440,height:900},extraHTTPHeaders:headers});await Promise.all([page.goto(new URL(`/approvals/${edgeApprovalId}`,base).toString(),{waitUntil:"networkidle"}),stalePage.goto(new URL(`/approvals/${edgeApprovalId}`,base).toString(),{waitUntil:"networkidle"})]);await page.getByRole("button",{name:"Approva"}).click();await page.waitForURL(/\/approvals\?decision=approved/);await stalePage.getByRole("button",{name:"Approva"}).click();await stalePage.waitForURL(/decision=already-decided/);assert.equal(await db.purchaseOrder.count({where:{requisitionId:edgeReqId}}),1,"duplicate/stale approval creates one PO");assert.equal(await db.auditEvent.count({where:{entityId:edgeReqId,action:"APPROVED"}}),1,"duplicate/stale approval creates one transition");const edgePo=await db.purchaseOrder.findFirstOrThrow({where:{requisitionId:edgeReqId}});cleanup.purchaseOrderIds.push(edgePo.id);await stalePage.close();

  checkpoint = "receipt-quantity-boundaries";
  await switchTo("Lucia Ferri");for(const invalid of ["0","-1","2"]){await open(`/orders/${edgePo.id}/receive`);const receiptInput=page.locator('input[name^="received-"]').first();await receiptInput.fill(invalid);await page.getByRole("button",{name:"Conferma tutto come ordinato"}).click();await page.waitForURL(invalid==="0"?/error=empty-receipt/:/error=invalid-quantity/);assert.equal(await db.receipt.count({where:{purchaseOrderId:edgePo.id}}),0,`receipt ${invalid} does not mutate`);await page.getByRole("alert").waitFor();}

  checkpoint = "duplicate-cart-list";
  const edgeCart=await db.cart.findUniqueOrThrow({where:{userId_facilityId:{userId:lucia.id,facilityId}}});await db.cartLine.deleteMany({where:{cartId:edgeCart.id}});for(let i=0;i<2;i++){await open(`/products/${product.id}`);const form=page.locator(`form:has(input[name="offerId"][value="${offer.id}"])`);await form.locator('input[name="quantity"]').fill("1");await form.getByRole("button",{name:"Aggiungi al carrello"}).click();await waitForDb(()=>db.cartLine.findUnique({where:{cartId_supplierOfferId:{cartId:edgeCart.id,supplierOfferId:offer.id}}}),value=>Number(value?.quantity)===i+1,`cart duplicate ${i}`);}const edgeCartLine=await db.cartLine.findUniqueOrThrow({where:{cartId_supplierOfferId:{cartId:edgeCart.id,supplierOfferId:offer.id}}});cleanup.cartLineIds.push(edgeCartLine.id);assert.equal(await db.cartLine.count({where:{cartId:edgeCart.id,supplierOfferId:offer.id}}),1);
  const list=await db.shoppingList.create({data:{userId:lucia.id,facilityId,name:`Lista ${adminName}`}});cleanup.shoppingListIds.push(list.id);for(let i=0;i<2;i++){await open(`/products/${product.id}`);await page.getByLabel(`Altre azioni per ${product.name}`).click();await page.locator(`form:has(input[name="listId"][value="${list.id}"]) button`).click();await waitForDb(()=>db.shoppingListItem.findUnique({where:{shoppingListId_canonicalProductId:{shoppingListId:list.id,canonicalProductId:product.id}}}),value=>Number(value?.quantity)===i+1,`list duplicate ${i}`);}assert.equal(await db.shoppingListItem.count({where:{shoppingListId:list.id,canonicalProductId:product.id}}),1);

  checkpoint = "expired-and-inactive-offers";
  const activePriceList=await db.priceList.findFirstOrThrow({where:{supplierId:offer.supplierId}}),expired=await db.supplierOffer.create({data:{supplierId:offer.supplierId,canonicalProductId:adminProduct.id,priceListId:activePriceList.id,unitPrice:2,normalizedUnitPrice:2,validUntil:new Date(Date.now()-86400000),active:true}});await open(`/products/${adminProduct.id}`);assert.equal(await page.locator(`form:has(input[value="${expired.id}"])`).count(),1);await page.locator(`form:has(input[value="${expired.id}"]) button`).click();await page.waitForURL(/\/catalog\?error=offer-unavailable/);assert.equal(await db.cartLine.count({where:{supplierOfferId:expired.id}}),0,"expired offer is rejected");await db.supplierOffer.update({where:{id:expired.id},data:{active:false}});
  const inactivePriceList=await db.priceList.create({data:{name:`Listino ${adminName}`,supplierId:adminSupplier.id,version:1,active:true}}),inactiveOffer=await db.supplierOffer.create({data:{supplierId:adminSupplier.id,canonicalProductId:adminProduct.id,priceListId:inactivePriceList.id,unitPrice:2,normalizedUnitPrice:2,active:true}});await open(`/products/${adminProduct.id}`);assert.equal(await page.locator(`form:has(input[value="${inactiveOffer.id}"])`).count(),1);await page.locator(`form:has(input[value="${inactiveOffer.id}"]) button`).click();await page.waitForURL(/\/catalog\?error=offer-unavailable/);assert.equal(await db.cartLine.count({where:{supplierOfferId:inactiveOffer.id}}),0,"inactive supplier offer is rejected");

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
  console.log(JSON.stringify({ status: "PASS", marker, attachment: { receipt: 2, nonconformity: 1, readback: true }, admin: { organization: true, users: true, delegations: true, suppliers: true, products: true, categories: true }, budgetWarning: true, negative: { invalidAttachment: true, emptyCart: true, duplicateApproval: true, staleApproval: true, zeroReceipt: true, negativeReceipt: true, overReceipt: true, duplicateCart: true, duplicateList: true, expiredOffer: true, inactiveSupplier: true, repeatedReceipt: true, invalidId: true, unauthorizedRoute: true } }));
} catch (error) {
  const directory = path.join(process.cwd(), "artifacts", "remote-certification"); await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, "external-demo-failure.png"), fullPage: true }).catch(() => undefined);
  const safe = (error instanceof Error ? error.message : String(error)).replace(/https?:\/\/\S+/g, "[url]").replace(/\s+/g, " ").slice(0, 600);
  if (process.env.GITHUB_ACTIONS === "true") console.error(`::error title=External demo ${checkpoint}::${safe}`);
  throw error;
} finally {
  if (warningBudgetId) await db.budget.deleteMany({ where: { id: warningBudgetId } }).catch(() => undefined);
  if (cleanup.cartLineIds.length) await db.cartLine.deleteMany({ where: { id: { in: cleanup.cartLineIds } } }).catch(() => undefined);
  if (cleanup.shoppingListIds.length) await db.shoppingList.deleteMany({ where: { id: { in: cleanup.shoppingListIds } } }).catch(() => undefined);
  if (cleanup.purchaseOrderIds.length) await db.purchaseOrder.deleteMany({ where: { id: { in: cleanup.purchaseOrderIds } } }).catch(() => undefined);
  if (cleanup.requisitionIds.length) await db.purchaseRequisition.deleteMany({ where: { id: { in: cleanup.requisitionIds } } }).catch(() => undefined);
  if (cleanup.delegationIds.length) await db.approvalDelegation.deleteMany({ where: { id: { in: cleanup.delegationIds } } }).catch(() => undefined);
  if (cleanup.userIds.length) await db.user.deleteMany({ where: { id: { in: cleanup.userIds } } }).catch(() => undefined);
  if (cleanup.productIds.length) await db.canonicalProduct.deleteMany({ where: { id: { in: cleanup.productIds } } }).catch(() => undefined);
  if (cleanup.categoryIds.length) await db.category.deleteMany({ where: { id: { in: cleanup.categoryIds } } }).catch(() => undefined);
  if (cleanup.supplierIds.length) await db.supplier.deleteMany({ where: { id: { in: cleanup.supplierIds } } }).catch(() => undefined);
  if (cleanup.legalEntityIds.length) await db.legalEntity.deleteMany({ where: { id: { in: cleanup.legalEntityIds } } }).catch(() => undefined);
  await browser.close(); await db.$disconnect();
}
