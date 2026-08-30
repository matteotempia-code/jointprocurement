import type { ImportField, InterpretedFields } from "./types";

const aliases: Record<ImportField, string[]> = {
  supplierSku: ["codice art", "codice articolo", "codice fornitore", "sku", "codice"],
  manufacturerSku: ["codice produttore", "manufacturer sku", "mfr sku"],
  ean: ["ean", "gtin", "barcode"],
  description: ["descrizione", "descrizione articolo", "prodotto", "articolo"],
  brand: ["marca", "brand"], manufacturer: ["produttore", "manufacturer"],
  category: ["categoria", "famiglia", "categoria merceologica"], subcategory: ["sottocategoria", "sotto categoria"],
  purchaseUom: ["um", "udm", "unità acquisto", "unita acquisto", "uom"],
  packageDescription: ["confezione", "formato", "pack", "contenuto"],
  unitsPerPackage: ["pz/conf", "pezzi confezione", "unità confezione", "qta conf", "fattore"],
  consumptionUom: ["unità consumo", "unita consumo", "udm consumo"],
  grossPrice: ["prezzo lordo", "listino", "gross price"], discount: ["sconto", "discount"],
  netPrice: ["prezzo netto", "prezzo", "net price"], taxRate: ["iva", "aliquota iva", "vat"],
  currency: ["valuta", "currency"], moq: ["moq", "ordine minimo", "minimo ordine"],
  validFrom: ["valido dal", "validità da", "data inizio"], validUntil: ["valido al", "validità a", "data fine"],
  leadTimeDays: ["consegna giorni", "lead time", "giorni consegna"], notes: ["note", "annotazioni"],
};

const clean = (value: string) => value.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function suggestColumnMapping(headers: string[]) {
  const result: Record<string, ImportField> = {};
  for (const header of headers) {
    const normalized = clean(header);
    let best: { field: ImportField; score: number } | null = null;
    for (const [field, values] of Object.entries(aliases) as [ImportField, string[]][]) {
      for (const alias of values) {
        const normalizedAlias = clean(alias);
        const score = normalized === normalizedAlias ? 1 : normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized) ? .82 : 0;
        if (score > (best?.score ?? 0)) best = { field, score };
      }
    }
    if (best && best.score >= .8 && !Object.values(result).includes(best.field)) result[header] = best.field;
  }
  return result;
}

export function applyColumnMapping(values: Record<string, unknown>, mapping: Record<string, ImportField>): InterpretedFields {
  const interpreted: InterpretedFields = {};
  for (const [source, target] of Object.entries(mapping)) {
    const value = values[source];
    if (value !== undefined && value !== null && String(value).trim() !== "") interpreted[target] = typeof value === "number" ? value : String(value).trim();
  }
  return interpreted;
}

export function knownHeaderScore(values: unknown[]) {
  const headers = values.map(String).filter(Boolean);
  return Object.keys(suggestColumnMapping(headers)).length;
}
