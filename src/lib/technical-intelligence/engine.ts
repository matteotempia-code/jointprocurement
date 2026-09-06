import { createHash } from "node:crypto";

export const TECHNICAL_MATCH_THRESHOLDS = Object.freeze({
  deterministicAutoConfirm: 0.98,
  reviewRequired: 0.72,
  attributeConfirmation: 0.8,
});

export type TechnicalValue = { key: string; label: string; value: string; normalizedValue?: number | null; unit?: string | null; confidence: number; evidence: string };
export type TechnicalInterpretation = {
  documentType: "TECHNICAL_SHEET" | "SDS" | "DECLARATION_OF_CONFORMITY" | "CE_DOCUMENT" | "CERTIFICATE" | "MANUAL" | "TEST_REPORT" | "REGULATORY_DOCUMENT" | "OTHER_TECHNICAL";
  title: string; manufacturer?: string | null; brand?: string | null; supplier?: string | null; manufacturerSku?: string | null; supplierSku?: string | null;
  gtin?: string | null; model?: string | null; productFamily?: string | null; revision?: string | null; revisionDate?: string | null; validFrom?: string | null; validUntil?: string | null;
  language?: string | null; candidateProductDescriptions: string[]; technicalAttributes: TechnicalValue[]; certifications: string[]; standards: string[]; confidence: number;
};

export function evidenceFingerprint(values: unknown) { return createHash("sha256").update(JSON.stringify(values)).digest("hex"); }
export function canonicalPair(a: string, b: string) { return a.localeCompare(b) < 0 ? [a, b] as const : [b, a] as const; }
export function normalizeTechnicalKey(value: string) { return value.trim().toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }

export function classifyTechnicalDocument(filename: string, text: string): TechnicalInterpretation["documentType"] {
  const haystack = `${filename} ${text.slice(0, 4000)}`.toLocaleLowerCase("it-IT");
  if (/scheda.{0,12}(sicurezza|sds)|safety data sheet|regolamento.{0,20}1907\/2006/.test(haystack)) return "SDS";
  if (/dichiarazione.{0,20}conform|declaration of conformity/.test(haystack)) return "DECLARATION_OF_CONFORMITY";
  if (/certificat|certificate/.test(haystack)) return "CERTIFICATE";
  if (/marcatura ce|ce document/.test(haystack)) return "CE_DOCUMENT";
  if (/rapporto.{0,12}prova|test report/.test(haystack)) return "TEST_REPORT";
  if (/manuale|manual/.test(haystack)) return "MANUAL";
  if (/scheda.{0,12}tecnica|technical data sheet|datasheet/.test(haystack)) return "TECHNICAL_SHEET";
  if (/regolamento|regulatory/.test(haystack)) return "REGULATORY_DOCUMENT";
  return "OTHER_TECHNICAL";
}

export function deterministicTechnicalInterpretation(filename: string, text: string): TechnicalInterpretation {
  const find = (pattern: RegExp) => text.match(pattern)?.[1]?.trim() ?? null;
  const attributes: TechnicalValue[] = [];
  const patterns: Array<[string,string,RegExp,string?]> = [
    ["material","Materiale",/materiale\s*[:\-]\s*([^\n;]+)/i], ["aql","AQL",/\baql\s*[:\-]?\s*([0-9.,]+)/i],
    ["thickness","Spessore",/spessore\s*[:\-]\s*([0-9.,]+)\s*(mm|µm|um)?/i,"mm"], ["dimensions","Dimensioni",/dimensioni\s*[:\-]\s*([^\n;]+)/i],
    ["intended_use","Uso previsto",/uso previsto\s*[:\-]\s*([^\n;]+)/i], ["concentration","Concentrazione",/concentrazione\s*[:\-]\s*([^\n;]+)/i],
  ];
  for (const [key,label,pattern,unit] of patterns) { const match=text.match(pattern); if(match?.[1]) attributes.push({key,label,value:match[1].trim(),normalizedValue:Number(String(match[1]).replace(",","."))||null,unit:match[2]??unit??null,confidence:.9,evidence:match[0].slice(0,240)}); }
  const standards=[...new Set(text.match(/\b(?:EN|ISO)\s*\d{3,6}(?:[-:]\d+)?/gi)??[])];
  return { documentType:classifyTechnicalDocument(filename,text),title:find(/(?:titolo|prodotto)\s*[:\-]\s*([^\n]+)/i)??filename.replace(/\.[^.]+$/,"") ,manufacturer:find(/(?:produttore|manufacturer)\s*[:\-]\s*([^\n;]+)/i),brand:find(/(?:marchio|brand)\s*[:\-]\s*([^\n;]+)/i),manufacturerSku:find(/(?:codice produttore|manufacturer sku|ref\.?|modello)\s*[:\-]\s*([\w./-]+)/i),supplierSku:find(/(?:codice fornitore|supplier sku)\s*[:\-]\s*([\w./-]+)/i),gtin:find(/(?:gtin|ean)\s*[:\-]\s*(\d{8,14})/i),revision:find(/(?:revisione|revision|rev\.)\s*[:\-]?\s*([\w.-]+)/i),language:/\bitaliano\b/i.test(text)?"it":null,candidateProductDescriptions:[],technicalAttributes:attributes,certifications:standards,standards,confidence:attributes.length || standards.length ? .86 : .55 };
}

export function compareTechnicalProfiles(a: Record<string,string>, b: Record<string,string>, criticalKeys: string[]) {
  const keys=[...new Set([...Object.keys(a),...Object.keys(b),...criticalKeys])]; const matched:string[]=[],differing:string[]=[],missing:string[]=[],blocking:string[]=[];
  for(const key of keys){if(!a[key]||!b[key]){if(criticalKeys.includes(key))missing.push(key);continue;} if(normalizeTechnicalKey(a[key])===normalizeTechnicalKey(b[key]))matched.push(key);else{differing.push(key);if(criticalKeys.includes(key))blocking.push(key);}}
  const result=missing.length?"INSUFFICIENT_EVIDENCE":blocking.length?"NOT_EQUIVALENT":matched.length?"FUNCTIONALLY_EQUIVALENT":"INSUFFICIENT_EVIDENCE";
  return {result:result as "FUNCTIONALLY_EQUIVALENT"|"NOT_EQUIVALENT"|"INSUFFICIENT_EVIDENCE",confidence:result==="FUNCTIONALLY_EQUIVALENT"?Math.min(.97,.75+matched.length*.04):result==="NOT_EQUIVALENT"?.98:.35,matched,differing,blocking,missing};
}
