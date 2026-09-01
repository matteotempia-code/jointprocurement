import "dotenv/config";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import AdmZip from "adm-zip";
import { LocalDocumentStorage } from "../src/lib/storage/local";
import { assertSafeObjectKey, buildDocumentObjectKey, sanitizeDocumentFilename } from "../src/lib/storage/keys";
import type { DocumentStorageLocator } from "../src/lib/storage/types";
import { ingestDocument } from "../src/lib/imports/service";
import { locatorFromSourceDocument, readSourceDocument } from "../src/lib/storage";
import { prisma } from "../src/lib/prisma";

after(async () => { await prisma.$disconnect(); });

test("object keys are organization-scoped, deterministic and traversal-safe", () => {
  const checksum = "a".repeat(64);
  const key = buildDocumentObjectKey({ organizationId: "org_123", sourceDocumentId: "doc-123", checksum, filename: "Listino Demo.xlsx" });
  assert.equal(key, `organizations/org_123/imports/doc-123/documents/doc-123/${checksum}-Listino-Demo.xlsx`);
  assert.equal(sanitizeDocumentFilename("file.csv"), "file.csv");
  assert.throws(() => sanitizeDocumentFilename("../file.csv"));
  assert.throws(() => assertSafeObjectKey("organizations/org/../secret"));
  assert.throws(() => assertSafeObjectKey("/absolute/file"));
});

test("local adapter supports immutable round-trip, metadata, deletion and missing objects", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "jpo-storage-test-"));
  const storage = new LocalDocumentStorage(root);
  const locator: DocumentStorageLocator = { provider: "local", bucket: null, objectKey: "organizations/org/imports/doc/documents/doc/test.csv" };
  const data = Buffer.from("sku;descrizione;prezzo\nA1;Demo;1,00\n");
  try {
    await storage.put(locator, data, "text/csv");
    assert.equal(await storage.exists(locator), true);
    assert.deepEqual(await storage.get(locator), data);
    assert.equal((await storage.head(locator))?.size, data.length);
    assert.equal(await storage.createSignedUrl(locator, 60), null);
    await assert.rejects(() => storage.put(locator, Buffer.from("different"), "text/csv"), /Collisione/);
    await storage.delete(locator);
    assert.equal(await storage.exists(locator), false);
    await assert.rejects(() => storage.get(locator));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ingest persists an explicit local locator and duplicate provenance", async () => {
  const previousProvider = process.env.DOCUMENT_STORAGE_PROVIDER;
  process.env.DOCUMENT_STORAGE_PROVIDER = "local";
  const user = await prisma.user.findFirstOrThrow({ where: { name: "Giulia Bianchi" }, include: { assignments: { take: 1 } } });
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { active: true } });
  const buffer = Buffer.from("sku;descrizione;prezzo;pezzi\nSTORAGE-1;Guanto nitrile senza polvere M;2,50;100\n");
  const ids: string[] = [];
  const locators: DocumentStorageLocator[] = [];
  try {
    for (let index = 0; index < 2; index += 1) {
      const jobId = await ingestDocument({ buffer, filename: "storage-duplicate-test.csv", mimeType: "text/csv", supplierId: supplier.id, documentKind: "PRICE_LIST", organizationId: user.assignments[0].organizationId, userId: user.id });
      const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId }, include: { sourceDocument: true } });
      ids.push(job.sourceDocumentId);
      locators.push(locatorFromSourceDocument(job.sourceDocument));
      assert.equal(job.sourceDocument.storageProvider, "local");
      assert.equal(job.sourceDocument.storageBucket, null);
      assert.deepEqual(await readSourceDocument(job.sourceDocument), buffer);
      if (index === 1) assert.equal((job.sourceDocument.metadata as { duplicateOf?: string }).duplicateOf, ids[0]);
    }
  } finally {
    const storage = new LocalDocumentStorage();
    for (const locator of locators) await storage.delete(locator).catch(() => {});
    if (ids.length) await prisma.sourceDocument.deleteMany({ where: { id: { in: ids } } });
    if (previousProvider === undefined) delete process.env.DOCUMENT_STORAGE_PROVIDER; else process.env.DOCUMENT_STORAGE_PROVIDER = previousProvider;
  }
});

test("operational ingestion preserves CSV, XLSX, PDF and DOCX source bytes", async () => {
  const previousProvider = process.env.DOCUMENT_STORAGE_PROVIDER;
  process.env.DOCUMENT_STORAGE_PROVIDER = "local";
  const user = await prisma.user.findFirstOrThrow({ where: { name: "Giulia Bianchi" }, include: { assignments: { take: 1 } } });
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { active: true } });
  const zip = new AdmZip();
  zip.addFile("[Content_Types].xml", Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'));
  zip.addFile("_rels/.rels", Buffer.from('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'));
  zip.addFile("word/document.xml", Buffer.from('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>sku;descrizione;prezzo;pezzi</w:t></w:r></w:p><w:p><w:r><w:t>CLOUD-DOCX;Guanto nitrile senza polvere M;2,50;100</w:t></w:r></w:p></w:body></w:document>'));
  const fixtureRoot = path.join(process.cwd(), "demo-imports");
  const cases = [
    { filename: "storage-e2e.csv", mimeType: "text/csv", buffer: Buffer.from("sku;descrizione;prezzo;pezzi\nCLOUD-CSV;Guanto nitrile senza polvere M;2,50;100\n") },
    { filename: "storage-e2e.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: await readFile(path.join(fixtureRoot, "listino-alfa-medical-2027.xlsx")) },
    { filename: "storage-e2e.pdf", mimeType: "application/pdf", buffer: await readFile(path.join(fixtureRoot, "listino-medika-testuale.pdf")) },
    { filename: "storage-e2e.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: zip.toBuffer() },
  ];
  const ids: string[] = [];
  const locators: DocumentStorageLocator[] = [];
  try {
    for (const fixture of cases) {
      const jobId = await ingestDocument({ ...fixture, supplierId: supplier.id, documentKind: "PRICE_LIST", organizationId: user.assignments[0].organizationId, userId: user.id });
      const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId }, include: { sourceDocument: true } });
      assert.notEqual(job.status, "FAILED", fixture.filename);
      assert.ok(job.totalRecords > 0, fixture.filename);
      assert.deepEqual(await readSourceDocument(job.sourceDocument), fixture.buffer);
      ids.push(job.sourceDocumentId);
      locators.push(locatorFromSourceDocument(job.sourceDocument));
    }
  } finally {
    const storage = new LocalDocumentStorage();
    for (const locator of locators) await storage.delete(locator).catch(() => {});
    if (ids.length) await prisma.sourceDocument.deleteMany({ where: { id: { in: ids } } });
    if (previousProvider === undefined) delete process.env.DOCUMENT_STORAGE_PROVIDER; else process.env.DOCUMENT_STORAGE_PROVIDER = previousProvider;
  }
});
