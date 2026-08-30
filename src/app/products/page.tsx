import { DataTable, EmptyState, PageHeader, ProductLink, SearchField } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareOffers, formatMoney, getComparablePrice } from "@/lib/pricing";

type Props = { searchParams: Promise<{ q?: string; category?: string; supplier?: string; sort?: string }> };
export default async function Prodotti({ searchParams }: Props) {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const filters = await searchParams;
  const [categories, suppliers, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.canonicalProduct.findMany({ where: { AND: [filters.q ? { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { brand: { contains: filters.q, mode: "insensitive" } }] } : {}, filters.category ? { categoryId: filters.category } : {}, filters.supplier ? { offers: { some: { supplierId: filters.supplier } } } : {}] }, include: { category: true, offers: { include: { supplier: true } } } }),
  ]);
  const rows = products.map((product) => ({ product, comparison: compareOffers(product.offers) })).sort((a, b) => filters.sort === "spread" ? b.comparison.spread - a.comparison.spread : a.product.name.localeCompare(b.product.name));
  return <main><PageHeader eyebrow="Anagrafica procurement" title="Prodotti" description="Copertura fornitori, convenzionamento e dispersione dei prezzi per prodotto canonico." /><form className="filter-bar"><SearchField defaultValue={filters.q} placeholder="Cerca prodotti" /><select name="category" defaultValue={filters.category ?? ""}><option value="">Tutte le categorie</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select name="supplier" defaultValue={filters.supplier ?? ""}><option value="">Tutti i fornitori</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><select name="sort" defaultValue={filters.sort ?? "name"}><option value="name">Ordina per nome</option><option value="spread">Differenza prezzo più alta</option></select><button>Applica filtri</button></form>{rows.length ? <DataTable label="Prodotti"><thead><tr><th>Prodotto</th><th>Categoria</th><th>Offerte</th><th>Prezzo più basso</th><th>Fornitore convenzionato</th><th>Differenza prezzo</th></tr></thead><tbody>{rows.map(({ product, comparison }) => <tr key={product.id}><td><ProductLink id={product.id} name={product.name} detail={product.brand ?? undefined} /></td><td>{product.category.name}</td><td>{product.offers.length}</td><td>{comparison.lowest ? formatMoney(getComparablePrice(comparison.lowest), 4) : "—"}</td><td>{comparison.preferred?.supplier.name ?? "—"}</td><td><strong>{comparison.spread.toFixed(1)}%</strong></td></tr>)}</tbody></DataTable> : <EmptyState title="Nessun prodotto trovato" description="Prova con filtri meno restrittivi." />}</main>;
}
