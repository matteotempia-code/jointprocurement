import type { SourceDocument } from "@prisma/client";
import { LocalDocumentStorage } from "./local";
import { SupabaseDocumentStorage, configuredSupabaseBucket } from "./supabase";
import type { DocumentStorageLocator, DocumentStorageProvider } from "./types";

export function configuredDocumentStorageProvider() {
  const configured = process.env.DOCUMENT_STORAGE_PROVIDER?.trim().toLocaleLowerCase("en-US");
  if (configured === "local" || configured === "supabase") return configured;
  if (process.env.NODE_ENV === "test") return "local" as const;
  throw new Error("DOCUMENT_STORAGE_PROVIDER deve essere configurato esplicitamente come 'supabase' o 'local'.");
}

export function getDocumentStorage(provider = configuredDocumentStorageProvider()): DocumentStorageProvider {
  return provider === "supabase" ? new SupabaseDocumentStorage() : new LocalDocumentStorage();
}

export function locatorForNewDocument(objectKey: string): DocumentStorageLocator {
  const provider = configuredDocumentStorageProvider();
  return { provider, bucket: provider === "supabase" ? configuredSupabaseBucket() : null, objectKey };
}

export function locatorFromSourceDocument(source: Pick<SourceDocument, "storageProvider" | "storageBucket" | "storageObjectKey" | "storagePath">): DocumentStorageLocator {
  if (source.storageProvider === "supabase" && source.storageBucket && source.storageObjectKey) return { provider: "supabase", bucket: source.storageBucket, objectKey: source.storageObjectKey };
  if (source.storageProvider === "local") {
    const legacy = source.storagePath.replaceAll("\\", "/");
    const normalized = source.storageObjectKey ?? (legacy.startsWith("demo-imports/") ? `fixtures/${legacy.slice("demo-imports/".length)}` : legacy.replace(/^var\/imports\//, ""));
    return { provider: "local", bucket: null, objectKey: normalized };
  }
  throw new Error("Locator del documento incompleto o non supportato.");
}

export async function readSourceDocument(source: Pick<SourceDocument, "storageProvider" | "storageBucket" | "storageObjectKey" | "storagePath">) {
  const locator = locatorFromSourceDocument(source);
  return getDocumentStorage(locator.provider).get(locator);
}
