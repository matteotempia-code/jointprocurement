import Link from "next/link";
import { addShoppingListToCart, createShoppingList, updateShoppingList } from "@/app/buying-actions";
import { EmptyState, Num, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";
import { resolveScope } from "@/lib/scope";

export default async function Liste() {
  const context = await requireRoles(["RSA_DIRECTOR"]), scope = await resolveScope(context.assignment);
  const lists = await prisma.shoppingList.findMany({ where: { userId: context.user.id, facilityId: scope.id }, include: { items: { include: { canonicalProduct: { include: { offers: { where: { active: true }, orderBy: [{ preferred: "desc" }, { normalizedUnitPrice: "asc" }], take: 1 } } } } } }, orderBy: { updatedAt: "desc" }, take: 20 });
  return <main className="phase2-page phase2-lists"><PageHeader eyebrow="Acquisti ricorrenti" title="Liste" description={`${lists.length} liste personali · ${scope.label}`} action={<details className="phase2-create-popover"><summary className="primary-cta">Nuova lista</summary><form action={createShoppingList}><label>Nome<input required minLength={3} name="name" placeholder="Es. Riordino mensile cucina" /></label><label>Descrizione<input name="description" placeholder="Quando o per cosa usarla" /></label><button className="primary-cta">Crea lista</button></form></details>} />
    {lists.length ? <section className="phase2-list-stack" aria-label="Liste ricorrenti">{lists.map((list) => { const estimate = list.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.canonicalProduct.offers[0]?.unitPrice ?? 0), 0); return <article key={list.id}><Link className="phase2-list-main" href={`/liste/${list.id}`}><div><strong>{list.name}</strong><span>{list.description ?? "Lista personale della struttura"}</span></div><div><b>{list.items.length} articoli</b><small>{list.lastUsedAt ? `Usata ${formatDate(list.lastUsedAt)}` : `Aggiornata ${formatDate(list.updatedAt)}`}</small></div><Num value={estimate} kind="currency" /></Link><div className="phase2-row-actions"><Link className="secondary-cta" href={`/liste/${list.id}`}>Apri</Link><form action={addShoppingListToCart}><input type="hidden" name="listId" value={list.id} /><button className="secondary-cta">Aggiungi al carrello</button></form><details className="row-more"><summary aria-label={`Altre azioni per ${list.name}`}>•••</summary><form action={updateShoppingList}><input type="hidden" name="listId" value={list.id} /><button name="intent" value="duplicate">Duplica</button><button className="danger-button" name="intent" value="delete">Elimina</button></form></details></div></article>; })}</section> : <EmptyState title="Non hai ancora creato liste ricorrenti" description="Crea una lista o aggiungi prodotti dal catalogo." action={<Link className="primary-cta" href="/catalog">Esplora il catalogo</Link>} />}
  </main>;
}
