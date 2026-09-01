import test from "node:test";
import assert from "node:assert/strict";
import { isValidGtin, normalizeOptionalGtin } from "../src/lib/validation/gtin";
import { evaluateCommercialConditions } from "../src/lib/procurement/commercial-conditions";
import { approvalSla } from "../src/lib/procurement/approval-sla";
import { supplierMetric } from "../src/lib/procurement/supplier-metric";
import { plural } from "../src/lib/presentation/format";

test("GTIN valida EAN-13/GTIN-14 e rifiuta placeholder", () => {
  assert.equal(isValidGtin("4006381333931"), true);
  assert.equal(isValidGtin("10012345000017"), true);
  assert.equal(isValidGtin("0000000000000"), false);
  assert.equal(normalizeOptionalGtin(null), null);
  assert.throws(() => normalizeOptionalGtin("4006381333932"), /valido/);
});

test("condizioni commerciali distinguono minimo, franco e costo totale", () => {
  const result = evaluateCommercialConditions(214, { minimumOrderValue: 350, freeShippingThreshold: 750, shippingFeeBelowThreshold: 24, surchargeBelowMinimum: 12 });
  assert.equal(result.minimumGap, 136); assert.equal(result.freeShippingGap, 536); assert.equal(result.totalCost, 250);
  assert.deepEqual(result.signals.map(({ code }) => code), ["BELOW_MINIMUM_ORDER", "BELOW_FREE_SHIPPING", "SHIPPING_SURCHARGE_EXPECTED"]);
});

test("metriche fornitore non mostrano percentuali con campione insufficiente", () => {
  assert.match(supplierMetric(100, 4, "Puntualità").label, /Dati insufficienti/);
  assert.equal(supplierMetric(80, 5, "Puntualità").label, "80.0%");
});

test("SLA approvazioni e plurali sono deterministici", () => {
  const now = new Date("2026-09-10T12:00:00Z");
  assert.equal(approvalSla(new Date("2026-09-05T12:00:00Z"), now).state, "overdue");
  assert.equal(plural(1, "registrazione", "registrazioni"), "1 registrazione");
  assert.equal(plural(10, "pezzo", "pezzi"), "10 pezzi");
});
