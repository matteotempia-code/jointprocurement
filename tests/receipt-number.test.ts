import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { receiptNumberFromId } from "../src/lib/procurement/receipt-number";

test("receipt numbers stay unique when receipts are created concurrently", () => {
  const receivedAt = new Date("2026-09-06T12:00:00Z");
  const numbers = Array.from({ length: 1_000 }, () => receiptNumberFromId(randomUUID(), receivedAt));

  assert.equal(new Set(numbers).size, numbers.length);
  assert.ok(numbers.every((number) => /^GR-2026-[0-9A-F]{16}$/.test(number)));
});

test("receipt numbers reject malformed identifiers", () => {
  assert.throws(() => receiptNumberFromId("short"), /Identificativo di ricezione non valido/);
});
