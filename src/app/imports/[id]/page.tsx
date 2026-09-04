import Link from "next/link";
import { notFound } from "next/navigation";
import { approveHighConfidence, bulkReviewRecords, confirmImportSupplier, retryImport } from "../actions";
import { Confidence, ImportProgress, ImportStatus, ImportTabs, SourceReference } from "@/components/import-primitives";
import { DataTable, EmptyState, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { getImportRecordCounts, getImportRecordPage, importReviewFilters, type ImportReviewFilter, type ImportReviewSort } from "@/lib/imports/review-query";
import { consumptionUomLabel, importKindLabels, matchTypeLabels, parserLabel, purchaseUomLabel } from "@/lib/imports/presentation";
import type { NormalizedImport, XlsxRuntimeDiagnostic } from "@/lib/imports/types";
import { providerRuntimeStatus } from "@/lib/imports/provider";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/pricing";

const exceptionLabels: Record<string, string> = {
  UNCERTAIN_MATCH: "Match incerto", UOM_AMBIGUOUS: "Unità ambigua", PACKAGE_AMBIGUOUS: "Confezione ambigua",
  PRICE_NOT_NORMALIZABLE: "Prezzo non normalizzabile", IDENTIFIER_CONFLICT: "Identificatore in conflitto", NEW_PRODUCT: "Nuovo prodotto",
  PACKAGE_CHANGE: "Cambio confezione", CATEGORY_UNCERTAIN: "Categoria incerta", MISSING_DATA: "Dato mancante",
};
function asStringArray(value: unknown) { return Array.isArray(value) ? value.map(String) : []; }
function filterFromQuery(value: string | undefined, hasAttention: boolean): ImportReviewFilter {
  const normalized = value === "attenzione" ? "attention" : value === "pronti" ? "ready" : value === "nuovi" ? "new" : value === "non-confrontabili" ? "non-comparable" : value;
  return importReviewFilters.includes(normalized as ImportReviewFilter) ? normalized as ImportReviewFilter : hasAttention ? "attention" : "all";
}
function filterHref(id: string, filter: ImportReviewFilter, count: number) { return `/imports/${id}?filtro=${filter}&conteggio=${count}`; }

export default async function ImportDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ filtro?: string; q?: string; ordine?: string; pagina?: string; eccezione?: string; caricato?: string; pubblicato?: string; batch?: string; errore?: string }> }) {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const { id } = await params;
  const query = await searchParams;
  const job = await prisma.importJob.findFirst({ where: { id, sourceDocument: { organizationId: context.assignment.organizationId } }, include: { sourceDocument: { include: { supplier: true, uploadedBy: true } }, publishedPriceList: true } });
  if (!job) notFound();
  const counts = await getImportRecordCounts(prisma, id);
  const filter = filterFromQuery(query.filtro, counts.attention > 0);
  const sort = ["confidence", "delta", "price", "description", "status"].includes(query.ordine ?? "") ? query.ordine as ImportReviewSort : "confidence";
  const pageData = await getImportRecordPage(prisma, { jobId: id, filter, search: query.q ?? "", sort, exceptionType: query.eccezione, page: Number(query.pagina ?? 1) });
  const [events, suppliers, categories] = await Promise.all([
    prisma.auditEvent.findMany({ where: { OR: [{ entityType: "IMPORT_JOB", entityId: job.id }, { entityType: "SOURCE_DOCUMENT", entityId: job.sourceDocument.id }] }, include: { actor: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const summary = (job.summary ?? {}) as {
    duplicateDocumentId?: string | null;
    supplierSuggestion?: { supplierId: string; supplierName: string; confidence: number; reasons: string[] } | null;
    commercialConditions?: Record<string, string | number>;
    aiSupplierSuggestion?: { value: string | null; confidence: number; sourceEvidence: string; reasoningSummary: string } | null;
    aiCommercialConditions?: Array<{ type: string; value: string | number | null; confidence: number; sourceEvidence: string }>;
    xlsxRuntimeDiagnostic?: XlsxRuntimeDiagnostic;
  };
  const commercialConditions = Object.entries(summary.commercialConditions ?? {});
  const aiSupplier = summary.aiSupplierSuggestion?.value ? suppliers.find((supplier) => supplier.id === summary.aiSupplierSuggestion?.value || supplier.name.toLocaleLowerCase("it-IT") === summary.aiSupplierSuggestion?.value?.toLocaleLowerCase("it-IT")) : null;
  const primaryAction = job.status === "NEEDS_REVIEW" ? counts.attention > 0 ? <Link className="primary-cta" href={filterHref(id, "attention", counts.attention)}>Rivedi {counts.attention} eccezioni</Link> : <Link className="primary-cta" href={filterHref(id, "ready", counts.proposed)}>Conferma {counts.proposed} proposte</Link>
    : job.status === "READY_TO_PUBLISH" ? <Link className="primary-cta" href={`/imports/${id}/summary`}>Pubblica importazione</Link>
      : job.status === "PUBLISHED" ? <Link className="primary-cta" href={`/imports/${id}/changes`}>Apri risultati</Link>
        : job.status === "FAILED" ? <form action={retryImport}><input type="hidden" name="jobId" value={id} /><button className="primary-cta">Riprova elaborazione</button></form>
          : <Link className="secondary-cta" href={`/imports/documents/${job.sourceDocument.id}`}>Apri originale</Link>;
  const providerCapabilities = (job.providerCapabilities ?? {}) as Record<string, boolean>;
  return <main className="phase2-page phase2-import-detail">
    {query.caricato && <div className="success">Documento caricato e letto. Le eccezioni sono mostrate per prime.</div>}
    {query.batch && <div className="success">Decisione salvata su {query.batch} {query.batch === "1" ? "riga" : "righe"}. I contatori riflettono lo stato persistito.</div>}
    {query.errore && <div className="error" role="alert">{query.errore}</div>}
    {summary.duplicateDocumentId && <div className="warning">Documento già importato: questa elaborazione è una nuova versione e non sovrascrive l’originale.</div>}
    <PageHeader eyebrow={importKindLabels[job.sourceDocument.documentKind]} title={job.sourceDocument.originalFilename} description={`${job.sourceDocument.supplier?.name ?? "Fornitore da confermare"} · ${job.totalRecords} righe · ${counts.attention} eccezioni`} action={primaryAction} />
    <section className="import-detail-facts" aria-label="Informazioni importazione">
      <div><span>Stato</span><ImportStatus status={job.status} /></div>
      <div><span>Documento</span><strong>{importKindLabels[job.sourceDocument.documentKind]}</strong><small>{parserLabel(job.parserType)}</small></div>
      <div><span>Caricato da</span><strong>{job.sourceDocument.uploadedBy.name}</strong><small>{formatDate(job.sourceDocument.uploadedAt)}</small></div>
      <div><span>Motore</span><strong>{job.interpretationProvider === "LOCAL_HEURISTIC" ? "Interpretazione locale" : job.interpretationProvider}</strong><small>{job.externalProcessing ? "Elaborazione esterna configurata" : "Nessun invio esterno"}</small></div>
      <div><span>Esito</span><strong>{counts.ready + counts.published} gestiti</strong><small>{counts.attention} da decidere</small></div>
    </section>
    <details className="phase2-mobile-technical"><summary>Provenienza e dettagli tecnici</summary><div><strong>{job.sourceDocument.uploadedBy.name}</strong><span>{formatDate(job.sourceDocument.uploadedAt)} · {parserLabel(job.parserType)}</span><small>{job.externalProcessing ? "Elaborazione esterna configurata" : "Nessun invio esterno"}</small></div></details>
    <ImportProgress status={job.status} /><ImportTabs jobId={job.id} active={filter === "attention" ? "review" : "preview"} />
    {job.status === "REQUIRES_PROVIDER" && <section className="import-failure provider-required" role="status"><p className="eyebrow">Document intelligence necessaria</p><h2>Questo documento richiede OCR o visione</h2><p>{job.errorMessage}</p><small>{providerRuntimeStatus.message} Capacità OCR attiva: {providerCapabilities.ocr ? "sì" : "no"}.</small></section>}
    {!job.sourceDocument.supplierId && <form action={confirmImportSupplier} className="supplier-confirmation"><input type="hidden" name="jobId" value={job.id} /><div><p className="eyebrow">Conferma necessaria</p><h2>A quale fornitore appartiene il documento?</h2><p>{summary.supplierSuggestion ? `Identificatore deterministico: ${summary.supplierSuggestion.supplierName} (${Math.round(summary.supplierSuggestion.confidence * 100)}%).` : aiSupplier ? `Suggerito dall’AI: ${aiSupplier.name} (${Math.round((summary.aiSupplierSuggestion?.confidence ?? 0) * 100)}%). Conferma prima dell’associazione.` : "Nessuna identificazione abbastanza affidabile. Seleziona il fornitore manualmente."}</p></div><label>Fornitore<select name="supplierId" required defaultValue={summary.supplierSuggestion?.supplierId ?? aiSupplier?.id ?? ""}><option value="" disabled>Seleziona un fornitore</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><button className="primary-cta">Conferma fornitore</button></form>}
    {commercialConditions.length > 0 && <details className="disclosure-section"><summary><span>Condizioni commerciali rilevate</span><small>{commercialConditions.length} valori da verificare</small></summary><div className="commercial-terms-detected">{commercialConditions.map(([key, value]) => <div key={key}><span>{({ minimumOrderValue: "Ordine minimo", freeShippingThreshold: "Franco porto", shippingFee: "Costo trasporto", surcharge: "Maggiorazione", discountPercent: "Sconto", paymentTerms: "Pagamento", deliveryTerms: "Resa/consegna" } as Record<string, string>)[key] ?? key}</span><strong>{typeof value === "number" ? `${value.toLocaleString("it-IT")} ${key === "discountPercent" ? "%" : "€"}` : value}</strong></div>)}</div><p className="muted">Valori estratti dal documento e mantenuti nel riepilogo di provenienza. La conferma umana resta necessaria; le condizioni generali del fornitore non vengono sovrascritte automaticamente.</p></details>}
    {(summary.aiCommercialConditions?.length ?? 0) > 0 && <details className="disclosure-section"><summary><span>Condizioni interpretate dall’AI</span><small>{summary.aiCommercialConditions!.length} evidenze da confermare</small></summary><div className="commercial-terms-detected">{summary.aiCommercialConditions!.map((condition, index) => <div key={`${condition.type}-${index}`}><span>{condition.type}</span><strong>{condition.value ?? "n.d."}</strong><small>{Math.round(condition.confidence * 100)}% · {condition.sourceEvidence}</small></div>)}</div><p className="muted">Proposte source-backed: diventano condizioni canoniche della versione soltanto dopo pubblicazione e conferma umana.</p></details>}
    {job.status === "FAILED" && <section className="import-failure" role="alert"><p className="eyebrow">Elaborazione interrotta</p><h2>Non siamo riusciti a identificare dati pubblicabili</h2><p>{job.errorMessage ?? "Errore non identificato."}</p>{summary.xlsxRuntimeDiagnostic && <details><summary>{summary.xlsxRuntimeDiagnostic.marker}</summary><dl><dt>Bytes Storage</dt><dd>{summary.xlsxRuntimeDiagnostic.sourceByteLength} · attesi {summary.xlsxRuntimeDiagnostic.expectedByteLength ?? "n.d."} · {summary.xlsxRuntimeDiagnostic.byteLengthMatches === null ? "confronto n.d." : summary.xlsxRuntimeDiagnostic.byteLengthMatches ? "coincidenti" : "diversi"}</dd><dt>Firma ZIP</dt><dd>{summary.xlsxRuntimeDiagnostic.firstFourBytesHex || "vuota"} · {summary.xlsxRuntimeDiagnostic.zipSignature ? "valida" : "non valida"}</dd><dt>Checksum SHA-256</dt><dd>{summary.xlsxRuntimeDiagnostic.expectedChecksumMatches === null ? "calcolato" : summary.xlsxRuntimeDiagnostic.expectedChecksumMatches ? "coincidente con SourceDocument" : "diverso da SourceDocument"}</dd><dt>Runtime</dt><dd>{summary.xlsxRuntimeDiagnostic.nodeVersion}</dd><dt>Parser XLSX</dt><dd>{summary.xlsxRuntimeDiagnostic.parserName} {summary.xlsxRuntimeDiagnostic.parserVersion} · modulo {summary.xlsxRuntimeDiagnostic.moduleDefaultExists ? "presente" : "assente"} · export {summary.xlsxRuntimeDiagnostic.moduleShapeKeys.join(", ") || "nessuno"}</dd><dt>Caricamento</dt><dd>lettore {summary.xlsxRuntimeDiagnostic.workbookCreated ? "creato" : "non creato"} · load avviato {summary.xlsxRuntimeDiagnostic.beforeWorkbookLoad ? "sì" : "no"} · load completato {summary.xlsxRuntimeDiagnostic.afterWorkbookLoad ? "sì" : "no"}</dd><dt>Fogli</dt><dd>{summary.xlsxRuntimeDiagnostic.worksheetsLength ?? "n.d."} · {summary.xlsxRuntimeDiagnostic.worksheetNames.join(", ") || "nessun nome disponibile"}</dd><dt>Errore</dt><dd>{summary.xlsxRuntimeDiagnostic.errorClass ?? "n.d."}: {summary.xlsxRuntimeDiagnostic.errorMessage ?? "n.d."}</dd><dt>Origine stack</dt><dd>{summary.xlsxRuntimeDiagnostic.stackOrigin ?? "n.d."}</dd></dl></details>}</section>}

    <section className="review-workspace" aria-labelledby="review-title">
      <div className="review-toolbar"><div><p className="eyebrow">Revisione per eccezione</p><h2 id="review-title">La prossima decisione</h2><span>{counts.proposed} proposte affidabili possono essere confermate insieme; {counts.attention} richiedono lettura.</span></div><nav>
        <Link className={filter === "attention" ? "active" : ""} href={filterHref(id,"attention",counts.attention)}>Da verificare <b>{counts.attention}</b></Link>
        <Link className={filter === "ready" ? "active" : ""} href={filterHref(id,"ready",counts.proposed + counts.ready + counts.published)}>Pronte <b>{counts.proposed + counts.ready + counts.published}</b></Link>
        <Link className={filter === "new" ? "active" : ""} href={filterHref(id,"new",counts.newProducts)}>Nuovi prodotti <b>{counts.newProducts}</b></Link>
        <Link className={filter === "non-comparable" ? "active" : ""} href={filterHref(id,"non-comparable",counts.nonComparable)}>Non confrontabili <b>{counts.nonComparable}</b></Link>
        <Link className={filter === "ignored" ? "active" : ""} href={filterHref(id,"ignored",counts.ignored)}>Ignorate <b>{counts.ignored}</b></Link>
        <Link className={filter === "all" ? "active" : ""} href={filterHref(id,"all",counts.total)}>Tutte <b>{counts.total}</b></Link>
      </nav></div>
      {counts.proposed > 0 && <form action={approveHighConfidence} className="bulk-review-action"><input type="hidden" name="jobId" value={id} /><div><strong>{counts.proposed} corrispondenze ad alta affidabilità</strong><span>Identificatori, unità e confezione sono compatibili. Confermale in un’unica decisione.</span></div><button className="secondary-cta">Conferma tutte le proposte affidabili</button></form>}
      <form className="import-record-filters" aria-label="Cerca e ordina record">
        <input type="hidden" name="filtro" value={filter} />
        <input name="q" defaultValue={query.q ?? ""} placeholder="Cerca SKU, descrizione o GTIN…" aria-label="Cerca nei record" />
        <select name="eccezione" defaultValue={query.eccezione ?? ""} aria-label="Tipo eccezione"><option value="">Tutte le eccezioni</option>{Object.entries(exceptionLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select>
        <select name="ordine" defaultValue={sort} aria-label="Ordina record"><option value="confidence">Affidabilità più bassa</option><option value="delta">Delta prezzo maggiore</option><option value="price">Prezzo maggiore</option><option value="description">Descrizione A–Z</option><option value="status">Stato</option></select>
        <button className="secondary-cta">Applica filtri</button>
      </form>
      <form action={bulkReviewRecords} className="bulk-review-form"><input type="hidden" name="jobId" value={id} />
        <div className="bulk-review-bar"><div><strong>Decisione sui selezionati</strong><span>La selezione viene salvata solo se tutte le righe sono compatibili.</span></div><select name="bulkAction" required aria-label="Azione multipla"><option value="">Scegli azione</option><option value="ACCEPT_RECOMMENDED">Conferma match consigliato</option><option value="ASSIGN_CATEGORY">Assegna categoria</option><option value="NON_COMPARABLE">Segna non confrontabile</option><option value="IGNORE">Ignora</option></select><select name="categoryId" aria-label="Categoria per azione multipla"><option value="">Categoria, se richiesta</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select><button className="primary-cta">Applica decisione</button></div>
        {pageData.records.length ? <DataTable label="Record interpretati"><thead><tr><th><span className="sr-only">Seleziona</span></th><th>Fonte</th><th>Descrizione</th><th>Confezione</th><th>Prezzo</th><th>Prezzo normalizzato</th><th>Match</th><th>Esito</th></tr></thead><tbody>{pageData.records.map((record) => { const normalized = record.normalizedFields as NormalizedImport; const candidate = record.matchCandidates[0]; const warnings = [...asStringArray(record.validationErrors), ...asStringArray(record.warnings)]; return <tr key={record.id} className={record.requiresReview ? "review-row" : ""}>
          <td><input type="checkbox" name="recordId" value={record.id} aria-label={`Seleziona riga ${record.recordIndex}`} /></td>
          <td><Link className="table-link" href={`/imports/${id}/records/${record.id}`}>Riga {record.recordIndex}</Link><SourceReference locator={record.sourceLocator} /></td>
          <td><Link className="table-link" href={`/imports/${id}/records/${record.id}`}>{String(normalized.description ?? "Descrizione mancante")}</Link><span className="cell-detail mono">{record.supplierSkuText ?? "Codice assente"}</span>{warnings[0] && <span className="cell-detail watch">{exceptionLabels[record.exceptionType ?? ""] ?? warnings[0]}</span>}</td>
          <td>{String(normalized.packageDescription ?? `${normalized.unitsPerPackage ?? "?"} ${consumptionUomLabel(normalized.consumptionUom)}`)}<span className="cell-detail">Per {purchaseUomLabel(normalized.purchaseUom)}</span></td>
          <td>{normalized.netPrice != null ? formatMoney(Number(normalized.netPrice)) : "—"}</td>
          <td>{normalized.comparable && normalized.normalizedPrice != null ? `${formatMoney(Number(normalized.normalizedPrice), 4)} / ${consumptionUomLabel(normalized.consumptionUom)}` : <span className="watch">Non confrontabile</span>}</td>
          <td>{candidate ? <><strong>{matchTypeLabels[candidate.matchType]}</strong><span className="cell-detail">{candidate.canonicalProduct?.name ?? "Nuovo prodotto"}</span><Confidence value={Number(record.matchConfidence)} /></> : "—"}</td>
          <td><Link href={`/imports/${id}/records/${record.id}`}><ImportStatus status={record.status} /></Link></td>
        </tr>; })}</tbody></DataTable> : <EmptyState title="Nessun record in questo filtro" description="Modifica ricerca o filtro per vedere gli altri record." />}
      </form>
      {pageData.pages > 1 && <nav className="pagination" aria-label="Pagine record"><span>{pageData.total} risultati · pagina {pageData.page} di {pageData.pages}</span><div>{pageData.page > 1 && <Link className="secondary-cta compact" href={`/imports/${id}?filtro=${filter}&q=${encodeURIComponent(query.q ?? "")}&ordine=${sort}&pagina=${pageData.page - 1}`}>Precedente</Link>}{pageData.page < pageData.pages && <Link className="secondary-cta compact" href={`/imports/${id}?filtro=${filter}&q=${encodeURIComponent(query.q ?? "")}&ordine=${sort}&pagina=${pageData.page + 1}`}>Successiva</Link>}</div></nav>}
    </section>
    <section className="publish-gate"><div><p className="eyebrow">Controllo di pubblicazione</p><h2>{counts.attention + counts.proposed ? `${counts.attention + counts.proposed} decisioni ancora aperte` : "Tutti i record sono stati gestiti"}</h2><p>{counts.attention ? `${counts.attention} eccezioni richiedono lettura; ${counts.proposed} proposte possono essere confermate insieme.` : "La fonte e ogni correzione restano tracciate dopo la pubblicazione."}</p></div><Link className={counts.attention + counts.proposed ? "secondary-cta" : "primary-cta"} href={`/imports/${id}/summary`}>Apri riepilogo</Link></section>
    {events.length > 0 && <details className="compact-audit"><summary>Cronologia importazione · {events.length} eventi</summary><ul>{events.map((event) => <li key={event.id}><strong>{event.action}</strong><span>{event.actor?.name ?? "Sistema"} · {formatDate(event.createdAt)}</span></li>)}</ul></details>}
  </main>;
}
