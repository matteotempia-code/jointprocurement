import { normalizeOfferPrice } from "@/lib/pricing/normalization";
import type { InterpretedFields, NormalizedImport } from "./types";

export function parseItalianNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined || String(value).trim() === "") return null;
  let text = String(value).trim().replace(/[€%\s]/g, "");
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

const uomAliases: Record<string, string> = { CF: "BOX", CONF: "BOX", BOX: "BOX", CT: "CASE", CARTONE: "CASE", PZ: "PIECE", PEZZO: "PIECE", PEZZI: "PIECE", TAN: "CAN", TANICA: "CAN", FL: "BOTTLE", FLACONE: "BOTTLE", KG: "KG", L: "L", LT: "L" };
const normalizeUom = (value: unknown) => uomAliases[String(value ?? "").trim().toLocaleUpperCase("it-IT")] ?? String(value ?? "").trim().toLocaleUpperCase("it-IT");

function inferConsumptionUom(input: InterpretedFields, purchaseUom: string) {
  if (input.consumptionUom) return normalizeUom(input.consumptionUom);
  const description = String(input.description ?? "").toLocaleLowerCase("it-IT");
  if (/\bkg\b|chilogramm/.test(description)) return "KG";
  const hasVolume = /\bml\b|\b\d+(?:[.,]\d+)?\s*l\b|\b(?:litro|litri)\b/.test(description);
  const isLiquidProduct = /acqua|ammorbident|bevanda|brillantant|candegg|detergent|disinfett|latte|liquid|olio|sapone|sgrass|shampoo|soluzion|succo/.test(description);
  if (["CAN", "BOTTLE"].includes(purchaseUom) || (hasVolume && isLiquidProduct)) return "L";
  if (/\b(?:paio|paia|pair)\b/.test(description)) return "PAIR";
  if (/\brotol/.test(description)) return "ROLL";
  if (/\bfiltr/.test(description)) return "FILTER";
  return "PIECE";
}

export function normalizeImportDate(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const text = String(value).trim();
  const italian = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(text);
  const iso = italian ? `${italian[3]}-${italian[2].padStart(2, "0")}-${italian[1].padStart(2, "0")}` : /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;
  if (!iso) return null;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso ? null : iso;
}

export function normalizeImportedFields(input: InterpretedFields): NormalizedImport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const gross = parseItalianNumber(input.grossPrice);
  const packageUnits = String(input.packageDescription ?? "").match(/(?:cf|conf|box|cartone|pack)?\s*[x×:]?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:pz|pezzi|unità|unita))?/i)?.[1];
  const units = parseItalianNumber(input.unitsPerPackage) ?? parseItalianNumber(packageUnits);
  const taxRate = parseItalianNumber(input.taxRate);
  const discount = parseItalianNumber(input.discount);
  const explicitNet = parseItalianNumber(input.netPrice);
  const net = explicitNet ?? (gross !== null && discount !== null ? gross * (1 - discount / 100) : gross);
  const moq = parseItalianNumber(input.moq) ?? 1;
  const purchaseUom = normalizeUom(input.purchaseUom || "BOX");
  const consumptionUom = inferConsumptionUom(input, purchaseUom);
  const validFrom = normalizeImportDate(input.validFrom);
  const validUntil = normalizeImportDate(input.validUntil);
  if (!input.description) errors.push("Descrizione prodotto mancante");
  if (net === null || net <= 0) errors.push("Prezzo netto mancante, nullo o negativo");
  if (discount !== null && (discount < 0 || discount > 100)) errors.push("Sconto fuori intervallo 0–100%");
  if (input.validFrom && !validFrom) warnings.push("Data di inizio validità non riconosciuta");
  if (input.validUntil && !validUntil) warnings.push("Data di fine validità non riconosciuta");
  if (validFrom && validUntil && validFrom > validUntil) errors.push("La validità termina prima della data di inizio");
  if (input.currency && String(input.currency).toLocaleUpperCase("it-IT") !== "EUR") warnings.push("Valuta differente da EUR da verificare");
  if (taxRate !== null && ![0, 4, 5, 10, 22].includes(taxRate)) warnings.push("Aliquota IVA non standard da verificare");
  if (units === null || units <= 0) warnings.push("Fattore di confezionamento mancante o ambiguo");
  const normalized = normalizeOfferPrice({ purchaseUom, unitsPerPackage: units, consumptionUom: consumptionUom || null, consumptionUomLabel: consumptionUom === "PIECE" ? "pezzo" : consumptionUom === "L" ? "litro" : consumptionUom === "KG" ? "kg" : consumptionUom.toLocaleLowerCase("it-IT"), packageDescription: input.packageDescription ? String(input.packageDescription) : null }, { unitPrice: net ?? -1, packageSize: units, packageUnit: purchaseUom });
  if (!normalized.comparable && normalized.reason) warnings.push(normalized.reason);
  return { ...input, netPrice: net, grossPrice: gross, discount, taxRate, moq, unitsPerPackage: units, leadTimeDays: parseItalianNumber(input.leadTimeDays), validFrom, validUntil, purchaseUom, consumptionUom, currency: String(input.currency || "EUR").toUpperCase(), comparable: normalized.comparable, normalizedPrice: normalized.normalizedPrice, normalizedLabel: normalized.normalizedLabel, validationErrors: errors, warnings: [...new Set(warnings)] };
}
