import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getDocumentStorage, locatorForNewDocument } from "@/lib/storage";
import { buildOperationalAttachmentKey, sanitizeDocumentFilename } from "@/lib/storage/keys";

export const MAX_OPERATIONAL_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const allowed: Record<string, Set<string>> = {
  pdf: new Set(["application/pdf", "application/octet-stream"]),
  png: new Set(["image/png", "application/octet-stream"]),
  jpg: new Set(["image/jpeg", "application/octet-stream"]),
  jpeg: new Set(["image/jpeg", "application/octet-stream"]),
  docx: new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"]),
  xlsx: new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"]),
};

export type PreparedOperationalAttachment = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  storageProvider: string;
  storageBucket: string | null;
  storageObjectKey: string;
};

function validate(file: File) {
  const filename = sanitizeDocumentFilename(file.name);
  const extension = filename.split(".").pop()?.toLocaleLowerCase("it-IT") ?? "";
  if (!allowed[extension]) throw new Error(`Formato non supportato per ${filename}. Usa PDF, PNG, JPG, DOCX o XLSX.`);
  if (!allowed[extension].has((file.type || "application/octet-stream").toLocaleLowerCase("it-IT"))) throw new Error(`Il tipo del file ${filename} non corrisponde all’estensione.`);
  if (file.size <= 0) throw new Error(`Il file ${filename} è vuoto.`);
  if (file.size > MAX_OPERATIONAL_ATTACHMENT_BYTES) throw new Error(`Il file ${filename} supera il limite di 8 MB.`);
  return filename;
}

export async function uploadOperationalAttachments(input: { files: File[]; organizationId: string; ownerType: string; ownerId: string }) {
  const uploaded: PreparedOperationalAttachment[] = [];
  for (const file of input.files.filter((candidate) => candidate.size > 0 && candidate.name)) {
    const originalFilename = validate(file);
    const data = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(data).digest("hex");
    const id = randomUUID();
    const storageObjectKey = buildOperationalAttachmentKey({ organizationId: input.organizationId, ownerType: input.ownerType, ownerId: input.ownerId, attachmentId: id, checksum, filename: originalFilename });
    const locator = locatorForNewDocument(storageObjectKey);
    const storage = getDocumentStorage(locator.provider);
    try {
      await storage.put(locator, data, file.type || "application/octet-stream");
      uploaded.push({ id, originalFilename, mimeType: file.type || "application/octet-stream", sizeBytes: data.length, checksum, storageProvider: locator.provider, storageBucket: locator.bucket, storageObjectKey });
    } catch (error) {
      await cleanupOperationalAttachments(uploaded);
      throw error;
    }
  }
  return uploaded;
}

export async function cleanupOperationalAttachments(attachments: PreparedOperationalAttachment[]) {
  await Promise.all(attachments.map((attachment) => getDocumentStorage(attachment.storageProvider as "local" | "supabase").delete({ provider: attachment.storageProvider as "local" | "supabase", bucket: attachment.storageBucket, objectKey: attachment.storageObjectKey }).catch(() => {})));
}
