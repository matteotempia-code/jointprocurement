import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaClient, type IssueType, type Prisma, type RequisitionStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const APPLY = process.argv.includes("--apply");
const MARKER = "m11.1.2-procurement-v1";
const anchor = new Date("2026-09-02T09:00:00.000Z");
const day = 86_400_000;
const money = (value: number) => Math.round(value * 100) / 100;
const id = (kind: string, ordinal: number) => `demo-${MARKER}-${kind}-${String(ordinal + 1).padStart(6, "0")}`;

type Snapshot = Awaited<ReturnType<typeof snapshot>>;
type SeededRequisition = { id: string; requisitionNumber: string; policyEvaluation: Prisma.JsonValue };

function isSeededProcurement(record: SeededRequisition) {
  const value = record.policyEvaluation;
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && value.seeded === true);
}

function digest(values: string[]) {
  return createHash("sha256").update(values.sort().join("\n")).digest("hex");
}

async function storageObjectCount() {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!bucket) throw new Error("SUPABASE_STORAGE_BUCKET non configurato.");
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM storage.objects WHERE bucket_id = ${bucket}`;
  return rows[0]?.count ?? 0;
}

async function snapshot() {
  const [sourceDocuments, imports, attachments, organizations, facilities, users, suppliers, products, offers, categories, priceLists, budgets, storageObjects] = await Promise.all([
    prisma.sourceDocument.findMany({ select: { id: true, storageProvider: true, storageBucket: true, storageObjectKey: true, checksum: true } }),
    prisma.importJob.findMany({ select: { id: true, sourceDocumentId: true, version: true } }),
    prisma.operationalAttachment.findMany({ select: { id: true, storageProvider: true, storageBucket: true, storageObjectKey: true, checksum: true } }),
    prisma.organization.findMany({ select: { id: true, name: true } }),
    prisma.facility.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, email: true } }),
    prisma.supplier.findMany({ select: { id: true, vatNumber: true } }),
    prisma.canonicalProduct.findMany({ select: { id: true, manufacturerSku: true } }),
    prisma.supplierOffer.findMany({ select: { id: true, supplierSku: true } }),
    prisma.category.findMany({ select: { id: true, code: true } }),
    prisma.priceList.findMany({ select: { id: true, name: true } }),
    prisma.budget.findMany({ select: { id: true, approvedAmount: true, actualAmount: true } }),
    storageObjectCount(),
  ]);
  const sourceLocators = sourceDocuments.map((item) => `${item.id}|${item.storageProvider}|${item.storageBucket}|${item.storageObjectKey}|${item.checksum}`);
  const attachmentLocators = attachments.map((item) => `${item.id}|${item.storageProvider}|${item.storageBucket}|${item.storageObjectKey}|${item.checksum}`);
  const master = [
    ...organizations.map((item) => `org|${item.id}|${item.name}`), ...facilities.map((item) => `facility|${item.id}|${item.name}`),
    ...users.map((item) => `user|${item.id}|${item.email}`), ...suppliers.map((item) => `supplier|${item.id}|${item.vatNumber}`),
    ...products.map((item) => `product|${item.id}|${item.manufacturerSku}`), ...offers.map((item) => `offer|${item.id}|${item.supplierSku}`),
    ...categories.map((item) => `category|${item.id}|${item.code}`), ...priceLists.map((item) => `price-list|${item.id}|${item.name}`),
  ];
  return {
    counts: { sourceDocuments: sourceDocuments.length, imports: imports.length, operationalAttachments: attachments.length, storageObjects, organizations: organizations.length, facilities: facilities.length, users: users.length, suppliers: suppliers.length, products: products.length, offers: offers.length, categories: categories.length, priceLists: priceLists.length, budgets: budgets.length },
    sourceLocatorDigest: digest(sourceLocators), attachmentLocatorDigest: digest(attachmentLocators),
    importDigest: digest(imports.map((item) => `${item.id}|${item.sourceDocumentId}|${item.version}`)), masterDigest: digest(master),
    invalidLocators: [...sourceDocuments, ...attachments].filter((item) => item.storageProvider === "supabase" && (!item.storageBucket || !item.storageObjectKey)).map((item) => item.id),
  };
}

async function audit() {
  const budgetIds = Array.from({ length: 102 }, (_, index) => id("budget", index));
  const limitIds = Array.from({ length: 3 }, (_, index) => id("limit", index));
  const potential = await prisma.purchaseRequisition.findMany({ where: { requisitionNumber: { startsWith: "PR-2026-" } }, select: { id: true, requisitionNumber: true, policyEvaluation: true } });
  const seeded = potential.filter(isSeededProcurement);
  const requisitionIds = seeded.map((item) => item.id);
  const orders = await prisma.purchaseOrder.findMany({ where: { requisitionId: { in: requisitionIds } }, select: { id: true, lines: { select: { id: true } }, receipts: { select: { id: true, lines: { select: { id: true } } } } } });
  const orderIds = orders.map((item) => item.id), orderLineIds = orders.flatMap((item) => item.lines.map((line) => line.id)), receiptIds = orders.flatMap((item) => item.receipts.map((receipt) => receipt.id));
  const issues = await prisma.qualityIssue.findMany({ where: { purchaseOrderLineId: { in: orderLineIds } }, select: { id: true } });
  const issueIds = issues.map((item) => item.id);
  const auditCandidates = await prisma.auditEvent.findMany({ where: { entityType: { in: ["PURCHASE_REQUISITION", "PURCHASE_ORDER", "RECEIPT", "QUALITY_ISSUE"] } }, select: { id: true, metadata: true } });
  const auditIds = auditCandidates.filter((item) => { const value = item.metadata; return Boolean(value && typeof value === "object" && !Array.isArray(value) && value.seeded === true); }).map((item) => item.id);
  const blockingAttachments = await prisma.operationalAttachment.findMany({ where: { OR: [{ receiptId: { in: receiptIds } }, { qualityIssueId: { in: issueIds } }] }, select: { id: true, receiptId: true, qualityIssueId: true, storageObjectKey: true } });
  const counts = {
    budgets: await prisma.budget.count({ where: { id: { in: budgetIds } } }),
    procurementLimits: await prisma.procurementLimit.count({ where: { id: { in: limitIds } } }),
    purchaseRequisitions: seeded.length,
    purchaseRequisitionLines: await prisma.purchaseRequisitionLine.count({ where: { requisitionId: { in: requisitionIds } } }),
    approvals: await prisma.approvalRequest.count({ where: { requisitionId: { in: requisitionIds } } }),
    purchaseOrders: orders.length,
    purchaseOrderLines: orderLineIds.length,
    receipts: receiptIds.length,
    receiptLines: orders.flatMap((item) => item.receipts.flatMap((receipt) => receipt.lines)).length,
    qualityIssues: issues.length,
    auditEvents: auditIds.length,
  };
  return { seeded, requisitionIds, orderIds, orderLineIds, receiptIds, issueIds, auditIds, budgetIds, limitIds, blockingAttachments, counts };
}

async function references() {
  const [facilities, requesters, areaAssignment, offers] = await Promise.all([
    prisma.facility.findMany({ include: { area: { include: { legalEntity: true } }, costCenters: { take: 1 } }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { email: { endsWith: "@demo.local" } }, orderBy: { email: "asc" } }),
    prisma.userAssignment.findFirst({ where: { role: { code: "AREA_MANAGER" }, user: { email: "andrea.riva@demo.local" } }, include: { user: true } }),
    prisma.supplierOffer.findMany({ where: { active: true }, include: { supplier: true, canonicalProduct: true }, orderBy: { supplierSku: "asc" }, take: 1200 }),
  ]);
  if (!facilities.length || !requesters.length || !areaAssignment || !offers.length) throw new Error("Master data demo incompleti: refresh annullato.");
  const managerFacilities = facilities.filter((item) => item.areaId === areaAssignment.scopeId);
  if (!managerFacilities.length) throw new Error("Perimetro Area Manager privo di strutture: refresh annullato.");
  return { facilities, requesters, areaAssignment, offers, managerFacilities };
}

function plan(refs: Awaited<ReturnType<typeof references>>) {
  const issueTypes: IssueType[] = ["MISSING", "DAMAGED", "WRONG_ITEM", "QUALITY", "PACKAGING"];
  const requisitions: Prisma.PurchaseRequisitionCreateManyInput[] = [], lines: Prisma.PurchaseRequisitionLineCreateManyInput[] = [], approvals: Prisma.ApprovalRequestCreateManyInput[] = [];
  const orders: Prisma.PurchaseOrderCreateManyInput[] = [], orderLines: Prisma.PurchaseOrderLineCreateManyInput[] = [], receipts: Prisma.ReceiptCreateManyInput[] = [], receiptLines: Prisma.ReceiptLineCreateManyInput[] = [], issues: Prisma.QualityIssueCreateManyInput[] = [], audits: Prisma.AuditEventCreateManyInput[] = [];
  const budgets: Prisma.BudgetCreateManyInput[] = refs.facilities.map((facility, index) => ({
    id: id("budget", index), organizationId: facility.area.legalEntity.organizationId, legalEntityId: facility.area.legalEntityId,
    areaId: facility.areaId, facilityId: facility.id, costCenterId: facility.costCenters[0]!.id,
    periodStart: new Date("2026-01-01T00:00:00.000Z"), periodEnd: new Date("2026-12-31T23:59:59.999Z"),
    approvedAmount: 240_000 + (index % 9) * 28_000, actualAmount: 95_000 + (index % 11) * 12_000, status: "ACTIVE",
  }));
  const primaryFacility = refs.facilities[0], primaryOffer = refs.offers[0];
  const limits: Prisma.ProcurementLimitCreateManyInput[] = [
    { id: id("limit", 0), organizationId: primaryFacility.area.legalEntity.organizationId, facilityId: primaryFacility.id, canonicalProductId: primaryOffer.canonicalProductId, limitType: "MONETARY", periodStart: new Date("2026-09-01T00:00:00.000Z"), periodEnd: new Date("2026-09-30T23:59:59.999Z"), maximumAmount: 1_800 },
    { id: id("limit", 1), organizationId: primaryFacility.area.legalEntity.organizationId, facilityId: primaryFacility.id, canonicalProductId: primaryOffer.canonicalProductId, limitType: "QUANTITY", periodStart: new Date("2026-09-01T00:00:00.000Z"), periodEnd: new Date("2026-09-30T23:59:59.999Z"), maximumQuantity: 10_000, quantityUom: "pezzi" },
    { id: id("limit", 2), organizationId: primaryFacility.area.legalEntity.organizationId, facilityId: primaryFacility.id, categoryId: primaryOffer.canonicalProduct.categoryId, limitType: "MONETARY", periodStart: new Date("2026-09-01T00:00:00.000Z"), periodEnd: new Date("2026-09-30T23:59:59.999Z"), maximumAmount: 12_000 },
  ];
  const reasons = ["Importo sopra l’autonomia della struttura", "Verifica limite prodotto del periodo", "Fornitore non convenzionato", "Condizioni commerciali sotto soglia", "Eccezione motivata rispetto al budget di categoria"];
  const justifications = ["Ripristino scorta minima di reparto", "Fabbisogno assistenziale programmato", "Reintegro dotazione mensile", "Continuità operativa dei servizi", "Acquisto per fabbisogno stagionale"];
  for (let i = 0; i < 520; i += 1) {
    const lifecycle = i < 400 ? "approved" : i < 454 ? "pending" : i < 470 ? "clarification" : i < 480 ? "rejected" : "draft";
    const facilityPool = lifecycle === "pending" || lifecycle === "clarification" || lifecycle === "rejected" ? refs.managerFacilities : refs.facilities;
    const facility = facilityPool[(i * 7 + Math.floor(i / 11)) % facilityPool.length], center = facility.costCenters[0];
    if (!center) throw new Error(`Centro di costo mancante per ${facility.name}.`);
    const offer = refs.offers[(i * 17 + Math.floor(i / 9)) % refs.offers.length], requester = refs.requesters[(i * 5 + Math.floor(i / 13)) % refs.requesters.length];
    const quantity = 3 + (i * 7) % 36, subtotal = money(Number(offer.unitPrice) * quantity), taxTotal = money(subtotal * Number(offer.taxRate) / 100), total = money(subtotal + taxTotal);
    const pendingOrdinal = Math.max(0, i - 400), ageDays = lifecycle === "pending" ? (pendingOrdinal % 10 < 7 ? 1 + pendingOrdinal % 3 : pendingOrdinal % 10 < 9 ? 4 + pendingOrdinal % 12 : 16 + pendingOrdinal % 17) : lifecycle === "approved" ? 12 + (i * 11) % 170 : 3 + (i * 5) % 28;
    const submittedAt = new Date(anchor.getTime() - ageDays * day), createdAt = new Date(submittedAt.getTime() - (1 + i % 2) * day), decisionAt = new Date(submittedAt.getTime() + (1 + i % 3) * day);
    const reqId = id("pr", i), reqStatus: RequisitionStatus = lifecycle === "approved" ? "APPROVED" : lifecycle === "pending" ? "PENDING_APPROVAL" : lifecycle === "clarification" ? "CLARIFICATION_REQUESTED" : lifecycle === "rejected" ? "REJECTED" : "DRAFT";
    const policyDecision = lifecycle === "draft" || i % 6 ? "AREA_MANAGER_APPROVAL" : "AUTO_APPROVE";
    let budgetBefore = 18_000 + (i % 17) * 2_750 + total * 2.2;
    if (i % 53 === 0) budgetBefore = total * 0.92;
    else if (i % 17 === 0) budgetBefore = total * 1.05;
    requisitions.push({ id: reqId, requisitionNumber: `PR-2026-${String(i + 1).padStart(6, "0")}`, requesterId: requester.id, organizationId: facility.area.legalEntity.organizationId, facilityId: facility.id, costCenterId: center.id, status: reqStatus, subtotal, taxTotal, total, justification: justifications[i % justifications.length], requiredByDate: new Date(submittedAt.getTime() + (8 + i % 12) * day), policyDecision, policyExplanation: policyDecision === "AUTO_APPROVE" ? "Acquisto entro budget e autonomia." : reasons[i % reasons.length], policyEvaluation: { seeded: true, demoDataset: MARKER, ordinal: i, rules: policyDecision === "AUTO_APPROVE" ? ["CATALOG", "WITHIN_BUDGET"] : ["CATALOG", "APPROVAL_REQUIRED"] }, budgetBefore, budgetAfter: budgetBefore - total, createdAt, updatedAt: createdAt, submittedAt: lifecycle === "draft" ? null : submittedAt, approvedAt: lifecycle === "approved" ? decisionAt : null, rejectedAt: lifecycle === "rejected" ? decisionAt : null });
    lines.push({ id: id("pr-line", i), requisitionId: reqId, canonicalProductId: offer.canonicalProductId, supplierOfferId: offer.id, descriptionSnapshot: offer.canonicalProduct.name, supplierSnapshot: offer.supplier.name, supplierSkuSnapshot: offer.supplierSku, quantity, unitPrice: offer.unitPrice, normalizedUnitPrice: offer.normalizedUnitPrice, taxRate: offer.taxRate, lineTotal: subtotal });
    if (lifecycle !== "draft" && (lifecycle !== "approved" || i % 4 === 0)) approvals.push({ id: id("approval", i), requisitionId: reqId, approverUserId: refs.areaAssignment.userId, approverAssignmentId: refs.areaAssignment.id, status: lifecycle === "approved" ? "APPROVED" : lifecycle === "pending" ? "PENDING" : lifecycle === "clarification" ? "CLARIFICATION_REQUESTED" : "REJECTED", level: 1, reason: reasons[i % reasons.length], decisionNote: lifecycle === "approved" ? "Approvato sulla base del fabbisogno e del budget disponibile." : lifecycle === "clarification" ? "Specificare urgenza e consumo previsto nel periodo." : lifecycle === "rejected" ? "Richiesta non coerente con il limite disponibile." : null, requestedAt: submittedAt, decidedAt: lifecycle === "approved" || lifecycle === "rejected" ? decisionAt : null });
    audits.push({ id: id("audit-pr", i), actorUserId: requester.id, entityType: "PURCHASE_REQUISITION", entityId: reqId, action: "REQUISITION_CREATED", metadata: { seeded: true, demoDataset: MARKER }, createdAt });
    if (lifecycle !== "approved") continue;
    const poId = id("po", i), poLineId = id("po-line", i), issuedAt = new Date(decisionAt.getTime() + day), expected = new Date(issuedAt.getTime() + (5 + i % 10) * day), receiptExists = i < 300, overdue = i >= 300 && i < 325;
    orders.push({ id: poId, poNumber: `PO-2026-${String(i + 1).padStart(6, "0")}`, requisitionId: reqId, supplierId: offer.supplierId, organizationId: facility.area.legalEntity.organizationId, facilityId: facility.id, deliveryLocation: facility.address ?? facility.name, status: receiptExists ? (i % 17 === 0 ? "PARTIALLY_RECEIVED" : "RECEIVED") : overdue ? "ISSUED" : i % 3 === 0 ? "ACKNOWLEDGED" : "ISSUED", subtotal, taxTotal, total, shippingFee: 0, commercialPolicy: { seeded: true, demoDataset: MARKER }, issuedAt, expectedDeliveryDate: receiptExists ? expected : overdue ? new Date(anchor.getTime() - (1 + i % 9) * day) : new Date(anchor.getTime() + (1 + i % 18) * day), supplierAcknowledgedAt: i % 3 === 0 ? new Date(issuedAt.getTime() + day) : null, createdAt: issuedAt, updatedAt: issuedAt });
    orderLines.push({ id: poLineId, purchaseOrderId: poId, canonicalProductId: offer.canonicalProductId, descriptionSnapshot: offer.canonicalProduct.name, supplierSkuSnapshot: offer.supplierSku, quantity, unitPrice: offer.unitPrice, taxRate: offer.taxRate, lineTotal: subtotal });
    audits.push({ id: id("audit-po", i), actorUserId: refs.areaAssignment.userId, entityType: "PURCHASE_ORDER", entityId: poId, action: "PO_CREATED", metadata: { seeded: true, demoDataset: MARKER }, createdAt: issuedAt });
    if (!receiptExists) continue;
    const receiptId = id("receipt", i), receiptLineId = id("receipt-line", i), hasIssue = i % 29 === 0, partial = i % 17 === 0, received = partial ? Math.max(1, quantity - 1) : quantity, receivedAt = new Date(Math.min(anchor.getTime() - day, expected.getTime() + ((i % 5) - 2) * day));
    receipts.push({ id: receiptId, receiptNumber: `GR-2026-${String(i + 1).padStart(6, "0")}`, purchaseOrderId: poId, facilityId: facility.id, receivedById: requester.id, receivedAt, status: hasIssue ? "WITH_ISSUES" : partial ? "PARTIAL" : "COMPLETE", notes: hasIssue ? "Difformità documentata alla ricezione." : partial ? "Consegna parziale; saldo atteso." : "Consegna verificata." });
    receiptLines.push({ id: receiptLineId, receiptId, purchaseOrderLineId: poLineId, quantityOrdered: quantity, quantityReceived: received, quantityAccepted: hasIssue ? Math.max(0, received - 1) : received, quantityRejected: hasIssue ? 1 : 0 });
    if (hasIssue) issues.push({ id: id("issue", i), receiptLineId, purchaseOrderLineId: poLineId, issueType: issueTypes[i % issueTypes.length], severity: i % 4 === 0 ? "HIGH" : "MEDIUM", affectedQuantity: 1, description: ["Unità mancante", "Imballo danneggiato", "Referenza non corrispondente", "Qualità da verificare", "Confezione non integra"][i % 5], status: i % 3 === 0 ? "RESOLVED" : "OPEN", openedAt: new Date(receivedAt.getTime() + 2 * 60 * 60 * 1000), resolvedAt: i % 3 === 0 ? new Date(receivedAt.getTime() + 2 * day) : null, resolutionType: i % 3 === 0 ? "replacement" : null, resolutionNote: i % 3 === 0 ? "Sostituzione concordata." : null });
  }
  return { budgets, limits, requisitions, lines, approvals, orders, orderLines, receipts, receiptLines, issues, audits };
}

function assertPreserved(before: Snapshot, after: Snapshot, previousDemoBudgetCount: number, plannedBudgetCount: number) {
  const failures: string[] = [];
  for (const key of Object.keys(before.counts) as Array<keyof Snapshot["counts"]>) {
    if (key === "budgets") continue;
    if (before.counts[key] !== after.counts[key]) failures.push(`${key}: ${before.counts[key]} -> ${after.counts[key]}`);
  }
  const expectedBudgetCount = before.counts.budgets - previousDemoBudgetCount + plannedBudgetCount;
  if (after.counts.budgets !== expectedBudgetCount) failures.push(`budgets: attesi ${expectedBudgetCount}, trovati ${after.counts.budgets}`);
  if (before.sourceLocatorDigest !== after.sourceLocatorDigest) failures.push("locator SourceDocument modificati");
  if (before.attachmentLocatorDigest !== after.attachmentLocatorDigest) failures.push("locator OperationalAttachment modificati");
  if (before.importDigest !== after.importDigest) failures.push("Smart Import modificato");
  if (before.masterDigest !== after.masterDigest) failures.push("master data o budget modificati");
  if (after.invalidLocators.length) failures.push(`locator cloud invalidi: ${after.invalidLocators.length}`);
  if (failures.length) throw new Error(`ASSERTION PRESERVAZIONE FALLITA: ${failures.join("; ")}`);
}

async function applyRefresh(auditResult: Awaited<ReturnType<typeof audit>>, data: ReturnType<typeof plan>) {
  await prisma.$transaction(async (tx) => {
    await tx.procurementLimit.deleteMany({ where: { id: { in: data.limits.map((item) => item.id!) } } });
    await tx.budget.deleteMany({ where: { id: { in: data.budgets.map((item) => item.id!) } } });
    await tx.auditEvent.deleteMany({ where: { id: { in: auditResult.auditIds } } });
    await tx.qualityIssue.deleteMany({ where: { id: { in: auditResult.issueIds } } });
    await tx.receiptLine.deleteMany({ where: { receiptId: { in: auditResult.receiptIds } } });
    await tx.receipt.deleteMany({ where: { id: { in: auditResult.receiptIds } } });
    await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: { in: auditResult.orderIds } } });
    await tx.purchaseOrder.deleteMany({ where: { id: { in: auditResult.orderIds } } });
    await tx.approvalRequest.deleteMany({ where: { requisitionId: { in: auditResult.requisitionIds } } });
    await tx.purchaseRequisitionLine.deleteMany({ where: { requisitionId: { in: auditResult.requisitionIds } } });
    await tx.purchaseRequisition.deleteMany({ where: { id: { in: auditResult.requisitionIds } } });
    await tx.budget.createMany({ data: data.budgets }); await tx.procurementLimit.createMany({ data: data.limits });
    await tx.purchaseRequisition.createMany({ data: data.requisitions }); await tx.purchaseRequisitionLine.createMany({ data: data.lines });
    await tx.approvalRequest.createMany({ data: data.approvals }); await tx.purchaseOrder.createMany({ data: data.orders }); await tx.purchaseOrderLine.createMany({ data: data.orderLines });
    await tx.receipt.createMany({ data: data.receipts }); await tx.receiptLine.createMany({ data: data.receiptLines }); await tx.qualityIssue.createMany({ data: data.issues }); await tx.auditEvent.createMany({ data: data.audits });
  }, { timeout: 120_000, maxWait: 10_000 });
}

async function procurementQuality() {
  const records = await prisma.purchaseRequisition.findMany({ where: { requisitionNumber: { startsWith: "PR-2026-" } }, select: { policyEvaluation: true, status: true, requesterId: true, facilityId: true, total: true, budgetBefore: true, budgetAfter: true, approvals: { select: { status: true, reason: true, requestedAt: true } } } });
  const seeded = records.filter((record) => isSeededProcurement({ id: "", requisitionNumber: "", policyEvaluation: record.policyEvaluation }));
  const pendingEntries = seeded.flatMap((record) => record.approvals.filter((approval) => approval.status === "PENDING").map((approval) => ({ record, approval })));
  const ages = pendingEntries.map(({ approval }) => Math.max(0, Math.floor((anchor.getTime() - approval.requestedAt.getTime()) / day)));
  const byStatus = Object.groupBy(seeded, (record) => record.status);
  const orderStatuses = await prisma.purchaseOrder.groupBy({ by: ["status"], where: { requisition: { requisitionNumber: { startsWith: "PR-2026-" } } }, _count: true });
  return {
    requisitionsByStatus: Object.fromEntries(Object.entries(byStatus).map(([status, values]) => [status, values?.length ?? 0])),
    approvals: { pending: pendingEntries.length, ageMin: ages.length ? Math.min(...ages) : 0, ageMax: ages.length ? Math.max(...ages) : 0, days1to3: ages.filter((age) => age <= 3).length, days4to15: ages.filter((age) => age >= 4 && age <= 15).length, days16to32: ages.filter((age) => age >= 16 && age <= 32).length, over32: ages.filter((age) => age > 32).length, overdue: ages.filter((age) => age > 3).length, distinctRequesters: new Set(pendingEntries.map(({ record }) => record.requesterId)).size, distinctFacilities: new Set(pendingEntries.map(({ record }) => record.facilityId)).size, distinctReasons: new Set(pendingEntries.map(({ approval }) => approval.reason)).size },
    amounts: { minimum: Math.min(...seeded.map((record) => Number(record.total))), maximum: Math.max(...seeded.map((record) => Number(record.total))) },
    budgetResiduals: { positive: seeded.filter((record) => Number(record.budgetAfter) >= 0).length, warning: seeded.filter((record) => Number(record.budgetAfter) >= 0 && Number(record.budgetAfter) / Math.max(1, Number(record.budgetBefore)) < 0.1).length, blocking: seeded.filter((record) => Number(record.budgetAfter) < 0).length },
    purchaseOrdersByStatus: Object.fromEntries(orderStatuses.map((item) => [item.status, item._count])),
  };
}

async function main() {
  const before = await snapshot(), audited = await audit(), refs = await references(), data = plan(refs);
  const creates = Object.fromEntries(Object.entries(data).map(([key, values]) => [key, values.length]));
  console.log(JSON.stringify({ mode: APPLY ? "APPLY" : "DRY_RUN", marker: MARKER, delete: audited.counts, create: creates, preserved: before.counts, currentQuality: await procurementQuality(), blockers: audited.blockingAttachments.map((item) => ({ attachmentId: item.id, receiptId: item.receiptId, qualityIssueId: item.qualityIssueId })) }, null, 2));
  if (before.invalidLocators.length) throw new Error(`Sono presenti ${before.invalidLocators.length} locator cloud invalidi: refresh annullato.`);
  if (audited.blockingAttachments.length) throw new Error(`Trovati ${audited.blockingAttachments.length} allegati legati a record candidati: refresh annullato.`);
  if (!APPLY) { console.log("DRY RUN COMPLETATO: zero mutazioni."); return; }
  const target = process.env.SORGENCE_ENVIRONMENT?.trim().toLocaleLowerCase("en-US");
  if (process.env.NODE_ENV === "production" || !["development", "dev", "demo"].includes(target ?? "")) throw new Error("Refresh demo bloccato: SORGENCE_ENVIRONMENT deve identificare esplicitamente DEV/demo e NODE_ENV non può essere production.");
  if (process.env.ALLOW_DEMO_PROCUREMENT_REFRESH !== "true") throw new Error("Impostare ALLOW_DEMO_PROCUREMENT_REFRESH=true per la sola esecuzione live.");
  await applyRefresh(audited, data);
  const after = await snapshot(); assertPreserved(before, after, audited.counts.budgets, data.budgets.length);
  const finalAudit = await audit();
  console.log(JSON.stringify({ liveRefresh: "PASS", deleted: audited.counts, created: creates, before: before.counts, after: after.counts, refreshedProcurement: finalAudit.counts, quality: await procurementQuality() }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Refresh fallito."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
