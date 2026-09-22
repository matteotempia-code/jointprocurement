import type { Prisma } from "@prisma/client";

const prefixes = {
  REQUISITION: "PR",
  PURCHASE_ORDER: "PO",
  OUT_OF_CATALOG: "FC",
  RECEIPT: "GR",
} as const;

export type DocumentNumberType = keyof typeof prefixes;

export function formatDocumentNumber(type: DocumentNumberType, year: number, value: number) {
  if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(value) || value < 1) {
    throw new Error("Sequenza documento non valida.");
  }
  return `${prefixes[type]}-${year}-${String(value).padStart(6, "0")}`;
}

export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  organizationId: string,
  type: DocumentNumberType,
  at = new Date(),
) {
  const year = at.getFullYear();
  const sequence = await tx.documentSequence.upsert({
    where: { organizationId_documentType_year: { organizationId, documentType: type, year } },
    create: { organizationId, documentType: type, year, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  });
  return formatDocumentNumber(type, year, sequence.value);
}
