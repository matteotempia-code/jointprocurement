import assert from "node:assert/strict";
import test from "node:test";
import { assertSavingStatusTransition, SAVING_STATUS_TRANSITIONS } from "../src/lib/procurement/savings-lifecycle";

test("savings lifecycle declares the ROI path in one place", () => {
  assert.deepEqual(SAVING_STATUS_TRANSITIONS.IDENTIFIED, ["NEGOTIATED", "DISMISSED", "STALE"]);
  assert.doesNotThrow(() => assertSavingStatusTransition("IDENTIFIED", "NEGOTIATED"));
  assert.doesNotThrow(() => assertSavingStatusTransition("NEGOTIATED", "CONTRACTED"));
  assert.doesNotThrow(() => assertSavingStatusTransition("CONTRACTED", "REALIZED"));
});

test("savings lifecycle rejects skipped and reversed ROI states", () => {
  assert.throws(() => assertSavingStatusTransition("IDENTIFIED", "REALIZED"), /non ammessa/);
  assert.throws(() => assertSavingStatusTransition("REALIZED", "CONTRACTED"), /non ammessa/);
  assert.throws(() => assertSavingStatusTransition("NEGOTIATED", "IDENTIFIED"), /non ammessa/);
});
