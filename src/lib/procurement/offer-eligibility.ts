export type PurchasableOffer = { active: boolean; validFrom: Date | null; validUntil: Date | null; supplier: { active: boolean } };

export function offerAvailability(offer: PurchasableOffer, at = new Date()) {
  if (!offer.active) return { purchasable: false, reason: "OFFER_INACTIVE" as const };
  if (!offer.supplier.active) return { purchasable: false, reason: "SUPPLIER_INACTIVE" as const };
  if (offer.validFrom && offer.validFrom > at) return { purchasable: false, reason: "OFFER_NOT_STARTED" as const };
  if (offer.validUntil && offer.validUntil < at) return { purchasable: false, reason: "OFFER_EXPIRED" as const };
  return { purchasable: true, reason: null };
}

export function validReceiptQuantity(value: number, remaining: number) {
  return Number.isFinite(value) && value >= 0 && value <= remaining;
}
