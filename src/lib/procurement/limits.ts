import "server-only";
import { prisma } from "@/lib/prisma";

export type LimitCandidateLine = { canonicalProductId: string; categoryId: string; productName: string; quantity: number; unitPrice: number; unitsPerPackage?: number | null; consumptionUomLabel?: string | null };
export type ProcurementLimitEvaluation = { limitId: string; productId: string; productName: string; scopeLabel: string; periodLabel: string; kind: "MONETARY" | "QUANTITY"; uom: string; limit: number; used: number; committed: number; reserved: number; requested: number; remainingAfter: number; exceeded: boolean };

const amountFor = (line: LimitCandidateLine, kind: "MONETARY" | "QUANTITY") => kind === "MONETARY" ? line.quantity * line.unitPrice : line.quantity * (line.unitsPerPackage ?? 1);

export async function evaluateFacilityProcurementLimits(facilityId: string, lines: LimitCandidateLine[], at = new Date()): Promise<ProcurementLimitEvaluation[]> {
  if (!lines.length) return [];
  const productIds = [...new Set(lines.map((line) => line.canonicalProductId))];
  const categoryIds = [...new Set(lines.map((line) => line.categoryId))];
  const limits = await prisma.procurementLimit.findMany({
    where: { facilityId, active: true, periodStart: { lte: at }, periodEnd: { gte: at }, OR: [{ canonicalProductId: { in: productIds } }, { categoryId: { in: categoryIds } }] },
    include: { facility: true, category: true, canonicalProduct: true },
    orderBy: [{ canonicalProductId: "desc" }, { periodStart: "desc" }],
  });
  if (!limits.length) return [];
  const periodStart = new Date(Math.min(...limits.map((limit) => limit.periodStart.getTime())));
  const [orders, pending] = await Promise.all([
    prisma.purchaseOrderLine.findMany({ where: { canonicalProductId: { in: productIds }, purchaseOrder: { facilityId, status: { not: "CANCELLED" }, issuedAt: { gte: periodStart, lte: at } } }, include: { purchaseOrder: true, canonicalProduct: true, receiptLines: true } }),
    prisma.purchaseRequisitionLine.findMany({ where: { canonicalProductId: { in: productIds }, requisition: { facilityId, status: "PENDING_APPROVAL", submittedAt: { gte: periodStart, lte: at } } }, include: { requisition: true, canonicalProduct: true } }),
  ]);

  return lines.flatMap((line) => {
    const applicable = limits.filter((limit) => limit.canonicalProductId === line.canonicalProductId || (!limit.canonicalProductId && limit.categoryId === line.categoryId));
    const selectedLimits = (["MONETARY", "QUANTITY"] as const).flatMap((kind) => {
      const sameKind = applicable.filter((limit) => limit.limitType === kind);
      const selected = sameKind.find((limit) => limit.canonicalProductId === line.canonicalProductId) ?? sameKind[0];
      return selected ? [selected] : [];
    });
    return selectedLimits.map((selected) => {
      const kind = selected.limitType;
      const relatedOrders = orders.filter((item) => item.canonicalProductId === line.canonicalProductId && item.purchaseOrder.issuedAt >= selected.periodStart && item.purchaseOrder.issuedAt <= selected.periodEnd);
      const factor = (item: (typeof relatedOrders)[number]) => kind === "QUANTITY" ? Number(item.canonicalProduct.unitsPerPackage ?? 1) : Number(item.unitPrice);
      const used = relatedOrders.reduce((sum, item) => sum + item.receiptLines.reduce((receiptSum, receipt) => receiptSum + Number(receipt.quantityAccepted), 0) * factor(item), 0);
      const committed = relatedOrders.reduce((sum, item) => { const received = item.receiptLines.reduce((receiptSum, receipt) => receiptSum + Number(receipt.quantityReceived), 0); return sum + Math.max(0, Number(item.quantity) - received) * factor(item); }, 0);
      const reserved = pending.filter((item) => item.canonicalProductId === line.canonicalProductId && item.requisition.submittedAt && item.requisition.submittedAt >= selected.periodStart && item.requisition.submittedAt <= selected.periodEnd).reduce((sum, item) => sum + Number(item.quantity) * (kind === "QUANTITY" ? Number(item.canonicalProduct.unitsPerPackage ?? 1) : Number(item.unitPrice)), 0);
      const requested = amountFor(line, kind);
      const maximum = Number(kind === "MONETARY" ? selected.maximumAmount : selected.maximumQuantity);
      const remainingAfter = maximum - used - committed - reserved - requested;
      return { limitId: selected.id, productId: line.canonicalProductId, productName: line.productName, scopeLabel: `${selected.facility.name} · ${selected.canonicalProduct?.name ?? selected.category?.name ?? "Limite"}`, periodLabel: `${selected.periodStart.toLocaleDateString("it-IT")} – ${selected.periodEnd.toLocaleDateString("it-IT")}`, kind, uom: kind === "MONETARY" ? "EUR" : selected.quantityUom ?? line.consumptionUomLabel ?? "unità", limit: maximum, used, committed, reserved, requested, remainingAfter, exceeded: remainingAfter < 0 };
    });
  });
}
