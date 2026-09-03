import type { InterpretedFields, MatchableProduct, NormalizedImport } from "@/lib/imports/types";

export type EvidenceValue<T> = { value: T | null; confidence: number; sourceEvidence: string; reasoningSummary: string };
export type DocumentIntelligence = {
  supplierCandidate: EvidenceValue<string>; supplierVatNumber: EvidenceValue<string>; priceListTitle: EvidenceValue<string>;
  currency: EvidenceValue<string>; issueDate: EvidenceValue<string>; validFrom: EvidenceValue<string>; validUntil: EvidenceValue<string>;
  commercialConditions: Array<{ type: string; value: string | number | null; confidence: number; sourceEvidence: string; reasoningSummary: string }>;
};
export type ProductInterpretation = { fields: InterpretedFields; confidence: number; evidence: string[] };
export type AIMatchJudgement = {
  candidateId: string | null; classification: "EXACT_PRODUCT" | "SAME_CANONICAL_PRODUCT" | "FUNCTIONALLY_EQUIVALENT" | "SIMILAR_NOT_EQUIVALENT" | "NOT_COMPARABLE" | "INSUFFICIENT_INFORMATION";
  confidence: number; commonAttributes: string[]; differences: string[]; blockingDifferences: string[]; missingEvidence: string[]; recommendedAction: string;
};
export type AIContext = { organizationId: string; importJobId?: string; operation: string };
export interface ProcurementAIProvider {
  id: "OPENAI" | "LOCAL_HEURISTIC" | "ANTHROPIC"; model: string | null; isAi: boolean;
  interpretDocumentContext(text: string, suppliers: { id: string; name: string; vatNumber: string | null }[], context: AIContext): Promise<DocumentIntelligence | null>;
  interpretCommercialConditions(text: string, context: AIContext): Promise<DocumentIntelligence["commercialConditions"]>;
  interpretProductRow(raw: string, headers: Record<string, unknown>, context: AIContext): Promise<ProductInterpretation | null>;
  matchCanonicalProduct(record: NormalizedImport, candidates: MatchableProduct[], context: AIContext): Promise<AIMatchJudgement | null>;
  evaluateProductEquivalence(record: NormalizedImport, candidate: MatchableProduct, context: AIContext): Promise<AIMatchJudgement | null>;
  explainMatch(record: NormalizedImport, candidate: MatchableProduct, context: AIContext): Promise<AIMatchJudgement | null>;
  judgeAmbiguousMatch(record: NormalizedImport, candidates: MatchableProduct[], context: AIContext): Promise<AIMatchJudgement | null>;
}
