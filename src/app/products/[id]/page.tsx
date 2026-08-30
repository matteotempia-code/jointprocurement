import Link from "next/link";
import { notFound } from "next/navigation";
import { addToCart, toggleFavorite } from "@/app/buying-actions";
import { ProductImage } from "@/components/product-image";
import { ProductActionsMenu } from "@/components/product-actions-menu";
import { DataTable, Metric, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareOffers, formatDate, formatMoney, getPreferredOffer } from "@/lib/pricing";
import { formatCurrency, normalizeOfferPrice } from "@/lib/pricing/normalization";
import { presentTechnicalAttributes } from "@/lib/presentation/technical-attributes";
import { statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

export default async function Product360({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["RSA_DIRECTOR", "AREA_MANAGER", "PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const scope = await resolveScope(context.assignment);
  const product = await prisma.canonicalProduct.findUnique({ where: { id: (await params).id }, include: { category: true, offers: { where: { active: true }, include: { supplier: true, priceList: true, sourceDocument: true, importedRecord: { select: { importJobId: true, sourceLocator: true } }, priceHistory: { orderBy: { effectiveAt: "asc" } } } } } });
  if (!product) notFound();
  const preferred = getPreferredOffer(product.offers);
  const comparison = compareOffers(product.offers);
  const selectedOffer = preferred ?? comparison.lowest ?? product.offers[0];
  const [usage, alternatives, favorite, lists] = await Promise.all([
    prisma.purchaseOrderLine.findMany({ where: { canonicalProductId: product.id, purchaseOrder: { facilityId: { in: scope.facilityIds } } }, include: { purchaseOrder: { include: { facility: true } } } }),
    prisma.canonicalProduct.findMany({ where: { subcategory: product.subcategory, id: { not: product.id }, active: true }, take: 4, include: { category: true, offers: { where: { active: true }, include: { supplier: true }, orderBy: { preferred: "desc" } } } }),
    context.roleCode === "RSA_DIRECTOR" ? prisma.favorite.findFirst({ where: { userId: context.user.id, facilityId: scope.id, canonicalProductId: product.id } }) : null,
    context.roleCode === "RSA_DIRECTOR" ? prisma.shoppingList.findMany({ where: { userId: context.user.id, facilityId: scope.id }, orderBy: { updatedAt: "desc" } }) : [],
  ]);
  const preferredPrice = selectedOffer ? normalizeOfferPrice(product, selectedOffer) : null;
  const bestPrice = comparison.lowest ? normalizeOfferPrice(product, comparison.lowest) : null;
  const attributes = presentTechnicalAttributes(product.category.code, product.technicalAttributes);
  const quantity = usage.reduce((sum, line) => sum + Number(line.quantity), 0);
  const spend = usage.reduce((sum, line) => sum + Number(line.lineTotal), 0);
  const last = [...usage].sort((a, b) => b.purchaseOrder.issuedAt.getTime() - a.purchaseOrder.issuedAt.getTime())[0];
  const history = selectedOffer?.priceHistory ?? [];
  const historyValues = history.map((point) => Number(point.normalizedPrice));
  const min = historyValues.length ? Math.min(...historyValues) : 0;
  const max = historyValues.length ? Math.max(...historyValues) : 0;
  return <main>
    <PageHeader eyebrow="Prodotto 360" title={product.name} description={product.shortDescription ?? "Informazioni tecniche, condizioni commerciali e utilizzo osservato."} />
    <section className="product-hero refined">
      <ProductImage name={product.name} categoryCode={product.category.code} className="product-packshot-large" />
      <div className="hero-copy"><span>{product.category.name} · {product.subcategory}</span><h2>{product.brand} <small>di {product.manufacturer}</small></h2><p>{product.longDescription}</p><dl><div><dt>Codice produttore</dt><dd>{product.manufacturerSku}</dd></div><div><dt>EAN / GTIN</dt><dd>{product.ean}</dd></div><div><dt>Unità d’acquisto</dt><dd>{product.purchaseUom}</dd></div><div><dt>Contenuto</dt><dd>{product.packageDescription}</dd></div></dl></div>
      <aside className="buy-box"><p className="eyebrow">{preferred ? "Offerta convenzionata" : "Migliore offerta disponibile"}</p><h3>{selectedOffer?.supplier.name ?? "Non disponibile"}</h3><strong>{preferredPrice ? formatMoney(preferredPrice.purchasePrice) : "—"}</strong><span>per {preferredPrice?.purchaseLabel}</span><small>{preferredPrice?.contentLabel}</small><b>{preferredPrice?.normalizedPrice != null ? `${formatCurrency(preferredPrice.normalizedPrice, 4)} / ${preferredPrice.consumptionLabel}` : preferredPrice?.normalizedLabel}</b><small>Consegna stimata: {selectedOffer?.leadTimeDays ?? "—"} giorni</small>
        {context.roleCode === "RSA_DIRECTOR" && selectedOffer && <div className="buy-actions">
          <form action={addToCart}><input type="hidden" name="offerId" value={selectedOffer.id} /><label>Quantità<input name="quantity" type="number" min={Number(selectedOffer.moq)} defaultValue={Number(selectedOffer.moq)} /></label><button className="primary-cta">Aggiungi al carrello</button></form>
          <div className="buy-secondary-actions"><form action={toggleFavorite}><input type="hidden" name="productId" value={product.id} /><button className="secondary-cta">{favorite ? "Salvato nei preferiti" : "Salva nei preferiti"}</button></form><ProductActionsMenu productId={product.id} productName={product.name} lists={lists} detailHref={`/products/${product.id}`} compareHref={`/compare-products?ids=${[product.id, ...alternatives.slice(0, 2).map((item) => item.id)].join(",")}`} /></div>
        </div>}
      </aside>
    </section>
    <section className="commercial-summary"><div><span>Disponibilità</span><strong>{statusLabel(selectedOffer?.availabilityStatus ?? "UNAVAILABLE")}</strong><small>Consegna in {selectedOffer?.leadTimeDays ?? "—"} giorni</small></div><div><span>Migliore disponibile</span><strong>{bestPrice?.normalizedPrice != null ? formatCurrency(bestPrice.normalizedPrice, 4) : "—"}</strong><small>{comparison.lowest?.supplier.name}</small></div><div><span>{preferred ? "Posizione convenzionato" : "Stato offerta"}</span><strong>{preferred ? comparison.preferredDelta === 0 ? "Miglior prezzo" : `+${comparison.preferredDelta.toFixed(1)}%` : "Non convenzionata"}</strong><small>{preferred ? comparison.preferredDelta === 0 ? "Nessun differenziale" : "Da valutare" : "Verificare la policy prima dell’acquisto"}</small></div></section>
    <details id="specifiche" className="disclosure-section"><summary><span>Specifiche tecniche</span><small>{attributes.length} caratteristiche</small></summary><div className="spec-grid">{attributes.map((attribute) => <div key={attribute.key}><span>{attribute.label}</span><strong>{attribute.value}</strong></div>)}</div></details>
    <details id="offerte" className="disclosure-section" open><summary><span>Offerte fornitori</span><small>{comparison.sorted.length} offerte · spread {comparison.spread.toFixed(1)}%</small></summary><DataTable label="Offerte fornitori"><thead><tr><th>Fornitore</th><th>Prezzo</th><th>Prezzo normalizzato</th><th>Consegna</th><th>Posizione</th><th>Fonte</th></tr></thead><tbody>{comparison.sorted.map((offer, index) => { const price = normalizeOfferPrice(product, offer); return <tr className={index === 0 ? "best-offer-row" : ""} key={offer.id}><td>{offer.supplier.name}{offer.preferred && <span className="cell-detail">Convenzionato</span>}</td><td>{formatMoney(Number(offer.unitPrice))}</td><td>{price.normalizedPrice != null ? `${formatCurrency(price.normalizedPrice, 4)} / ${price.consumptionLabel}` : "Non confrontabile"}</td><td>{offer.leadTimeDays} giorni</td><td>{index === 0 ? "Migliore" : `+${((Number(offer.normalizedUnitPrice) / Number(comparison.lowest?.normalizedUnitPrice) - 1) * 100).toFixed(1)}%`}</td><td>{offer.sourceDocument && offer.importedRecord ? ["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"].includes(context.roleCode) ? <Link className="text-link" href={`/imports/${offer.importedRecord.importJobId}`}>{offer.sourceDocument.originalFilename}</Link> : <span className="muted">{offer.sourceDocument.originalFilename}</span> : <span className="muted">Listino demo</span>}</td></tr>; })}</tbody></DataTable></details>
    <details id="storico" className="disclosure-section"><summary><span>{history.length >= 12 ? "Andamento del prezzo negli ultimi 12 mesi" : "Ultime variazioni di prezzo"}</span><small>{history.length ? `Min ${formatCurrency(min, 4)} · Max ${formatCurrency(max, 4)}` : "Nessuno storico disponibile"}</small></summary>{history.length > 1 && <><svg className="line-chart" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-label="Andamento mensile del prezzo"><polyline points={historyValues.map((value, index) => `${index / Math.max(1, historyValues.length - 1) * 1000},${190 - (value - min) / Math.max(.0001, max - min) * 150}`).join(" ")} />{historyValues.map((value, index) => <circle key={index} cx={index / Math.max(1, historyValues.length - 1) * 1000} cy={190 - (value - min) / Math.max(.0001, max - min) * 150} r="5" />)}</svg><div className="chart-labels">{history.map((point) => <span key={point.id}>{new Intl.DateTimeFormat("it-IT", { month: "short" }).format(point.effectiveAt)}</span>)}</div></>}</details>
    <details id="utilizzo" className="disclosure-section"><summary><span>Utilizzo nel perimetro</span><small>{quantity} unità osservate</small></summary><div className="metrics-grid four"><Metric label="Quantità acquistata" value={quantity} /><Metric label="Spesa da inizio anno" value={formatMoney(spend)} /><Metric label="Ultimo acquisto" value={last ? formatDate(last.purchaseOrder.issuedAt) : "Nessuno"} /><Metric label="Strutture acquirenti" value={new Set(usage.map((line) => line.purchaseOrder.facilityId)).size} /></div></details>
    <details id="documenti" className="disclosure-section"><summary><span>Documenti verificabili</span><small>Schede e certificazioni</small></summary><div className="document-list">{[["Scheda tecnica", product.datasheetPath], ["Scheda di sicurezza", product.safetySheetPath], ["Certificazione", product.certificationPath], ["Dichiarazione di conformità", product.declarationPath]].filter(([, path]) => path).map(([label, path]) => <Link href={path!} key={label}><strong>{label}</strong><span>Apri PDF demo</span></Link>)}</div></details>
    <details id="alternative" className="disclosure-section"><summary><span>Alternative commerciali</span><small>{alternatives.length} prodotti da valutare</small></summary><div className="disclosure-actions"><Link className="secondary-cta" href={`/compare-products?ids=${[product.id, ...alternatives.slice(0, 2).map((item) => item.id)].join(",")}`}>Confronta prodotti</Link></div><div className="alternative-grid">{alternatives.map((alternative, index) => { const offer = getPreferredOffer(alternative.offers) ?? alternative.offers[0]; const price = offer ? normalizeOfferPrice(alternative, offer) : null; return <Link href={`/products/${alternative.id}`} key={alternative.id}><ProductImage name={alternative.name} categoryCode={alternative.category.code} /><b>{index % 3 === 0 ? "Variante" : index % 3 === 1 ? "Alternativa commerciale" : "Alternativa funzionale da verificare"}</b><strong>{alternative.name}</strong><span>{offer?.supplier.name} · {price?.normalizedLabel}</span><small>{statusLabel(offer?.availabilityStatus ?? "UNAVAILABLE")}</small></Link>; })}</div></details>
  </main>;
}
