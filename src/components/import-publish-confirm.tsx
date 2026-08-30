"use client";

import { useRef } from "react";
import { publishImportAction } from "@/app/imports/actions";

export function ImportPublishConfirm({ jobId, records, newProducts, supplier, version }: { jobId: string; records: number; newProducts: number; supplier: string; version: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="primary-cta" onClick={() => dialogRef.current?.showModal()}>Pubblica importazione</button>
    <dialog ref={dialogRef} className="publish-confirm-dialog" aria-labelledby="publish-confirm-title">
      <form method="dialog" className="dialog-close"><button aria-label="Chiudi conferma">×</button></form>
      <p className="eyebrow">Conferma finale</p>
      <h2 id="publish-confirm-title">Pubblicare {records} record?</h2>
      <p>Stai per creare la versione {version} del listino {supplier}. L’operazione è atomica e conserva la versione precedente.</p>
      <dl><div><dt>Offerte</dt><dd>{records}</dd></div><div><dt>Nuovi prodotti</dt><dd>{newProducts}</dd></div><div><dt>Nuova versione listino</dt><dd>1</dd></div></dl>
      <div className="dialog-actions"><form method="dialog"><button className="secondary-cta">Annulla</button></form><form action={publishImportAction}><input type="hidden" name="jobId" value={jobId} /><button className="primary-cta">Pubblica</button></form></div>
    </dialog>
  </>;
}
