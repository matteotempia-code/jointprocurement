import "dotenv/config";
import { randomUUID } from "node:crypto";
import { SupabaseDocumentStorage } from "../../src/lib/storage/supabase";
import type { DocumentStorageLocator } from "../../src/lib/storage/types";

async function main() {
  const provider = process.env.DOCUMENT_STORAGE_PROVIDER;
  console.log(`Provider................ ${provider === "supabase" ? "supabase" : "NOT READY"}`);
  if (provider !== "supabase") throw new Error("DOCUMENT_STORAGE_PROVIDER deve essere 'supabase'.");
  const storage = new SupabaseDocumentStorage();
  const { data: buckets, error } = await storage.listBuckets();
  if (error) throw new Error(`Supabase non raggiungibile: ${error.message}`);
  const bucket = buckets.find((item) => item.id === storage.bucket);
  if (!bucket) throw new Error(`Bucket '${storage.bucket}' assente. Eseguire npm run storage:setup.`);
  if (bucket.public) throw new Error(`Bucket '${storage.bucket}' pubblico: configurazione non sicura.`);
  console.log("Bucket.................. PASS (privato)");

  const objectKey = `_probes/${randomUUID()}.txt`;
  const locator: DocumentStorageLocator = { provider: "supabase", bucket: storage.bucket, objectKey };
  const payload = Buffer.from(`storage-probe-${randomUUID()}`);
  try {
    await storage.put(locator, payload, "text/plain");
    if (!await storage.exists(locator)) throw new Error("Probe caricato ma non rilevato.");
    const metadata = await storage.head(locator);
    if (!metadata || metadata.size !== payload.length) throw new Error("Metadata probe non coerenti.");
    const downloaded = await storage.get(locator);
    if (!downloaded.equals(payload)) throw new Error("Contenuto probe non coerente.");
    const signedUrl = await storage.createSignedUrl(locator, 60);
    if (!signedUrl) throw new Error("URL firmato non generato.");
    console.log("Upload/read/signed URL.. PASS");
  } finally {
    await storage.delete(locator).catch(() => {});
  }
  if (await storage.exists(locator)) throw new Error("Cleanup probe non riuscito.");
  console.log("Probe cleanup........... PASS");
  console.log("OVERALL................. READY");
}

main().catch((error) => { console.error(`OVERALL................. NOT READY (${error instanceof Error ? error.message : "errore sconosciuto"})`); process.exitCode = 1; });
