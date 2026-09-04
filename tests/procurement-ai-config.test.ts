import assert from "node:assert/strict";
import test from "node:test";
import { resolveProcurementAIStatus } from "../src/lib/procurement-ai/config";

test("Procurement AI reports disabled instead of silently implying OpenAI", () => {
  const status = resolveProcurementAIStatus({});
  assert.equal(status.state, "DISABLED");
  assert.equal(status.activeProvider, "LOCAL_HEURISTIC");
  assert.match(status.reason, /nessun invio esterno/i);
});

test("Procurement AI reports fallback when OpenAI is requested without a key", () => {
  const status = resolveProcurementAIStatus({ PROCUREMENT_AI_ENABLED: "true", PROCUREMENT_AI_PRIMARY_PROVIDER: "openai" });
  assert.equal(status.state, "FALLBACK");
  assert.equal(status.fallbackActive, true);
  assert.match(status.reason, /OPENAI_API_KEY/);
});

test("Procurement AI reports OpenAI only with explicit enablement and key", () => {
  const status = resolveProcurementAIStatus({ PROCUREMENT_AI_ENABLED: "true", PROCUREMENT_AI_PRIMARY_PROVIDER: "openai", OPENAI_API_KEY: "test-placeholder", OPENAI_PROCUREMENT_MODEL: "gpt-5-mini" });
  assert.equal(status.state, "OPENAI");
  assert.equal(status.activeProvider, "OPENAI");
  assert.equal(status.model, "gpt-5-mini");
});
