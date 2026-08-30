import type { ImportField } from "./types";

export const importStatusLabels: Record<string, string> = {
  UPLOADED: "Caricato",
  PARSING: "Lettura in corso",
  PARSED: "Letto",
  INTERPRETING: "Interpretazione in corso",
  INTERPRETED: "Interpretato",
  NEEDS_REVIEW: "Da verificare",
  READY_TO_PUBLISH: "Pronto per la pubblicazione",
  PUBLISHING: "Pubblicazione in corso",
  PUBLISHED: "Pubblicato",
  REQUIRES_PROVIDER: "Richiede document intelligence",
  FAILED: "Non riuscito",
  READY: "Corrispondenza proposta",
  CONFIRMED: "Confermato",
  NEW_PRODUCT_CONFIRMED: "Nuovo prodotto confermato",
  NON_COMPARABLE: "Non direttamente confrontabile",
  IGNORED: "Ignorato",
};

export const importKindLabels: Record<string, string> = {
  PRICE_LIST: "Listino prezzi",
  OFFER: "Offerta",
  QUOTATION: "Quotazione",
  INFORMATIONAL_INVOICE: "Fattura come fonte informativa",
  OTHER: "Altro documento commerciale",
};

export const matchTypeLabels: Record<string, string> = {
  IDENTICAL: "Prodotto identico",
  PROBABLE_MATCH: "Corrispondenza probabile",
  COMMERCIAL_SUBSTITUTE: "Alternativa commerciale",
  FUNCTIONAL_EQUIVALENT: "Alternativa funzionale da verificare",
  NEW_PRODUCT: "Nuovo prodotto",
};

const purchaseUomLabels: Record<string, string> = {
  BOX: "confezione",
  CASE: "cartone",
  BOTTLE: "flacone",
  CAN: "tanica",
  PACK: "pacco",
};

const consumptionUomLabels: Record<string, string> = {
  PIECE: "pezzo",
  PAIR: "paio",
  L: "litro",
  KG: "kg",
  ROLL: "rotolo",
  FILTER: "filtro",
};

export function purchaseUomLabel(value: unknown) {
  const code = String(value ?? "").toLocaleUpperCase("it-IT");
  return purchaseUomLabels[code] ?? (code ? code.toLocaleLowerCase("it-IT") : "unità acquistata");
}

export function consumptionUomLabel(value: unknown) {
  const code = String(value ?? "").toLocaleUpperCase("it-IT");
  return consumptionUomLabels[code] ?? (code ? code.toLocaleLowerCase("it-IT") : "unità");
}

export const fieldLabels: Record<ImportField, string> = {
  supplierSku: "Codice fornitore",
  manufacturerSku: "Codice produttore",
  ean: "EAN / GTIN",
  description: "Descrizione prodotto",
  brand: "Marca",
  manufacturer: "Produttore",
  category: "Categoria",
  subcategory: "Sottocategoria",
  purchaseUom: "Unità acquistata",
  packageDescription: "Contenuto confezione",
  unitsPerPackage: "Unità per confezione",
  consumptionUom: "Unità di consumo",
  grossPrice: "Prezzo lordo",
  discount: "Sconto",
  netPrice: "Prezzo netto confezione",
  taxRate: "IVA",
  currency: "Valuta",
  moq: "Ordine minimo",
  validFrom: "Valido dal",
  validUntil: "Valido fino al",
  leadTimeDays: "Tempo di consegna",
  notes: "Note",
};

export function importStatusLabel(status: string) {
  return importStatusLabels[status] ?? status.replaceAll("_", " ").toLocaleLowerCase("it-IT");
}

export function confidenceLabel(value: number | null | undefined) {
  if (value == null) return "Non calcolata";
  if (value >= 0.88) return "Alta";
  if (value >= 0.68) return "Media";
  return "Da verificare";
}

export function confidenceClass(value: number | null | undefined) {
  if (value == null || value < 0.68) return "confidence-low";
  if (value < 0.88) return "confidence-medium";
  return "confidence-high";
}

export function sourceLocatorLabel(locator: unknown) {
  const value = (locator ?? {}) as { sheet?: string; row?: number; column?: string; page?: number; paragraph?: number };
  const segments: string[] = [];
  if (value.sheet) segments.push(`Foglio “${value.sheet}”`);
  if (value.page) segments.push(`pagina ${value.page}`);
  if (value.row) segments.push(`riga ${value.row}`);
  if (value.column) segments.push(`colonna “${value.column}”`);
  if (value.paragraph) segments.push(`paragrafo ${value.paragraph}`);
  return segments.length ? segments.join(" · ") : "Posizione nel documento non disponibile";
}

export function parserLabel(parser: string | null) {
  if (!parser) return "In attesa di lettura";
  if (parser.startsWith("XLSX")) return "Workbook Excel · lettura deterministica";
  if (parser.startsWith("CSV")) return "Dati delimitati · lettura deterministica";
  if (parser.startsWith("PDF")) return "PDF con testo · estrazione deterministica";
  if (parser.startsWith("DOCX")) return "Documento Word · estrazione strutturale";
  return parser;
}

export function interpretationProviderLabel(provider: string | null | undefined) {
  if (!provider || provider === "LOCAL_HEURISTIC") return "Interpretazione locale";
  return "Document intelligence configurata";
}
