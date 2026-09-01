import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../src/lib/prisma";
import { assertSafeObjectKey, buildDocumentObjectKey } from "../../src/lib/storage/keys";
import { SupabaseDocumentStorage } from "../../src/lib/storage/supabase";
import type { DocumentStorageLocator } from "../../src/lib/storage/types";

function resolveLegacyFile(storagePath: string) {
  const normalized = storagePath.replaceAll("\\", "/");
  if (normalized.split("/").some((part) => part === ".." || part === "." || !part)) return null;
  const fixtureRoot = path.resolve(process.cwd(), "demo-imports") + path.sep;
  const runtimeRoot = path.resolve(process.cwd(), "var", "imports") + path.sep;
  if (normalized.startsWith("demo-imports/")) {
    const resolved = path.resolve(process.cwd(), ...normalized.split("/"));
    return resolved.startsWith(fixtureRoot) ? resolved : null;
  }
  const objectKey = normalized.startsWith("var/imports/") ? normalized.slice("var/imports/".length) : normalized;
  try { assertSafeObjectKey(objectKey); } catch { return null; }
  const resolved = path.resolve(process.cwd(), "var", "imports", ...objectKey.split("/"));
  return resolved.startsWith(runtimeRoot) ? resolved : null;
}

async function main() {
  if (process.env.DOCUMENT_STORAGE_PROVIDER !== "supabase") throw new Error("DOCUMENT_STORAGE_PROVIDER deve essere 'supabase'.");
  const storage = new SupabaseDocumentStorage();
  const sources = await prisma.sourceDocument.findMany({ where: { NOT: { storageProvider: "supabase" } }, orderBy: { uploadedAt: "asc" } });
  let migrated = 0; let missing = 0;
  for (const source of sources) {
    const legacyFile = resolveLegacyFile(source.storagePath);
    if (!legacyFile) { missing += 1; console.log(`SKIP ${source.id}: locator locale non migrabile.`); continue; }
    let data: Buffer;
    try { data = await readFile(legacyFile); } catch { missing += 1; console.log(`SKIP ${source.id}: file locale assente.`); continue; }
    const checksum = createHash("sha256").update(data).digest("hex");
    const objectKey = buildDocumentObjectKey({ organizationId: source.organizationId, sourceDocumentId: source.id, checksum, filename: source.originalFilename });
    const locator: DocumentStorageLocator = { provider: "supabase", bucket: storage.bucket, objectKey };
    if (await storage.exists(locator)) {
      const existing = await storage.get(locator);
      if (!existing.equals(data)) throw new Error(`Oggetto esistente con contenuto differente per ${source.id}.`);
    } else {
      await storage.put(locator, data, source.mimeType || "application/octet-stream");
    }
    try {
      await prisma.sourceDocument.update({ where: { id: source.id }, data: { checksum, fileSize: data.length, storageProvider: "supabase", storageBucket: storage.bucket, storageObjectKey: objectKey, storagePath: objectKey, metadata: { ...(source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata) ? source.metadata : {}), migratedFrom: source.storagePath, migratedAt: new Date().toISOString() } } });
      migrated += 1;
    } catch (error) {
      await storage.delete(locator).catch(() => {});
      throw error;
    }
  }
  console.log(`STORAGE MIGRATION: ${migrated} migrati, ${missing} saltati, ${sources.length} candidati.`);
  if (missing) process.exitCode = 2;
}

main().finally(() => prisma.$disconnect()).catch((error) => { console.error(`STORAGE MIGRATION FAIL: ${error instanceof Error ? error.message : "errore sconosciuto"}`); process.exitCode = 1; });
