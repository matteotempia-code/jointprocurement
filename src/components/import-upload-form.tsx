"use client";

import { useActionState, useState } from "react";
import { uploadImport, type UploadImportState } from "@/app/imports/actions";

export function ImportUploadForm({ suppliers }: { suppliers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<UploadImportState, FormData>(uploadImport, {});
  const [filename, setFilename] = useState("Nessun file selezionato");
  return <form action={action} className="import-upload-form">
    <label className="drop-zone">
      <span className="drop-zone-title">Trascina qui il documento o scegli un file</span>
      <span>XLSX, CSV, TSV, PDF, DOCX, TXT o immagine · massimo 8 MB</span>
      <span className="import-file-picker"><b>Scegli file</b><span>{filename}</span></span>
      <input className="sr-only" data-testid="import-file" required name="file" type="file" accept=".xlsx,.xls,.csv,.tsv,.pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={(event) => setFilename(event.currentTarget.files?.[0]?.name ?? "Nessun file selezionato")} />
    </label>
    <div className="import-form-grid">
      <label>Fornitore
        <select name="supplierId" defaultValue="">
          <option value="">Da identificare o confermare</option>
          {suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}
        </select>
        <small>Il sistema può proporre un fornitore; la conferma resta umana.</small>
      </label>
      <label>Tipo di documento
        <select name="documentKind" defaultValue="PRICE_LIST">
          <option value="PRICE_LIST">Listino prezzi</option>
          <option value="OFFER">Offerta</option>
          <option value="QUOTATION">Quotazione</option>
          <option value="INFORMATIONAL_INVOICE">Fattura come fonte informativa</option>
          <option value="OTHER">Altro documento commerciale</option>
        </select>
      </label>
    </div>
    <label>Note per la revisione
      <textarea name="notes" placeholder="Contesto o indicazioni utili per chi verificherà i dati" />
    </label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <div className="import-honesty-note"><strong>Come verrà elaborato</strong><span>Parser deterministico e mapping euristico locale. In questo ambiente non è configurato un provider AI esterno: i record incerti richiedono sempre conferma.</span></div>
    <button className="primary-cta" disabled={pending}>{pending ? "Caricamento e lettura…" : "Carica e interpreta"}</button>
  </form>;
}
