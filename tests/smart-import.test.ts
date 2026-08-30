import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { classifyPriceChange } from "../src/lib/imports/changes";
import { suggestColumnMapping } from "../src/lib/imports/mapping";
import { suggestMatches } from "../src/lib/imports/matching";
import { normalizeImportDate, normalizeImportedFields, parseItalianNumber } from "../src/lib/imports/normalization";
import { parseDocument } from "../src/lib/imports/parser";

const fixtures = path.join(process.cwd(), "demo-imports");

test("parser XLSX legge il file reale, trova header e conserva la riga sorgente", async () => {
  const buffer = await readFile(path.join(fixtures, "listino-alfa-medical-2027.xlsx"));
  const parsed = await parseDocument(buffer, "listino-alfa-medical-2027.xlsx");
  assert.equal(parsed.parserType, "XLSX_DETERMINISTIC");
  assert.equal(parsed.rows.length, 36);
  assert.equal(parsed.rows[0].locator.sheet, "Listino");
  assert.equal(parsed.rows[0].locator.row, 4);
  assert.ok(String(parsed.rows[0].values["Descrizione"]).length > 10);
  assert.equal(parsed.sheets.find((sheet) => sheet.name === "Note")?.selected, false);
});

test("parser CSV Italy-first gestisce punto e virgola e virgola decimale", async () => {
  const buffer = await readFile(path.join(fixtures, "offerta-caresupply-sporca.csv"));
  const parsed = await parseDocument(buffer, "offerta-caresupply-sporca.csv");
  assert.equal(parsed.rows.length, 18);
  assert.equal(parseItalianNumber(parsed.rows[0].values.prezzo), 2.45);
  assert.equal(parsed.rows[0].locator.row, 3);
});

test("parser PDF nativo usa il testo senza OCR", async () => {
  const buffer = await readFile(path.join(fixtures, "listino-medika-testuale.pdf"));
  const parsed = await parseDocument(buffer, "listino-medika-testuale.pdf");
  assert.equal(parsed.parserType, "PDF_TEXT_DETERMINISTIC");
  assert.ok(parsed.rows.length >= 10);
  assert.ok(parsed.textPreview?.includes("LISTINO TESTUALE"));
});

test("mapping colonne riconosce sinonimi commerciali italiani", () => {
  const mapping = suggestColumnMapping(["Codice art.", "Descrizione", "Pz/conf", "Prezzo netto", "UM", "IVA"]);
  assert.equal(mapping["Codice art."], "supplierSku");
  assert.equal(mapping["Pz/conf"], "unitsPerPackage");
  assert.equal(mapping["Prezzo netto"], "netPrice");
  assert.equal(mapping.IVA, "taxRate");
});

test("normalizzazione import: box 100 a 2,50 € vale 0,025 € per pezzo", () => {
  const result = normalizeImportedFields({ description: "Guanti nitrile M", purchaseUom: "BOX", unitsPerPackage: 100, consumptionUom: "PIECE", netPrice: "2,50", currency: "EUR" });
  assert.equal(result.comparable, true);
  assert.equal(result.normalizedPrice, 0.025);
});

test("normalizzazione import: tanica da 5 litri usa il litro come unità di consumo", () => {
  const result = normalizeImportedFields({ description: "Detergente professionale 5 L", purchaseUom: "CAN", unitsPerPackage: 5, netPrice: "12,00", currency: "EUR" });
  assert.equal(result.consumptionUom, "L");
  assert.equal(result.normalizedPrice, 2.4);
});

test("normalizzazione import: confezione da 5 kg usa il chilogrammo come unità di consumo", () => {
  const result = normalizeImportedFields({ description: "Pasta secca confezione 5 kg", purchaseUom: "PACK", unitsPerPackage: 5, netPrice: "10,00", currency: "EUR" });
  assert.equal(result.consumptionUom, "KG");
  assert.equal(result.normalizedPrice, 2);
});

test("normalizzazione import: la capacità di una siringa non diventa unità di consumo", () => {
  const result = normalizeImportedFields({ description: "Siringa sterile 10 ml — 100 pezzi", purchaseUom: "BOX", unitsPerPackage: 100, netPrice: "6,74", currency: "EUR" });
  assert.equal(result.consumptionUom, "PIECE");
  assert.equal(result.normalizedPrice, 0.0674);
});

