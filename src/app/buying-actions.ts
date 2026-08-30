"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveScope } from "@/lib/scope";
import { getFacilityBudget } from "@/lib/procurement/budget";
import { evaluatePurchasePolicy } from "@/lib/policy/engine";
import { createPurchaseOrders } from "@/lib/procurement/orders";
import { resolveApprover } from "@/lib/policy/approver";

export async function addToCart(formData:FormData){
 const context=await requireRoles(["RSA_DIRECTOR"]); const scope=await resolveScope(context.assignment); const offerId=String(formData.get("offerId")); const quantity=Math.max(1,Number(formData.get("quantity")??1));
 const offer=await prisma.supplierOffer.findFirst({where:{id:offerId,active:true},include:{canonicalProduct:true}}); if(!offer)throw new Error("L’offerta selezionata non è disponibile.");
 const cart=await prisma.cart.upsert({where:{userId_facilityId:{userId:context.user.id,facilityId:scope.id}},create:{userId:context.user.id,facilityId:scope.id},update:{}});
 await prisma.cartLine.upsert({where:{cartId_supplierOfferId:{cartId:cart.id,supplierOfferId:offer.id}},create:{cartId:cart.id,supplierOfferId:offer.id,canonicalProductId:offer.canonicalProductId,quantity},update:{quantity:{increment:quantity}}});
 revalidatePath("/catalog");revalidatePath("/cart");
}
export async function updateCartLine(formData:FormData){const c=await requireRoles(["RSA_DIRECTOR"]);const id=String(formData.get("lineId")),quantity=Number(formData.get("quantity"));if(quantity<=0)await prisma.cartLine.deleteMany({where:{id,cart:{userId:c.user.id}}});else await prisma.cartLine.updateMany({where:{id,cart:{userId:c.user.id}},data:{quantity}});revalidatePath("/cart");}
export async function removeCartLine(formData:FormData){const c=await requireRoles(["RSA_DIRECTOR"]);await prisma.cartLine.deleteMany({where:{id:String(formData.get("lineId")),cart:{userId:c.user.id}}});revalidatePath("/cart");}

export async function toggleFavorite(formData:FormData){const c=await requireRoles(["RSA_DIRECTOR"]),scope=await resolveScope(c.assignment),productId=String(formData.get("productId"));const key={userId_facilityId_canonicalProductId:{userId:c.user.id,facilityId:scope.id,canonicalProductId:productId}},existing=await prisma.favorite.findUnique({where:key});if(existing)await prisma.favorite.delete({where:{id:existing.id}});else await prisma.favorite.create({data:{userId:c.user.id,facilityId:scope.id,canonicalProductId:productId}});revalidatePath("/catalog");revalidatePath("/preferiti");revalidatePath("/products/"+productId);}

export async function addShoppingListToCart(formData:FormData){
 const c=await requireRoles(["RSA_DIRECTOR"]),scope=await resolveScope(c.assignment),list=await prisma.shoppingList.findFirstOrThrow({where:{id:String(formData.get("listId")),userId:c.user.id,facilityId:scope.id},include:{items:{include:{canonicalProduct:{include:{offers:{where:{active:true},orderBy:{preferred:"desc"},take:1}}}}}}});
 const cart=await prisma.cart.upsert({where:{userId_facilityId:{userId:c.user.id,facilityId:scope.id}},create:{userId:c.user.id,facilityId:scope.id},update:{}});
 for(const item of list.items){const offer=item.canonicalProduct.offers[0];if(offer)await prisma.cartLine.upsert({where:{cartId_supplierOfferId:{cartId:cart.id,supplierOfferId:offer.id}},create:{cartId:cart.id,supplierOfferId:offer.id,canonicalProductId:item.canonicalProductId,quantity:item.quantity},update:{quantity:{increment:item.quantity}}});}
 await prisma.shoppingList.update({where:{id:list.id},data:{lastUsedAt:new Date()}});
 redirect("/cart?lista=aggiunta");
}

