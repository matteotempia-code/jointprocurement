import assert from "node:assert/strict";
import test from "node:test";
import { requireFiniteProcurementLimitMaximum, validateProcurementLimit } from "../src/lib/procurement/limit-validation";

const base = {
  periodStart: new Date("2026-01-01"),
  periodEnd: new Date("2026-12-31"),
  canonicalProductId: "product-1",
  categoryId: null,
};

test("valid procurement limits preserve a positive explicit maximum", () => {
  assert.deepEqual(validateProcurementLimit({ ...base, limitType: "MONETARY", maximumAmount: "125.50" }), {
    maximumAmount: 125.5,
    maximumQuantity: null,
  });
  assert.deepEqual(validateProcurementLimit({ ...base, limitType: "QUANTITY", maximumQuantity: 10, quantityUom: "pezzi" }), {
    maximumAmount: null,
    maximumQuantity: 10,
  });
});

test("null, NaN, non-positive, mixed and incomplete limits fail explicitly", () => {
  assert.throws(() => validateProcurementLimit({ ...base, limitType: "MONETARY", maximumAmount: null }), /obbligatorio/);
  assert.throws(() => validateProcurementLimit({ ...base, limitType: "MONETARY", maximumAmount: "NaN" }), /numero positivo/);
  assert.throws(() => validateProcurementLimit({ ...base, limitType: "QUANTITY", maximumQuantity: 0, quantityUom: "pezzi" }), /numero positivo/);
  assert.throws(() => validateProcurementLimit({ ...base, limitType: "QUANTITY", maximumQuantity: 1, quantityUom: " " }), /misura/);
  assert.throws(() => validateProcurementLimit({ ...base, categoryId: "category-1", limitType: "MONETARY", maximumAmount: 1 }), /contemporaneamente/);
  assert.throws(() => validateProcurementLimit({ ...base, periodEnd: base.periodStart, limitType: "MONETARY", maximumAmount: 1 }), /periodo/);
});

test("limit evaluation fails explicitly when a stored maximum is not finite", () => {
  assert.throws(
    () => requireFiniteProcurementLimitMaximum({ limitType: "MONETARY", maximumAmount: "NaN", maximumQuantity: null }),
    /massimo deve essere finito/,
  );
  assert.throws(
    () => requireFiniteProcurementLimitMaximum({ limitType: "QUANTITY", maximumAmount: null, maximumQuantity: Infinity }),
    /massimo deve essere finito/,
  );
});
