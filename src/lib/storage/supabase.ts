import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSafeObjectKey } from "./keys";
import type { DocumentStorageLocator, DocumentStorageProvider } from "./types";

function required(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "SUPABASE_STORAGE_BUCKET") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} non configurata.`);
  return value;
}

export function configuredSupabaseBucket() { return required("SUPABASE_STORAGE_BUCKET"); }

export class SupabaseDocumentStorage implements DocumentStorageProvider {
  readonly id = "supabase" as const;
  private readonly client: SupabaseClient;
  readonly bucket: string;

  constructor(options: { url?: string; serviceKey?: string; bucket?: string } = {}) {
    const url = options.url ?? required("SUPABASE_URL");
    const serviceKey = options.serviceKey ?? required("SUPABASE_SERVICE_ROLE_KEY");
    this.bucket = options.bucket ?? required("SUPABASE_STORAGE_BUCKET");
    if (!/^[a-z0-9][a-z0-9._-]{1,62}$/.test(this.bucket)) throw new Error("SUPABASE_STORAGE_BUCKET non valido.");
    this.client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  }

  private key(locator: DocumentStorageLocator) {
    if (locator.provider !== this.id || locator.bucket !== this.bucket) throw new Error("Locator Supabase non valido.");
    return assertSafeObjectKey(locator.objectKey);
  }

  async put(locator: DocumentStorageLocator, data: Buffer, contentType: string) {
    const { error } = await this.client.storage.from(this.bucket).upload(this.key(locator), data, { contentType, upsert: false });
    if (error) throw new Error(`Upload Supabase Storage non riuscito: ${error.message}`);
  }

  async get(locator: DocumentStorageLocator) {
    const { data, error } = await this.client.storage.from(this.bucket).download(this.key(locator));
    if (error || !data) throw new Error(`Documento non disponibile in Supabase Storage${error ? `: ${error.message}` : "."}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async exists(locator: DocumentStorageLocator) { return (await this.head(locator)) !== null; }

  async delete(locator: DocumentStorageLocator) {
    const { error } = await this.client.storage.from(this.bucket).remove([this.key(locator)]);
    if (error) throw new Error(`Eliminazione Supabase Storage non riuscita: ${error.message}`);
  }

  async head(locator: DocumentStorageLocator) {
    const key = this.key(locator);
    const slash = key.lastIndexOf("/");
    const { data, error } = await this.client.storage.from(this.bucket).list(key.slice(0, slash), { search: key.slice(slash + 1), limit: 2 });
    if (error) throw new Error(`Verifica Supabase Storage non riuscita: ${error.message}`);
    const item = data.find((candidate) => candidate.name === key.slice(slash + 1));
    if (!item) return null;
    return { size: Number(item.metadata?.size ?? 0), contentType: typeof item.metadata?.mimetype === "string" ? item.metadata.mimetype : undefined };
  }

  async createSignedUrl(locator: DocumentStorageLocator, expiresInSeconds: number) {
    const ttl = Math.min(Math.max(Math.floor(expiresInSeconds), 10), 300);
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(this.key(locator), ttl);
    if (error || !data?.signedUrl) throw new Error(`URL firmato non disponibile${error ? `: ${error.message}` : "."}`);
    return data.signedUrl;
  }

  async listBuckets() { return this.client.storage.listBuckets(); }
  async createPrivateBucket() { return this.client.storage.createBucket(this.bucket, { public: false, fileSizeLimit: 8 * 1024 * 1024 }); }
}
