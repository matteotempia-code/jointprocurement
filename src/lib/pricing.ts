export type NumericOffer = { normalizedUnitPrice: unknown; unitPrice: unknown; taxRate?: unknown; preferred: boolean };

export function numeric(value: unknown): number { return Number(value); }

export function effectiveCost(netPrice: unknown, taxRate: unknown, vatDeductibilityPercent: unknown): number {
  const net = numeric(netPrice);
  const vat = numeric(taxRate ?? 0);
  const deductible = numeric(vatDeductibilityPercent);
  if (![net, vat, deductible].every(Number.isFinite) || net < 0 || vat < 0 || deductible < 0 || deductible > 100) {
    throw new Error("Parametri IVA non validi per il calcolo del costo effettivo.");
  }
  return net * (1 + vat / 100 * (1 - deductible / 100));
}

export function getComparablePrice(offer: NumericOffer, vatDeductibilityPercent: unknown = 100): number {
  return effectiveCost(offer.normalizedUnitPrice ?? offer.unitPrice, offer.taxRate, vatDeductibilityPercent);
}

export function getPreferredOffer<T extends NumericOffer>(offers: T[]): T | undefined {
  return offers.find((offer) => offer.preferred);
}

export function compareOffers<T extends NumericOffer>(offers: T[], vatDeductibilityPercent: unknown = 100) {
  const sorted = [...offers].sort((a, b) => getComparablePrice(a, vatDeductibilityPercent) - getComparablePrice(b, vatDeductibilityPercent));
  const lowest = sorted[0];
  const highest = sorted.at(-1);
  const preferred = getPreferredOffer(offers);
  const low = lowest ? getComparablePrice(lowest, vatDeductibilityPercent) : 0;
  const high = highest ? getComparablePrice(highest, vatDeductibilityPercent) : 0;
  const spread = low > 0 ? ((high - low) / low) * 100 : 0;
  const preferredDelta = preferred && low > 0 ? ((getComparablePrice(preferred, vatDeductibilityPercent) - low) / low) * 100 : 0;
  return { sorted, lowest, highest, preferred, spread, preferredDelta, deltaEuro: high - low };
}

export function formatMoney(value: number, digits = 2) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(value) : "—";
}
