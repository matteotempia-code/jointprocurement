import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
const groupedSources = await prisma.sourceDocument.groupBy({ by: ["storageProvider"], _count: true });
const groupedAttachments = await prisma.operationalAttachment.groupBy({ by: ["kind", "storageProvider"], _count: true });
const lucia = await prisma.user.findUnique({ where: { email: "lucia.ferri@demo.local" }, include: { carts: { include: { lines: true } } } });
const counts = {
  organizations: await prisma.organization.count(),
  facilities: await prisma.facility.count(),
  products: await prisma.canonicalProduct.count(),
  suppliers: await prisma.supplier.count(),
  offers: await prisma.supplierOffer.count(),
  requisitions: await prisma.purchaseRequisition.count(),
  orders: await prisma.purchaseOrder.count(),
  receipts: await prisma.receipt.count(),
  qualityIssues: await prisma.qualityIssue.count(),
};
const failures = [
  counts.organizations !== 2 && "organizzazioni != 2",
  (counts.facilities < 90 || counts.facilities > 110) && "strutture fuori target",
  (counts.products < 700 || counts.products > 1200) && "prodotti fuori target",
  (counts.suppliers < 60 || counts.suppliers > 120) && "fornitori fuori target",
  counts.offers < 2000 && "offerte insufficienti",
  counts.requisitions < 500 && "richieste insufficienti",
  counts.orders < 400 && "ordini insufficienti",
  groupedSources.some((item) => item.storageProvider !== "supabase") && "SourceDocument non cloud",
].filter(Boolean);

console.log(JSON.stringify({ counts, sourceDocuments: groupedSources, operationalAttachments: groupedAttachments, luciaCartLines: lucia?.carts.reduce((sum, cart) => sum + cart.lines.length, 0) ?? 0 }, null, 2));
console.log(failures.length ? `M11 READINESS: FAIL — ${failures.join(", ")}` : "M11 READINESS: READY");
if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Verifica M11 fallita."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
