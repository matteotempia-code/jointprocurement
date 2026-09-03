import Link from "next/link";
import { Prisma } from "@prisma/client";
import { DataTable, EmptyRow, Num, PageHeader, Pagination, SearchField, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSupplierMetrics } from "@/lib/procurement/metrics";

const PAGE_SIZE = 20;

export default async function Fornitori({ searchParams }: { searchParams: Promise<{ q?: string; stato?: string; pagina?: string }> }) {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const query = await searchParams;
  const page = Math.max(1, Number(query.pagina ?? 1));
  const where: Prisma.SupplierWhereInput = {
    ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { vatNumber: { contains: query.q, mode: "insensitive" } }] } : {}),
    ...(query.stato === "active" ? { active: true } : query.stato === "inactive" ? { active: false } : {}),
  };
  const [total, suppliers] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({ where, include: { offers: { where: { active: true }, include: { canonicalProduct: { include: { category: true } } } }, purchaseOrders: { where: { status: { not: "CANCELLED" } }, select: { status: true } } }, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const rows = await Promise.all(suppliers.map(async (supplier) => ({ supplier, metrics: await getSupplierMetrics(supplier.id) })));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <main className="phase2-page phase2-list-page">
    <PageHeader eyebrow="Gestione fornitori" title="Fornitori" description={`${total} fornitori · copertura, spesa e affidabilità osservata`} />
    <form className="phase2-control-bar"><SearchField defaultValue={query.q} placeholder="Cerca fornitore o partita IVA" /><select name="stato" defaultValue={query.stato ?? "all"} aria-label="Stato fornitore"><option value="all">Tutti gli stati</option><option value="active">Attivi</option><option value="inactive">Non attivi</option></select><button className="secondary-cta">Applica</button></form>
    <section className="phase2-queue"><div className="section-heading"><div><h2>Copertura operativa</h2><p>Apri un fornitore per prodotti, condizioni, qualità e attività.</p></div><span>{rows.length} mostrati su {total}</span></div>
      <DataTable label="Elenco fornitori"><thead><tr><th>Fornitore</th><th>Copertura</th><th>Ordini aperti</th><th className="num-cell">Spesa</th><th>Consegne</th><th>Qualità</th><th>Stato</th><th aria-label="Apri" /></tr></thead><tbody>{rows.length ? rows.map(({ supplier, metrics }) => <tr key={supplier.id}><td><Link className="table-link" href={`/suppliers/${supplier.id}`}>{supplier.name}</Link><small className="cell-detail">{supplier.vatNumber}</small></td><td>{new Set(supplier.offers.map((offer) => offer.canonicalProductId)).size} prodotti<small className="cell-detail">{new Set(supplier.offers.map((offer) => offer.canonicalProduct.categoryId)).size} categorie</small></td><td className="num-cell">{supplier.purchaseOrders.filter((order) => !["RECEIVED", "CANCELLED"].includes(order.status)).length}</td><td className="num-cell"><Num value={metrics.spend} kind="currency" /></td><td>{metrics.onTime.label}<small className="cell-detail">{metrics.complete.label}</small></td><td>{metrics.openIssues} aperte<small className="cell-detail">{metrics.nonConformity.label}</small></td><td><StatusChip variant={supplier.active ? "ok" : "neutral"}>{supplier.active ? "Attivo" : "Non attivo"}</StatusChip></td><td><Link className="row-disclosure" aria-label={`Apri ${supplier.name}`} href={`/suppliers/${supplier.id}`}>→</Link></td></tr>) : <EmptyRow colSpan={8}>Nessun fornitore nel filtro.</EmptyRow>}</tbody></DataTable>
      <Pagination page={Math.min(page, pages)} pages={pages} pathname="/suppliers" params={{ q: query.q, stato: query.stato }} />
    </section>
  </main>;
}
