import Link from "next/link";
import { notFound } from "next/navigation";
import { Metric, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/pricing";

export default async function Categoria({ params }: { params: Promise<{ id: string }> }) {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const category = await prisma.category.findUnique({ where: { id: (await params).id }, include: { budgets: true, products: { include: { offers: { where: { active: true }, include: { supplier: true } }, requisitionLines: { where: { requisition: { status: "APPROVED" } } } } } } });
  if (!category) notFound();
  const spend = category.products.flatMap(({ requisitionLines }) => requisitionLines).reduce((sum, line) => sum + Number(line.lineTotal), 0);
  const budget = category.budgets.reduce((sum, item) => sum + Number(item.approvedAmount), 0);
  const supplierIds = new Set(category.products.flatMap(({ offers }) => offers.map(({ supplierId }) => supplierId)));
  const opportunities = category.products.map((product) => { const prices = product.offers.map((offer) => Number(offer.normalizedUnitPrice ?? offer.unitPrice)); return { product, spread: prices.length > 1 ? (Math.max(...prices) - Math.min(...prices)) / Math.min(...prices) * 100 : 0 }; }).sort((a, b) => b.spread - a.spread);
  const offers = category.products.flatMap(({ offers: productOffers }) => productOffers);
  const compliance = offers.length ? offers.filter(({ preferred }) => preferred).length / offers.length * 100 : 0;
  const averageCoverage = category.products.length ? offers.length / category.products.length : 0;
  const utilization = budget ? spend / budget * 100 : 0;
  const highestSpread = opportunities[0]?.spread ?? 0;
  return <main><PageHeader eyebrow="Categoria 360" title={category.name} description="Decisioni, domanda e copertura fornitori in un’unica lettura." />
    <section className="decision-signals"><header><p className="eyebrow">Cosa fare</p><h2>Priorità della categoria</h2></header><div><Link href="#opportunita"><strong>{highestSpread.toFixed(1)}%</strong><span>massima differenza prezzo</span><small>Valuta armonizzazione</small></Link><Link href="#fornitori"><strong>{averageCoverage.toFixed(1)}</strong><span>fornitori medi per prodotto</span><small>{averageCoverage < 2 ? "Copertura fragile" : "Copertura adeguata"}</small></Link><Link href="#fornitori"><strong>{compliance.toFixed(1)}%</strong><span>offerte convenzionate</span><small>{compliance < 50 ? "Compliance da migliorare" : "Presidio attivo"}</small></Link><Link href="/budget"><strong>{utilization.toFixed(1)}%</strong><span>budget utilizzato</span><small>{utilization > 80 ? "Da monitorare" : "Entro soglia"}</small></Link></div></section>
    <div className="metrics-grid four"><Metric label="Spesa osservata" value={formatMoney(spend)} /><Metric label="Budget" value={formatMoney(budget)} /><Metric label="Prodotti attivi" value={category.products.length} /><Metric label="Fornitori" value={supplierIds.size} /></div>
    <div className="dashboard-columns"><section id="opportunita"><div className="section-heading"><div><p className="eyebrow">Prezzi</p><h2>Prodotti con confronto utile</h2></div><span>Top 5</span></div>{opportunities.slice(0, 5).map(({ product, spread }) => <Link className="activity-row" key={product.id} href={`/products/${product.id}#offerte`}><div><strong>{product.name}</strong><span>{product.offers.length} offerte dello stesso prodotto · confronta condizioni e fonti</span></div><b>{spread.toFixed(1)}%</b></Link>)}</section><section id="fornitori"><div className="section-heading"><div><p className="eyebrow">Copertura</p><h2>Fornitori della categoria</h2></div><span>{supplierIds.size} attivi</span></div>{[...supplierIds].slice(0, 5).map((supplierId) => { const offer = offers.find((item) => item.supplierId === supplierId)!; const covered = category.products.filter((product) => product.offers.some((item) => item.supplierId === supplierId)).length; return <Link className="activity-row" key={supplierId} href={`/suppliers/${supplierId}?tab=products`}><div><strong>{offer.supplier.name}</strong><span>{covered} prodotti · minimo {offer.supplier.minimumOrderValue ? formatMoney(Number(offer.supplier.minimumOrderValue)) : "n.d."} · franco {offer.supplier.freeShippingThreshold ? formatMoney(Number(offer.supplier.freeShippingThreshold)) : "n.d."}</span></div><b>{(covered / Math.max(category.products.length, 1) * 100).toFixed(0)}%</b></Link>; })}</section></div>
  </main>;
}
