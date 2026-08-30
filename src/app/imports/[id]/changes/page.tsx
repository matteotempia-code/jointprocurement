import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { ImportTabs } from "@/components/import-primitives";
import { DataTable, EmptyState, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { consumptionUomLabel } from "@/lib/imports/presentation";
import type { NormalizedImport } from "@/lib/imports/types";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/pricing";

const pageSize = 25;
const changeLabels: Record<string, string> = { INCREASE: "Aumento", DECREASE: "Riduzione", UNCHANGED: "Invariato", NEW: "Nuovo", REMOVED: "Rimosso", PACKAGE_CHANGE: "Confezione cambiata", NON_COMPARABLE: "Non confrontabile" };
function observationStart() { return new Date(Date.now() - 365 * 86_400_000); }

function changeWhere(jobId: string, filter: string, relevant: boolean): Prisma.ImportedRecordWhereInput {
  const state: Prisma.ImportedRecordWhereInput = filter === "increases" ? { changeType: "INCREASE" }
    : filter === "reductions" ? { changeType: "DECREASE" }
      : filter === "new" ? { changeType: "NEW" }
        : filter === "packaging" ? { changeType: "PACKAGE_CHANGE" }
          : filter === "non-comparable" ? { changeType: "NON_COMPARABLE" }
            : {};
  return { importJobId: jobId, ...state, ...(relevant ? { OR: [{ priceDeltaPercent: { gte: 5 } }, { priceDeltaPercent: { lte: -5 } }, { changeType: { in: ["PACKAGE_CHANGE", "NEW", "NON_COMPARABLE"] } }] } : {}) };
}
function changeOrder(sort: string): Prisma.ImportedRecordOrderByWithRelationInput[] {
  if (sort === "decrease") return [{ priceDeltaPercent: "asc" }, { recordIndex: "asc" }];
  if (sort === "amount") return [{ priceDeltaAmount: "desc" }, { recordIndex: "asc" }];
  if (sort === "product") return [{ searchText: "asc" }, { recordIndex: "asc" }];
  return [{ priceDeltaPercent: "desc" }, { recordIndex: "asc" }];
}

export default async function ImportChangesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tipo?: string; ordine?: string; rilevanti?: string; pagina?: string }> }) {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const id = (await params).id;
  const query = await searchParams;
  const job = await prisma.importJob.findFirst({ where: { id, sourceDocument: { organizationId: context.assignment.organizationId } }, include: { sourceDocument: { include: { supplier: true } }, publishedPriceList: true } });
  if (!job) notFound();
  const filter = query.tipo ?? "all";
  const relevant = query.rilevanti === "1";
  const [representedRecords, previousList] = await Promise.all([
    prisma.importedRecord.findMany({
      where: { importJobId: id },
      select: {
        canonicalProductId: true,
        matchCandidates: { where: { recommended: true }, select: { canonicalProductId: true }, take: 1 },
      },
    }),
    prisma.priceList.findFirst({
      where: {
        supplierId: job.sourceDocument.supplierId ?? "__nessun_fornitore__",
        ...(job.publishedPriceList ? { id: { not: job.publishedPriceList.id }, version: { lt: job.publishedPriceList.version } } : {}),
      },
      orderBy: { version: "desc" },
      include: {
        offers: {
          include: { canonicalProduct: { select: { id: true, name: true, consumptionUom: true } } },
          orderBy: { canonicalProduct: { name: "asc" } },
        },
      },
    }),
  ]);
  const representedProductIds = new Set(
    representedRecords
      .map((record) => record.canonicalProductId ?? record.matchCandidates[0]?.canonicalProductId)
      .filter((value): value is string => Boolean(value)),
  );
  const removedOffers = Array.from(
    new Map(
      (previousList?.offers ?? [])
        .filter((offer) => !representedProductIds.has(offer.canonicalProductId))
        .map((offer) => [offer.canonicalProductId, offer]),
    ).values(),
  );
  const where = changeWhere(id, filter, relevant);
  const recordTotal = await prisma.importedRecord.count({ where });
  const total = filter === "removed" ? removedOffers.length : recordTotal;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, Number(query.pagina ?? 1)));
  const [rows, grouped, topIncreases, topReductions, packageChanges] = await Promise.all([
    prisma.importedRecord.findMany({ where, orderBy: changeOrder(query.ordine ?? "increase"), skip: (page - 1) * pageSize, take: pageSize, include: { canonicalProduct: { select: { id: true, name: true, consumptionUom: true } }, matchCandidates: { where: { recommended: true }, include: { canonicalProduct: { select: { id: true, name: true, consumptionUom: true } } }, take: 1 } } }),
    prisma.importedRecord.groupBy({ by: ["changeType"], where: { importJobId: id }, _count: true }),
    prisma.importedRecord.findMany({ where: { importJobId: id, changeType: "INCREASE" }, orderBy: { priceDeltaPercent: "desc" }, take: 3, include: { canonicalProduct: { select: { id: true, name: true } }, matchCandidates: { where: { recommended: true }, include: { canonicalProduct: { select: { id: true, name: true } } }, take: 1 } } }),
    prisma.importedRecord.findMany({ where: { importJobId: id, changeType: "DECREASE" }, orderBy: { priceDeltaPercent: "asc" }, take: 3, include: { canonicalProduct: { select: { id: true, name: true } }, matchCandidates: { where: { recommended: true }, include: { canonicalProduct: { select: { id: true, name: true } } }, take: 1 } } }),
    prisma.importedRecord.findMany({ where: { importJobId: id, changeType: "PACKAGE_CHANGE" }, orderBy: { priceDeltaPercent: "asc" }, take: 4, include: { canonicalProduct: { select: { id: true, name: true, consumptionUom: true } }, matchCandidates: { where: { recommended: true }, include: { canonicalProduct: { select: { id: true, name: true, consumptionUom: true } } }, take: 1 } } }),
  ]);
  const counts = Object.fromEntries(grouped.map((item) => [item.changeType ?? "NON_COMPARABLE", item._count])) as Record<string, number>;
  const count = (key: string) => counts[key] ?? 0;
  const allProductIds = [...new Set([...topIncreases, ...topReductions].map((record) => record.canonicalProductId ?? record.matchCandidates[0]?.canonicalProductId).filter((value): value is string => Boolean(value)))];
  const observed = allProductIds.length ? await prisma.purchaseOrderLine.groupBy({ by: ["canonicalProductId"], where: { canonicalProductId: { in: allProductIds }, purchaseOrder: { issuedAt: { gte: observationStart() } } }, _sum: { quantity: true } }) : [];
  const observedVolume = new Map(observed.map((item) => [item.canonicalProductId, Number(item._sum.quantity ?? 0)]));
  const impact = topIncreases.reduce((sum, record) => { const productId = record.canonicalProductId ?? record.matchCandidates[0]?.canonicalProductId; return sum + Math.max(0, Number(record.priceDeltaAmount ?? 0)) * (productId ? observedVolume.get(productId) ?? 0 : 0); }, 0);
  return <main>
    <PageHeader eyebrow="Intelligenza prezzi" title="Cosa è cambiato" description={`${job.sourceDocument.originalFilename} · confronto sul prezzo normalizzato, mai sul solo prezzo della confezione.`} />
    <ImportTabs jobId={job.id} active="changes" />
    <section className="price-intelligence-summary"><div><span>Aumenti</span><strong>{count("INCREASE")}</strong></div><div><span>Riduzioni</span><strong>{count("DECREASE")}</strong></div><div><span>Nuovi</span><strong>{count("NEW")}</strong></div><div><span>Rimossi</span><strong>{removedOffers.length}</strong></div><div><span>Confezioni cambiate</span><strong>{count("PACKAGE_CHANGE")}</strong></div><div><span>Non confrontabili</span><strong>{count("NON_COMPARABLE")}</strong></div></section>
    <section className="old-new-overview"><div><p className="eyebrow">Variazione osservata</p><h2>{impact > 0 ? formatMoney(impact) : "Nessun impatto quantificabile"}</h2><p>{impact > 0 ? "Calcolato sui volumi degli ultimi 12 mesi: non è una previsione annuale." : "Il valore viene calcolato solo quando esiste volume storico affidabile."}</p></div><div><strong>{count("INCREASE") + count("DECREASE")}</strong><span>variazioni confrontabili</span></div><div><strong>{count("PACKAGE_CHANGE")}</strong><span>cambi confezione da leggere sul normalizzato</span></div></section>
    {(topIncreases.length > 0 || topReductions.length > 0) && <div className="top-change-grid"><section><p className="eyebrow">Top aumenti</p>{topIncreases.map((record) => { const product = record.canonicalProduct ?? record.matchCandidates[0]?.canonicalProduct; return <Link href={`/imports/${id}/records/${record.id}`} key={record.id}><span>{product?.name ?? record.supplierSkuText ?? `Riga ${record.recordIndex}`}</span><strong>+{Number(record.priceDeltaPercent ?? 0).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%</strong></Link>; })}</section><section><p className="eyebrow">Top riduzioni</p>{topReductions.map((record) => { const product = record.canonicalProduct ?? record.matchCandidates[0]?.canonicalProduct; return <Link href={`/imports/${id}/records/${record.id}`} key={record.id}><span>{product?.name ?? record.supplierSkuText ?? `Riga ${record.recordIndex}`}</span><strong>{Number(record.priceDeltaPercent ?? 0).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%</strong></Link>; })}</section></div>}
    {packageChanges.length > 0 && <section className="packaging-change-section"><div className="section-heading"><div><p className="eyebrow">Confezioni cambiate</p><h2>Il prezzo confezione non racconta la variazione reale</h2></div></div><div>{packageChanges.map((record) => { const normalized = record.normalizedFields as NormalizedImport; const product = record.canonicalProduct ?? record.matchCandidates[0]?.canonicalProduct; const unit = consumptionUomLabel(normalized.consumptionUom ?? product?.consumptionUom); return <article key={record.id}><div><strong>{product?.name ?? String(normalized.description ?? "Prodotto")}</strong><span>Vecchio: {Number(record.previousPackageSize ?? 0).toLocaleString("it-IT")} unità · Nuovo: {Number(normalized.unitsPerPackage ?? 0).toLocaleString("it-IT")} unità</span></div><div><span>{record.previousNormalizedPrice == null ? "—" : formatMoney(Number(record.previousNormalizedPrice),4)} → {record.normalizedPriceValue == null ? "—" : formatMoney(Number(record.normalizedPriceValue),4)} / {unit}</span><strong>{Number(record.priceDeltaPercent ?? 0) > 0 ? "+" : ""}{Number(record.priceDeltaPercent ?? 0).toLocaleString("it-IT",{maximumFractionDigits:1})}%</strong></div><Link className="text-link" href={`/imports/${id}/records/${record.id}`}>Apri dettaglio</Link></article>; })}</div></section>}
    <div className="review-toolbar"><div><p className="eyebrow">Tutte le variazioni</p><h2>Analisi completa</h2><span>{total} risultati nel filtro</span></div><nav>{[["all","Tutte"],["increases","Aumenti"],["reductions","Riduzioni"],["new","Nuovi"],["removed","Rimossi"],["packaging","Confezioni"],["non-comparable","Non confrontabili"]].map(([value,label]) => <Link className={filter === value ? "active" : ""} href={`/imports/${id}/changes?tipo=${value}`} key={value}>{label}</Link>)}</nav></div>
    <form className="import-record-filters" aria-label="Filtra variazioni"><input type="hidden" name="tipo" value={filter} /><label className="check-filter"><input type="checkbox" name="rilevanti" value="1" defaultChecked={relevant} /> Solo variazioni rilevanti (&gt; 5%)</label><select name="ordine" defaultValue={query.ordine ?? "increase"} aria-label="Ordina variazioni"><option value="increase">Maggiore aumento %</option><option value="decrease">Maggiore riduzione %</option><option value="amount">Delta €</option><option value="product">Prodotto A–Z</option></select><button className="secondary-cta">Applica</button></form>
    {filter === "removed" ? removedOffers.length ? <DataTable label="Articoli rimossi dal nuovo listino"><thead><tr><th>Prodotto</th><th>Ultimo prezzo</th><th>Ultimo listino</th><th>Esito</th></tr></thead><tbody>{removedOffers.map((offer) => <tr key={offer.id}><td><strong>{offer.canonicalProduct.name}</strong><span className="cell-detail">Non presente nel documento corrente</span></td><td>{offer.normalizedUnitPrice == null ? "—" : `${formatMoney(Number(offer.normalizedUnitPrice), 4)} / ${consumptionUomLabel(offer.canonicalProduct.consumptionUom)}`}</td><td>{previousList?.name ?? "Versione precedente"}</td><td><span className="watch">Rimosso</span></td></tr>)}</tbody></DataTable> : <EmptyState title="Nessun articolo rimosso" description="Tutti gli articoli della versione precedente sono rappresentati nel nuovo documento." /> : rows.length ? <DataTable label="Variazioni del listino"><thead><tr><th>Prodotto</th><th>Precedente</th><th>Nuovo</th><th>Variazione</th><th>Migliore corrente</th><th>Posizione</th><th aria-label="Azione" /></tr></thead><tbody>{rows.map((record) => { const normalized = record.normalizedFields as NormalizedImport; const product = record.canonicalProduct ?? record.matchCandidates[0]?.canonicalProduct; const unit = consumptionUomLabel(normalized.consumptionUom ?? product?.consumptionUom); const next = Number(record.normalizedPriceValue); const best = Number(record.bestCurrentNormalizedPrice); return <tr key={record.id} className={Number(record.priceDeltaPercent ?? 0) >= 5 ? "review-row" : ""}><td><strong>{product?.name ?? String(normalized.description ?? "Nuovo prodotto")}</strong><span className="cell-detail">{changeLabels[record.changeType ?? "NON_COMPARABLE"] ?? "Da verificare"}</span></td><td>{record.previousNormalizedPrice == null ? "—" : `${formatMoney(Number(record.previousNormalizedPrice),4)} / ${unit}`}</td><td>{record.normalizedPriceValue == null ? <span className="watch">Non confrontabile</span> : `${formatMoney(next,4)} / ${unit}`}</td><td className={Number(record.priceDeltaPercent ?? 0) > 0 ? "risk" : ""}>{record.priceDeltaPercent == null ? "—" : `${Number(record.priceDeltaPercent) > 0 ? "+" : ""}${Number(record.priceDeltaPercent).toLocaleString("it-IT",{maximumFractionDigits:1})}%`}</td><td>{record.bestCurrentNormalizedPrice == null ? "—" : `${formatMoney(best,4)} / ${unit}`}</td><td>{Number.isFinite(next) && Number.isFinite(best) ? next <= best ? "Migliore disponibile" : `+${((next / best - 1) * 100).toLocaleString("it-IT",{maximumFractionDigits:1})}% vs migliore` : "Non calcolabile"}</td><td><Link className="text-link" href={`/imports/${id}/records/${record.id}`}>Apri dettaglio</Link></td></tr>; })}</tbody></DataTable> : <EmptyState title="Nessuna variazione in questo filtro" description="Rimuovi il filtro o scegli un’altra categoria di variazione." />}
    {pages > 1 && <nav className="pagination" aria-label="Pagine variazioni"><span>Pagina {page} di {pages}</span><div>{page > 1 && <Link className="secondary-cta compact" href={`/imports/${id}/changes?tipo=${filter}&ordine=${query.ordine ?? "increase"}&pagina=${page - 1}`}>Precedente</Link>}{page < pages && <Link className="secondary-cta compact" href={`/imports/${id}/changes?tipo=${filter}&ordine=${query.ordine ?? "increase"}&pagina=${page + 1}`}>Successiva</Link>}</div></nav>}
  </main>;
}
