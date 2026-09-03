import Link from "next/link";
import type { ReactNode } from "react";
import { addProductToList, createShoppingList } from "@/app/buying-actions";

type ListOption = { id: string; name: string };

export function ProductActionsMenu({ productId, productName, lists, detailHref, compareHref, extraActions }: {
  productId: string;
  productName: string;
  lists: ListOption[];
  detailHref: string;
  compareHref?: string;
  extraActions?: ReactNode;
}) {
  return <details className="product-actions-menu">
    <summary aria-label={`Altre azioni per ${productName}`}>Altre azioni</summary>
    <div className="product-actions-popover">
      <strong>Aggiungi a una lista</strong>
      {lists.length ? <div className="list-choice">{lists.slice(0, 4).map((list) => <form action={addProductToList} key={list.id}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="listId" value={list.id} />
        <button>{list.name}</button>
      </form>)}</div> : <p>Nessuna lista disponibile.</p>}
      <details className="create-list-choice"><summary>+ Crea nuova lista</summary><form action={createShoppingList}>
        <input type="hidden" name="productId" value={productId} />
        <input name="name" required minLength={3} placeholder="Nome della lista" aria-label={`Nome della lista per ${productName}`} />
        <button>Crea e aggiungi</button>
      </form></details>
      <nav aria-label="Approfondimenti prodotto"><Link href={detailHref}>Apri dettagli</Link>{compareHref && <Link href={compareHref}>Confronta offerte</Link>}</nav>
      {extraActions && <div className="product-menu-extra">{extraActions}</div>}
    </div>
  </details>;
}
