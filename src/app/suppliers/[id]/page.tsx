import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable, Metric, PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, getComparablePrice } from "@/lib/pricing";
import { formatCurrency, normalizeOfferPrice } from "@/lib/pricing/normalization";
import { statusLabel } from "@/lib/presentation/status";
import { getSupplierMetrics } from "@/lib/procurement/metrics";

type Contact = { name?: string; email?: string; phone?: string };

export default async function Supplier360({ params }: { params: Promise<{ id: string }> }) {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const id = (await params).id;
  const [supplier, metrics, network] = await Promise.all([
    prisma.supplier.findUnique({
      where: { id },
      include: {
        offers: { where: { active: true }, include: { canonicalProduct: { include: { category: true, offers: { where: { active: true } } } } } },
        purchaseOrders: { include: { facility: true, lines: true, receipts: true }, orderBy: { issuedAt: "desc" } },
      },
    }),
    getSupplierMetrics(id),
    prisma.purchaseOrder.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
  ]);
  if (!supplier) notFound();
  const issues = await prisma.qualityIssue.findMany({
    where: { purchaseOrderLine: { purchaseOrder: { supplierId: id } } },
    include: { purchaseOrderLine: { include: { canonicalProduct: true, purchaseOrder: true } } },
    orderBy: { openedAt: "desc" },
  });
  const spend = supplier.purchaseOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const share = Number(network._sum.total) ? spend / Number(network._sum.total) * 100 : 0;
  const dependency = share >= 25 ? "Alta dipendenza" : share >= 10 ? "Media dipendenza" : "Bassa dipendenza";
  const facilities = new Set(supplier.purchaseOrders.map((order) => order.facilityId));
  const products = supplier.offers.map((offer) => {
    const current = getComparablePrice(offer);
    const best = Math.min(...offer.canonicalProduct.offers.map(getComparablePrice));
    const lines = supplier.purchaseOrders.flatMap((order) => order.lines).filter((line) => line.canonicalProductId === offer.canonicalProductId);
    const last = supplier.purchaseOrders.find((order) => order.lines.some((line) => line.canonicalProductId === offer.canonicalProductId));
    return { offer, current, best, spend: lines.reduce((sum, line) => sum + Number(line.lineTotal), 0), last };
  });
  const singleSource = products.filter(({ offer }) => offer.canonicalProduct.offers.length === 1).length;
  const monthly = Array.from({ length: 12 }, (_, offset) => {
    const date = new Date(2025, 8 + offset, 1);
    const value = supplier.purchaseOrders.filter((order) => order.issuedAt.getFullYear() === date.getFullYear() && order.issuedAt.getMonth() === date.getMonth()).reduce((sum, order) => sum + Number(order.total), 0);
    return { date, value };
  });
  const maxMonth = Math.max(1, ...monthly.map(({ value }) => value));
  const contacts = [supplier.commercialContact, supplier.orderContact, supplier.qualityContact] as Contact[];
  return <main>
    <PageHeader eyebrow="Fornitore 360" title={supplier.name} description={`${supplier.vatNumber} · ${supplier.address}`} />
    <div className="definition-grid">
      <div><span>Stato</span><StatusIndicator active={supplier.active} label={supplier.active ? "Attivo" : "Non attivo"} /></div>
      <div><span>Dipendenza commerciale</span><strong>{dependency}</strong><small>{share.toFixed(1)}% della spesa osservata</small></div>
      <div><span>Strutture servite</span><strong>{facilities.size}</strong></div>
      <div><span>Categorie</span><strong>{new Set(supplier.offers.map(({ canonicalProduct }) => canonicalProduct.categoryId)).size}</strong></div>
    </div>
    <div className="metrics-grid four">
      <Metric label="Spesa osservata" value={formatMoney(spend)} detail={`${share.toFixed(1)}% del totale`} />
      <Metric label="Consegne puntuali" value={metrics.delivered >= 3 ? `${metrics.onTimeRate.toFixed(1)}%` : "Dati insufficienti"} detail={`su ${metrics.delivered} consegne`} />
      <Metric label="Consegne complete" value={metrics.delivered >= 3 ? `${metrics.completeRate.toFixed(1)}%` : "Dati insufficienti"} detail={`su ${metrics.delivered} consegne`} />
      <Metric label="Tasso di non conformità" value={metrics.delivered >= 3 ? `${metrics.issueRate.toFixed(1)}%` : "Dati insufficienti"} detail={`${metrics.issues} problemi registrati`} />
    </div>
    <div className="supplier-analytics-grid">
      <section><p className="eyebrow">Andamento</p><h2>Spesa mensile</h2><div className="mini-bars">{monthly.map((month) => <div key={month.date.toISOString()}><i><b style={{ height: `${month.value / maxMonth * 100}%` }} /></i><span>{new Intl.DateTimeFormat("it-IT", { month: "short" }).format(month.date)}</span><small>{month.value ? formatMoney(month.value) : "—"}</small></div>)}</div></section>
      <section><p className="eyebrow">Dipendenza</p><h2>Copertura commerciale</h2><div className="dependency-note"><b>{singleSource} prodotti a fonte unica</b><span>{products.length - singleSource} prodotti con alternative</span><span>Fasce trasparenti: alta ≥25%, media ≥10% della spesa.</span></div></section>
    </div>
    <section><div className="section-heading"><div><p className="eyebrow">Posizione prezzo</p><h2>Listino prodotti</h2></div><span>{products.filter((p) => Math.abs(p.current - p.best) < .000001).length} al miglior prezzo</span></div>
      <DataTable label="Prodotti del fornitore"><thead><tr><th>Prodotto</th><th>Categoria</th><th>Prezzo confezione</th><th>Prezzo normalizzato</th><th>Posizione</th><th>Convenzionato</th><th>Ultimo ordine</th><th>Spesa</th></tr></thead><tbody>{products.slice(0, 40).map(({ offer, current, best, spend: productSpend, last }) => { const normalized = normalizeOfferPrice(offer.canonicalProduct, offer); return <tr key={offer.id}><td><Link href={`/products/${offer.canonicalProductId}`}>{offer.canonicalProduct.name}</Link></td><td>{offer.canonicalProduct.category.name}</td><td>{formatMoney(Number(offer.unitPrice))}</td><td>{normalized.normalizedPrice != null ? `${formatCurrency(normalized.normalizedPrice, 4)} / ${normalized.consumptionLabel}` : "Non confrontabile"}</td><td>{Math.abs(current - best) < .000001 ? "Migliore" : `+${((current / best - 1) * 100).toFixed(1)}%`}</td><td>{offer.preferred ? "Sì" : "No"}</td><td>{last ? formatDate(last.issuedAt) : "Mai"}</td><td>{formatMoney(productSpend)}</td></tr>; })}</tbody></DataTable>
    </section>
    <div className="supplier-analytics-grid">
      <section><p className="eyebrow">Termini commerciali</p><h2>Condizioni correnti</h2><dl className="commercial-terms"><div><dt>Pagamento</dt><dd>{supplier.paymentTerms}</dd></div><div><dt>Consegna</dt><dd>{supplier.deliveryTerms}</dd></div><div><dt>Ordine minimo</dt><dd>{supplier.minimumOrderValue ? formatMoney(Number(supplier.minimumOrderValue)) : "—"}</dd></div><div><dt>Franco porto</dt><dd>{supplier.freeShippingThreshold ? formatMoney(Number(supplier.freeShippingThreshold)) : "—"}</dd></div></dl></section>
      <section><p className="eyebrow">Contatti</p><h2>Referenti operativi</h2>{contacts.filter(Boolean).map((contact, index) => <div className="contact-row" key={index}><b>{["Commerciale", "Ordini", "Qualità"][index]}</b><strong>{contact.name}</strong><span>{contact.email} · {contact.phone}</span></div>)}</section>
    </div>
    <section><div className="section-heading"><div><p className="eyebrow">Qualità</p><h2>Non conformità</h2></div><span>{issues.filter((issue) => ["OPEN", "UNDER_REVIEW"].includes(issue.status)).length} aperte · {issues.length} totali</span></div>
      {issues.length ? <DataTable label="Non conformità"><thead><tr><th>Prodotto</th><th>Tipo</th><th>Ordine</th><th>Gravità</th><th>Quantità</th><th>Aperta</th><th>Stato</th></tr></thead><tbody>{issues.map((issue) => <tr key={issue.id}><td>{issue.purchaseOrderLine.canonicalProduct.name}</td><td>{statusLabel(issue.issueType)}</td><td><Link href={`/orders/${issue.purchaseOrderLine.purchaseOrder.id}`}>{issue.purchaseOrderLine.purchaseOrder.poNumber}</Link></td><td>{statusLabel(issue.severity)}</td><td>{Number(issue.affectedQuantity)}</td><td>{formatDate(issue.openedAt)}</td><td>{statusLabel(issue.status)}</td></tr>)}</tbody></DataTable> : <p className="muted">Nessuna non conformità registrata.</p>}
    </section>
    <div className="supplier-analytics-grid"><section><p className="eyebrow">Documenti</p><h2>Fornitore</h2>{[["Certificazione", supplier.certificationPath], ["Condizioni commerciali", supplier.commercialDocumentPath], ["Documento qualità", supplier.qualityDocumentPath]].map(([label, path]) => <Link className="document-action" href={path ?? "#"} key={label}>{label} · PDF demo</Link>)}</section><section><p className="eyebrow">Attività recente</p><h2>Eventi</h2>{supplier.purchaseOrders.slice(0, 5).map((order) => <Link className="activity-row" href={`/orders/${order.id}`} key={order.id}><strong>{order.poNumber}</strong><span>{formatDate(order.issuedAt)} · {statusLabel(order.status)}</span><b>{formatMoney(Number(order.total))}</b></Link>)}</section></div>
  </main>;
}
