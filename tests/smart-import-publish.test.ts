import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { publishImport } from "../src/lib/imports/service";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

test("staging non muta il catalogo e publish è atomico, idempotente e conserva la provenienza", async () => {
  // PrismaPg owns the connection lifecycle: keep fixture reads sequential so the
  // integration test also exercises the adapter without overlapping queries.
  const organization = await prisma.organization.findFirstOrThrow({ where: { name: "Anteo Demo" } });
  const user = await prisma.user.findFirstOrThrow({ where: { email: "giulia.bianchi@demo.local" } });
  const product = await prisma.canonicalProduct.findFirstOrThrow({ orderBy: { name: "asc" } });
  const productsBefore = await prisma.canonicalProduct.count();
  const supplier = await prisma.supplier.create({ data: { name: "Fornitore Publish Test", vatNumber: `ITQA${Date.now()}`, active: true } });
  const source = await prisma.sourceDocument.create({ data: { organizationId: organization.id, supplierId: supplier.id, uploadedByUserId: user.id, originalFilename: "listino-publish-test.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileSize: 1200, checksum: `publish-test-${Date.now()}`, sourceType: "XLSX", documentKind: "PRICE_LIST", storagePath: "var/imports/test/listino-publish-test.xlsx", status: "PROCESSED" } });
  const job = await prisma.importJob.create({ data: { sourceDocumentId: source.id, status: "READY_TO_PUBLISH", parserType: "XLSX_DETERMINISTIC", interpretationProvider: "LOCAL_HEURISTIC", totalRecords: 1, interpretedRecords: 1, publishableRecords: 1, createdByUserId: user.id, version: 1 } });
  const record = await prisma.importedRecord.create({ data: { importJobId: job.id, recordIndex: 1, rawSource: "QA-1;Prodotto;BOX;100;2,50", rawFields: { sku: "QA-1", price: "2,50" }, interpretedFields: { supplierSku: "QA-1", description: product.name, purchaseUom: "BOX", unitsPerPackage: 100, consumptionUom: "PIECE", netPrice: 2.5 }, normalizedFields: { supplierSku: "QA-1", description: product.name, purchaseUom: "BOX", unitsPerPackage: 100, consumptionUom: "PIECE", netPrice: 2.5, normalizedPrice: 0.025, normalizedLabel: "0,0250 € / pezzo", comparable: true, validationErrors: [], warnings: [], currency: "EUR", taxRate: 22, moq: 1, validFrom: "2027-01-01", validUntil: "2027-12-31" }, sourceLocator: { sheet: "Listino", row: 4, columns: { netPrice: "Prezzo netto" } }, extractionConfidence: 1, mappingConfidence: 1, normalizationConfidence: 1, matchConfidence: 1, status: "CONFIRMED", requiresReview: false, canonicalProductId: product.id } });
  assert.equal(await prisma.canonicalProduct.count(), productsBefore, "lo staging non crea prodotti canonici");
  try {
    const first = await publishImport(job.id, user.id, organization.id);
    const second = await publishImport(job.id, user.id, organization.id);
    assert.equal(second.id, first.id, "un secondo publish restituisce lo stesso listino");
    assert.equal(await prisma.priceList.count({ where: { importJobId: job.id } }), 1);
    assert.equal(await prisma.supplierOffer.count({ where: { importedRecordId: record.id } }), 1);
    const offer = await prisma.supplierOffer.findUniqueOrThrow({ where: { importedRecordId: record.id } });
    assert.equal(Number(offer.normalizedUnitPrice), 0.025);
    assert.equal(offer.sourceDocumentId, source.id);
    assert.equal(await prisma.auditEvent.count({ where: { entityType: "IMPORT_JOB", entityId: job.id, action: "IMPORT_PUBLISHED" } }), 1);
  } finally {
    await prisma.offerPriceHistory.deleteMany({ where: { supplierOffer: { importedRecordId: record.id } } });
    await prisma.supplierOffer.deleteMany({ where: { importedRecordId: record.id } });
    await prisma.priceList.deleteMany({ where: { importJobId: job.id } });
    await prisma.auditEvent.deleteMany({ where: { OR: [{ entityType: "IMPORT_JOB", entityId: job.id }, { entityType: "CANONICAL_PRODUCT", entityId: product.id, metadata: { path: ["importedRecordId"], equals: record.id } }] } });
    await prisma.importedRecord.deleteMany({ where: { id: record.id } });
    await prisma.importJob.deleteMany({ where: { id: job.id } });
    await prisma.sourceDocument.deleteMany({ where: { id: source.id } });
    await prisma.supplier.deleteMany({ where: { id: supplier.id } });
  }
});

test.after(async () => prisma.$disconnect());