export async function buyAgain(formData:FormData){const c=await requireRoles(["RSA_DIRECTOR"]),scope=await resolveScope(c.assignment),po=await prisma.purchaseOrder.findFirstOrThrow({where:{id:String(formData.get("poId")),facilityId:scope.id},include:{lines:true}}),cart=await prisma.cart.upsert({where:{userId_facilityId:{userId:c.user.id,facilityId:scope.id}},create:{userId:c.user.id,facilityId:scope.id},update:{}});for(const line of po.lines){const offer=await prisma.supplierOffer.findFirst({where:{canonicalProductId:line.canonicalProductId,supplierId:po.supplierId,active:true}})??await prisma.supplierOffer.findFirst({where:{canonicalProductId:line.canonicalProductId,active:true},orderBy:{preferred:"desc"}});if(offer)await prisma.cartLine.upsert({where:{cartId_supplierOfferId:{cartId:cart.id,supplierOfferId:offer.id}},create:{cartId:cart.id,supplierOfferId:offer.id,canonicalProductId:line.canonicalProductId,quantity:line.quantity},update:{quantity:{increment:line.quantity}}});}redirect("/cart?riordino=1");}

export async function createOutOfCatalogRequest(formData:FormData){const c=await requireRoles(["RSA_DIRECTOR"]),scope=await resolveScope(c.assignment),description=String(formData.get("description")??"").trim(),justification=String(formData.get("justification")??"").trim();if(description.length<8||justification.length<8)throw new Error("Descrizione e motivazione sono obbligatorie");const count=await prisma.outOfCatalogRequest.count(),request=await prisma.outOfCatalogRequest.create({data:{requestNumber:"FC-"+new Date().getFullYear()+"-"+String(count+1).padStart(6,"0"),requesterId:c.user.id,organizationId:c.organization.id,facilityId:scope.id,categoryId:String(formData.get("categoryId")||"")||null,needDescription:description,quantity:Math.max(1,Number(formData.get("quantity")||1)),estimatedAmount:Number(formData.get("estimatedAmount"))||null,suggestedSupplier:String(formData.get("supplier")||"")||null,justification}});await prisma.auditEvent.create({data:{actorUserId:c.user.id,entityType:"OUT_OF_CATALOG_REQUEST",entityId:request.id,action:"SUBMITTED",metadata:{number:request.requestNumber}}});redirect("/richieste?fuoriCatalogo=1");}

export async function acknowledgeOrder(formData:FormData){await requireRoles(["PROCUREMENT_MANAGER"]);const id=String(formData.get("poId"));await prisma.purchaseOrder.update({where:{id},data:{status:"ACKNOWLEDGED",supplierAcknowledgedAt:new Date(),expectedDeliveryDate:formData.get("expectedDate")?new Date(String(formData.get("expectedDate"))):undefined}});revalidatePath("/orders/"+id);}

export async function resolveQualityIssue(formData:FormData){const c=await requireRoles(["PROCUREMENT_MANAGER"]),id=String(formData.get("issueId")),decision=String(formData.get("status"));await prisma.$transaction([prisma.qualityIssue.update({where:{id},data:{status:decision as "UNDER_REVIEW"|"RESOLVED"|"CLOSED",resolutionType:String(formData.get("resolutionType")||"")||null,resolutionNote:String(formData.get("note")||"")||null,resolvedAt:decision==="RESOLVED"||decision==="CLOSED"?new Date():null}}),prisma.auditEvent.create({data:{actorUserId:c.user.id,entityType:"QUALITY_ISSUE",entityId:id,action:"ISSUE_"+decision,metadata:{resolutionType:String(formData.get("resolutionType")||"")}}})]);revalidatePath("/non-conformita");}

