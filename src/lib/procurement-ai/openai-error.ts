type OpenAIErrorPayload = {
  error?: {
    type?: unknown;
    code?: unknown;
    message?: unknown;
  };
};

const safeString = (value: unknown, fallback: string, maxLength = 300) => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
};

export type SafeOpenAIErrorDiagnostic = {
  httpStatus: number;
  type: string;
  code: string;
  message: string;
  requestId: string | null;
  operation: string;
  model: string;
};

export function safeOpenAIErrorDiagnostic(input: {
  status: number;
  payload: unknown;
  requestId?: string | null;
  operation: string;
  model: string;
}): SafeOpenAIErrorDiagnostic {
  const payload = input.payload && typeof input.payload === "object" ? input.payload as OpenAIErrorPayload : {};
  return {
    httpStatus: input.status,
    type: safeString(payload.error?.type, "unknown", 100),
    code: safeString(payload.error?.code, `HTTP_${input.status}`, 100),
    message: safeString(payload.error?.message, "OpenAI request failed"),
    requestId: input.requestId ? safeString(input.requestId, "", 150) || null : null,
    operation: safeString(input.operation, "unknown", 100),
    model: safeString(input.model, "unknown", 100),
  };
}
