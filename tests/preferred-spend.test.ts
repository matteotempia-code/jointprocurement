import assert from "node:assert/strict";
import test from "node:test";
import { preferredSpendShare } from "../src/lib/procurement/preferred-spend";

test("acquisti convenzionati is the share of actual spend, not offer count", () => {
  const share = preferredSpendShare([
    { supplierId: "preferred", canonicalProductId: "p1", amount: 900 },
    { supplierId: "other", canonicalProductId: "p1", amount: 100 },
  ], ["preferred:p1"]);
  assert.equal(share, 90);
});

test("preferred offers without purchases do not inflate compliance", () => {
  assert.equal(preferredSpendShare([{ supplierId: "other", canonicalProductId: "p1", amount: 100 }], ["preferred:p1"]), 0);
});
