import type { MatchableProduct, NormalizedImport, SuggestedMatch } from "./types";

const normalizeText = (value: unknown) => String(value ?? "").toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const tokens = (value: unknown) => new Set(normalizeText(value).split(" ").filter((token) => token.length > 1));
export function descriptionSimilarity(left: unknown, right: unknown) { const a = tokens(left), b = tokens(right); if (!a.size || !b.size) return 0; const intersection = [...a].filter((token) => b.has(token)).length; return 2 * intersection / (a.size + b.size); }

export function suggestMatches(record: NormalizedImport, products: MatchableProduct[], supplierId?: string | null): SuggestedMatch[] {
  const candidates: SuggestedMatch[] = products.map((product) => {
    const identifiers: string[] = [];
    const reasons: string[] = [];
    let score = 0;
    if (record.ean && product.ean && String(record.ean) === product.ean) { score += .78; identifiers.push("stesso GTIN/EAN"); }
    if (record.manufacturerSku && product.manufacturerSku && normalizeText(record.manufacturerSku) === normalizeText(product.manufacturerSku)) { score += .7; identifiers.push("stesso codice produttore"); }
    if (supplierId && record.supplierSku && product.offers?.some((offer) => offer.supplierId === supplierId && normalizeText(offer.supplierSku) === normalizeText(record.supplierSku))) { score += .72; identifiers.push("stesso codice fornitore"); }
    const similarity = descriptionSimilarity(record.description, product.name);
    score += similarity * .42;
    if (similarity > .84) reasons.push("descrizione quasi identica"); else if (similarity > .58) reasons.push("descrizione simile");
    if (record.brand && product.brand && normalizeText(record.brand) === normalizeText(product.brand)) { score += .12; reasons.push("stessa marca"); }
    const purchaseCompatible = record.purchaseUom ? String(record.purchaseUom) === product.purchaseUom : null;
    const consumptionCompatible = record.consumptionUom && product.consumptionUom ? String(record.consumptionUom) === product.consumptionUom : null;
    const uom = purchaseCompatible === null ? consumptionCompatible : consumptionCompatible === null ? purchaseCompatible : purchaseCompatible && consumptionCompatible;
    const packageCompatible = record.unitsPerPackage ? Math.abs(Number(record.unitsPerPackage) - Number(product.unitsPerPackage)) < .0001 : null;
    const category = record.category ? normalizeText(record.category) === normalizeText(product.category.name) : null;
    if (uom) { score += .05; reasons.push("stessa unità d’acquisto"); }
    if (packageCompatible) { score += .08; reasons.push("stessa confezione"); }
    if (category) { score += .05; reasons.push("stessa categoria"); }
    score = Math.min(1, score);
    const strongIdentifier = identifiers.length > 0;
    const matchType = strongIdentifier && score >= .88 ? "IDENTICAL" : score >= .68 ? "PROBABLE_MATCH" : score >= .48 ? "COMMERCIAL_SUBSTITUTE" : score >= .34 ? "FUNCTIONAL_EQUIVALENT" : "NEW_PRODUCT";
    return { canonicalProductId: product.id, matchType, score, reasons: [...identifiers, ...reasons], identifierMatches: identifiers, descriptionSimilarity: similarity, uomCompatibility: uom, packagingCompatibility: packageCompatible, categoryCompatibility: category, recommended: false } satisfies SuggestedMatch;
  }).sort((a, b) => b.score - a.score).slice(0, 3);
  if (!candidates.length || candidates[0].score < .34) return [{ canonicalProductId: null, matchType: "NEW_PRODUCT", score: 1 - (candidates[0]?.score ?? 0), reasons: ["nessun identificatore o prodotto sufficientemente simile"], identifierMatches: [], descriptionSimilarity: candidates[0]?.descriptionSimilarity ?? 0, uomCompatibility: null, packagingCompatibility: null, categoryCompatibility: null, recommended: true }];
  candidates[0].recommended = true;
  return candidates;
}

export function confidenceBand(value: number | null | undefined) { return value !== null && value !== undefined && value >= .88 ? "Alta" : value !== null && value !== undefined && value >= .68 ? "Media" : "Da verificare"; }
