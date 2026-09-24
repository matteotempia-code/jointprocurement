import assert from "node:assert/strict";
import test from "node:test";
import {
  actionId,
  actionQuantity,
  procurementActionSchemas,
} from "../src/lib/procurement/action-validation";

test("procurement action quantities reject empty, NaN and out-of-range values", () => {
  for (const value of ["", "NaN", Number.NaN, "0", "-1", "1000001"]) {
    assert.throws(() => actionQuantity(value), /Quantità non valida/);
  }
  assert.equal(actionQuantity("2.5"), 2.5);
  assert.equal(actionQuantity("0", { removable: true }), 0);
});

test("procurement action identifiers and decisions are constrained", () => {
  assert.throws(() => actionId("", "productId"), /productId/);
  assert.throws(() => actionId("\u0000", "productId"), /productId/);
  assert.equal(actionId("cert_product", "productId"), "cert_product");
  assert.equal(procurementActionSchemas.decision.parse("APPROVED"), "APPROVED");
  assert.throws(() => procurementActionSchemas.decision.parse("IGNORE"));
});
