import type { Prisma } from "@prisma/client";

type AcknowledgeOrderTransaction = Pick<Prisma.TransactionClient, "purchaseOrder" | "auditEvent">;

type AcknowledgeOrderDatabase = {
  $transaction<T>(operation: (tx: AcknowledgeOrderTransaction) => Promise<T>): Promise<T>;
};

export type AcknowledgeOrderInput = {
  orderId: string;
  organizationId: string;
  actorUserId: string;
  expectedDate?: string;
};

function parseExpectedDate(value: string | undefined) {
  if (value === undefined || value === "") return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Data di consegna non valida.");

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Data di consegna non valida.");
  }
  return date;
}

export async function acknowledgePurchaseOrder(
  database: AcknowledgeOrderDatabase,
  input: AcknowledgeOrderInput,
) {
  const expectedDeliveryDate = parseExpectedDate(input.expectedDate);

  return database.$transaction(async (tx) => {
    const result = await tx.purchaseOrder.updateMany({
      where: { id: input.orderId, organizationId: input.organizationId },
      data: {
        status: "ACKNOWLEDGED",
        supplierAcknowledgedAt: new Date(),
        expectedDeliveryDate,
      },
    });
    if (result.count !== 1) throw new Error("Ordine non trovato.");

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: "PURCHASE_ORDER",
        entityId: input.orderId,
        action: "SUPPLIER_ACKNOWLEDGED",
        metadata: { organizationId: input.organizationId, expectedDate: input.expectedDate ?? null },
      },
    });
  });
}
