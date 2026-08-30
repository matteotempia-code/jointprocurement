import Link from "next/link";
import { EmptyState, PageHeader, SearchField, StatusIndicator } from "@/components/ui";
import { addToCart, toggleFavorite } from "@/app/buying-actions";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComparablePrice, getPreferredOffer } from "@/lib/pricing";
import { formatCurrency, normalizeOfferPrice } from "@/lib/pricing/normalization";
import { resolveScope } from "@/lib/scope";

type Props = { searchParams: Promise<Record<string, string | undefined>> };
export default async function Catalogo({ searchParams }: Props) {
  const context = await requireRoles(["RSA_DIRECTOR", "AREA_MANAGER"]);
  const scope = await resolveScope(context.assignment);
  const filters = await searchParams;
  const [categories, suppliers, favorites, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    context.roleCode === "RSA_DIRECTOR" ? prisma.favorite.findMany({ where: { userId: context.user.id, facilityId: scope.id }, select: { canonicalProductId: true } }) : [],
    prisma.canonicalProduct.findMany({
      where: { active: true, AND: [
        filters.q ? { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { brand: { contains: filters.q, mode: "insensitive" } }] } : {},
        filters.category ? { categoryId: filters.category } : {},
        filters.subcategory ? { subcategory: filters.subcategory } : {},
        filters.supplier ? { offers: { some: { supplierId: filters.supplier, active: true } } } : {},
        filters.preferred === "true" ? { offers: { some: { preferred: true, active: true } } } : {},
        filters.favorite === "true" ? { favorites: { some: { userId: context.user.id, facilityId: scope.id } } } : {},
      ] },
      include: { category: true, offers: { where: { active: true }, include: { supplier: true } } },
      take: 80,
    }),
  ]);
  const favoriteIds = new Set(favorites.map(({ canonicalProductId }) => canonicalProductId));
  const subcategories = [...new Set(products.map(({ subcategory }) => subcategory).filter(Boolean))];
  const rows = products.map((product) => ({ product, offer: getPreferredOffer(product.offers) ?? [...product.offers].sort((a, b) => getComparablePrice(a) - getComparablePrice(b))[0] })).sort((a, b) => filters.sort === "price" ? getComparablePrice(a.offer) - getComparablePrice(b.offer) : filters.sort === "lead" ? Number(a.offer?.leadTimeDays ?? 99) - Number(b.offer?.leadTimeDays ?? 99) : a.product.name.localeCompare(b.product.name));
  return <main><PageHeader eyebrow="Acquisto governato" title="Catalogo" description="Prezzi, contenuti delle confezioni e alternative confrontabili per la tua struttura." />
    <div className="catalog-tabs"><Link href="/catalog">Tutti</Link><Link href="/catalog?favorite=true">Preferiti</Link><Link href="/liste">Liste ricorrenti</Link><Link href="/richieste#fuori-catalogo">Fuori catalogo</Link></div>
    <form className="filter-bar catalog-filters"><SearchField defaultValue={filters.q} placeholder="Cerca guanti nitrile M…" /><select name="category" defaultValue={filters.category ?? ""}><option value="">Categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select name="subcategory" defaultValue={filters.subcategory ?? ""}><option value="">Sottocategoria</option>{subcategories.map((value) => <option key={value!}>{value}</option>)}</select><select name="supplier" defaultValue={filters.supplier ?? ""}><option value="">Fornitore</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><select name="sort" defaultValue={filters.sort ?? "name"}><option value="name">Nome A–Z</option><option value="price">Prezzo normalizzato</option><option value="lead">Consegna più rapida</option></select><label className="checkbox"><input type="checkbox" name="preferred" value="true" defaultChecked={filters.preferred === "true"} /> Solo convenzionati</label><button>Applica filtri</button></form>
    <div className="catalog-result-head"><p><strong>{rows.length}</strong> prodotti trovati</p><span>Prezzi IVA esclusa · listini attivi</span></div>
    {rows.length ? <div className="refined-catalog">{rows.map(({ product, offer }) => { const normalized = offer ? normalizeOfferPrice(product, offer) : null; return <article key={product.id}><div className="product-identity"><div className="product-chip">{product.category.code.slice(0, 2)}</div><div><span>{product.category.name} · {product.subcategory}</span><Link href={`/products/${product.id}`}><h2>{product.name}</h2></Link><p>{product.brand} · {product.packageDescription}</p></div></div><div className="catalog-commercial"><div><small>Prezzo confezione</small><strong>{normalized ? formatCurrency(normalized.purchasePrice) : "—"}</strong><span>{offer?.supplier.name}</span></div><div><small>Prezzo normalizzato</small><strong>{normalized?.normalizedLabel ?? "—"}</strong><span>{normalized?.contentLabel}</span></div><div><StatusIndicator active={offer?.availabilityStatus === "IN_STOCK"} label={offer?.availabilityStatus === "IN_STOCK" ? "Disponibile" : "Disponibilità limitata"} />{offer?.preferred && <b className="quiet-tag">Convenzionato</b>}<span>{offer?.leadTimeDays} giorni</span></div></div><footer><Link href={`/products/${product.id}#offerte`}>Confronta {product.offers.length} offerte</Link>{context.roleCode === "RSA_DIRECTOR" && <><form action={toggleFavorite}><input type="hidden" name="productId" value={product.id} /><button className="favorite-button">{favoriteIds.has(product.id) ? "Salvato" : "Salva"}</button></form>{offer && <form action={addToCart} className="add-control"><input type="hidden" name="offerId" value={offer.id} /><input type="number" name="quantity" min="1" defaultValue="1" aria-label={`Quantità ${product.name}`} /><button>Aggiungi</button></form>}</>}</footer></article>; })}</div> : <EmptyState title="Nessun prodotto trovato" description="Modifica i filtri oppure invia una richiesta fuori catalogo." />}
  </main>;
}
