import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { parseDocument } from "../../src/lib/imports/parser";
import { LocalHeuristicProvider } from "../../src/lib/imports/provider";
import { normalizeImportedFields } from "../../src/lib/imports/normalization";
import { suggestMatches } from "../../src/lib/imports/matching";
import { procurementAI, procurementAIStatus } from "../../src/lib/procurement-ai";
import type { MatchableProduct } from "../../src/lib/imports/types";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
async function main() {
  const organization = await prisma.organization.findFirstOrThrow();
  // This proof intentionally sends only repository-owned synthetic fixture data
  // to OpenAI. Supabase master data is never included in the request payload.
  const suppliers = [
    { id: "fixture-alfa", name: "Alfa Medical Demo", vatNumber: "00000000000" },
    { id: "fixture-care", name: "CareSupply Demo", vatNumber: "11111111111" },
    { id: "fixture-medika", name: "Medika Demo", vatNumber: "22222222222" },
  ];
  // Matching against live catalog data is deliberately excluded from this
  // outbound-provider proof. It is covered locally by deterministic tests.
  const products: MatchableProduct[] = [];
  const local = new LocalHeuristicProvider(); const results = [];
  const irregularOnly = process.argv.includes("--irregular-only");
  for (const fixture of irregularOnly ? [] : ["listino-alfa-medical-2027.xlsx", "offerta-caresupply-sporca.csv", "listino-medika-testuale.pdf"]) {
    const parsed = await parseDocument(await readFile(`demo-imports/${fixture}`), fixture); const mapped = local.mapFields(parsed.rows); const interpreted = local.interpretRows(parsed.rows, mapped.mapping);
    const localNormalized = interpreted.map(normalizeImportedFields); const localHigh = localNormalized.filter((record) => (suggestMatches(record, products).at(0)?.score ?? 0) >= .95 && record.comparable).length;
    const documentText = [fixture, parsed.textPreview, ...parsed.rows.slice(0,5).map((row) => row.rawSource)].filter(Boolean).join("\n");
    const aiDocument = await procurementAI.interpretDocumentContext(documentText, suppliers, { organizationId: organization.id, operation: "READINESS_DOCUMENT" });
    const ambiguousIndex = localNormalized.findIndex((record) => !record.comparable || !record.description || record.unitsPerPackage == null);
    const aiRow = ambiguousIndex >= 0 ? await procurementAI.interpretProductRow(parsed.rows[ambiguousIndex].rawSource, parsed.rows[ambiguousIndex].values, { organizationId: organization.id, operation: "READINESS_ROW" }) : null;
    results.push({ fixture, records: parsed.rows.length, local: { high: localHigh, review: parsed.rows.length - localHigh }, ai: { document: Boolean(aiDocument), supplier: aiDocument?.supplierCandidate.value, commercialConditions: aiDocument?.commercialConditions.length ?? 0, ambiguousRowInterpreted: Boolean(aiRow), rowConfidence: aiRow?.confidence ?? null } });
  }
  const irregular = "IRR-01 | Detergente cucina professionale | CF 12 X 750 ML | 31,50 EUR | IVA 22%";
  const aiIrregular = await procurementAI.interpretProductRow(irregular, { codice: "IRR-01", descrizione: "Detergente cucina professionale", formato: "CF 12 X 750 ML", prezzo: "31,50 EUR" }, { organizationId: organization.id, operation: "READINESS_IRREGULAR_ROW" });
  const telemetry = await prisma.procurementAICall.aggregate({ where: { operation: { startsWith: "READINESS_" }, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } }, _count: true, _sum: { inputTokens: true, outputTokens: true, totalTokens: true, estimatedCostUsd: true } });
  console.log(JSON.stringify({ provider: procurementAIStatus, fixtures: results, irregular: aiIrregular, telemetry }, null, 2));
}
main().finally(() => prisma.$disconnect());
