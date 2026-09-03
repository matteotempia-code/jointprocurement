import { Prisma } from "@prisma/client";
import { DataTable, EmptyRow, Num, PageHeader, Pagination, ProductLink, SearchField } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareOffers, getComparablePrice } from "@/lib/pricing";

const PAGE_SIZE = 20;
type Props = { searchParams: Promise<{ q?: string; category?: string; supplier?: string; sort?: string; pagina?: string }> };

export default async function Prodotti({ searchParams }: Props) {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const query = await searchParams, page = Math.max(1, Number(query.pagina ?? 1));
  const where: Prisma.CanonicalProductWhereInput = { AND: [query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { brand: { contains: query.q, mode: "insensitive" } }, { manufacturerSku: { contains: query.q, mode: "insensitive" } }] } : {}, query.category ? { categoryId: query.category } : {}, query.supplier ? { offers: { some: { supplierId: query.supplier, active: true } } } : {}, { active: true }] };
  const [categories, suppliers, total, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }), prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }), prisma.canonicalProduct.count({ where }),
    prisma.canonicalProduct.findMany({ where, include: { category: true, offers: { where: { active: true }, include: { supplier: true } } }, orderBy: query.sort === "newest" ? { createdAt: "desc" } : { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const rows = products.map((product) => ({ product, comparison: compareOffers(product.offers) }));
  if (query.sort === "spread") rows.sort((a, b) => b.comparison.spread - a.comparison.spread);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <main className="phase2-page phase2-list-page"><PageHeader eyebrow="Anagrafica procurement" title="Prodotti" description={`${total} prodotti nel perimetro · confronto sul prezzo normalizzato`} />
    <form className="phase2-control-bar"><SearchField defaultValue={query.q} placeholder="Nome, marca o codice" /><select name="category" defaultValue={query.category ?? ""}><option value="">Tutte le categorie</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select name="supplier" defaultValue={query.supplier ?? ""}><option value="">Tutti i fornitori</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><select name="sort" defaultValue={query.sort ?? "name"}><option value="name">Nome A–Z</option><option value="spread">Dispersione prezzo</option><option value="newest">Più recenti</option></select><button className="secondary-cta">Applica</button></form>
    <DataTable label="Prodotti"><thead><tr><th>Prodotto</th><th>Categoria</th><th className="num-cell">Offerte</th><th className="num-cell">Miglior prezzo normalizzato</th><th>Offerta convenzionata</th><th className="num-cell">Dispersione</th></tr></thead><tbody>{rows.length ? rows.map(({ product, comparison }) => <tr key={product.id}><td><ProductLink id={product.id} name={product.name} detail={`${product.brand ?? "Marca non indicata"} · ${product.manufacturerSku ?? "codice n.d."}`} /></td><td>{product.category.name}</td><td className="num-cell">{product.offers.length}</td><td className="num-cell">{comparison.lowest ? <><Num value={getComparablePrice(comparison.lowest)} kind="currency" digits={4} /><small className="cell-detail">per unità normalizzata</small></> : "—"}</td><td>{comparison.preferred?.supplier.name ?? "Nessuna"}</td><td className="num-cell"><Num value={comparison.spread} kind="percent" digits={1} /></td></tr>) : <EmptyRow colSpan={6}>Nessun prodotto trovato.</EmptyRow>}</tbody></DataTable>
    <Pagination page={Math.min(page, pages)} pages={pages} pathname="/products" params={{ q: query.q, category: query.category, supplier: query.supplier, sort: query.sort }} />
  </main>;
}
