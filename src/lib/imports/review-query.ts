import { Prisma, type PrismaClient } from "@prisma/client";

export const IMPORT_PAGE_SIZE = 25;
export const importReviewFilters = ["attention", "ready", "new", "non-comparable", "ignored", "all"] as const;
export type ImportReviewFilter = (typeof importReviewFilters)[number];
export type ImportReviewSort = "confidence" | "delta" | "price" | "description" | "status";

export function recordFilterWhere(jobId: string, filter: ImportReviewFilter, search = "", exceptionType?: string): Prisma.ImportedRecordWhereInput {
  const state: Prisma.ImportedRecordWhereInput = filter === "attention"
    ? { status: "NEEDS_REVIEW" }
    : filter === "ready"
      ? { status: { in: ["READY", "CONFIRMED", "NEW_PRODUCT_CONFIRMED", "PUBLISHED"] } }
      : filter === "new"
        ? { OR: [{ status: "NEW_PRODUCT_CONFIRMED" }, { matchCandidates: { some: { matchType: "NEW_PRODUCT" } } }] }
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
  const [total, attention, proposed, ready, newProducts, nonComparable, ignored, published] = await Promise.all([
    db.importedRecord.count({ where: { importJobId: jobId } }),
    db.importedRecord.count({ where: { importJobId: jobId, status: "NEEDS_REVIEW" } }),
    db.importedRecord.count({ where: { importJobId: jobId, status: "READY" } }),
    db.importedRecord.count({ where: { importJobId: jobId, status: { in: ["CONFIRMED", "NEW_PRODUCT_CONFIRMED"] } } }),
    db.importedRecord.count({
      where: {
        importJobId: jobId,
        OR: [
          { status: "NEW_PRODUCT_CONFIRMED" },
          { matchCandidates: { some: { matchType: "NEW_PRODUCT" } } },
        ],
      },
    }),
    db.importedRecord.count({ where: { importJobId: jobId, status: "NON_COMPARABLE" } }),
    db.importedRecord.count({ where: { importJobId: jobId, status: "IGNORED" } }),
    db.importedRecord.count({ where: { importJobId: jobId, status: "PUBLISHED" } }),
  ]);
  return { total, attention, proposed, ready, newProducts, nonComparable, ignored, published };
}
