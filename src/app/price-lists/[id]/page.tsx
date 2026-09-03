import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable, EmptyRow, Num, PageHeader, Pagination, SearchField, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";
import { normalizeOfferPrice } from "@/lib/pricing/normalization";
import { confirmPriceListCondition } from "../actions";

const PAGE_SIZE = 25;

export default async function ListinoDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; pagina?: string }> }) {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const id = (await params).id;
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.pagina ?? "1", 10) || 1);
  const offerWhere = { priceListId: id, ...(query.q ? { OR: [{ canonicalProduct: { name: { contains: query.q, mode: "insensitive" as const } } }, { supplierSku: { contains: query.q, mode: "insensitive" as const } }] } : {}) };
  const [list, total, offers] = await Promise.all([
    prisma.priceList.findUnique({ where: { id }, include: { supplier: true, sourceDocument: { include: { uploadedBy: true } }, publishedBy: true, previousVersion: true, importJob: true, commercialConditions: { orderBy: { confidence: "desc" } } } }),
    prisma.supplierOffer.count({ where: offerWhere }),
    prisma.supplierOffer.findMany({ where: offerWhere, include: { canonicalProduct: true }, orderBy: { canonicalProduct: { name: "asc" } }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  if (!list) notFound();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <main className="phase2-page phase2-price-list-detail">
    <PageHeader eyebrow={list.supplier.name} title={list.name} description={`${formatDate(list.validFrom)} – ${formatDate(list.validUntil)} · versione ${list.version}`} action={<div className="cta-row"><Link className="secondary-cta" href="/imports/new">Importa nuova versione</Link>{list.importJob && <Link className="primary-cta" href={`/imports/${list.importJob.id}/changes`}>Analizza variazioni</Link>}</div>} />
    <section className="phase2-summary-strip"><div><span>Stato</span><StatusIndicator active={list.active} label={list.active ? "Attivo" : "Versione storica"} /></div><div><span>Articoli</span><strong><Num value={total} /></strong></div><div><span>Versione</span><strong>v{list.version}</strong></div><div><span>Precedente</span><strong>{list.previousVersion ? <Link href={`/price-lists/${list.previousVersion.id}`}>v{list.previousVersion.version}</Link> : "Prima versione"}</strong></div></section>
    {list.sourceDocument && <details className="phase2-secondary-section"><summary>Provenienza verificabile · {list.sourceDocument.originalFilename}</summary><div className="price-list-provenance"><p>Caricato da {list.sourceDocument.uploadedBy.name} il {formatDate(list.sourceDocument.uploadedAt)} · pubblicato da {list.publishedBy?.name ?? "—"} il {formatDate(list.publishedAt)}.</p><div className="cta-row"><Link className="secondary-cta" href={`/imports/documents/${list.sourceDocument.id}`}>Apri originale</Link>{list.importJob && <Link className="secondary-cta" href={`/imports/${list.importJob.id}`}>Apri revisione</Link>}</div></div></details>}
    {list.commercialConditions.length > 0 && <section className="phase2-queue"><div className="section-heading"><div><h2>Condizioni della versione</h2><p>Prevalgono sui default fornitore solo dopo conferma umana.</p></div><span>{list.commercialConditions.filter((item) => item.humanConfirmationState === "CONFIRMED").length} confermate</span></div><DataTable label="Condizioni commerciali della versione"><thead><tr><th>Condizione</th><th>Valore</th><th>Evidenza sorgente</th><th>Affidabilità</th><th>Stato</th></tr></thead><tbody>{list.commercialConditions.map((condition) => <tr key={condition.id}><td>{condition.conditionType}</td><td>{condition.numericValue != null ? `${Number(condition.numericValue).toLocaleString("it-IT")} ${condition.currency ?? ""}` : condition.textValue ?? "n.d."}</td><td>{condition.sourceEvidence}</td><td>{Math.round(Number(condition.confidence) * 100)}%</td><td>{condition.humanConfirmationState === "CONFIRMED" ? "Confermata" : <form action={confirmPriceListCondition}><input type="hidden" name="conditionId" value={condition.id} /><button className="secondary-cta compact">Conferma</button></form>}</td></tr>)}</tbody></DataTable></section>}
    <section className="phase2-queue"><div className="section-heading"><div><h2>Articoli del listino</h2><p>Prezzo normalizzato dominante e finestra controllata.</p></div><span>{offers.length} mostrati su {total}</span></div><form className="phase2-control-bar"><SearchField defaultValue={query.q} placeholder="Prodotto o codice fornitore" /><button className="secondary-cta">Cerca</button></form>
      <DataTable label="Articoli del listino"><thead><tr><th>Prodotto</th><th>Codice fornitore</th><th>Confezione</th><th className="num-cell">Prezzo confezione</th><th className="num-cell">Prezzo normalizzato</th><th>Posizione</th></tr></thead><tbody>{offers.length ? offers.map((offer) => { const normalized = normalizeOfferPrice(offer.canonicalProduct, offer); return <tr key={offer.id}><td><Link className="table-link" href={`/products/${offer.canonicalProductId}`}>{offer.canonicalProduct.name}</Link></td><td className="mono">{offer.supplierSku ?? "—"}</td><td>{offer.canonicalProduct.packageDescription}</td><td className="num-cell"><Num value={Number(offer.unitPrice)} kind="currency" /></td><td className="num-cell"><strong>{normalized.normalizedLabel}</strong></td><td><StatusIndicator active={offer.preferred} label={offer.preferred ? "Convenzionato" : "Listino"} /></td></tr>; }) : <EmptyRow colSpan={6}>Nessun articolo nel filtro.</EmptyRow>}</tbody></DataTable>
      <Pagination page={Math.min(page, pages)} pages={pages} pathname={`/price-lists/${id}`} params={{ q: query.q }} />
    </section>
  </main>;
}
