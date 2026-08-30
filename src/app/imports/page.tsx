import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";
import { importKindLabels, parserLabel } from "@/lib/imports/presentation";
import { ImportStatus } from "@/components/import-primitives";
import { DataTable, EmptyState, PageHeader } from "@/components/ui";

const actionable = ["NEEDS_REVIEW", "READY_TO_PUBLISH", "FAILED", "REQUIRES_PROVIDER", "PARSING", "INTERPRETING", "PUBLISHING"] as const;
const processing = ["PARSING", "INTERPRETING", "PUBLISHING"] as const;
function periodStart(days: number) { return new Date(Date.now() - days * 86_400_000); }

function stateWhere(state?: string): Prisma.ImportJobWhereInput {
  if (!state || state === "manage") return { status: { in: [...actionable] } };
  if (state === "all") return {};
  if (state === "processing") return { status: { in: [...processing] } };
  if (state === "ready") return { status: "READY_TO_PUBLISH" };
  if (state === "published") return { status: "PUBLISHED" };
  if (state === "failed") return { status: { in: ["FAILED", "REQUIRES_PROVIDER"] } };
  return {};
}

function jobAction(job: { id: string; status: string }) {
  if (job.status === "NEEDS_REVIEW") return { label: "Continua revisione", href: `/imports/${job.id}?filtro=attenzione` };
  if (job.status === "READY_TO_PUBLISH") return { label: "Pubblica", href: `/imports/${job.id}/summary` };
  if (job.status === "PUBLISHED") return { label: "Apri risultati", href: `/imports/${job.id}/changes` };
  if (job.status === "FAILED" || job.status === "REQUIRES_PROVIDER") return { label: "Apri problema", href: `/imports/${job.id}` };
  return { label: "Vedi avanzamento", href: `/imports/${job.id}` };
}

export default async function ImportsPage({ searchParams }: { searchParams: Promise<{ stato?: string; fornitore?: string; tipo?: string; periodo?: string }> }) {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const filters = await searchParams;
  const periodDays = ["7", "30", "90"].includes(filters.periodo ?? "") ? Number(filters.periodo) : null;
  const sourceWhere: Prisma.SourceDocumentWhereInput = {
    organizationId: context.assignment.organizationId,
    ...(filters.fornitore ? { supplierId: filters.fornitore } : {}),
    ...(filters.tipo ? { documentKind: filters.tipo as never } : {}),
    ...(periodDays ? { uploadedAt: { gte: periodStart(periodDays) } } : {}),
  };
  const [workQueue, recent, suppliers] = await Promise.all([
    prisma.importJob.findMany({ where: { sourceDocument: sourceWhere, status: { in: [...actionable] } }, include: { sourceDocument: { include: { supplier: true, uploadedBy: true } } }, orderBy: [{ reviewRequiredRecords: "desc" }, { createdAt: "asc" }], take: 12 }),
    prisma.importJob.findMany({ where: { sourceDocument: sourceWhere, ...stateWhere(filters.stato) }, include: { sourceDocument: { include: { supplier: true, uploadedBy: true } } }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <main>
    <PageHeader eyebrow="Dati commerciali" title="Importazioni" description="Lavora prima sulle eccezioni. Le righe affidabili restano nello staging finché una persona non conferma la pubblicazione." action={<Link className="primary-cta" href="/imports/new">Importa un documento</Link>} />
    <section className="import-work-queue" aria-labelledby="work-queue-title">
      <div className="section-heading"><div><p className="eyebrow">Priorità</p><h2 id="work-queue-title">Da gestire</h2><p>Importazioni ordinate per eccezioni e anzianità.</p></div><span>{workQueue.length} attività</span></div>
      {workQueue.length ? <div className="import-work-list">{workQueue.map((job) => { const action = jobAction(job); return <article key={job.id}>
        <div className="import-work-priority"><ImportStatus status={job.status} /><strong>{job.sourceDocument.supplier?.name ?? "Fornitore da confermare"}</strong></div>
        <div><Link className="table-link" href={`/imports/${job.id}`}>{job.sourceDocument.originalFilename}</Link><span>{job.totalRecords} righe · {job.reviewRequiredRecords} da verificare</span></div>
        <div><span>Caricato {formatDate(job.sourceDocument.uploadedAt)}</span><small>{job.sourceDocument.uploadedBy.name}</small></div>
        <Link className="secondary-cta compact" href={action.href}>{action.label}</Link>
      </article>; })}</div> : <EmptyState title="Non ci sono importazioni che richiedono attenzione" description="Tutti gli import sono pubblicati o non richiedono decisioni. Puoi caricare un nuovo documento quando serve." action={<Link className="secondary-cta" href="/imports/new">Importa nuovo documento</Link>} />}
    </section>
    <section className="import-history" aria-labelledby="import-history-title">
      <div className="section-heading"><div><p className="eyebrow">Storico</p><h2 id="import-history-title">Import recenti</h2></div></div>
      <nav className="state-tabs" aria-label="Stato importazioni">{[["manage","Da gestire"],["processing","In elaborazione"],["ready","Pronti"],["published","Pubblicati"],["failed","Falliti"],["all","Tutti"]].map(([value,label]) => <Link key={value} className={(filters.stato ?? "manage") === value ? "active" : ""} href={`/imports?stato=${value}`}>{label}</Link>)}</nav>
      <form className="filter-bar" aria-label="Filtra importazioni">
        <input type="hidden" name="stato" value={filters.stato ?? "manage"} />
        <select name="fornitore" defaultValue={filters.fornitore ?? ""} aria-label="Fornitore"><option value="">Tutti i fornitori</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
        <select name="tipo" defaultValue={filters.tipo ?? ""} aria-label="Tipo documento"><option value="">Tutti i documenti</option>{Object.entries(importKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select name="periodo" defaultValue={filters.periodo ?? ""} aria-label="Periodo"><option value="">Qualsiasi periodo</option><option value="7">Ultimi 7 giorni</option><option value="30">Ultimi 30 giorni</option><option value="90">Ultimi 90 giorni</option></select>
        <button className="secondary-cta">Applica filtri</button>
      </form>
      {recent.length ? <DataTable label="Importazioni recenti"><thead><tr><th>Documento</th><th>Fornitore</th><th>Lettura</th><th>Caricato</th><th>Record</th><th>Eccezioni</th><th>Stato</th><th aria-label="Azione" /></tr></thead><tbody>{recent.map((job) => { const action = jobAction(job); return <tr key={job.id}><td><Link className="table-link" href={`/imports/${job.id}`}>{job.sourceDocument.originalFilename}</Link><span className="cell-detail">{importKindLabels[job.sourceDocument.documentKind]} · v{job.version}</span></td><td>{job.sourceDocument.supplier?.name ?? "Da confermare"}</td><td>{parserLabel(job.parserType)}</td><td>{formatDate(job.sourceDocument.uploadedAt)}<span className="cell-detail">{job.sourceDocument.uploadedBy.name}</span></td><td>{job.totalRecords}</td><td className={job.reviewRequiredRecords ? "watch" : ""}>{job.reviewRequiredRecords}</td><td><ImportStatus status={job.status} /></td><td><Link className="text-link" href={action.href}>{action.label}</Link></td></tr>; })}</tbody></DataTable> : <EmptyState title="Nessun import in questo filtro" description="Modifica stato, fornitore, tipo documento o periodo." />}
    </section>
  </main>;
}
