import "dotenv/config";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { applyBulkReview, BulkReviewValidationError } from "../src/lib/imports/bulk-review";
import { parseDocument } from "../src/lib/imports/parser";
import { LocalHeuristicProvider, providerRuntimeStatus, providerSupportsScannedDocuments } from "../src/lib/imports/provider";
import { getImportRecordCounts, getImportRecordPage } from "../src/lib/imports/review-query";
import { ingestDocument } from "../src/lib/imports/service";
import { prisma } from "../src/lib/prisma";

after(async () => { await prisma.$disconnect(); });

async function fixtureContext() {
  const user = await prisma.user.findFirstOrThrow({ where: { name: "Giulia Bianchi" }, include: { assignments: { take: 1 } } });
  const assignment = user.assignments[0];
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { active: true } });
  const product = await prisma.canonicalProduct.findFirstOrThrow({ where: { active: true } });
  return { user, assignment, supplier, product };
}

test("provider locale dichiara capacità reali e non simula OCR o invio esterno", () => {
  const provider = new LocalHeuristicProvider();
  assert.equal(provider.capabilities.structuredOutput, true);
  assert.equal(provider.capabilities.tables, true);
  assert.equal(provider.capabilities.ocr, false);
  assert.equal(provider.externalProcessing, false);
  assert.equal(providerSupportsScannedDocuments(provider), false);
  assert.equal(providerRuntimeStatus.externalProcessing, false);
});

test("parser e paginazione gestiscono 1.000 righe senza renderizzarle tutte", async () => {
  const header = "sku;descrizione;prezzo;pezzi\n";
  const csv = header + Array.from({ length: 1_000 }, (_, index) => `SKU-${String(index + 1).padStart(4, "0")};Guanto nitrile ${index + 1};2,50;100`).join("\n");
  const parsed = await parseDocument(Buffer.from(csv), "fixture-1000.csv");
  assert.equal(parsed.rows.length, 1_000);
  const { user, assignment, supplier } = await fixtureContext();
  const source = await prisma.sourceDocument.create({ data: { organizationId: assignment.organizationId, supplierId: supplier.id, uploadedByUserId: user.id, originalFilename: "fixture-1000.csv", mimeType: "text/csv", fileSize: Buffer.byteLength(csv), checksum: `fixture-large-${process.pid}`, sourceType: "CSV", documentKind: "PRICE_LIST", storagePath: "test/fixture-1000.csv", status: "PROCESSED" } });
  try {
    const job = await prisma.importJob.create({ data: { sourceDocumentId: source.id, status: "NEEDS_REVIEW", interpretationProvider: "LOCAL_HEURISTIC", createdByUserId: user.id, totalRecords: 1_000, reviewRequiredRecords: 38 } });
    await prisma.importedRecord.createMany({ data: Array.from({ length: 1_000 }, (_, index) => ({ importJobId: job.id, recordIndex: index + 1, rawSource: `SKU-${String(index + 1).padStart(4, "0")};Prodotto ${index + 1}`, rawFields: { supplierSku: `SKU-${index + 1}` }, interpretedFields: { supplierSku: `SKU-${index + 1}`, description: `Prodotto ${index + 1}` }, normalizedFields: { description: `Prodotto ${index + 1}`, comparable: true, normalizedPrice: (index + 1) / 1000, normalizedLabel: "", validationErrors: [], warnings: [] }, sourceLocator: { row: index + 2 }, searchText: `sku-${String(index + 1).padStart(4, "0")} prodotto ${index + 1}`, supplierSkuText: `SKU-${index + 1}`, normalizedPriceValue: (index + 1) / 1000, exceptionType: index < 38 ? "UNCERTAIN_MATCH" : null, status: index < 38 ? "NEEDS_REVIEW" : "READY", requiresReview: index < 38, matchConfidence: index < 38 ? .7 : .95 })) });
    const first = await getImportRecordPage(prisma, { jobId: job.id, filter: "attention", page: 1, pageSize: 25 });
    const second = await getImportRecordPage(prisma, { jobId: job.id, filter: "attention", page: 2, pageSize: 25 });
    const searched = await getImportRecordPage(prisma, { jobId: job.id, filter: "all", search: "SKU-0999", pageSize: 25 });
    assert.equal(first.total, 38);
    assert.equal(first.records.length, 25);
    assert.equal(second.records.length, 13);
    assert.equal(second.records[0].recordIndex, 26);
    assert.equal(searched.total, 1);
    assert.equal(searched.records[0].recordIndex, 999);
  } finally {
    await prisma.sourceDocument.delete({ where: { id: source.id } });
  }
});

