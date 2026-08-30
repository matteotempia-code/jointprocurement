import { notFound } from "next/navigation";
import { resetColumnMapping, updateColumnMapping } from "../../actions";
import { ImportProgress, ImportTabs } from "@/components/import-primitives";
import { DataTable, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { fieldLabels, parserLabel } from "@/lib/imports/presentation";
import { importFields } from "@/lib/imports/types";
import { prisma } from "@/lib/prisma";

export default async function ColumnMappingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvato?: string; automatico?: string }> }) {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const job = await prisma.importJob.findFirst({ where: { id: (await params).id, sourceDocument: { organizationId: context.assignment.organizationId } }, include: { sourceDocument: true, records: { orderBy: { recordIndex: "asc" }, take: 5, select: { id: true, recordIndex: true, rawFields: true } } } });
  if (!job) notFound();
  const query = await searchParams;
  const mapping = (job.columnMapping ?? {}) as Record<string, string>;
  const summary = (job.summary ?? {}) as { sourceHeaders?: string[] };
  const headers = summary.sourceHeaders?.length ? summary.sourceHeaders : Object.keys(mapping);
  const sheets = Array.isArray(job.detectedSheets) ? job.detectedSheets as { name: string; records: number; selected: boolean }[] : [];
  const manualChanges = await prisma.auditEvent.count({ where: { entityType: "IMPORT_JOB", entityId: job.id, action: "COLUMN_MAPPING_CHANGED" } });
  const mapped = headers.filter((header) => mapping[header]).length;
  return <main>
    {query.salvato && <div className="success">Mapping aggiornato. I record sono stati ricalcolati usando le nuove associazioni.</div>}
    {query.automatico && <div className="success">Mapping automatico ripristinato e staging ricalcolato.</div>}
    <PageHeader eyebrow="Interpretazione struttura" title="Mapping delle colonne" description={`${job.sourceDocument.originalFilename} · ${parserLabel(job.parserType)}. Correggi solo ciò che non rappresenta la fonte.`} />
    <ImportProgress status={job.status} /><ImportTabs jobId={job.id} active="mapping" />
    {sheets.length > 0 && <section className="sheet-selection"><div><p className="eyebrow">Fogli rilevati</p><h2>Origine dei record</h2></div>{sheets.map((sheet) => <article key={sheet.name} className={sheet.selected ? "selected" : ""}><strong>{sheet.name}</strong><span>{sheet.records} righe</span><small>{sheet.selected ? "Foglio selezionato" : "Escluso dalla lettura"}</small></article>)}</section>}
    <section className="mapping-summary"><div><strong>{mapped}/{headers.length} colonne mappate {manualChanges ? "con revisione" : "automaticamente"}</strong><span>{headers.length - mapped ? `${headers.length - mapped} richiedono verifica` : "Nessuna colonna irrisolta"}</span></div><span className={headers.length === mapped ? "status-positive" : "watch"}>{headers.length === mapped ? "Mapping completo" : "Verifica necessaria"}</span></section>
    <form action={updateColumnMapping} className="mapping-form"><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="headers" value={JSON.stringify(headers)} />
      <div className="section-heading"><div><p className="eyebrow">Campi riconosciuti</p><h2>Documento → dato procurement</h2></div><span>{mapped} colonne associate</span></div>
      <div className="mapping-list">{headers.map((header) => <label key={header} className={mapping[header] ? "mapped" : "unmapped"}><span><strong>{header}</strong><small>{mapping[header] ? "Associazione proposta" : "Colonna non riconosciuta"}</small></span><i aria-hidden="true">→</i><select name={`mapping:${header}`} defaultValue={mapping[header] ?? ""} aria-label={`Mapping per ${header}`}><option value="">Ignora colonna</option>{importFields.map((candidate) => <option value={candidate} key={candidate}>{fieldLabels[candidate]}</option>)}</select></label>)}</div>
      <div className="mapping-footer"><p>Salva tutte le associazioni insieme. Il file originale resta invariato.</p><button className="primary-cta">Salva e ricalcola</button></div>
    </form>
    <form action={resetColumnMapping} className="mapping-reset"><input type="hidden" name="jobId" value={job.id} /><button className="text-button">Ripristina mapping automatico</button></form>
    {job.records.length > 0 && <section className="mapping-preview"><div className="section-heading"><div><p className="eyebrow">Anteprima</p><h2>Prime {job.records.length} righe della fonte</h2><p>La pagina non carica mai l’intero documento.</p></div></div><DataTable label="Anteprima righe sorgente"><thead><tr><th>Riga</th>{headers.slice(0, 6).map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{job.records.map((record) => { const raw = record.rawFields as Record<string, unknown>; return <tr key={record.id}><td>{record.recordIndex}</td>{headers.slice(0, 6).map((header) => <td key={header}>{String(raw[header] ?? "—")}</td>)}</tr>; })}</tbody></DataTable></section>}
  </main>;
}
