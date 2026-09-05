import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const queries = {
    organizations: () => prisma.organization.count(), legalEntities: () => prisma.legalEntity.count(), facilities: () => prisma.facility.count(), users: () => prisma.user.count(), suppliers: () => prisma.supplier.count(), categories: () => prisma.category.count(), products: () => prisma.canonicalProduct.count(), offers: () => prisma.supplierOffer.count(), favorites: () => prisma.favorite.count(), shoppingLists: () => prisma.shoppingList.count(), carts: () => prisma.cart.count(), requisitions: () => prisma.purchaseRequisition.count(), approvals: () => prisma.approvalRequest.count(), orders: () => prisma.purchaseOrder.count(), receipts: () => prisma.receipt.count(), issues: () => prisma.qualityIssue.count(), budgets: () => prisma.budget.count(), limits: () => prisma.procurementLimit.count(), sourceDocuments: () => prisma.sourceDocument.count(), imports: () => prisma.importJob.count(), attachments: () => prisma.operationalAttachment.count(), aiCalls: () => prisma.procurementAICall.count(), memories: () => prisma.procurementMemory.count(),
  } as const;
  const counts: Record<string, number | null> = {}, failures: Array<{ query: string; errorName: string; errorCode: string | null }> = [];
  for (const [name, query] of Object.entries(queries)) {
    try { counts[name] = await query(); }
    catch (error) {
      counts[name] = null;
      failures.push({ query: name, errorName: error instanceof Error ? error.name : "UnknownError", errorCode: error && typeof error === "object" && "code" in error ? String(error.code) : null });
    }
  }
  let personas: Array<{ id: string; email: string }> = [];
  try { personas = await prisma.user.findMany({ where: { email: { endsWith: "@demo.local" } }, select: { id: true, email: true } }); }
  catch (error) { failures.push({ query: "personas", errorName: error instanceof Error ? error.name : "UnknownError", errorCode: error && typeof error === "object" && "code" in error ? String(error.code) : null }); }
  console.log(JSON.stringify({ counts, personas, failures }, null, 2));
  if (failures.length) {
    const safeSummary = failures.map((item) => `${item.query}:${item.errorName}:${item.errorCode ?? "NO_CODE"}`).join(", ");
    if (process.env.GITHUB_ACTIONS === "true") console.error(`::error title=Supabase DEV state audit::${safeSummary}`);
    throw new Error(`DEV state audit failed in ${failures.map((item) => item.query).join(", ")}; only safe error classes/codes were emitted.`);
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "DEV state audit failed."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
