import Link from "next/link";
import { notFound } from "next/navigation";
import { addShoppingListToCart, moveShoppingListItem, updateShoppingList, updateShoppingListItem } from "@/app/buying-actions";
import { EmptyState, PageHeader } from "@/components/ui";
import { ProductImage } from "@/components/product-image";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/pricing";
import { normalizeOfferPrice } from "@/lib/pricing/normalization";
import { resolveScope } from "@/lib/scope";

export default async function ListaDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await requireRoles(["RSA_DIRECTOR"]);
  const scope = await resolveScope(context.assignment);
  const list = await prisma.shoppingList.findFirst({ where: { id: (await params).id, userId: context.user.id, facilityId: scope.id }, include: { items: { orderBy: [{ position: "asc" }, { id: "asc" }], include: { canonicalProduct: { include: { category: true, offers: { where: { active: true }, include: { supplier: true }, orderBy: [{ preferred: "desc" }, { normalizedUnitPrice: "asc" }], take: 1 } } } } } } });
  if (!list) notFound();
  const notice = await searchParams;
  const estimate = list.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.canonicalProduct.offers[0]?.unitPrice ?? 0), 0);
  return <main className="phase2-page phase2-list-detail">
    {(notice.creata || notice.duplicata || notice.dalCarrello || notice.daOrdine) && <div className="success">Lista pronta. Puoi modificarla o aggiungerla subito al carrello.</div>}
    <PageHeader eyebrow="Lista ricorrente" title={list.name} description={`${list.items.length} articoli · ${scope.label} · ${list.lastUsedAt ? `usata ${formatDate(list.lastUsedAt)}` : "non ancora utilizzata"}`} />
    <div className="list-command"><div><span>Valore stimato</span><strong>{formatMoney(estimate)}</strong><small>IVA esclusa, prezzi correnti</small></div><Link className="secondary-cta" href="/catalog">Aggiungi prodotti</Link><form action={addShoppingListToCart}><input type="hidden" name="listId" value={list.id} /><button className="primary-cta">Aggiungi tutto al carrello</button></form></div>
    {list.items.length ? <div className="list-detail-items">{list.items.map((item) => {
      const product = item.canonicalProduct;
      const offer = product.offers[0];
      const normalized = offer ? normalizeOfferPrice(product, offer) : null;
      return <article key={item.id}><ProductImage name={product.name} categoryCode={product.category.code} /><div><span>{product.category.name}</span><Link href={`/products/${product.id}`}><h2>{product.name}</h2></Link><p>{product.packageDescription} · {offer?.supplier.name ?? "Offerta non disponibile"}</p><small className="availability-copy">{offer?.availabilityStatus === "IN_STOCK" ? "Disponibile" : "Disponibilità da verificare"}</small></div><div><strong>{offer ? formatMoney(Number(offer.unitPrice)) : "—"}</strong><small>{normalized?.normalizedLabel}</small><details className="row-more"><summary>Riordina</summary><form action={moveShoppingListItem} className="reorder-actions"><input type="hidden" name="itemId" value={item.id} /><button name="direction" value="up" aria-label={`Sposta ${product.name} su`}>Sposta su</button><button name="direction" value="down" aria-label={`Sposta ${product.name} giù`}>Sposta giù</button></form></details></div><form action={updateShoppingListItem}><input type="hidden" name="itemId" value={item.id} /><label>Quantità<input name="quantity" type="number" min="0" defaultValue={Number(item.quantity)} /></label><button>Aggiorna</button><button className="text-button" name="quantity" value="0">Rimuovi</button></form></article>;
    })}</div> : <EmptyState title="Questa lista è vuota" description="Aggiungi prodotti dal catalogo per preparare il prossimo riordino." action={<Link className="primary-cta" href="/catalog">Vai al catalogo</Link>} />}
    <section className="list-settings"><div><p className="eyebrow">Impostazioni</p><h2>Nome e descrizione</h2></div><form action={updateShoppingList}><input type="hidden" name="listId" value={list.id} /><label>Nome<input name="name" defaultValue={list.name} /></label><label>Descrizione<input name="description" defaultValue={list.description ?? ""} /></label><button name="intent" value="update">Salva modifiche</button><button name="intent" value="duplicate">Duplica lista</button><button className="danger-button" name="intent" value="delete">Elimina lista</button></form></section>
  </main>;
}
