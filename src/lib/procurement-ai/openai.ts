import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { AIContext, AIMatchJudgement, DocumentIntelligence, ProcurementAIProvider, ProductInterpretation } from "./types";
import type { MatchableProduct, NormalizedImport } from "@/lib/imports/types";
import { isOpenAIRequestTimeout, openAIRequestSignal, openAIRequestTimeoutMs, safeOpenAIErrorDiagnostic } from "./openai-error";

const evidenceSchema = z.object({ value: z.string().nullable(), confidence: z.number().min(0).max(1), sourceEvidence: z.string(), reasoningSummary: z.string() });
const documentSchema = z.object({ supplierCandidate: evidenceSchema, supplierVatNumber: evidenceSchema, priceListTitle: evidenceSchema, currency: evidenceSchema, issueDate: evidenceSchema, validFrom: evidenceSchema, validUntil: evidenceSchema, commercialConditions: z.array(z.object({ type: z.string(), value: z.union([z.string(), z.number()]).nullable(), confidence: z.number().min(0).max(1), sourceEvidence: z.string(), reasoningSummary: z.string() })) });
const rowSchema = z.object({ fields: z.record(z.string(), z.union([z.string(), z.number(), z.null()])), confidence: z.number().min(0).max(1), evidence: z.array(z.string()) });
const matchSchema = z.object({ candidateId: z.string().nullable(), classification: z.enum(["EXACT_PRODUCT","SAME_CANONICAL_PRODUCT","FUNCTIONALLY_EQUIVALENT","SIMILAR_NOT_EQUIVALENT","NOT_COMPARABLE","INSUFFICIENT_INFORMATION"]), confidence: z.number().min(0).max(1), commonAttributes: z.array(z.string()), differences: z.array(z.string()), blockingDifferences: z.array(z.string()), missingEvidence: z.array(z.string()), recommendedAction: z.string() });
const field = { type: "object", additionalProperties: false, required: ["value","confidence","sourceEvidence","reasoningSummary"], properties: { value: { type: ["string","null"] }, confidence: { type: "number" }, sourceEvidence: { type: "string" }, reasoningSummary: { type: "string" } } };
const documentJsonSchema = { type: "object", additionalProperties: false, required: ["supplierCandidate","supplierVatNumber","priceListTitle","currency","issueDate","validFrom","validUntil","commercialConditions"], properties: { supplierCandidate: field, supplierVatNumber: field, priceListTitle: field, currency: field, issueDate: field, validFrom: field, validUntil: field, commercialConditions: { type: "array", items: { type: "object", additionalProperties: false, required: ["type","value","confidence","sourceEvidence","reasoningSummary"], properties: { type: { type: "string" }, value: { type: ["string","number","null"] }, confidence: { type: "number" }, sourceEvidence: { type: "string" }, reasoningSummary: { type: "string" } } } } } };
const rowFieldNames = ["supplierSku","manufacturerSku","ean","description","brand","manufacturer","category","subcategory","purchaseUom","packageDescription","unitsPerPackage","consumptionUom","grossPrice","discount","netPrice","taxRate","currency","moq","validFrom","validUntil","leadTimeDays","notes"];
const rowJsonSchema = { type: "object", additionalProperties: false, required: ["fields","confidence","evidence"], properties: { fields: { type: "object", additionalProperties: false, required: rowFieldNames, properties: Object.fromEntries(rowFieldNames.map((name) => [name, { type: ["string","number","null"] }])) }, confidence: { type: "number" }, evidence: { type: "array", items: { type: "string" } } } };
const matchJsonSchema = { type: "object", additionalProperties: false, required: ["candidateId","classification","confidence","commonAttributes","differences","blockingDifferences","missingEvidence","recommendedAction"], properties: { candidateId: { type: ["string","null"] }, classification: { type: "string", enum: ["EXACT_PRODUCT","SAME_CANONICAL_PRODUCT","FUNCTIONALLY_EQUIVALENT","SIMILAR_NOT_EQUIVALENT","NOT_COMPARABLE","INSUFFICIENT_INFORMATION"] }, confidence: { type: "number" }, commonAttributes: { type: "array", items: { type: "string" } }, differences: { type: "array", items: { type: "string" } }, blockingDifferences: { type: "array", items: { type: "string" } }, missingEvidence: { type: "array", items: { type: "string" } }, recommendedAction: { type: "string" } } };

