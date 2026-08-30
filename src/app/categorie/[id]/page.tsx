import Link from "next/link";
import { notFound } from "next/navigation";
import { Metric, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/pricing";

export default async function Categoria({ params }: { params: Promise<{ id: string }> }) {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const category = await prisma.category.findUnique({
    where: { id: (await params).id },
    include: { budgets: true, products: { include: { offers: { where: { active: true }, include: { supplier: true } }, requisitionLines: { where: { requisition: { status: "APPROVED" } } } } } },
  });
  if (!category) notFound();
  const spend = category.products.flatMap((p) => p.requisitionLines).reduce((sum, line) => sum + Number(line.lineTotal), 0);
  const budget = category.budgets.reduce((sum, item) => sum + Number(item.approvedAmount), 0);
  const supplierIds = new Set(category.products.flatMap((product) => product.offers.map((offer) => offer.supplierId)));
  const opportunities = category.products.map((product) => {
    const prices = product.offers.map((offer) => Number(offer.normalizedUnitPrice ?? offer.unitPrice));
    return { product, spread: prices.length > 1 ? (Math.max(...prices) - Math.min(...prices)) / Math.min(...prices) * 100 : 0 };
  }).sort((a, b) => b.spread - a.spread);
  return <main><PageHeader eyebrow="Category 360" title={category.name} description="Domanda, offerta e segnali di prezzo per guidare la strategia di categoria."/><div className="metrics-grid four"><Metric label="Spesa osservata" value={formatMoney(spend)}/><Metric label="Budget" value={formatMoney(budget)}/><Metric label="Prodotti attivi" value={category.products.length}/><Metric label="Fornitori" value={supplierIds.size}/></div><div className="dashboard-columns"><section><h2>Opportunità di prezzo</h2>{opportunities.slice(0, 8).map(({ product, spread }) => <Link className="activity-row" key={product.id} href={`/products/${product.id}`}><strong>{product.name}</strong><span>{product.offers.length} offerte</span><b>{spread.toFixed(1)}%</b></Link>)}</section><section><h2>Concentrazione fornitori</h2>{[...supplierIds].slice(0, 8).map((supplierId) => { const offer = category.products.flatMap((p) => p.offers).find((item) => item.supplierId === supplierId)!; return <Link className="activity-row" key={supplierId} href={`/suppliers/${supplierId}`}><strong>{offer.supplier.name}</strong><span>{category.products.filter((p) => p.offers.some((item) => item.supplierId === supplierId)).length} prodotti</span></Link>; })}</section></div></main>;
}