export async function submitRequisition(formData:FormData){
 const context=await requireRoles(["RSA_DIRECTOR"]);const scope=await resolveScope(context.assignment);const cart=await prisma.cart.findUnique({where:{userId_facilityId:{userId:context.user.id,facilityId:scope.id}},include:{lines:{include:{canonicalProduct:true,supplierOffer:{include:{supplier:true}}}}}});if(!cart?.lines.length)throw new Error("Il carrello è vuoto.");
 const center=await prisma.costCenter.findFirstOrThrow({where:{facilityId:scope.id},orderBy:{code:"asc"}}),budget=await getFacilityBudget(scope.id);
 const subtotal=cart.lines.reduce((s,l)=>s+Number(l.quantity)*Number(l.supplierOffer.unitPrice),0),taxTotal=cart.lines.reduce((s,l)=>s+Number(l.quantity)*Number(l.supplierOffer.unitPrice)*Number(l.supplierOffer.taxRate)/100,0),total=subtotal+taxTotal;
 const decision=evaluatePurchasePolicy({total,availableBudget:budget.available,requesterLimit:Number(context.assignment.approvalLimit??0),areaManagerLimit:20000,justification:String(formData.get("justification")??"")});const justification=String(formData.get("justification")??"").trim();if(decision.requiresJustification&&!justification)throw new Error("La motivazione è obbligatoria per questa eccezione alla policy.");
 const count=await prisma.purchaseRequisition.count();const req=await prisma.$transaction(async tx=>{
  const requisition=await tx.purchaseRequisition.create({data:{requisitionNumber:"PR-"+new Date().getFullYear()+"-"+String(count+1).padStart(6,"0"),requesterId:context.user.id,organizationId:context.organization.id,facilityId:scope.id,costCenterId:center.id,status:decision.outcome==="AUTO_APPROVE"?"APPROVED":"PENDING_APPROVAL",subtotal,taxTotal,total,justification:justification||null,requiredByDate:formData.get("requiredByDate")?new Date(String(formData.get("requiredByDate"))):null,policyDecision:decision.outcome,policyExplanation:decision.explanation,policyEvaluation:{rules:decision.evaluatedRules,reason:decision.reason},budgetBefore:budget.available,budgetAfter:budget.available-total,submittedAt:new Date(),approvedAt:decision.outcome==="AUTO_APPROVE"?new Date():null,lines:{create:cart.lines.map(l=>({canonicalProductId:l.canonicalProductId,supplierOfferId:l.supplierOfferId,descriptionSnapshot:l.canonicalProduct.name,supplierSnapshot:l.supplierOffer.supplier.name,supplierSkuSnapshot:l.supplierOffer.supplierSku,quantity:l.quantity,unitPrice:l.supplierOffer.unitPrice,normalizedUnitPrice:l.supplierOffer.normalizedUnitPrice,taxRate:l.supplierOffer.taxRate,lineTotal:Number(l.quantity)*Number(l.supplierOffer.unitPrice)}))}}});
  await tx.auditEvent.createMany({data:[{actorUserId:context.user.id,entityType:"PURCHASE_REQUISITION",entityId:requisition.id,action:"REQUISITION_CREATED",metadata:{number:requisition.requisitionNumber}},{actorUserId:context.user.id,entityType:"PURCHASE_REQUISITION",entityId:requisition.id,action:"POLICY_EVALUATED",metadata:{outcome:decision.outcome,rules:decision.evaluatedRules}}]});
  if(decision.outcome==="AUTO_APPROVE")await createPurchaseOrders(tx,requisition.id,context.user.id);else{const role=decision.requiredApproverRole!;const approver=await resolveApprover(tx,{organizationId:context.organization.id,requiredRole:role,facilityId:scope.id,total,categoryIds:[...new Set(cart.lines.map(l=>l.canonicalProduct.categoryId))]});await tx.approvalRequest.create({data:{requisitionId:requisition.id,approverUserId:approver.userId,approverAssignmentId:approver.assignmentId,delegationId:approver.delegationId,status:"PENDING",level:role==="AREA_MANAGER"?1:2,reason:decision.reason+" "+approver.reason}});await tx.auditEvent.create({data:{actorUserId:context.user.id,entityType:"PURCHASE_REQUISITION",entityId:requisition.id,action:"APPROVAL_REQUESTED",metadata:{role,approver:approver.user.name,delegationId:approver.delegationId,routingReason:approver.reason}}});}
  await tx.cartLine.deleteMany({where:{cartId:cart.id}});return requisition;
 });redirect("/requisitions/"+req.id+"?created=1");
}

export async function decideApproval(formData:FormData){
 const context=await requireRoles(["AREA_MANAGER","PROCUREMENT_MANAGER"]);const approvalId=String(formData.get("approvalId")),decision=String(formData.get("decision")),note=String(formData.get("note")??"").trim();if(["REJECTED","CLARIFICATION_REQUESTED"].includes(decision)&&!note)throw new Error("La nota è obbligatoria per rifiutare o chiedere chiarimenti");
 const approval=await prisma.approvalRequest.findFirstOrThrow({where:{id:approvalId,approverUserId:context.user.id,status:"PENDING"}});
 await prisma.$transaction(async tx=>{await tx.approvalRequest.update({where:{id:approval.id},data:{status:decision as "APPROVED"|"REJECTED"|"CLARIFICATION_REQUESTED",decisionNote:note||null,decidedAt:new Date()}});
  if(decision==="APPROVED"){await tx.purchaseRequisition.update({where:{id:approval.requisitionId},data:{status:"APPROVED",approvedAt:new Date()}});await createPurchaseOrders(tx,approval.requisitionId,context.user.id);}else await tx.purchaseRequisition.update({where:{id:approval.requisitionId},data:{status:decision==="REJECTED"?"REJECTED":"CLARIFICATION_REQUESTED",rejectedAt:decision==="REJECTED"?new Date():null}});
  await tx.auditEvent.create({data:{actorUserId:context.user.id,entityType:"PURCHASE_REQUISITION",entityId:approval.requisitionId,action:decision==="APPROVED"?"APPROVED":decision,metadata:{approvalId:approval.id,note}}});});
 redirect("/approvals?decision="+decision.toLowerCase());
}

