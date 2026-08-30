import assert from "node:assert/strict";
import test from "node:test";
import { compareOffers, getPreferredOffer } from "../src/lib/pricing";

const offers = [
  { unitPrice: 4.18, normalizedUnitPrice: 0.0418, preferred: false, supplier: "B" },
  { unitPrice: 3.72, normalizedUnitPrice: 0.0372, preferred: true, supplier: "A" },
];

test("preferred offer determination follows the explicit domain flag", () => {
  assert.equal(getPreferredOffer(offers)?.supplier, "A");
});

test("price comparison uses normalized prices and calculates spread", () => {
  const result = compareOffers(offers);
  assert.equal(result.lowest?.supplier, "A");
  assert.equal(result.preferredDelta, 0);
  assert.ok(Math.abs(result.spread - 12.3655913978) < 0.0001);
});

test("comparison exposes a preferred premium when preferred is not lowest", () => {
  const result = compareOffers([
    { unitPrice: 10, normalizedUnitPrice: 2, preferred: false },
    { unitPrice: 12, normalizedUnitPrice: 2.4, preferred: true },
  ]);
  assert.ok(Math.abs(result.preferredDelta - 20) < 0.0001);
});
