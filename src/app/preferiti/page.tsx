import Link from "next/link";
import { addSelectedFavoritesToCart, addSelectedFavoritesToList, addToCart, toggleFavorite } from "@/app/buying-actions";
import { FavoritesWorkspace } from "@/components/favorites-workspace";
import { ProductImage } from "@/components/product-image";
import { ProductActionsMenu } from "@/components/product-actions-menu";
import { EmptyState, PageHeader, PriceBlock } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeOfferPrice } from "@/lib/pricing/normalization";
import { resolveScope } from "@/lib/scope";

export default async function Preferiti() {
  const context = await requireRoles(["RSA_DIRECTOR"]);
  const scope = await resolveScope(context.assignment);
  const [favorites, lists] = await Promise.all([
    prisma.favorite.findMany({ where: { userId: context.user.id, facilityId: scope.id }, include: { canonicalProduct: { include: { category: true, offers: { where: { active: true }, include: { supplier: true }, orderBy: [{ preferred: "desc" }, { normalizedUnitPrice: "asc" }], take: 1 } } } }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.shoppingList.findMany({ where: { userId: context.user.id, facilityId: scope.id }, orderBy: { updatedAt: "desc" } }),
  ]);
  return <main className="phase1-page">
    <PageHeader eyebrow="Catalogo personale" title="Preferiti" description={`${favorites.length} prodotti pronti per il prossimo ordine · ${scope.label}`} />
    {favorites.length ? <FavoritesWorkspace toolbar={<form id="favorite-selection" action={addSelectedFavoritesToCart} className="selection-toolbar"><div><strong>Azioni di gruppo</strong><span>Seleziona almeno un prodotto per procedere.</span></div><div className="selection-actions">{lists.length > 0 && <><select name="listId" aria-label="Lista per i preferiti selezionati">{lists.map((list) => <option value={list.id} key={list.id}>{list.name}</option>)}</select><button formAction={addSelectedFavoritesToList}>Aggiungi a lista</button></>}<button className="primary-cta">Aggiungi selezionati al carrello</button></div></form>}>
      <div className="favorite-grid">{favorites.map(({ canonicalProduct: product }) => {
        const offer = product.offers[0];
        const normalized = offer ? normalizeOfferPrice(product, offer) : null;
        return <article key={product.id}>
          <label className="selection-check"><input form="favorite-selection" type="checkbox" name="productId" value={product.id} /><span className="sr-only">Seleziona {product.name}</span></label>
          <ProductImage name={product.name} categoryCode={product.category.code} />
          <div className="favorite-copy"><span>{product.category.name}</span><Link href={`/products/${product.id}`}><h2>{product.name}</h2></Link><p>{product.brand} · {product.packageDescription}</p></div>
          <div className="favorite-commercial">{offer && normalized ? <PriceBlock normalizedPrice={normalized.normalizedPrice} normalizedUom={product.consumptionUomLabel} packPrice={Number(offer.unitPrice)} packSize={product.packageDescription} variant="table" /> : <strong>Non disponibile</strong>}<span>{offer?.supplier.name}{offer?.preferred ? " · convenzionato" : ""}</span></div>
          <div className="favorite-actions">
            {offer && <form action={addToCart} className="favorite-add"><input type="hidden" name="offerId" value={offer.id} /><input aria-label={`Quantità di ${product.name}`} type="number" name="quantity" min="1" defaultValue="1" /><button className="secondary-cta">Aggiungi</button></form>}
            <div className="row-quiet-actions"><ProductActionsMenu productId={product.id} productName={product.name} lists={lists} detailHref={`/products/${product.id}`} extraActions={<form action={toggleFavorite}><input type="hidden" name="productId" value={product.id} /><button className="text-button">Rimuovi dai preferiti</button></form>} /></div>
          </div>
        </article>;
      })}</div>
    </FavoritesWorkspace> : <EmptyState title="Non hai ancora aggiunto prodotti ai preferiti" description="Aggiungili dal catalogo o dalla scheda prodotto per ritrovarli subito qui." action={<Link className="primary-cta" href="/catalog">Vai al catalogo</Link>} />}
  </main>;
}
