export type PriceChangeKind = "INCREASE" | "DECREASE" | "UNCHANGED" | "NEW" | "REMOVED" | "PACKAGE_CHANGE" | "NON_COMPARABLE";

export function classifyPriceChange(input: { oldNormalizedPrice: number | null; newNormalizedPrice: number | null; oldPackageQuantity?: number | null; newPackageQuantity?: number | null }) {
  if (input.oldNormalizedPrice == null && input.newNormalizedPrice != null) return { kind: "NEW" as const, deltaAmount: null, deltaPercent: null };
  if (input.oldNormalizedPrice != null && input.newNormalizedPrice == null) return { kind: "NON_COMPARABLE" as const, deltaAmount: null, deltaPercent: null };
  if (input.oldNormalizedPrice == null || input.newNormalizedPrice == null || input.oldNormalizedPrice <= 0) return { kind: "NON_COMPARABLE" as const, deltaAmount: null, deltaPercent: null };
  const deltaAmount = input.newNormalizedPrice - input.oldNormalizedPrice;
  const deltaPercent = deltaAmount / input.oldNormalizedPrice * 100;
  const packageChanged = input.oldPackageQuantity != null && input.newPackageQuantity != null && Math.abs(input.oldPackageQuantity - input.newPackageQuantity) > 0.0001;
  const direction = Math.abs(deltaPercent) < 0.01 ? "UNCHANGED" as const : deltaPercent > 0 ? "INCREASE" as const : "DECREASE" as const;
  return { kind: packageChanged ? "PACKAGE_CHANGE" as const : direction, direction, deltaAmount, deltaPercent };
}

export const priceChangeLabels: Record<PriceChangeKind, string> = {
  INCREASE: "Aumento",
  DECREASE: "Riduzione",
  UNCHANGED: "Invariato",
  NEW: "Nuovo articolo",
  REMOVED: "Rimosso",
  PACKAGE_CHANGE: "Confezione modificata",
  NON_COMPARABLE: "Non confrontabile",
};
