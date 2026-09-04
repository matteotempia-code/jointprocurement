import assert from "node:assert/strict";
import test from "node:test";
import { resolveProcurementAIStatus } from "../src/lib/procurement-ai/config";

test("Procurement AI reports disabled instead of silently implying OpenAI", () => {
  const status = resolveProcurementAIStatus({});
  assert.equal(status.state, "DISABLED");
  assert.equal(status.activeProvider, "LOCAL_HEURISTIC");
  assert.match(status.reason, /nessun invio esterno/i);
  assert.equal(status.processingExplanation, "Procurement AI è disabilitata in questo ambiente. Il documento verrà elaborato localmente senza invio a provider AI esterni.");
});

test("Procurement AI reports fallback when OpenAI is requested without a key", () => {
  const status = resolveProcurementAIStatus({ PROCUREMENT_AI_ENABLED: "true", PROCUREMENT_AI_PRIMARY_PROVIDER: "openai" });
  assert.equal(status.state, "FALLBACK");
  assert.equal(status.fallbackActive, true);
  assert.match(status.reason, /OPENAI_API_KEY/);
  assert.equal(status.processingExplanation, "Procurement AI non è disponibile in questo momento. Il documento verrà elaborato con parser deterministico e mapping euristico locale.");
});

test("Procurement AI reports OpenAI only with explicit enablement and key", () => {
  const status = resolveProcurementAIStatus({ PROCUREMENT_AI_ENABLED: "true", PROCUREMENT_AI_PRIMARY_PROVIDER: "openai", OPENAI_API_KEY: "test-placeholder", OPENAI_PROCUREMENT_MODEL: "gpt-5-mini" });
  assert.equal(status.state, "OPENAI");
  assert.equal(status.activeProvider, "OPENAI");
  assert.equal(status.model, "gpt-5-mini");
  assert.equal(status.processingExplanation, "Il documento verrà letto dal parser deterministico e interpretato con Procurement AI tramite OpenAI. Fornitore, condizioni commerciali e righe ambigue possono essere proposti automaticamente; le decisioni incerte restano soggette a conferma umana.");
});
