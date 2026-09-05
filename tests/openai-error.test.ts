import assert from "node:assert/strict";
import test from "node:test";
import { isOpenAIRequestTimeout, openAIRequestSignal, safeOpenAIErrorDiagnostic } from "../src/lib/procurement-ai/openai-error";

test("OpenAI failure diagnostics preserve quota category without leaking credentials", () => {
  const diagnostic = safeOpenAIErrorDiagnostic({
    status: 429,
    payload: { error: { type: "insufficient_quota", code: "insufficient_quota", message: "Quota exhausted for sk-secret at https://example.test/details\nRetry later." } },
    requestId: "req_safe_123",
    operation: "DOCUMENT_CONTEXT",
    model: "gpt-5-mini",
  });

  assert.deepEqual(diagnostic, {
    httpStatus: 429,
    type: "insufficient_quota",
    code: "insufficient_quota",
    message: "Quota exhausted for [redacted] at [url] Retry later.",
    requestId: "req_safe_123",
    operation: "DOCUMENT_CONTEXT",
    model: "gpt-5-mini",
  });
  assert.doesNotMatch(JSON.stringify(diagnostic), /sk-secret|example\.test/);
});

test("OpenAI failure diagnostics use bounded safe fallbacks for malformed responses", () => {
  const diagnostic = safeOpenAIErrorDiagnostic({ status: 429, payload: "not-json", operation: "ROW_INTERPRETATION", model: "gpt-5-mini" });
  assert.equal(diagnostic.type, "unknown");
  assert.equal(diagnostic.code, "HTTP_429");
  assert.equal(diagnostic.requestId, null);
});

test("OpenAI requests have a bounded timeout that can trigger local fallback", async () => {
  const signal = openAIRequestSignal(5);
  await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
  assert.equal(signal.aborted, true);
  assert.equal(isOpenAIRequestTimeout(signal.reason), true);
});
