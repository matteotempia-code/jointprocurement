import Link from "next/link";
import { DataTable, PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/pricing";
import { getSupplierMetrics } from "@/lib/procurement/metrics";

export default async function Fornitori() {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const suppliers = await prisma.supplier.findMany({ include: { priceLists: { where: { active: true } }, offers: { where: { active: true }, include: { canonicalProduct: { include: { category: true } } } }, purchaseOrders: { where: { status: { not: "CANCELLED" } } } }, orderBy: { name: "asc" } });
  const rows = await Promise.all(suppliers.map(async (supplier) => ({ supplier, metrics: await getSupplierMetrics(supplier.id) })));
  return <main><PageHeader eyebrow="Gestione fornitori" title="Fornitori" description="Copertura commerciale, spesa e affidabilità delle consegne in un’unica vista." /><DataTable label="Elenco fornitori"><thead><tr><th>Fornitore</th><th>Categorie</th><th>Prodotti</th><th>Listini</th><th>Convenzionati</th><th>Ordini aperti</th><th>Spesa osservata</th><th>Puntualità</th><th>Completezza</th><th>Problemi</th><th>Stato</th></tr></thead><tbody>{rows.map(({ supplier, metrics }) => <tr key={supplier.id}><td><Link className="table-link" href={`/suppliers/${supplier.id}`}>{supplier.name}</Link><small className="cell-detail">{supplier.vatNumber}</small></td><td>{new Set(supplier.offers.map((offer) => offer.canonicalProduct.category.name)).size}</td><td>{new Set(supplier.offers.map((offer) => offer.canonicalProductId)).size}</td><td>{supplier.priceLists.length}</td><td>{supplier.offers.filter((offer) => offer.preferred).length}</td><td>{supplier.purchaseOrders.filter((order) => !["RECEIVED", "CANCELLED"].includes(order.status)).length}</td><td>{formatMoney(metrics.spend)}</td><td>{metrics.delivered >= 3 ? `${metrics.onTimeRate.toFixed(0)}%` : "Dati insufficienti"}</td><td>{metrics.delivered >= 3 ? `${metrics.completeRate.toFixed(0)}%` : "Dati insufficienti"}</td><td>{metrics.issues}</td><td><StatusIndicator active={supplier.active} label={supplier.active ? "Attivo" : "Non attivo"} /></td></tr>)}</tbody></DataTable></main>;
}