async function ownedListContext() {
  const context = await requireRoles(["RSA_DIRECTOR"]);
  const scope = await resolveScope(context.assignment);
  return { context, scope };
}

export async function createShoppingList(formData: FormData) {
  const { context, scope } = await ownedListContext();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) throw new Error("Inserisci un nome di almeno 3 caratteri.");
  const productId = String(formData.get("productId") ?? "");
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const list = await prisma.shoppingList.create({
    data: {
      userId: context.user.id,
      facilityId: scope.id,
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      items: productId ? { create: { canonicalProductId: productId, quantity } } : undefined,
    },
  });
  await prisma.auditEvent.create({ data: { actorUserId: context.user.id, entityType: "SHOPPING_LIST", entityId: list.id, action: "CREATED", metadata: { name } } });
  redirect(`/liste/${list.id}?creata=1`);
}

export async function addProductToList(formData: FormData) {
  const { context, scope } = await ownedListContext();
  const listId = String(formData.get("listId"));
  const productId = String(formData.get("productId"));
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  await prisma.shoppingList.findFirstOrThrow({ where: { id: listId, userId: context.user.id, facilityId: scope.id } });
  await prisma.shoppingListItem.upsert({
    where: { shoppingListId_canonicalProductId: { shoppingListId: listId, canonicalProductId: productId } },
    create: { shoppingListId: listId, canonicalProductId: productId, quantity },
    update: { quantity: { increment: quantity } },
  });
  revalidatePath("/liste");
  revalidatePath(`/liste/${listId}`);
}

export async function updateShoppingList(formData: FormData) {
  const { context, scope } = await ownedListContext();
  const id = String(formData.get("listId"));
  const intent = String(formData.get("intent") ?? "update");
  const list = await prisma.shoppingList.findFirstOrThrow({ where: { id, userId: context.user.id, facilityId: scope.id }, include: { items: true } });
  if (intent === "delete") {
    await prisma.shoppingList.delete({ where: { id } });
    redirect("/liste?eliminata=1");
  }
  if (intent === "duplicate") {
    const copy = await prisma.shoppingList.create({ data: { userId: context.user.id, facilityId: scope.id, name: `${list.name} — copia`, description: list.description, items: { create: list.items.map((item) => ({ canonicalProductId: item.canonicalProductId, quantity: item.quantity })) } } });
    redirect(`/liste/${copy.id}?duplicata=1`);
  }
  const name = String(formData.get("name") ?? "").trim();
  await prisma.shoppingList.update({ where: { id }, data: { name: name || list.name, description: String(formData.get("description") ?? "").trim() || null } });
  revalidatePath("/liste");
  revalidatePath(`/liste/${id}`);
}

export async function updateShoppingListItem(formData: FormData) {
  const { context, scope } = await ownedListContext();
  const itemId = String(formData.get("itemId"));
  const item = await prisma.shoppingListItem.findFirstOrThrow({ where: { id: itemId, shoppingList: { userId: context.user.id, facilityId: scope.id } } });
  const quantities = formData.getAll("quantity");
  const quantity = Number(quantities.at(-1) ?? 0);
  if (quantity <= 0) await prisma.shoppingListItem.delete({ where: { id: itemId } });
  else await prisma.shoppingListItem.update({ where: { id: itemId }, data: { quantity } });
  revalidatePath(`/liste/${item.shoppingListId}`);
}