export class OpenAIProcurementProvider implements ProcurementAIProvider {
  id = "OPENAI" as const; isAi = true; model = process.env.OPENAI_PROCUREMENT_MODEL?.trim() || "gpt-5-mini";
  private async call<T>(instructions: string, input: unknown, name: string, schema: object, validator: z.ZodType<T>, context: AIContext): Promise<T | null> {
    const started = Date.now(); let state = "FAILED"; let usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number } = {}; let errorCode: string | undefined;
    try {
      const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: this.model, instructions, input: JSON.stringify(input), text: { format: { type: "json_schema", name, strict: true, schema } } }), signal: openAIRequestSignal(openAIRequestTimeoutMs(context.operation)) });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const diagnostic = safeOpenAIErrorDiagnostic({
          status: response.status,
          payload,
          requestId: response.headers.get("x-request-id") ?? response.headers.get("request-id"),
          operation: context.operation,
          model: this.model,
        });
        errorCode = diagnostic.code;
        console.error("PROCUREMENT_AI_PROVIDER_ERROR", diagnostic);
        throw new Error(`OpenAI request failed (${response.status})`);
      }
      const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: typeof usage };
      usage = payload.usage ?? {}; const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
      if (!text) throw new Error("OpenAI structured output missing"); const parsed = validator.parse(JSON.parse(text)); state = "SUCCEEDED"; return parsed;
    } catch (error) {
      const timedOut = isOpenAIRequestTimeout(error);
      errorCode ??= timedOut ? "PROVIDER_TIMEOUT" : error instanceof z.ZodError ? "SCHEMA_VALIDATION" : "PROVIDER_ERROR";
      if (timedOut) console.error("PROCUREMENT_AI_PROVIDER_ERROR", { httpStatus: null, type: "request_timeout", code: errorCode, message: "OpenAI request timed out", requestId: null, operation: context.operation, model: this.model });
      return null;
    }
    finally { await prisma.procurementAICall.create({ data: { organizationId: context.organizationId, importJobId: context.importJobId, provider: this.id, model: this.model!, operation: context.operation, latencyMs: Date.now() - started, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, totalTokens: usage.total_tokens, resultState: state, errorCode } }).catch(() => {}); }
  }
  interpretDocumentContext(text: string, suppliers: { id: string; name: string; vatNumber: string | null }[], context: AIContext) { return this.call<DocumentIntelligence>("Extract procurement document identity and source-backed commercial terms. Never invent missing values. Evidence must be a short verbatim fragment, not hidden reasoning.", { documentText: text.slice(0,12000), supplierCandidates: suppliers.slice(0,100) }, "procurement_document", documentJsonSchema, documentSchema, context); }
  async interpretCommercialConditions(text: string, context: AIContext) { return (await this.interpretDocumentContext(text, [], { ...context, operation: "COMMERCIAL_CONDITIONS" }))?.commercialConditions ?? []; }
  interpretProductRow(raw: string, headers: Record<string, unknown>, context: AIContext) { return this.call<ProductInterpretation>("Interpret one supplier price-list row. Preserve source meaning. Parse packaging phrases, but do not calculate normalized economics. Use only canonical field names supplied by the application.", { raw, fields: headers }, "procurement_row", rowJsonSchema, rowSchema, context); }
  matchCanonicalProduct(record: NormalizedImport, candidates: MatchableProduct[], context: AIContext) { return this.call<AIMatchJudgement>("Judge identity separately from functional equivalence. Missing critical attributes means INSUFFICIENT_INFORMATION. Never select outside the bounded candidates. Return concise evidence, not chain-of-thought.", { record, candidates: candidates.slice(0,8) }, "procurement_match", matchJsonSchema, matchSchema, context); }
  evaluateProductEquivalence(record: NormalizedImport, candidate: MatchableProduct, context: AIContext) { return this.matchCanonicalProduct(record, [candidate], { ...context, operation: "EVALUATE_EQUIVALENCE" }); }
  explainMatch(record: NormalizedImport, candidate: MatchableProduct, context: AIContext) { return this.matchCanonicalProduct(record, [candidate], { ...context, operation: "EXPLAIN_MATCH" }); }
  judgeAmbiguousMatch(record: NormalizedImport, candidates: MatchableProduct[], context: AIContext) { return this.matchCanonicalProduct(record, candidates, { ...context, operation: "JUDGE_AMBIGUOUS_MATCH" }); }
}
