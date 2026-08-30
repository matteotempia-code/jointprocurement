export type NumericOffer = { normalizedUnitPrice: unknown; unitPrice: unknown; preferred: boolean };

export function numeric(value: unknown): number { return Number(value); }

export function getComparablePrice(offer: NumericOffer): number {
  return numeric(offer.normalizedUnitPrice ?? offer.unitPrice);
}

export function getPreferredOffer<T extends NumericOffer>(offers: T[]): T | undefined {
  return offers.find((offer) => offer.preferred);
}

export function compareOffers<T extends NumericOffer>(offers: T[]) {
  const sorted = [...offers].sort((a, b) => getComparablePrice(a) - getComparablePrice(b));
  const lowest = sorted[0];
  const highest = sorted.at(-1);
  const preferred = getPreferredOffer(offers);
  const low = lowest ? getComparablePrice(lowest) : 0;
  const high = highest ? getComparablePrice(highest) : 0;
  const spread = low > 0 ? ((high - low) / low) * 100 : 0;
  const preferredDelta = preferred && low > 0 ? ((getComparablePrice(preferred) - low) / low) * 100 : 0;
  return { sorted, lowest, highest, preferred, spread, preferredDelta, deltaEuro: high - low };
}

export function formatMoney(value: number, digits = 2) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(value) : "—";
}
