import path from "node:path";

function safeSegment(value: string, label: string) {
  if (!value || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error(`${label} non valido per lo storage.`);
  return value;
}

export function sanitizeDocumentFilename(filename: string) {
  const base = path.win32.basename(path.posix.basename(filename));
  if (base !== filename) throw new Error("Nome file non valido.");
  const sanitized = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!sanitized || sanitized === "." || sanitized === "..") throw new Error("Nome file non valido.");
  return sanitized;
}

export function buildDocumentObjectKey(input: { organizationId: string; sourceDocumentId: string; checksum: string; filename: string }) {
  const organizationId = safeSegment(input.organizationId, "Organizzazione");
  const sourceDocumentId = safeSegment(input.sourceDocumentId, "Documento");
  if (!/^[a-f0-9]{64}$/.test(input.checksum)) throw new Error("Checksum non valido per lo storage.");
  const filename = sanitizeDocumentFilename(input.filename);
  return `organizations/${organizationId}/imports/${sourceDocumentId}/documents/${sourceDocumentId}/${input.checksum}-${filename}`;
}

export function assertSafeObjectKey(objectKey: string) {
  if (objectKey.startsWith("/") || objectKey.includes("\\") || objectKey.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Chiave oggetto non valida.");
  }
  return objectKey;
}
