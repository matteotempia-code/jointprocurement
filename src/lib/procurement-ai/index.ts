import { extractCommercialConditions } from "@/lib/imports/document-context";
import { LocalHeuristicProvider } from "@/lib/imports/provider";
import { resolveProcurementAIStatus } from "./config";
import type { ProcurementAIProvider } from "./types";
import { OpenAIProcurementProvider } from "./openai";

class LocalProcurementAIProvider implements ProcurementAIProvider {
  id = "LOCAL_HEURISTIC" as const; model = "heuristics-2"; isAi = false; private local = new LocalHeuristicProvider();
  async interpretDocumentContext(text: string) { const terms = extractCommercialConditions(text); return { supplierCandidate: empty(), supplierVatNumber: empty(), priceListTitle: empty(), currency: empty(), issueDate: empty(), validFrom: empty(), validUntil: empty(), commercialConditions: Object.entries(terms).map(([type,value]) => ({ type, value, confidence: .7, sourceEvidence: type, reasoningSummary: "Regola locale" })) }; }
  async interpretCommercialConditions(text: string) { return (await this.interpretDocumentContext(text)).commercialConditions; }
  async interpretProductRow() { return null; } async matchCanonicalProduct() { return null; } async evaluateProductEquivalence() { return null; } async explainMatch() { return null; } async judgeAmbiguousMatch() { return null; }
}
const empty = () => ({ value: null, confidence: 0, sourceEvidence: "", reasoningSummary: "Non rilevato" });

export const procurementAIStatus = resolveProcurementAIStatus({
  PROCUREMENT_AI_ENABLED: process.env.PROCUREMENT_AI_ENABLED,
  PROCUREMENT_AI_PRIMARY_PROVIDER: process.env.PROCUREMENT_AI_PRIMARY_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_PROCUREMENT_MODEL: process.env.OPENAI_PROCUREMENT_MODEL,
});
const configured = procurementAIStatus.state === "OPENAI";
export const procurementAI: ProcurementAIProvider = configured ? new OpenAIProcurementProvider() : new LocalProcurementAIProvider();
export type { ProcurementAIProvider } from "./types";
export { resolveProcurementAIStatus } from "./config";
