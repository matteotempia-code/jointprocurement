import assert from "node:assert/strict";
import test from "node:test";
import { selectHistoricalBaseline } from "../src/lib/procurement/savings-baseline";

test("savings baseline uses the latest historically paid effective price", () => {
  const baseline = selectHistoricalBaseline(
    [
      {
        id: "old",
        unitPrice: 140,
        taxRate: 22,
        unitsPerPackage: 10,
        issuedAt: new Date("2026-01-01"),
        facilityId: "f1",
      },
      {
        id: "latest",
        unitPrice: 100,
        taxRate: 22,
        unitsPerPackage: 10,
        issuedAt: new Date("2026-06-01"),
        facilityId: "f2",
      },
    ],
    50,
  );
  assert.equal(baseline?.purchaseOrderLineId, "latest");
  assert.equal(baseline?.price, 11.1);
});

test("savings baseline does not invent a price without purchase history", () => {
  assert.equal(selectHistoricalBaseline([], 100), null);
});
