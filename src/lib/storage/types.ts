export type DocumentStorageLocator = {
  provider: "local" | "supabase";
  bucket: string | null;
  objectKey: string;
};

export type StoredDocumentMetadata = {
  size: number;
  contentType?: string;
};

export interface DocumentStorageProvider {
  readonly id: DocumentStorageLocator["provider"];
  put(locator: DocumentStorageLocator, data: Buffer, contentType: string): Promise<void>;
  get(locator: DocumentStorageLocator): Promise<Buffer>;
  exists(locator: DocumentStorageLocator): Promise<boolean>;
  delete(locator: DocumentStorageLocator): Promise<void>;
  head(locator: DocumentStorageLocator): Promise<StoredDocumentMetadata | null>;
  createSignedUrl(locator: DocumentStorageLocator, expiresInSeconds: number): Promise<string | null>;
}
