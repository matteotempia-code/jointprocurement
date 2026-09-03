export type SupplierCandidate = { id: string; name: string; vatNumber?: string | null };

export type SupplierSuggestion = { supplierId: string; supplierName: string; confidence: number; reasons: string[] };

export type ExtractedCommercialConditions = {
  minimumOrderValue?: number; freeShippingThreshold?: number; shippingFee?: number; surcharge?: number;
  discountPercent?: number; paymentTerms?: string; deliveryTerms?: string;
};

const normalize = (value: unknown) => String(value ?? "").toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const compact = (value: unknown) => normalize(value).replace(/\s+/g, "");
const parseNumber = (value: string) => Number(value.replace(/\./g, "").replace(",", "."));

export function suggestSupplierFromDocument(filename: string, documentText: string, suppliers: SupplierCandidate[]): SupplierSuggestion | null {
  const filenameText = normalize(filename.replace(/\.[^.]+$/, ""));
  const bodyText = normalize(documentText).slice(0, 12_000);
  const compactBody = compact(documentText).slice(0, 12_000);
  const ranked = suppliers.map((supplier) => {
    const name = normalize(supplier.name);
    const tokens = name.split(" ").filter((token) => token.length >= 4 && !["demo", "italia", "srl", "spa"].includes(token));
    const reasons: string[] = []; let confidence = 0;
    if (name.length >= 4 && filenameText.includes(name)) { confidence = Math.max(confidence, .96); reasons.push("ragione sociale nel nome file"); }
    if (name.length >= 4 && bodyText.includes(name)) { confidence = Math.max(confidence, .94); reasons.push("ragione sociale nel documento"); }
    const vat = String(supplier.vatNumber ?? "").replace(/\D/g, "");
    if (vat.length >= 8 && compactBody.includes(vat)) { confidence = Math.max(confidence, .99); reasons.push("partita IVA nel documento"); }
    const hits = tokens.filter((token) => filenameText.includes(token) || bodyText.includes(token));
    if (hits.length && tokens.length) { const ratio = hits.length / tokens.length; confidence = Math.max(confidence, ratio === 1 ? .88 : ratio >= .67 ? .76 : .55); reasons.push(`${hits.length}/${tokens.length} elementi della ragione sociale`); }
    return { supplierId: supplier.id, supplierName: supplier.name, confidence, reasons };
  }).sort((a, b) => b.confidence - a.confidence);
  const [first, second] = ranked;
  if (!first || first.confidence < .7 || (second && first.confidence - second.confidence < .12)) return null;
  return first;
}

function money(text: string, patterns: RegExp[]) { for (const pattern of patterns) { const match = text.match(pattern); if (match?.[1]) return parseNumber(match[1]); } return undefined; }

export function extractCommercialConditions(documentText: string): ExtractedCommercialConditions {
  const text = documentText.replace(/\s+/g, " ").trim();
  const result: ExtractedCommercialConditions = {};
  result.minimumOrderValue = money(text, [/(?:ordine\s+minimo|minimo\s+d['’]?ordine)[^\d]{0,20}(\d[\d.,]*)\s*€/i]);
  result.freeShippingThreshold = money(text, [/(?:franco\s+porto|spedizione\s+gratuita)[^\d]{0,20}(\d[\d.,]*)\s*€/i]);
  result.shippingFee = money(text, [/(?:costo\s+(?:di\s+)?spedizione|spese\s+di\s+trasporto|trasporto\s*(?::|a\s+carico))[^\d]{0,20}(\d[\d.,]*)\s*€/i]);
  result.surcharge = money(text, [/(?:maggiorazione|supplemento)[^\d]{0,20}(\d[\d.,]*)\s*€/i]);
  const discount = text.match(/sconto[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*%/i); if (discount) result.discountPercent = parseNumber(discount[1]);
  const payment = text.match(/(?:pagamento|payment terms?)\s*[:\-]\s*([^;|\n]{3,80})/i); if (payment) result.paymentTerms = payment[1].trim();
  const delivery = text.match(/(?:resa|delivery terms?|termini di consegna)\s*[:\-]\s*([^;|\n]{3,80})/i); if (delivery) result.deliveryTerms = delivery[1].trim();
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined)) as ExtractedCommercialConditions;
}
