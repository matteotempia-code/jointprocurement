type ProcurementAIEnvironment = {
  PROCUREMENT_AI_ENABLED?: string;
  PROCUREMENT_AI_PRIMARY_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  OPENAI_PROCUREMENT_MODEL?: string;
};

export function resolveProcurementAIStatus(environment: ProcurementAIEnvironment) {
  const enabled = /^(1|true|yes)$/i.test(environment.PROCUREMENT_AI_ENABLED ?? "false");
  const requestedProvider = (environment.PROCUREMENT_AI_PRIMARY_PROVIDER ?? "local").trim().toLowerCase();
  const hasApiKey = Boolean(environment.OPENAI_API_KEY?.trim());
  const openAIActive = enabled && requestedProvider === "openai" && hasApiKey;
  const model = environment.OPENAI_PROCUREMENT_MODEL?.trim() || "gpt-5-mini";

  if (openAIActive) return {
    enabled,
    requestedProvider,
    activeProvider: "OPENAI" as const,
    model,
    fallbackActive: false,
    state: "OPENAI" as const,
    reason: `OpenAI attivo con modello ${model}.`,
    processingExplanation: "Il documento verrà letto dal parser deterministico e interpretato con Procurement AI tramite OpenAI. Fornitore, condizioni commerciali e righe ambigue possono essere proposti automaticamente; le decisioni incerte restano soggette a conferma umana.",
  };
  if (!enabled) return {
    enabled,
    requestedProvider,
    activeProvider: "LOCAL_HEURISTIC" as const,
    model: "heuristics-2",
    fallbackActive: false,
    state: "DISABLED" as const,
    reason: "Procurement AI disattivata: interpretazione locale, nessun invio esterno.",
    processingExplanation: "Procurement AI è disabilitata in questo ambiente. Il documento verrà elaborato localmente senza invio a provider AI esterni.",
  };
  return {
    enabled,
    requestedProvider,
    activeProvider: "LOCAL_HEURISTIC" as const,
    model: "heuristics-2",
    fallbackActive: true,
    state: "FALLBACK" as const,
    reason: requestedProvider !== "openai"
      ? `Provider “${requestedProvider || "non definito"}” non supportato: interpretazione locale.`
      : "OPENAI_API_KEY non configurata: interpretazione locale, nessun invio esterno.",
    processingExplanation: "Procurement AI non è disponibile in questo momento. Il documento verrà elaborato con parser deterministico e mapping euristico locale.",
  };
}
