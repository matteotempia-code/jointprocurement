import assert from "node:assert/strict";
import test from "node:test";
import { compareOffers, effectiveCost, getPreferredOffer } from "../src/lib/pricing";

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

test("effective cost includes only the non-deductible VAT component", () => {
  assert.equal(effectiveCost(100, 22, 100), 100);
  assert.equal(effectiveCost(100, 22, 50), 111);
  assert.equal(effectiveCost(100, 22, 0), 122);
});

test("offer ordering uses effective cost for partially deductible VAT", () => {
  const candidates = [
    { unitPrice: 10, normalizedUnitPrice: 10, taxRate: 22, preferred: false, supplier: "A" },
    { unitPrice: 10.5, normalizedUnitPrice: 10.5, taxRate: 4, preferred: false, supplier: "B" },
  ];
  assert.equal(compareOffers(candidates, 100).lowest?.supplier, "A");
  assert.equal(compareOffers(candidates, 0).lowest?.supplier, "B");
});
