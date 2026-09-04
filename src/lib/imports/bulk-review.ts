import { Prisma, type PrismaClient } from "@prisma/client";

export type BulkReviewAction = "ACCEPT_RECOMMENDED" | "ASSIGN_CATEGORY" | "NON_COMPARABLE" | "IGNORE";

export class BulkReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BulkReviewValidationError";
  }
}

export async function applyBulkReview(db: PrismaClient, input: { jobId: string; recordIds: string[]; action: BulkReviewAction; actorUserId: string; categoryId?: string }) {
  const recordIds = [...new Set(input.recordIds)].slice(0, 100);
  if (!recordIds.length) throw new BulkReviewValidationError("Seleziona almeno una riga.");
  const records = await db.importedRecord.findMany({ where: { id: { in: recordIds }, importJobId: input.jobId }, include: { matchCandidates: { where: { recommended: true }, take: 1 } } });
  if (records.length !== recordIds.length) throw new BulkReviewValidationError("Una o più righe non appartengono più a questa importazione. Ricarica la pagina.");
  const category = input.action === "ASSIGN_CATEGORY" && input.categoryId ? await db.category.findUnique({ where: { id: input.categoryId } }) : null;
  if (input.action === "ASSIGN_CATEGORY" && !category) throw new BulkReviewValidationError("Seleziona una categoria valida.");
  const compatible = (record: typeof records[number]) => {
    const candidate = record.matchCandidates[0];
    if (input.action === "ACCEPT_RECOMMENDED") return ["READY", "NEEDS_REVIEW"].includes(record.status) && Boolean(candidate?.canonicalProductId) && Number(candidate?.score) >= 0.88 && candidate?.packagingCompatibility !== false && candidate?.uomCompatibility !== false && record.normalizedPriceValue != null;
    if (input.action === "NON_COMPARABLE") return ["READY", "NEEDS_REVIEW"].includes(record.status);
    if (input.action === "IGNORE") return !["PUBLISHED", "IGNORED"].includes(record.status);
    return Boolean(category) && !["PUBLISHED", "IGNORED", "NON_COMPARABLE"].includes(record.status);
  };
  const incompatible = records.filter((record) => !compatible(record));
  if (incompatible.length) throw new BulkReviewValidationError(`${incompatible.length} ${incompatible.length === 1 ? "riga non è compatibile" : "righe non sono compatibili"} con questa decisione. La selezione non è stata modificata.`);
  let changed = 0;
  const changedIds: string[] = [];
  await db.$transaction(async (tx) => {
    for (const record of records) {
      const candidate = record.matchCandidates[0];
      if (input.action === "ACCEPT_RECOMMENDED") {
        if (!candidate?.canonicalProductId) continue;
        const updated = await tx.importedRecord.updateMany({ where: { id: record.id, status: { in: ["READY", "NEEDS_REVIEW"] } }, data: { status: "CONFIRMED", requiresReview: false, exceptionType: null, canonicalProductId: candidate.canonicalProductId } });
        if (!updated.count) continue;
        await tx.productMatchCandidate.updateMany({ where: { importedRecordId: record.id }, data: { humanDecision: "REJECTED", decidedByUserId: input.actorUserId, decidedAt: new Date() } });
        await tx.productMatchCandidate.update({ where: { id: candidate.id }, data: { humanDecision: "ACCEPTED", decidedByUserId: input.actorUserId, decidedAt: new Date() } });
      } else if (input.action === "NON_COMPARABLE" && ["READY", "NEEDS_REVIEW"].includes(record.status)) {
        const updated = await tx.importedRecord.updateMany({ where: { id: record.id, status: { in: ["READY", "NEEDS_REVIEW"] } }, data: { status: "NON_COMPARABLE", requiresReview: false } });
        if (!updated.count) continue;
      } else if (input.action === "IGNORE" && record.status !== "PUBLISHED" && record.status !== "IGNORED") {
        const updated = await tx.importedRecord.updateMany({ where: { id: record.id, status: { notIn: ["PUBLISHED", "IGNORED"] } }, data: { status: "IGNORED", requiresReview: false } });
        if (!updated.count) continue;
      } else if (input.action === "ASSIGN_CATEGORY" && category) {
        const current = (record.humanOverride ?? {}) as Record<string, unknown>;
        if (current.categoryId === category.id) continue;
        await tx.importedRecord.update({ where: { id: record.id }, data: { humanOverride: { ...current, categoryId: category.id, categoryName: category.name } as Prisma.InputJsonValue } });
      } else continue;
      changed += 1;
      changedIds.push(record.id);
    }
    if (changed) {
      const action = input.action === "ACCEPT_RECOMMENDED" ? "MATCH_ACCEPTED" : input.action === "ASSIGN_CATEGORY" ? "FIELD_CORRECTED" : input.action === "IGNORE" ? "RECORD_IGNORED" : "RECORD_NOT_COMPARABLE";
      await tx.auditEvent.createMany({ data: changedIds.map((recordId) => ({ actorUserId: input.actorUserId, entityType: "IMPORTED_RECORD", entityId: recordId, action, metadata: { bulk: true, importJobId: input.jobId } })) });
      await tx.auditEvent.create({ data: { actorUserId: input.actorUserId, entityType: "IMPORT_JOB", entityId: input.jobId, action, metadata: { bulk: true, selected: recordIds.length, changed } } });
    }
  });
  return { selected: recordIds.length, changed };
}
