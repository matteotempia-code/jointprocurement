import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let prisma: PrismaClient | undefined;
try {
  if (process.env.DEMO_MODE !== "true" || process.env.ALLOW_CERTIFICATION_CLEANUP !== "true") {
    throw new Error("Certification cleanup requires DEMO_MODE=true and ALLOW_CERTIFICATION_CLEANUP=true.");
  }
  if (process.env.NODE_ENV === "production") throw new Error("Certification cleanup is forbidden with NODE_ENV=production.");
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const requisitions = await prisma.purchaseRequisition.findMany({
    where: { requisitionNumber: { startsWith: "PR-EDGE-" } },
    select: { id: true, purchaseOrders: { select: { id: true } } },
  });
  const requisitionIds = requisitions.map((item) => item.id);
  const purchaseOrderIds = requisitions.flatMap((item) => item.purchaseOrders.map((order) => order.id));

  if (requisitionIds.length) {
    await prisma.$transaction(async (tx) => {
      await tx.auditEvent.deleteMany({ where: { entityId: { in: [...requisitionIds, ...purchaseOrderIds] } } });
      await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: { in: purchaseOrderIds } } });
      await tx.purchaseOrder.deleteMany({ where: { id: { in: purchaseOrderIds } } });
      await tx.approvalRequest.deleteMany({ where: { requisitionId: { in: requisitionIds } } });
      await tx.purchaseRequisitionLine.deleteMany({ where: { requisitionId: { in: requisitionIds } } });
      await tx.purchaseRequisition.deleteMany({ where: { id: { in: requisitionIds } } });
    });
  }
  console.log(JSON.stringify({ marker: "CERTIFICATION_FIXTURE_CLEANUP_V1", requisitions: requisitionIds.length, purchaseOrders: purchaseOrderIds.length }));
} catch (error) {
  const safe = (error instanceof Error ? error.message : String(error))
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[connection]")
    .replace(/[^\p{L}\p{N} .,:()/_-]/gu, "")
    .slice(0, 300);
  if (process.env.GITHUB_ACTIONS === "true") console.error(`::error title=Certification cleanup::${safe}`);
  throw error;
} finally {
  await prisma?.$disconnect();
}
