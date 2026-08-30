import { Prisma, type PrismaClient } from "@prisma/client";

export type BulkReviewAction = "ACCEPT_RECOMMENDED" | "ASSIGN_CATEGORY" | "NON_COMPARABLE" | "IGNORE";

export async function applyBulkReview(db: PrismaClient, input: { jobId: string; recordIds: string[]; action: BulkReviewAction; actorUserId: string; categoryId?: string }) {
  const recordIds = [...new Set(input.recordIds)].slice(0, 100);
  const records = await db.importedRecord.findMany({ where: { id: { in: recordIds }, importJobId: input.jobId }, include: { matchCandidates: { where: { recommended: true }, take: 1 } } });
  const category = input.action === "ASSIGN_CATEGORY" && input.categoryId ? await db.category.findUnique({ where: { id: input.categoryId } }) : null;
  let changed = 0;
  await db.$transaction(async (tx) => {
    for (const record of records) {
      const candidate = record.matchCandidates[0];
      if (input.action === "ACCEPT_RECOMMENDED") {
        const compatible = ["READY", "NEEDS_REVIEW"].includes(record.status) && candidate?.canonicalProductId && Number(candidate.score) >= 0.88 && candidate.packagingCompatibility !== false && candidate.uomCompatibility !== false && record.normalizedPriceValue != null;
        if (!compatible || !candidate.canonicalProductId) continue;
        await tx.importedRecord.update({ where: { id: record.id }, data: { status: "CONFIRMED", requiresReview: false, exceptionType: null, canonicalProductId: candidate.canonicalProductId } });
        await tx.productMatchCandidate.update({ where: { id: candidate.id }, data: { humanDecision: "ACCEPTED", decidedByUserId: input.actorUserId, decidedAt: new Date() } });
      } else if (input.action === "NON_COMPARABLE" && ["READY", "NEEDS_REVIEW"].includes(record.status)) {
        await tx.importedRecord.update({ where: { id: record.id }, data: { status: "NON_COMPARABLE", requiresReview: false } });
      } else if (input.action === "IGNORE" && record.status !== "PUBLISHED" && record.status !== "IGNORED") {
        await tx.importedRecord.update({ where: { id: record.id }, data: { status: "IGNORED", requiresReview: false } });
      } else if (input.action === "ASSIGN_CATEGORY" && category) {
        const current = (record.humanOverride ?? {}) as Record<string, unknown>;
        if (current.categoryId === category.id) continue;
        await tx.importedRecord.update({ where: { id: record.id }, data: { humanOverride: { ...current, categoryId: category.id, categoryName: category.name } as Prisma.InputJsonValue } });
      } else continue;
      changed += 1;
    }
    await tx.auditEvent.create({ data: { actorUserId: input.actorUserId, entityType: "IMPORT_JOB", entityId: input.jobId, action: input.action === "ACCEPT_RECOMMENDED" ? "MATCH_ACCEPTED" : input.action === "ASSIGN_CATEGORY" ? "FIELD_CORRECTED" : input.action === "IGNORE" ? "RECORD_IGNORED" : "RECORD_NOT_COMPARABLE", metadata: { bulk: true, selected: recordIds.length, changed } } });
  });
  return { selected: recordIds.length, changed };
}
