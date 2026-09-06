import Link from "next/link";
import { TechnicalUploadForm } from "@/components/technical-upload-form";
import { DataTable, EmptyRow, PageHeader, Pagination, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE = 20;
const labels: Record<string, string> = {
  READY: "Associati",
  REVIEW_REQUIRED: "Da verificare",
  NEEDS_OCR: "OCR necessario",
  FAILED: "Falliti",
  UPLOADED: "Caricati",
  PROCESSING: "In analisi",
  SUPERSEDED: "Superati",
};

export default async function TechnicalDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string; pagina?: string }>;
}) {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const query = await searchParams;
  const page = Math.max(1, Number(query.pagina) || 1);
  const where = {
    organizationId: context.organization.id,
    ...(query.stato ? { status: query.stato as "READY" } : {}),
  };
  const [documents, total, counts, batches, incomplete, missing, equivalence, conflicts, savings] = await Promise.all([
    prisma.technicalDocument.findMany({ where, include: { currentVersion: { include: { sourceDocument: true } }, associations: true }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.technicalDocument.count({ where }),
    prisma.technicalDocument.groupBy({ by: ["status"], where: { organizationId: context.organization.id }, _count: true }),
    prisma.technicalDocumentBatch.findMany({ where: { organizationId: context.organization.id }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.productTechnicalState.count({ where: { organizationId: context.organization.id, status: { not: "COMPLETE" } } }),
    prisma.missingEvidenceItem.count({ where: { organizationId: context.organization.id, status: "OPEN" } }),
    prisma.productEquivalenceAssessment.count({ where: { organizationId: context.organization.id, reviewStatus: { in: ["AI_PROPOSED", "REVIEW_REQUIRED", "STALE"] } } }),
    prisma.productTechnicalState.count({ where: { organizationId: context.organization.id, status: "CONFLICTED" } }),
    prisma.technicalSavingOpportunity.count({ where: { organizationId: context.organization.id, status: { in: ["OPEN", "REVIEW_REQUIRED"] } } }),
  ]);
  return (
    <main className="phase2-page technical-control-center">
      <PageHeader eyebrow="Product Intelligence" title="Evidenze tecniche" description="Documenti, associazioni e completezza: il lavoro incerto resta in revisione umana." />
      <section className="technical-summary">
        {counts.map((item) => <Link key={item.status} href={`/technical-documents?stato=${item.status}`}><strong>{item._count}</strong><span>{labels[item.status] ?? item.status}</span></Link>)}
        <Link href="/technical-products"><strong>{incomplete}</strong><span>Prodotti incompleti</span></Link>
        <Link href="/technical-products"><strong>{missing}</strong><span>Evidenze mancanti</span></Link>
        <Link href="/technical-compare"><strong>{equivalence}</strong><span>Equivalenze da decidere</span></Link>
        <Link href="/technical-products"><strong>{conflicts}</strong><span>Conflitti</span></Link>
        <Link href="/technical-compare"><strong>{savings}</strong><span>Opportunità economiche</span></Link>
      </section>
      <TechnicalUploadForm />
      <section>
        <div className="section-heading"><div><h2>Documenti</h2><p>{total} nel filtro corrente</p></div><div className="disclosure-actions"><Link className="secondary-cta" href="/technical-products">Prodotti senza evidenze</Link><Link className="secondary-cta" href="/technical-requirements">Regole per categoria</Link></div></div>
        <DataTable label="Documenti tecnici">
          <thead><tr><th>Documento</th><th>Tipo</th><th>Versione</th><th>Associazioni</th><th>Stato</th><th /></tr></thead>
          <tbody>{documents.length ? documents.map((document) => <tr key={document.id}><td><strong>{document.title}</strong><span className="cell-detail">{document.currentVersion?.sourceDocument.originalFilename}</span></td><td>{document.documentType}</td><td>v{document.currentVersion?.versionNumber ?? "—"}<span className="cell-detail">rev. {document.currentVersion?.revision ?? "n.d."}</span></td><td>{document.associations.filter((association) => ["AUTO_CONFIRMED", "MANUALLY_CONFIRMED"].includes(association.status)).length}<span className="cell-detail">{document.associations.filter((association) => association.status === "REVIEW_REQUIRED").length} da verificare</span></td><td><StatusChip variant={document.status === "READY" ? "ok" : document.status === "FAILED" ? "danger" : "warn"}>{labels[document.status] ?? document.status}</StatusChip></td><td><Link className="row-disclosure" href={`/technical-documents/${document.id}`}>→</Link></td></tr>) : <EmptyRow colSpan={6}>Nessun documento tecnico.</EmptyRow>}</tbody>
        </DataTable>
        <Pagination page={page} pages={Math.max(1, Math.ceil(total / PAGE))} pathname="/technical-documents" params={{ stato: query.stato }} />
      </section>
      {batches.length > 0 && <details className="disclosure-section" open={batches.some((batch) => batch.status === "PROCESSING")}><summary><span>Lotti recenti</span><small>{batches.length}</small></summary>{batches.map((batch) => <p key={batch.id}><strong>{batch.status}</strong> · {batch.completedFiles}/{batch.totalFiles} completati · {batch.failedFiles} falliti · {batch.reviewRequiredFiles} da verificare</p>)}</details>}
    </main>
  );
}
