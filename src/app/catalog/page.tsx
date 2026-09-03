import Link from "next/link";
import { addToCart, toggleFavorite } from "@/app/buying-actions";
import { ProductImage } from "@/components/product-image";
import { ProductActionsMenu } from "@/components/product-actions-menu";
import { EmptyState, PageHeader, PriceBlock, SearchField, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComparablePrice, getPreferredOffer } from "@/lib/pricing";
import { normalizeOfferPrice } from "@/lib/pricing/normalization";
import { resolveScope } from "@/lib/scope";

type Props = { searchParams: Promise<Record<string, string | undefined>> };
const PAGE_SIZE = 8;

export default async function Catalogo({ searchParams }: Props) {
  const context = await requireRoles(["RSA_DIRECTOR", "AREA_MANAGER"]);
  const scope = await resolveScope(context.assignment);
  const filters = await searchParams;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const searchTerms = (filters.q ?? "").trim().split(/\s+/).filter(Boolean);
  const searchClauses = searchTerms.map((term) => ({ OR: (term.toLocaleLowerCase("it-IT") === "guanti" ? [term, "guanto"] : [term]).flatMap((value) => [{ name: { contains: value, mode: "insensitive" as const } }, { brand: { contains: value, mode: "insensitive" as const } }, { category: { name: { contains: value, mode: "insensitive" as const } } }, { manufacturerSku: { contains: value, mode: "insensitive" as const } }]) }));
  const where = { active: true, AND: [...searchClauses, filters.category ? { categoryId: filters.category } : {}, filters.supplier ? { offers: { some: { supplierId: filters.supplier, active: true } } } : {}, filters.preferred === "true" ? { offers: { some: { preferred: true, active: true } } } : {}, filters.favorite === "true" ? { favorites: { some: { userId: context.user.id, facilityId: scope.id } } } : {}] };
  const [categories, suppliers, favorites, lists, totalCount, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    context.roleCode === "RSA_DIRECTOR" ? prisma.favorite.findMany({ where: { userId: context.user.id, facilityId: scope.id }, select: { canonicalProductId: true } }) : [],
    context.roleCode === "RSA_DIRECTOR" ? prisma.shoppingList.findMany({ where: { userId: context.user.id, facilityId: scope.id }, orderBy: { updatedAt: "desc" } }) : [],
    prisma.canonicalProduct.count({ where }),
    prisma.canonicalProduct.findMany({ where, include: { category: true, offers: { where: { active: true }, include: { supplier: true } } }, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const favoriteIds = new Set(favorites.map(({ canonicalProductId }) => canonicalProductId));
  const rows = products.map((product) => ({ product, offer: getPreferredOffer(product.offers) ?? [...product.offers].sort((a, b) => getComparablePrice(a) - getComparablePrice(b))[0] })).sort((a, b) => filters.sort === "price" ? getComparablePrice(a.offer) - getComparablePrice(b.offer) : filters.sort === "lead" ? Number(a.offer?.leadTimeDays ?? 99) - Number(b.offer?.leadTimeDays ?? 99) : a.product.name.localeCompare(b.product.name));
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const query = (overrides: Record<string, string | undefined>) => { const params = new URLSearchParams(); Object.entries({ ...filters, ...overrides }).forEach(([key, value]) => { if (value && key !== "page") params.set(key, value); }); if (overrides.page && overrides.page !== "1") params.set("page", overrides.page); return `?${params.toString()}`; };
  const active = [["q", filters.q], ["category", categories.find((item) => item.id === filters.category)?.name], ["supplier", suppliers.find((item) => item.id === filters.supplier)?.name], ["preferred", filters.preferred === "true" ? "Solo convenzionati" : undefined]] as const;
  return <main className="phase1-page phase1-catalog">
    <PageHeader eyebrow="Acquisto guidato" title="Catalogo" description="Cerca, confronta il costo normalizzato e scegli la quantità." />
    <nav className="catalog-tabs"><Link href="/catalog">Tutti</Link><Link href="/catalog?favorite=true">Preferiti</Link><Link href="/liste">Liste ricorrenti</Link><Link href="/richieste#fuori-catalogo">Fuori catalogo</Link></nav>
    <form className="filter-bar catalog-filters">
      <SearchField defaultValue={filters.q} placeholder="Cerca prodotto, categoria o codice…" />
      <select name="category" defaultValue={filters.category ?? ""}><option value="">Tutte le categorie</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
      <select name="supplier" defaultValue={filters.supplier ?? ""}><option value="">Tutti i fornitori</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
      <select name="sort" defaultValue={filters.sort ?? "name"}><option value="name">Rilevanza</option><option value="price">Prezzo normalizzato</option><option value="lead">Consegna più rapida</option></select>
      <label className="checkbox"><input type="checkbox" name="preferred" value="true" defaultChecked={filters.preferred === "true"} /> Convenzionati</label>
      <button className="primary-cta">Applica</button>
    </form>
    {active.some(([, value]) => value) && <div className="active-filter-row">{active.map(([key, value]) => value && <Link key={key} href={query({ [key]: undefined, page: "1" })}>{value} <span aria-hidden>×</span></Link>)}</div>}
    <div className="catalog-result-head"><p><strong>{totalCount}</strong> {totalCount === 1 ? "prodotto" : "prodotti"} · pagina {Math.min(page, pageCount)} di {pageCount}</p><span>Prezzi IVA esclusa · listino attivo</span></div>
    {rows.length ? <div className="refined-catalog">{rows.map(({ product, offer }) => {
      const normalized = offer ? normalizeOfferPrice(product, offer) : null;
      return <article key={product.id}>
        <div className="product-identity"><ProductImage name={product.name} categoryCode={product.category.code} /><div><span>{product.category.name} · {product.subcategory}</span><Link href={`/products/${product.id}`}><h2>{product.name}</h2></Link><p>{product.brand} · {product.packageDescription}</p></div></div>
        <div className="catalog-commercial">{offer && normalized ? <PriceBlock normalizedPrice={normalized.normalizedPrice} normalizedUom={product.consumptionUomLabel} packPrice={Number(offer.unitPrice)} packSize={product.packageDescription} variant="table" /> : <strong>Non confrontabile</strong>}<div className="catalog-supplier"><strong>{offer?.supplier.name}</strong><span>{offer?.preferred ? "Convenzionato" : "Listino attivo"} · consegna {offer?.leadTimeDays} gg</span></div><StatusChip variant={offer?.availabilityStatus === "IN_STOCK" ? "ok" : "warn"}>{offer?.availabilityStatus === "IN_STOCK" ? "Disponibile" : "Disponibilità limitata"}</StatusChip></div>
        {context.roleCode === "RSA_DIRECTOR" && <footer className="catalog-actions"><form action={toggleFavorite}><input type="hidden" name="productId" value={product.id} /><button className="favorite-button">{favoriteIds.has(product.id) ? "Salvato" : "Preferito"}</button></form><ProductActionsMenu productId={product.id} productName={product.name} lists={lists} detailHref={`/products/${product.id}`} compareHref={`/products/${product.id}#offerte`} />{offer && <form action={addToCart} className="add-control"><input type="hidden" name="offerId" value={offer.id} /><input type="number" name="quantity" min="1" defaultValue="1" aria-label={`Quantità di ${product.name}`} /><button className="secondary-cta">Aggiungi</button></form>}</footer>}
      </article>;
    })}</div> : <EmptyState title="Nessun prodotto corrisponde alla ricerca" description="Modifica i filtri oppure invia una richiesta fuori catalogo." action={<Link className="primary-cta" href="/richieste#fuori-catalogo">Richiedi un prodotto</Link>} />}
    {pageCount > 1 && <nav className="phase1-pagination" aria-label="Paginazione catalogo"><Link aria-disabled={page <= 1} href={query({ page: String(Math.max(1, page - 1)) })}>Precedente</Link><span>{page} / {pageCount}</span><Link aria-disabled={page >= pageCount} href={query({ page: String(Math.min(pageCount, page + 1)) })}>Successiva</Link></nav>}
  </main>;
}
