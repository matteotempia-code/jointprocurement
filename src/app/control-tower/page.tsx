import { Metric, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareOffers, formatMoney } from "@/lib/pricing";

export default async function ControlTower() {
  await requireRoles(["EXECUTIVE_SPONSOR"]);
  const [orders, offers, issues, products, organizations] = await Promise.all([
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } }, include: { lines: true } }),
    prisma.supplierOffer.findMany({ where: { active: true } }),
    prisma.qualityIssue.count({ where: { status: "OPEN" } }),
    prisma.canonicalProduct.findMany({ include: { category: true, offers: true } }), prisma.organization.findMany({ select: { id: true, name: true } }),
  ]);
  const spend = orders.filter((order) => order.issuedAt.getFullYear() === new Date().getFullYear()).reduce((sum, order) => sum + Number(order.total), 0);
  const compliance = offers.length ? offers.filter((offer) => offer.preferred).length / offers.length * 100 : 0;
  const opportunities = products.filter((product) => product.offers.length > 1).map((product) => ({ product, comparison: compareOffers(product.offers) })).filter(({ comparison }) => comparison.spread > 5).sort((a, b) => b.comparison.spread - a.comparison.spread);
  const observedOpportunity = opportunities.reduce((sum, { product, comparison }) => {
    const observedQuantity = orders.flatMap((order) => order.lines).filter((line) => line.canonicalProductId === product.id).reduce((quantity, line) => quantity + Number(line.quantity), 0);
    const preferred = product.offers.find((offer) => offer.preferred);
    return sum + Math.max(0, Number(preferred?.unitPrice ?? comparison.lowest?.unitPrice ?? 0) - Number(comparison.lowest?.unitPrice ?? 0)) * observedQuantity;
  }, 0);
  const openOrders = orders.filter((order) => !["RECEIVED", "CANCELLED"].includes(order.status));
  const overdue = openOrders.filter((order) => order.expectedDeliveryDate < new Date()).length;
  const organizationSpend = organizations.map((organization) => ({ ...organization, spend: orders.filter((order) => order.organizationId === organization.id).reduce((sum, order) => sum + Number(order.total), 0) }));
  return <main><PageHeader eyebrow="Control Tower direzionale" title="Performance della rete" description="Valore, affidabilità e rischi in una lettura di 30 secondi." />
    <div className="metrics-grid executive"><Metric label="Spesa da inizio anno" value={formatMoney(spend)} /><Metric label="Acquisti convenzionati" value={`${compliance.toFixed(1)}%`} /><Metric label="Opportunità osservata" value={formatMoney(observedOpportunity)} detail="Sui volumi presenti" /><Metric label="Rischi operativi" value={overdue + issues} detail={`${overdue} ritardi · ${issues} problemi`} /></div>
    <div className="executive-brief"><section><div className="section-heading"><div><p className="eyebrow">Top 3 opportunità</p><h2>Dove creare valore</h2></div></div>{opportunities.slice(0, 3).map(({ product, comparison }, index) => <article key={product.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{product.name}</strong><small>{product.category.name}</small></div><b>{comparison.spread.toFixed(1)}%</b></article>)}</section><section><div className="section-heading"><div><p className="eyebrow">Top 3 rischi</p><h2>Cosa presidiare</h2></div></div><article><span>01</span><div><strong>Consegne in ritardo</strong><small>Ordini da sollecitare</small></div><b>{overdue}</b></article><article><span>02</span><div><strong>Problemi aperti</strong><small>Non conformità operative</small></div><b>{issues}</b></article><article><span>03</span><div><strong>Copertura convenzionata</strong><small>Offerte preferite sul catalogo</small></div><b>{compliance.toFixed(1)}%</b></article></section></div>
    <section><div className="section-heading"><div><p className="eyebrow">Rete congiunta</p><h2>Anteo e Coopselios</h2></div><span>Spesa osservata, non annualizzata</span></div><div className="organization-comparison">{organizationSpend.map((organization) => <div key={organization.id}><span>{organization.name}</span><strong>{formatMoney(organization.spend)}</strong><i><b style={{ width: `${organization.spend / Math.max(...organizationSpend.map((item) => item.spend), 1) * 100}%` }} /></i></div>)}</div></section>
  </main>;
}
