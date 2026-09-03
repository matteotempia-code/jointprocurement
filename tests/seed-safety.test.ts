import assert from "node:assert/strict";
import test from "node:test";
import { assertDemoSeedSafety } from "../prisma/seed-safety";

test("demo seed requires both an explicit DEV marker and deliberate opt-in", () => {
  assert.throws(() => assertDemoSeedSafety({}), /Seed demo bloccato/);
  assert.throws(() => assertDemoSeedSafety({ SORGENCE_ENVIRONMENT: "development" }), /Seed demo bloccato/);
  assert.throws(() => assertDemoSeedSafety({ ALLOW_DEMO_SEED: "true" }), /Seed demo bloccato/);
  assert.doesNotThrow(() => assertDemoSeedSafety({ SORGENCE_ENVIRONMENT: "development", ALLOW_DEMO_SEED: "true" }));
});

test("demo seed always rejects NODE_ENV=production", () => {
  assert.throws(() => assertDemoSeedSafety({ NODE_ENV: "production", SORGENCE_ENVIRONMENT: "development", ALLOW_DEMO_SEED: "true" }), /Seed demo bloccato/);
});
