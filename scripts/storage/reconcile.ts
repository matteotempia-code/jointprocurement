import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

function probableSource(key: string) {
  if (key.startsWith("_probes/")) return "storage health probe";
  if (key.includes("/source-documents/") || (key.includes("/imports/") && key.includes("/documents/"))) return "Smart Import source document";
  if (key.includes("/attachments/")) return "operational attachment";
  return "unknown";
}

async function main() {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  if (!bucket) throw new Error("SUPABASE_STORAGE_BUCKET non configurato.");
  const [objects, sources, attachments] = await Promise.all([
    prisma.$queryRaw<Array<{ name: string; metadata: unknown; createdAt: Date; updatedAt: Date }>>`
      SELECT name, metadata, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM storage.objects WHERE bucket_id = ${bucket} ORDER BY name`,
    prisma.sourceDocument.findMany({ where: { storageProvider: "supabase", storageBucket: bucket }, select: { id: true, storageObjectKey: true, checksum: true } }),
    prisma.operationalAttachment.findMany({ where: { storageProvider: "supabase", storageBucket: bucket }, select: { id: true, storageObjectKey: true, checksum: true } }),
  ]);
  const references = new Map<string, { model: string; id: string; checksum: string }>();
  for (const item of sources) if (item.storageObjectKey) references.set(item.storageObjectKey, { model: "SourceDocument", id: item.id, checksum: item.checksum });
  for (const item of attachments) references.set(item.storageObjectKey, { model: "OperationalAttachment", id: item.id, checksum: item.checksum });
  const report = objects.map((object) => {
    const reference = references.get(object.name);
    const metadata = object.metadata && typeof object.metadata === "object" ? object.metadata as Record<string, unknown> : {};
    return {
      objectKey: object.name,
      size: typeof metadata.size === "number" ? metadata.size : null,
      contentType: typeof metadata.mimetype === "string" ? metadata.mimetype : null,
      createdAt: object.createdAt,
      updatedAt: object.updatedAt,
      probableSource: probableSource(object.name),
      reference: reference ?? null,
      classification: reference ? "REFERENCED" : probableSource(object.name) === "unknown" ? "UNKNOWN" : "ORPHANED",
    };
  });
  const objectNames = new Set(objects.map((item) => item.name));
  const missingObjects = [...references.entries()].filter(([key]) => !objectNames.has(key)).map(([objectKey, reference]) => ({ objectKey, ...reference }));
  console.log(JSON.stringify({ bucket, objectCount: objects.length, referenced: report.filter((item) => item.classification === "REFERENCED").length, orphaned: report.filter((item) => item.classification === "ORPHANED").length, unknown: report.filter((item) => item.classification === "UNKNOWN").length, missingObjects, objects: report }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Riconciliazione fallita."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
