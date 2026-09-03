"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export function FavoritesWorkspace({ toolbar, children }: { toolbar: ReactNode; children: ReactNode }) {
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState(0);
  return <div className={bulk ? "phase1-favorites is-bulk" : "phase1-favorites"}>
    <div className="phase1-list-command">
      <div><strong>La tua selezione abituale</strong><span>Quantità modificabili prima dell’aggiunta.</span></div>
      <button type="button" className="secondary-cta" onClick={() => { setBulk((value) => !value); setSelected(0); }}>{bulk ? "Fine selezione" : "Seleziona"}</button>
    </div>
    {bulk && <div onChange={(event) => {
      const form = (event.target as HTMLInputElement).form;
      setSelected(form?.querySelectorAll<HTMLInputElement>('input[name="productId"]:checked').length ?? 0);
    }}><div className="phase1-selection-count" aria-live="polite">{selected ? `${selected} selezionati` : "Nessun prodotto selezionato"}</div><fieldset disabled={!selected}>{toolbar}</fieldset></div>}
    {children}
  </div>;
}
