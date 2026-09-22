import assert from "node:assert/strict";
import test from "node:test";
import { formatDocumentNumber } from "../src/lib/procurement/document-number";

test("document numbering is annual, typed and zero padded", () => {
  assert.equal(formatDocumentNumber("REQUISITION", 2026, 1), "PR-2026-000001");
  assert.equal(formatDocumentNumber("PURCHASE_ORDER", 2027, 42), "PO-2027-000042");
  assert.equal(formatDocumentNumber("OUT_OF_CATALOG", 2027, 9), "FC-2027-000009");
  assert.equal(formatDocumentNumber("RECEIPT", 2027, 10), "GR-2027-000010");
});

test("document numbering rejects invalid sequence values", () => {
  assert.throws(() => formatDocumentNumber("REQUISITION", 2026, 0), /non valida/);
});
