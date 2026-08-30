import Link from "next/link";
import { addShoppingListToCart, createShoppingList, updateShoppingList } from "@/app/buying-actions";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/pricing";
import { resolveScope } from "@/lib/scope";

export default async function Liste() {
  const context = await requireRoles(["RSA_DIRECTOR"]);
  const scope = await resolveScope(context.assignment);
  const lists = await prisma.shoppingList.findMany({
    where: { userId: context.user.id, facilityId: scope.id },
    include: { items: { include: { canonicalProduct: { include: { offers: { where: { active: true }, orderBy: [{ preferred: "desc" }, { normalizedUnitPrice: "asc" }], take: 1 } } } } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return <main>
    <PageHeader eyebrow="Acquisti ricorrenti" title="Liste" description="Prepara una volta le dotazioni ricorrenti e riutilizzale quando serve." />
    <section className="list-create-panel"><div><p className="eyebrow">Nuova lista</p><h2>Cosa vuoi preparare?</h2><p>Assegna un nome chiaro: potrai aggiungere i prodotti dal catalogo o dalla scheda prodotto.</p></div><form action={createShoppingList}><label>Nome della lista<input required minLength={3} name="name" placeholder="Es. Riordino mensile cucina" /></label><label>Descrizione facoltativa<input name="description" placeholder="A cosa serve o quando usarla" /></label><button className="primary-cta">Crea lista</button></form></section>
    {lists.length ? <div className="list-overview">{lists.map((list) => {
      const estimate = list.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.canonicalProduct.offers[0]?.unitPrice ?? 0), 0);
      return <article key={list.id}><header><div><span>{list.items.length} articoli · {scope.label}</span><Link href={`/liste/${list.id}`}><h2>{list.name}</h2></Link><p>{list.description ?? "Lista personale della struttura"}</p></div><strong>{formatMoney(estimate)}<small>stima IVA esclusa</small></strong></header><div className="list-preview">{list.items.slice(0, 4).map((item) => <div key={item.id}><span>{item.canonicalProduct.name}</span><b>× {Number(item.quantity)}</b></div>)}{list.items.length > 4 && <small>Altri {list.items.length - 4} articoli</small>}</div><div className="list-meta"><span>Aggiornata {formatDate(list.updatedAt)}</span><span>{list.lastUsedAt ? `Usata ${formatDate(list.lastUsedAt)}` : "Non ancora utilizzata"}</span></div><footer><Link className="secondary-cta" href={`/liste/${list.id}`}>Apri</Link><details className="row-more"><summary aria-label={`Altre azioni per ${list.name}`}>Altre azioni</summary><form action={updateShoppingList}><input type="hidden" name="listId" value={list.id} /><button name="intent" value="duplicate">Duplica</button><button className="danger-button" name="intent" value="delete">Elimina</button></form></details><form action={addShoppingListToCart}><input type="hidden" name="listId" value={list.id} /><button className="primary-cta">Aggiungi tutto al carrello</button></form></footer></article>;
    })}</div> : <EmptyState title="Non hai ancora creato liste ricorrenti" description="Crea una lista da qui, dal catalogo, da un ordine precedente o dal carrello." action={<Link className="primary-cta" href="/catalog">Esplora il catalogo</Link>} />}
  </main>;
}