export async function moveShoppingListItem(formData: FormData) {
  const { context, scope } = await ownedListContext();
  const itemId = String(formData.get("itemId"));
  const direction = String(formData.get("direction")) === "up" ? -1 : 1;
  const item = await prisma.shoppingListItem.findFirstOrThrow({ where: { id: itemId, shoppingList: { userId: context.user.id, facilityId: scope.id } } });
  const items = await prisma.shoppingListItem.findMany({ where: { shoppingListId: item.shoppingListId }, orderBy: [{ position: "asc" }, { id: "asc" }] });
  const index = items.findIndex(({ id }) => id === itemId);
  const target = index + direction;
  if (index >= 0 && target >= 0 && target < items.length) {
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await prisma.$transaction(reordered.map((entry, position) => prisma.shoppingListItem.update({ where: { id: entry.id }, data: { position } })));
  }
  revalidatePath(`/liste/${item.shoppingListId}`);
}

export async function saveCartAsList(formData: FormData) {
  const { context, scope } = await ownedListContext();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) throw new Error("Inserisci un nome per la lista.");
  const cart = await prisma.cart.findUnique({ where: { userId_facilityId: { userId: context.user.id, facilityId: scope.id } }, include: { lines: true } });
  if (!cart?.lines.length) throw new Error("Il carrello è vuoto.");
  const quantities = new Map<string, number>();
  for (const line of cart.lines) quantities.set(line.canonicalProductId, (quantities.get(line.canonicalProductId) ?? 0) + Number(line.quantity));
  const existing = await prisma.shoppingList.findFirst({ where: { userId: context.user.id, facilityId: scope.id, name } });
  const list = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.shoppingListItem.deleteMany({ where: { shoppingListId: existing.id } });
      return tx.shoppingList.update({ where: { id: existing.id }, data: { description: "Creata dal carrello", items: { create: [...quantities].map(([canonicalProductId, quantity]) => ({ canonicalProductId, quantity })) } } });
    }
    return tx.shoppingList.create({ data: { userId: context.user.id, facilityId: scope.id, name, description: "Creata dal carrello", items: { create: [...quantities].map(([canonicalProductId, quantity]) => ({ canonicalProductId, quantity })) } } });
  });
  redirect(`/liste/${list.id}?dalCarrello=1`);
}

export async function createListFromOrder(formData: FormData) {
  const { context, scope } = await ownedListContext();
  const order = await prisma.purchaseOrder.findFirstOrThrow({ where: { id: String(formData.get("poId")), facilityId: scope.id }, include: { lines: true } });
  const name = `Riordino ${order.poNumber}`;
  const existing = await prisma.shoppingList.findFirst({ where: { userId: context.user.id, facilityId: scope.id, name } });
  const list = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.shoppingListItem.deleteMany({ where: { shoppingListId: existing.id } });
      return tx.shoppingList.update({ where: { id: existing.id }, data: { description: "Creata da un ordine precedente", items: { create: order.lines.map((line) => ({ canonicalProductId: line.canonicalProductId, quantity: line.quantity })) } } });
    }
    return tx.shoppingList.create({ data: { userId: context.user.id, facilityId: scope.id, name, description: "Creata da un ordine precedente", items: { create: order.lines.map((line) => ({ canonicalProductId: line.canonicalProductId, quantity: line.quantity })) } } });
  });
  await prisma.auditEvent.create({ data: { actorUserId: context.user.id, entityType: "SHOPPING_LIST", entityId: list.id, action: "CREATED_FROM_ORDER", metadata: { purchaseOrderId: order.id } } });
  redirect(`/liste/${list.id}?daOrdine=1`);
}

export async function addSelectedFavoritesToCart(formData: FormData) {
  const { context, scope } = await ownedListContext();
  const productIds = formData.getAll("productId").map(String);
  const favorites = await prisma.favorite.findMany({ where: { userId: context.user.id, facilityId: scope.id, canonicalProductId: { in: productIds } }, include: { canonicalProduct: { include: { offers: { where: { active: true }, orderBy: [{ preferred: "desc" }, { normalizedUnitPrice: "asc" }], take: 1 } } } } });
  const cart = await prisma.cart.upsert({ where: { userId_facilityId: { userId: context.user.id, facilityId: scope.id } }, create: { userId: context.user.id, facilityId: scope.id }, update: {} });
  for (const favorite of favorites) {
    const offer = favorite.canonicalProduct.offers[0];
    if (offer) await prisma.cartLine.upsert({ where: { cartId_supplierOfferId: { cartId: cart.id, supplierOfferId: offer.id } }, create: { cartId: cart.id, supplierOfferId: offer.id, canonicalProductId: favorite.canonicalProductId, quantity: 1 }, update: { quantity: { increment: 1 } } });
  }
  redirect("/cart?preferiti=aggiunti");
}

