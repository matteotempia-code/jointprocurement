import "dotenv/config";
import { SupabaseDocumentStorage } from "../../src/lib/storage/supabase";

async function main() {
  if (process.env.DOCUMENT_STORAGE_PROVIDER !== "supabase") throw new Error("DOCUMENT_STORAGE_PROVIDER deve essere 'supabase'.");
  const storage = new SupabaseDocumentStorage();
  const { data, error } = await storage.listBuckets();
  if (error) throw new Error(`Impossibile verificare i bucket: ${error.message}`);
  const current = data.find((bucket) => bucket.id === storage.bucket);
  if (current?.public) throw new Error(`Il bucket '${storage.bucket}' esiste ma e pubblico. Renderlo privato prima di continuare.`);
  if (!current) {
    const { error: createError } = await storage.createPrivateBucket();
    if (createError) throw new Error(`Creazione bucket non riuscita: ${createError.message}`);
    console.log(`STORAGE SETUP PASS: bucket '${storage.bucket}' creato come privato.`);
    return;
  }
  console.log(`STORAGE SETUP PASS: bucket '${storage.bucket}' esiste ed e privato.`);
}

main().catch((error) => { console.error(`STORAGE SETUP FAIL: ${error instanceof Error ? error.message : "errore sconosciuto"}`); process.exitCode = 1; });
