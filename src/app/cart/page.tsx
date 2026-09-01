import Link from "next/link";
import { removeCartLine, saveCartAsList, submitRequisition, toggleFavorite, updateCartLine } from "@/app/buying-actions";
import { ProductImage } from "@/components/product-image";
import { EmptyState, Metric, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/pricing";
import { normalizeOfferPrice } from "@/lib/pricing/normalization";
import { getFacilityBudget } from "@/lib/procurement/budget";
import { resolveScope } from "@/lib/scope";
import { evaluateCommercialConditions } from "@/lib/procurement/commercial-conditions";

export default async function CartPage() {
  const context = await requireRoles(["RSA_DIRECTOR"]);
  const scope = await resolveScope(context.assignment);
  const [cart, budget, favorites] = await Promise.all([
    prisma.cart.findUnique({ where: { userId_facilityId: { userId: context.user.id, facilityId: scope.id } }, include: { lines: { include: { canonicalProduct: { include: { category: true } }, supplierOffer: { include: { supplier: true } } } } } }),
    getFacilityBudget(scope.id),
    prisma.favorite.findMany({ where: { userId: context.user.id, facilityId: scope.id }, select: { canonicalProductId: true } }),
  ]);
  if (!cart?.lines.length) return <main><PageHeader eyebrow="Acquisto guidato" title="Carrello" description="Qui troverai i prodotti prima di inviare la richiesta." /><EmptyState title="Il carrello è vuoto" description="Cerca nel catalogo, usa un preferito oppure aggiungi una lista ricorrente." action={<Link className="primary-cta" href="/catalog">Vai al catalogo</Link>} /></main>;
  const favoriteIds = new Set(favorites.map(({ canonicalProductId }) => canonicalProductId));
  const subtotal = cart.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.supplierOffer.unitPrice), 0);
  const iva = cart.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.supplierOffer.unitPrice) * Number(line.supplierOffer.taxRate) / 100, 0);
  const total = subtotal + iva;
  const groups = Object.groupBy(cart.lines, (line) => line.supplierOffer.supplierId);
  const commercialGroups = Object.entries(groups).map(([supplierId, lines]) => { const supplier=lines![0].supplierOffer.supplier; const groupSubtotal=lines!.reduce((sum,line)=>sum+Number(line.quantity)*Number(line.supplierOffer.unitPrice),0); return {supplierId,supplier,lines:lines!,commercial:evaluateCommercialConditions(groupSubtotal,supplier)}; });
  const autoApproved = total <= Number(context.assignment.approvalLimit) && total <= budget.available;
  return <main>
    <PageHeader eyebrow="Acquisto guidato" title="Carrello" description={`${cart.lines.length} articoli · ${commercialGroups.length} fornitori`} />
    <div className="cart-tools"><div><strong>Vuoi riutilizzare questo acquisto?</strong><span>Salva prodotti e quantità come lista ricorrente.</span></div><form action={saveCartAsList}><label className="sr-only" htmlFor="cart-list-name">Nome lista</label><input id="cart-list-name" required minLength={3} name="name" placeholder="Nome della nuova lista" /><button className="secondary-cta">Salva carrello come lista</button></form></div>
    <div className="cart-layout"><div>{commercialGroups.map(({supplierId,supplier,lines,commercial}) => <section className="supplier-group" key={supplierId}><header><h2>{supplier.name}</h2><p>{lines.length} articoli · totale {formatMoney(commercial.subtotal)} · minimo {commercial.minimum ? formatMoney(commercial.minimum) : "non previsto"} · franco porto {commercial.freeShipping ? formatMoney(commercial.freeShipping) : "non previsto"}</p>{commercial.minimumGap > 0 && <strong className="warning">Mancano {formatMoney(commercial.minimumGap)} al minimo ordine</strong>}{commercial.freeShippingGap > 0 && <small>Mancano {formatMoney(commercial.freeShippingGap)} al franco porto · costo previsto {formatMoney(commercial.shippingFee + commercial.surcharge)}</small>}</header>{lines.map((line) => {
      const normalized = normalizeOfferPrice(line.canonicalProduct, line.supplierOffer);
      return <article className="cart-line enriched" key={line.id}><ProductImage name={line.canonicalProduct.name} categoryCode={line.canonicalProduct.category.code} /><div><strong>{line.canonicalProduct.name}</strong><span>{line.canonicalProduct.packageDescription} · {formatMoney(Number(line.supplierOffer.unitPrice))} / confezione</span><small>{normalized.normalizedLabel}</small></div><form action={updateCartLine}><input type="hidden" name="lineId" value={line.id} /><label className="sr-only">Quantità di {line.canonicalProduct.name}</label><input aria-label={`Quantità di ${line.canonicalProduct.name}`} name="quantity" type="number" min="1" defaultValue={Number(line.quantity)} /><button>Aggiorna</button></form><strong>{formatMoney(Number(line.quantity) * Number(line.supplierOffer.unitPrice))}</strong><div className="cart-line-actions"><form action={toggleFavorite}><input type="hidden" name="productId" value={line.canonicalProductId} /><button className="text-button">{favoriteIds.has(line.canonicalProductId) ? "Nei preferiti" : "Aggiungi ai preferiti"}</button></form><form action={removeCartLine}><input type="hidden" name="lineId" value={line.id} /><button className="text-button">Rimuovi</button></form></div></article>;
    })}</section>)}</div>
      <aside className="checkout"><h2>Riepilogo richiesta</h2><dl><div><dt>Imponibile</dt><dd>{formatMoney(subtotal)}</dd></div><div><dt>IVA</dt><dd>{formatMoney(iva)}</dd></div><div className="total"><dt>Totale</dt><dd>{formatMoney(total)}</dd></div></dl><h3>Impatto sul budget</h3><div className="metrics-stack"><Metric label="Budget prima" value={formatMoney(budget.available)} /><Metric label="Questa richiesta" value={formatMoney(total)} /><Metric label="Budget residuo" value={formatMoney(budget.available - total)} /></div>{total > budget.available && <p className="warning">La richiesta supera il budget disponibile: aggiungi una motivazione.</p>}<div className="policy-preview"><strong>{autoApproved ? "Approvazione automatica prevista" : "Sarà necessaria un’approvazione"}</strong><p>{autoApproved ? "L’acquisto rientra nella tua autonomia di spesa e nel budget disponibile." : total > budget.available ? "È presente un’eccezione di budget: la richiesta sarà inviata al responsabile previsto." : "L’importo supera la tua autonomia di spesa: la richiesta sarà inviata all’Area Manager."}</p></div><form id="checkout-submit" action={submitRequisition} className="submit-form"><label>Motivazione<textarea name="justification" placeholder="Spiega brevemente il bisogno, soprattutto in caso di eccezione" /></label><label>Consegna richiesta entro<input name="requiredByDate" type="date" /></label><button className="primary-cta">Invia richiesta d’acquisto</button></form></aside>
    </div>
    <div className="mobile-cart-action"><div><span>Totale</span><strong>{formatMoney(total)}</strong><small>{autoApproved ? "Approvazione automatica" : "Richiederà approvazione"}</small></div><button form="checkout-submit" className="primary-cta">Continua</button></div>
  </main>;
}
