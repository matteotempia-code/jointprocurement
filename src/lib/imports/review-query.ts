import { Prisma, type PrismaClient } from "@prisma/client";

export const IMPORT_PAGE_SIZE = 25;
export const importReviewFilters = ["attention", "ready", "new", "non-comparable", "ignored", "all"] as const;
export type ImportReviewFilter = (typeof importReviewFilters)[number];
export type ImportReviewSort = "confidence" | "delta" | "price" | "description" | "status";

export function recordFilterWhere(jobId: string, filter: ImportReviewFilter, search = "", exceptionType?: string): Prisma.ImportedRecordWhereInput {
  const state: Prisma.ImportedRecordWhereInput = filter === "attention"
    ? { status: "NEEDS_REVIEW", NOT: { matchCandidates: { some: { recommended: true, matchType: "NEW_PRODUCT" } } } }
    : filter === "ready"
      ? { status: { in: ["READY", "CONFIRMED", "PUBLISHED"] } }
      : filter === "new"
        ? { OR: [{ status: "NEW_PRODUCT_CONFIRMED" }, { status: "NEEDS_REVIEW", matchCandidates: { some: { recommended: true, matchType: "NEW_PRODUCT" } } }] }
        : filter === "non-comparable"
          ? { status: "NON_COMPARABLE" }
          : filter === "ignored"
            ? { status: "IGNORED" }
            : {};
  return {
    importJobId: jobId,
    ...state,
    ...(exceptionType ? { exceptionType } : {}),
    ...(search.trim() ? { searchText: { contains: search.trim(), mode: "insensitive" } } : {}),
  };
}

export function recordOrderBy(sort: ImportReviewSort): Prisma.ImportedRecordOrderByWithRelationInput[] {
  if (sort === "delta") return [{ priceDeltaPercent: "desc" }, { recordIndex: "asc" }];
  if (sort === "price") return [{ normalizedPriceValue: "desc" }, { recordIndex: "asc" }];
  if (sort === "description") return [{ searchText: "asc" }, { recordIndex: "asc" }];
  if (sort === "status") return [{ status: "asc" }, { recordIndex: "asc" }];
  return [{ matchConfidence: "asc" }, { recordIndex: "asc" }];
}

export async function getImportRecordPage(db: PrismaClient, input: { jobId: string; filter: ImportReviewFilter; page?: number; pageSize?: number; search?: string; sort?: ImportReviewSort; exceptionType?: string }) {
  const pageSize = Math.min(100, Math.max(10, input.pageSize ?? IMPORT_PAGE_SIZE));
  const where = recordFilterWhere(input.jobId, input.filter, input.search, input.exceptionType);
  const total = await db.importedRecord.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, input.page ?? 1));
  const records = await db.importedRecord.findMany({
    where,
    orderBy: recordOrderBy(input.sort ?? "confidence"),
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      canonicalProduct: { select: { id: true, name: true } },
      matchCandidates: { where: { recommended: true }, include: { canonicalProduct: { select: { id: true, name: true } } }, orderBy: { score: "desc" }, take: 1 },
    },
  });
  return { records, total, pages, page, pageSize };
}

export async function getImportRecordCounts(db: PrismaClient, jobId: string) {
  const [groups, pendingNewProducts] = await Promise.all([db.importedRecord.groupBy({ by: ["status"], where: { importJobId: jobId }, _count: { _all: true } }), db.importedRecord.count({ where: { importJobId: jobId, status: "NEEDS_REVIEW", matchCandidates: { some: { recommended: true, matchType: "NEW_PRODUCT" } } } })]);
  const byStatus = new Map(groups.map((group) => [group.status, group._count._all]));
  const total = groups.reduce((sum, group) => sum + group._count._all, 0);
  const attention = (byStatus.get("NEEDS_REVIEW") ?? 0) - pendingNewProducts;
  const proposed = byStatus.get("READY") ?? 0;
  const confirmed = byStatus.get("CONFIRMED") ?? 0;
  const newProducts = (byStatus.get("NEW_PRODUCT_CONFIRMED") ?? 0) + pendingNewProducts;
  const nonComparable = byStatus.get("NON_COMPARABLE") ?? 0;
  const ignored = byStatus.get("IGNORED") ?? 0;
  const published = byStatus.get("PUBLISHED") ?? 0;
  const failed = byStatus.get("FAILED") ?? 0;
  const reconciled = attention + proposed + confirmed + newProducts + nonComparable + ignored + published + failed;
  if (reconciled !== total) throw new Error(`Invariant Smart Import violata: ${reconciled}/${total} record classificati.`);
  return { total, attention, proposed, ready: confirmed + newProducts, confirmed, newProducts, nonComparable, ignored, published, failed, reconciled };
}