test("normalizzazione import: multipack acqua usa il volume totale", () => {
  const result = normalizeImportedFields({ description: "Acqua naturale 6 × 1,5 L", purchaseUom: "PACK", unitsPerPackage: 9, netPrice: "3,60", currency: "EUR" });
  assert.equal(result.consumptionUom, "L");
  assert.equal(result.normalizedPrice, 0.4);
});

test("normalizzazione non forza confronti con conversione mancante", () => {
  const result = normalizeImportedFields({ description: "Prodotto ambiguo", purchaseUom: "BOX", netPrice: 8.5 });
  assert.equal(result.comparable, false);
  assert.ok(result.warnings.some((warning) => warning.toLocaleLowerCase("it-IT").includes("confezion")));
});

test("date italiane diventano ISO e intervalli invertiti bloccano il record", () => {
  assert.equal(normalizeImportDate("31/12/2027"), "2027-12-31");
  const result = normalizeImportedFields({ description: "Prodotto", unitsPerPackage: 10, netPrice: 5, validFrom: "31/12/2027", validUntil: "01/01/2027" });
  assert.ok(result.validationErrors.includes("La validità termina prima della data di inizio"));
});

test("matching privilegia GTIN e spiega la corrispondenza", () => {
  const products = [{ id: "p1", name: "Guanto nitrile senza polvere M", brand: "DemoCare", manufacturerSku: "DM-01", ean: "8001000000001", purchaseUom: "BOX", unitsPerPackage: 100, consumptionUom: "PIECE", category: { id: "c1", name: "Dispositivi monouso", code: "DISPOSABLES" }, offers: [] }];
  const normalized = normalizeImportedFields({ ean: "8001000000001", description: "Guanto nit blu M cf100", brand: "DemoCare", category: "Dispositivi monouso", purchaseUom: "BOX", unitsPerPackage: 100, consumptionUom: "PIECE", netPrice: 2.5 });
  const [match] = suggestMatches(normalized, products);
  assert.equal(match.matchType, "IDENTICAL");
  assert.equal(match.canonicalProductId, "p1");
  assert.ok(match.reasons.includes("stesso GTIN/EAN"));
});

test("confezione differente abbassa la compatibilità e richiede review", () => {
  const products = [{ id: "p1", name: "Garza sterile 10 x 10 cm", brand: "DemoCare", manufacturerSku: null, ean: null, purchaseUom: "BOX", unitsPerPackage: 100, consumptionUom: "PIECE", category: { id: "c1", name: "Dispositivi monouso", code: "DISPOSABLES" }, offers: [] }];
  const normalized = normalizeImportedFields({ description: "Garza sterile 10 x 10 cm", brand: "DemoCare", category: "Dispositivi monouso", purchaseUom: "BOX", unitsPerPackage: 50, consumptionUom: "PIECE", netPrice: 1.8 });
  const [match] = suggestMatches(normalized, products);
  assert.equal(match.packagingCompatibility, false);
  assert.notEqual(match.matchType, "IDENTICAL");
});

test("analisi prezzo usa il normalizzato: 2,50/100 → 3,00/100 = +20%", () => {
  const change = classifyPriceChange({ oldNormalizedPrice: 2.5 / 100, newNormalizedPrice: 3 / 100, oldPackageQuantity: 100, newPackageQuantity: 100 });
  assert.equal(Math.round(change.deltaPercent!), 20);
  assert.equal(change.kind, "INCREASE");
});

test("cambio pack: 2,50/100 → 4,60/200 = -8%, non +84%", () => {
  const change = classifyPriceChange({ oldNormalizedPrice: 2.5 / 100, newNormalizedPrice: 4.6 / 200, oldPackageQuantity: 100, newPackageQuantity: 200 });
  assert.equal(Math.round(change.deltaPercent!), -8);
  assert.equal(change.kind, "PACKAGE_CHANGE");
  assert.equal(change.direction, "DECREASE");
});
