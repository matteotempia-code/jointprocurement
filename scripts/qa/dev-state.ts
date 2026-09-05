import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const [organizations, legalEntities, facilities, users, suppliers, categories, products, offers, favorites, shoppingLists, carts, requisitions, approvals, orders, receipts, issues, budgets, limits, sourceDocuments, imports, attachments, aiCalls, memories, personas] = await Promise.all([
    prisma.organization.count(), prisma.legalEntity.count(), prisma.facility.count(), prisma.user.count(), prisma.supplier.count(), prisma.category.count(), prisma.canonicalProduct.count(), prisma.supplierOffer.count(), prisma.favorite.count(), prisma.shoppingList.count(), prisma.cart.count(), prisma.purchaseRequisition.count(), prisma.approvalRequest.count(), prisma.purchaseOrder.count(), prisma.receipt.count(), prisma.qualityIssue.count(), prisma.budget.count(), prisma.procurementLimit.count(), prisma.sourceDocument.count(), prisma.importJob.count(), prisma.operationalAttachment.count(), prisma.procurementAICall.count(), prisma.procurementMemory.count(), prisma.user.findMany({ where: { email: { endsWith: "@demo.local" } }, select: { id: true, email: true } }),
  ]);
  console.log(JSON.stringify({ counts: { organizations, legalEntities, facilities, users, suppliers, categories, products, offers, favorites, shoppingLists, carts, requisitions, approvals, orders, receipts, issues, budgets, limits, sourceDocuments, imports, attachments, aiCalls, memories }, personas }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "DEV state audit failed."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
