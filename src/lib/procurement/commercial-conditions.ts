export type CommercialTerms = { minimumOrderValue: unknown; freeShippingThreshold: unknown; shippingFeeBelowThreshold?: unknown; surchargeBelowMinimum?: unknown; currency?: string };
export type CommercialPolicySignal = { code: "BELOW_MINIMUM_ORDER" | "BELOW_FREE_SHIPPING" | "SHIPPING_SURCHARGE_EXPECTED"; severity: "info" | "warning" | "blocking"; message: string; amount?: number };

const amount = (value: unknown) => value == null ? 0 : Number(value);
export function evaluateCommercialConditions(subtotal: number, supplier: CommercialTerms, options: { blockBelowMinimum?: boolean } = {}) {
  const minimum = amount(supplier.minimumOrderValue), freeShipping = amount(supplier.freeShippingThreshold), shippingFee = amount(supplier.shippingFeeBelowThreshold), surcharge = amount(supplier.surchargeBelowMinimum);
  const minimumGap = Math.max(0, minimum - subtotal), freeShippingGap = Math.max(0, freeShipping - subtotal), appliedShipping = freeShippingGap > 0 ? shippingFee : 0, appliedSurcharge = minimumGap > 0 ? surcharge : 0;
  const signals: CommercialPolicySignal[] = [];
  if (minimumGap > 0) signals.push({ code: "BELOW_MINIMUM_ORDER", severity: options.blockBelowMinimum ? "blocking" : "warning", message: `Mancano ${minimumGap.toFixed(2)} € al minimo ordine.`, amount: minimumGap });
  if (freeShippingGap > 0) signals.push({ code: "BELOW_FREE_SHIPPING", severity: "info", message: `Mancano ${freeShippingGap.toFixed(2)} € al franco porto.`, amount: freeShippingGap });
  if (appliedShipping + appliedSurcharge > 0) signals.push({ code: "SHIPPING_SURCHARGE_EXPECTED", severity: "warning", message: `Costi commerciali previsti: ${(appliedShipping + appliedSurcharge).toFixed(2)} €.`, amount: appliedShipping + appliedSurcharge });
  return { subtotal, minimum, freeShipping, minimumGap, freeShippingGap, shippingFee: appliedShipping, surcharge: appliedSurcharge, totalCost: subtotal + appliedShipping + appliedSurcharge, signals };
}
