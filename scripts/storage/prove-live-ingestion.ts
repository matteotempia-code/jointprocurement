import "dotenv/config";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../src/lib/prisma";
import { ingestDocument } from "../../src/lib/imports/service";
import { getDocumentStorage, locatorFromSourceDocument } from "../../src/lib/storage";

const cases = [
  { proof: "xlsx", fixture: "listino-alfa-medical-2027.xlsx", filename: "cloud-proof-listino.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", supplier: "Alfa Medical" },
  { proof: "pdf", fixture: "listino-medika-testuale.pdf", filename: "cloud-proof-listino-native.pdf", mimeType: "application/pdf", supplier: "Medika Network" },
] as const;

async function main() {
  if (process.env.DOCUMENT_STORAGE_PROVIDER !== "supabase") throw new Error("La prova live richiede DOCUMENT_STORAGE_PROVIDER=supabase.");
  const organization = await prisma.organization.findFirstOrThrow({ where: { name: "Anteo Demo" } });
  const user = await prisma.user.findFirstOrThrow({ where: { name: "Giulia Bianchi" } });
  const results: Array<Record<string, unknown>> = [];
  for (const definition of cases) {
    const supplier = await prisma.supplier.findFirstOrThrow({ where: { name: definition.supplier } });
    const buffer = await readFile(path.join(process.cwd(), "demo-imports", definition.fixture));
    const jobId = await ingestDocument({ buffer, filename: definition.filename, mimeType: definition.mimeType, documentKind: "PRICE_LIST", organizationId: organization.id, supplierId: supplier.id, userId: user.id, notes: "Prova live Supabase Storage sintetica" });
    const job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId }, include: { sourceDocument: true } });
    const source = job.sourceDocument;
    const expectedPrefix = `organizations/${organization.id}/imports/${source.id}/documents/${source.id}/`;
    if (source.storageProvider !== "supabase" || source.storageBucket !== process.env.SUPABASE_STORAGE_BUCKET || !source.storageObjectKey?.startsWith(expectedPrefix)) throw new Error(`Locator cloud non valido per ${definition.proof}.`);
    if (source.storagePath !== source.storageObjectKey || /^[A-Za-z]:\\|^\//.test(source.storagePath)) throw new Error(`Percorso locale persistito per ${definition.proof}.`);
    const locator = locatorFromSourceDocument(source), storage = getDocumentStorage("supabase"), metadata = await storage.head(locator), downloaded = await storage.get(locator), signedUrl = await storage.createSignedUrl(locator, 60);
    if (!metadata || downloaded.length !== buffer.length || !signedUrl) throw new Error(`Oggetto live non verificabile per ${definition.proof}.`);
    results.push({ proof: definition.proof, sourceDocumentId: source.id, importJobId: job.id, originalFilename: source.originalFilename, mimeType: source.mimeType, sizeBytes: source.fileSize, checksum: source.checksum, storageProvider: source.storageProvider, storageBucket: source.storageBucket, storageObjectKey: source.storageObjectKey, parserType: job.parserType, importStatus: job.status, objectExists: true, serverReadBytes: downloaded.length, signedUrlTtlSeconds: 60 });
  }
  const proofDirectory = path.join(process.cwd(), "var", "storage-proof"); await mkdir(proofDirectory, { recursive: true }); await writeFile(path.join(proofDirectory, "manifest.json"), JSON.stringify({ createdAt: new Date().toISOString(), results }, null, 2));
  console.log(`LIVE STORAGE PROOF PASS: ${results.map((item) => item.proof).join(" + ")} caricati, letti e firmati nel bucket privato.`);
  for (const result of results) console.log(`${result.proof}: SourceDocument ${result.sourceDocumentId} · ${result.serverReadBytes} byte · provider supabase`);
}

main().finally(() => prisma.$disconnect()).catch((error) => { console.error(`LIVE STORAGE PROOF FAIL: ${error instanceof Error ? error.message : "errore sconosciuto"}`); process.exitCode = 1; });