export async function addSelectedFavoritesToList(formData: FormData) {
  const { context, scope } = await ownedListContext();
  const listId = String(formData.get("listId") ?? "");
  const productIds = formData.getAll("productId").map(String);
  await prisma.shoppingList.findFirstOrThrow({ where: { id: listId, userId: context.user.id, facilityId: scope.id } });
  const favorites = await prisma.favorite.findMany({ where: { userId: context.user.id, facilityId: scope.id, canonicalProductId: { in: productIds } }, select: { canonicalProductId: true } });
  for (const favorite of favorites) await prisma.shoppingListItem.upsert({ where: { shoppingListId_canonicalProductId: { shoppingListId: listId, canonicalProductId: favorite.canonicalProductId } }, create: { shoppingListId: listId, canonicalProductId: favorite.canonicalProductId, quantity: 1 }, update: {} });
  redirect(`/liste/${listId}?daPreferiti=1`);
}

export async function addOrderProductsToFavorites(formData: FormData) {
  const { context, scope } = await ownedListContext();
  const order = await prisma.purchaseOrder.findFirstOrThrow({ where: { id: String(formData.get("poId")), facilityId: scope.id }, include: { lines: true } });
  await prisma.favorite.createMany({ data: order.lines.map((line) => ({ userId: context.user.id, facilityId: scope.id, canonicalProductId: line.canonicalProductId })), skipDuplicates: true });
  redirect("/preferiti?daOrdine=1");
}

export async function receiveOrder(formData:FormData){
 const context=await requireRoles(["RSA_DIRECTOR"]);const scope=await resolveScope(context.assignment),poId=String(formData.get("poId"));const po=await prisma.purchaseOrder.findFirstOrThrow({where:{id:poId,facilityId:scope.id,status:{in:["ISSUED","ACKNOWLEDGED","PARTIALLY_RECEIVED","ISSUE"]}},include:{lines:{include:{receiptLines:true}}}});
 const receiptCount=await prisma.receipt.count();await prisma.$transaction(async tx=>{let hasIssue=false,allComplete=true;const receipt=await tx.receipt.create({data:{receiptNumber:"GR-"+new Date().getFullYear()+"-"+String(receiptCount+1).padStart(6,"0"),purchaseOrderId:po.id,facilityId:po.facilityId,receivedById:context.user.id,status:"PARTIAL",notes:String(formData.get("notes")??"")||null}});
  for(const line of po.lines){const already=line.receiptLines.reduce((s,r)=>s+Number(r.quantityReceived),0),remaining=Number(line.quantity)-already,received=Math.max(0,Math.min(remaining,Number(formData.get("received-"+line.id)??0))),issueType=String(formData.get("issue-"+line.id)??""),affected=issueType?Math.min(received||remaining,Number(formData.get("affected-"+line.id)??1)):0;const accepted=Math.max(0,received-affected);if(already+received<Number(line.quantity))allComplete=false;if(issueType)hasIssue=true;
   const rl=await tx.receiptLine.create({data:{receiptId:receipt.id,purchaseOrderLineId:line.id,quantityOrdered:line.quantity,quantityReceived:received,quantityAccepted:accepted,quantityRejected:affected}});if(issueType)await tx.qualityIssue.create({data:{receiptLineId:rl.id,purchaseOrderLineId:line.id,issueType:issueType as never,severity:"MEDIUM",affectedQuantity:affected,description:String(formData.get("issueNote-"+line.id)??"Delivery issue reported")}});}
  await tx.receipt.update({where:{id:receipt.id},data:{status:hasIssue?"WITH_ISSUES":allComplete?"COMPLETE":"PARTIAL"}});await tx.purchaseOrder.update({where:{id:po.id},data:{status:hasIssue?"ISSUE":allComplete?"RECEIVED":"PARTIALLY_RECEIVED"}});await tx.auditEvent.create({data:{actorUserId:context.user.id,entityType:"PURCHASE_ORDER",entityId:po.id,action:"RECEIPT_CREATED",metadata:{receiptId:receipt.id,hasIssue}}});if(hasIssue)await tx.auditEvent.create({data:{actorUserId:context.user.id,entityType:"PURCHASE_ORDER",entityId:po.id,action:"ISSUE_OPENED",metadata:{receiptId:receipt.id}}});});
 redirect("/orders/"+po.id+"?received=1");
}
