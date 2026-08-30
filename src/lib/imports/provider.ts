import type { ParsedRow } from "./types";
import { applyColumnMapping, suggestColumnMapping } from "./mapping";

export const INTERPRETATION_SCHEMA_VERSION = "smart-import-v2";

export type ProviderCapabilities = {
  nativePdf: boolean;
  scannedPdf: boolean;
  images: boolean;
  tables: boolean;
  ocr: boolean;
  vision: boolean;
  structuredOutput: boolean;
};

export interface DocumentInterpretationProvider {
  readonly id: string;
  readonly label: string;
  readonly isAi: boolean;
  readonly externalProcessing: boolean;
  readonly modelVersion: string | null;
  readonly schemaVersion: string;
  readonly capabilities: ProviderCapabilities;
  mapFields(rows: ParsedRow[]): { mapping: ReturnType<typeof suggestColumnMapping>; confidence: number };
  interpretRows(rows: ParsedRow[], mapping: ReturnType<typeof suggestColumnMapping>): ReturnType<typeof applyColumnMapping>[];
}

export class LocalHeuristicProvider implements DocumentInterpretationProvider {
  readonly id = "LOCAL_HEURISTIC";
  readonly label = "Interpretazione locale";
  readonly isAi = false;
  readonly externalProcessing = false;
  readonly modelVersion = "heuristics-2";
  readonly schemaVersion = INTERPRETATION_SCHEMA_VERSION;
  readonly capabilities: ProviderCapabilities = {
    nativePdf: true,
    scannedPdf: false,
    images: false,
    tables: true,
    ocr: false,
    vision: false,
    structuredOutput: true,
  };
  mapFields(rows: ParsedRow[]) {
    const headers = Object.keys(rows[0]?.values ?? {});
    const mapping = suggestColumnMapping(headers);
    return { mapping, confidence: headers.length ? Math.min(1, Object.keys(mapping).length / Math.max(1, Math.min(headers.length, 9))) : 0 };
  }
  interpretRows(rows: ParsedRow[], mapping: ReturnType<typeof suggestColumnMapping>) { return rows.map((row) => applyColumnMapping(row.values, mapping)); }
}

const configuredProvider = (process.env.DOCUMENT_INTELLIGENCE_PROVIDER ?? "local").trim().toLocaleLowerCase("en-US");
const localProvider = new LocalHeuristicProvider();

// Provider esterni entrano qui solo con adapter e credenziali esplicite. Il
// fallback locale non invia mai documenti all'esterno e non simula OCR/vision.
export const providerRuntimeStatus = {
  requestedProvider: configuredProvider,
  activeProvider: localProvider.id,
  fallbackActive: configuredProvider !== "local" && configuredProvider !== "local_heuristic",
  externalProcessing: false,
  message: configuredProvider === "local" || configuredProvider === "local_heuristic"
    ? "Elaborazione locale: nessun documento viene inviato a servizi esterni."
    : `Il provider “${configuredProvider}” non è configurato: viene usata l’interpretazione locale.`,
} as const;

export const activeInterpretationProvider: DocumentInterpretationProvider = localProvider;

export function providerSupportsScannedDocuments(provider = activeInterpretationProvider) {
  return provider.capabilities.ocr && (provider.capabilities.scannedPdf || provider.capabilities.images);
}
