import { effectiveCost } from "@/lib/pricing";

export type HistoricalPriceLine = {
  id: string;
  unitPrice: unknown;
  taxRate: unknown;
  issuedAt: Date;
  facilityId: string;
  unitsPerPackage: unknown;
};

export function selectHistoricalBaseline(lines: HistoricalPriceLine[], vatDeductibilityPercent: unknown) {
  const latest = [...lines].sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())[0];
  if (!latest) return null;
  const units = Number(latest.unitsPerPackage);
  if (!Number.isFinite(units) || units <= 0) return null;
  return {
    price: effectiveCost(latest.unitPrice, latest.taxRate, vatDeductibilityPercent) / units,
    purchaseOrderLineId: latest.id,
    facilityId: latest.facilityId,
    issuedAt: latest.issuedAt,
  };
}
