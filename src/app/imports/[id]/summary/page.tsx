import Link from "next/link";
import { notFound } from "next/navigation";
import { ImportPublishConfirm } from "@/components/import-publish-confirm";
import { ImportProgress, ImportStatus, ImportTabs } from "@/components/import-primitives";
import { PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { getImportRecordCounts } from "@/lib/imports/review-query";
import { importKindLabels } from "@/lib/imports/presentation";
import { prisma } from "@/lib/prisma";

export default async function ImportSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const job = await prisma.importJob.findFirst({ where: { id: (await params).id, sourceDocument: { organizationId: context.assignment.organizationId } }, include: { sourceDocument: { include: { supplier: true } }, publishedPriceList: true } });
  if (!job) notFound();
  const [counts, createdProducts, currentVersion] = await Promise.all([
    getImportRecordCounts(prisma, job.id),
    prisma.productMatchCandidate.count({ where: { importedRecord: { importJobId: job.id }, humanDecision: "CREATE_NEW" } }),
    job.sourceDocument.supplierId ? prisma.priceList.aggregate({ where: { supplierId: job.sourceDocument.supplierId }, _max: { version: true } }) : null,
  ]);
  const publishable = job.status === "PUBLISHED" ? job.publishedRecords : counts.ready;
  const blocking = counts.attention + counts.proposed;
  const version = (currentVersion?._max.version ?? 0) + (job.status === "PUBLISHED" ? 0 : 1);
  return <main>
    <PageHeader eyebrow="Controllo finale" title={job.status === "PUBLISHED" ? "Importazione completata" : "Pronto per pubblicare?"} description={`${job.sourceDocument.originalFilename} · ${job.sourceDocument.supplier?.name ?? "Fornitore da confermare"} · ${importKindLabels[job.sourceDocument.documentKind]}`} />
    <ImportProgress status={job.status} /><ImportTabs jobId={job.id} active="summary" />
    <section className="publish-decision-summary"><div><p className="eyebrow">Decisione</p><h2>{job.status === "PUBLISHED" ? `${job.publishedRecords} offerte pubblicate` : blocking ? `${blocking} decisioni bloccano la pubblicazione` : `${publishable} record pronti`}</h2><p>{job.status === "PUBLISHED" ? "Listino, offerte, correzioni e documento sorgente restano collegati." : "Verrà creata una nuova versione del listino senza sovrascrivere quella precedente."}</p></div><ImportStatus status={job.status} /></section>
    <section className="publish-counts" aria-label="Riepilogo record"><div><span>Pronte</span><strong>{job.status === "PUBLISHED" ? job.publishedRecords : counts.ready}</strong></div><div><span>Nuovi prodotti</span><strong>{job.status === "PUBLISHED" ? createdProducts : counts.newProducts}</strong></div><div><span>Ignorate</span><strong>{counts.ignored}</strong></div><div><span>Non confrontabili</span><strong>{counts.nonComparable}</strong></div><div className={blocking ? "blocking" : "clear"}><span>Decisioni aperte</span><strong>{blocking}</strong></div></section>
    {job.status === "PUBLISHED" ? <section className="publish-result"><div><p className="eyebrow">Pubblicazione completata</p><h2>{job.publishedPriceList?.name ?? "Nuovo listino pubblicato"}</h2><p>{job.publishedRecords} offerte create · {createdProducts} nuovi prodotti · {counts.ignored} record ignorati. La provenienza è disponibile su ogni offerta.</p></div><div className="cta-row"><Link className="primary-cta" href={`/imports/${job.id}/changes`}>Analizza variazioni</Link>{job.publishedPriceList && <Link className="secondary-cta" href={`/price-lists/${job.publishedPriceList.id}`}>Apri listino</Link>}</div></section>
      : blocking > 0 ? <section className="publish-blocked"><p className="eyebrow">Pubblicazione bloccata</p><h2>Completa le decisioni rimaste</h2><p>{counts.attention} eccezioni richiedono lettura; {counts.proposed} proposte affidabili possono essere confermate insieme.</p><Link className="primary-cta" href={`/imports/${job.id}?filtro=${counts.attention ? "attention" : "ready"}`}>{counts.attention ? `Rivedi ${counts.attention} eccezioni` : `Conferma ${counts.proposed} proposte`}</Link></section>
        : <section className="publish-ready"><div><p className="eyebrow">Nessun errore bloccante</p><h2>Conferma la nuova versione</h2><p>Verranno creati {publishable} record pubblicabili, {counts.newProducts} nuovi prodotti e una nuova versione del listino.</p></div><ImportPublishConfirm jobId={job.id} records={publishable} newProducts={counts.newProducts} supplier={job.sourceDocument.supplier?.name ?? "fornitore"} version={version} /></section>}
    <aside className="publish-safeguards"><strong>Garanzie applicate</strong><ul><li>Transazione atomica</li><li>Pubblicazione idempotente</li><li>Versione precedente conservata</li><li>Fonte collegata a ogni offerta</li><li>Audit di attore e decisioni</li></ul></aside>
  </main>;
}