test("bulk review rifiuta selezioni miste, aggiorna contatori e non duplica audit", async () => {
  const { user, assignment, supplier, product } = await fixtureContext();
  const source = await prisma.sourceDocument.create({ data: { organizationId: assignment.organizationId, supplierId: supplier.id, uploadedByUserId: user.id, originalFilename: "fixture-bulk.csv", mimeType: "text/csv", fileSize: 10, checksum: `fixture-bulk-${process.pid}`, sourceType: "CSV", documentKind: "OFFER", storagePath: "test/fixture-bulk.csv", status: "PROCESSED" } });
  try {
    const job = await prisma.importJob.create({ data: { sourceDocumentId: source.id, status: "NEEDS_REVIEW", interpretationProvider: "LOCAL_HEURISTIC", createdByUserId: user.id, totalRecords: 2, reviewRequiredRecords: 2 } });
    const records: { id: string }[] = [];
    for (let index = 0; index < 2; index += 1) {
      const record = await prisma.importedRecord.create({ data: { importJobId: job.id, recordIndex: index + 1, rawSource: `riga ${index + 1}`, rawFields: {}, interpretedFields: {}, normalizedFields: { comparable: true }, sourceLocator: { row: index + 1 }, normalizedPriceValue: .025, status: "READY", requiresReview: true } });
      await prisma.productMatchCandidate.create({ data: { importedRecordId: record.id, canonicalProductId: product.id, matchType: "PROBABLE_MATCH", score: .95, reasons: ["test"], uomCompatibility: true, packagingCompatibility: index === 0, recommended: true } });
      records.push(record);
    }
    await assert.rejects(() => applyBulkReview(prisma, { jobId: job.id, recordIds: records.map(({ id }) => id), action: "ACCEPT_RECOMMENDED", actorUserId: user.id }), BulkReviewValidationError);
    assert.equal(await prisma.importedRecord.count({ where: { importJobId: job.id, status: "CONFIRMED" } }), 0, "una selezione mista deve essere atomica");
    const first = await applyBulkReview(prisma, { jobId: job.id, recordIds: [records[0].id], action: "ACCEPT_RECOMMENDED", actorUserId: user.id });
    const auditAfterFirst = await prisma.auditEvent.count({ where: { OR: [{ entityType: "IMPORTED_RECORD", entityId: records[0].id }, { entityType: "IMPORT_JOB", entityId: job.id }], action: "MATCH_ACCEPTED" } });
    await assert.rejects(() => applyBulkReview(prisma, { jobId: job.id, recordIds: [records[0].id], action: "ACCEPT_RECOMMENDED", actorUserId: user.id }), BulkReviewValidationError);
    assert.equal(first.changed, 1);
    assert.equal(auditAfterFirst, 2, "la decisione bulk deve lasciare audit sia sul record sia sul job");
    assert.equal(await prisma.auditEvent.count({ where: { OR: [{ entityType: "IMPORTED_RECORD", entityId: records[0].id }, { entityType: "IMPORT_JOB", entityId: job.id }], action: "MATCH_ACCEPTED" } }), auditAfterFirst, "la ripetizione non deve duplicare audit");
    assert.equal(await prisma.importedRecord.count({ where: { importJobId: job.id, status: "CONFIRMED" } }), 1);
    const counts = await getImportRecordCounts(prisma, job.id);
    assert.equal(counts.confirmed, 1);
    assert.equal(counts.proposed, 1);
  } finally {
    await prisma.sourceDocument.delete({ where: { id: source.id } });
  }
});

test("immagine senza provider resta persistita e non modifica dati canonici", async () => {
  const previousStorageProvider = process.env.DOCUMENT_STORAGE_PROVIDER;
  process.env.DOCUMENT_STORAGE_PROVIDER = "local";
  const { user, assignment, supplier } = await fixtureContext();
  const productsBefore = await prisma.canonicalProduct.count();
  const jobId = await ingestDocument({ buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), filename: `scansione-${process.pid}.png`, mimeType: "image/png", supplierId: supplier.id, documentKind: "PRICE_LIST", organizationId: assignment.organizationId, userId: user.id });
  const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId }, include: { sourceDocument: true, records: true } });
  try {
    assert.equal(job.status, "REQUIRES_PROVIDER");
    assert.equal(job.sourceDocument.status, "REQUIRES_PROVIDER");
    assert.equal(job.records.length, 0);
    assert.equal(await prisma.canonicalProduct.count(), productsBefore);
  } finally {
    const locator = job.sourceDocument.storageObjectKey ? path.join("var", "imports", ...job.sourceDocument.storageObjectKey.split("/")) : null;
    if (locator) await rm(locator, { force: true });
    await prisma.sourceDocument.delete({ where: { id: job.sourceDocumentId } });
    if (previousStorageProvider === undefined) delete process.env.DOCUMENT_STORAGE_PROVIDER; else process.env.DOCUMENT_STORAGE_PROVIDER = previousStorageProvider;
  }
});
