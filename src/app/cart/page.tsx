import { EmptyState, Metric, PageHeader } from "@/components/ui";
import { removeCartLine, submitRequisition, updateCartLine } from "@/app/buying-actions";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/pricing";
import { normalizeOfferPrice } from "@/lib/pricing/normalization";
import { getFacilityBudget } from "@/lib/procurement/budget";
import { resolveScope } from "@/lib/scope";

export default async function CartPage() {
  const context = await requireRoles(["RSA_DIRECTOR"]);
  const scope = await resolveScope(context.assignment);
  const [cart, budget] = await Promise.all([
    prisma.cart.findUnique({ where: { userId_facilityId: { userId: context.user.id, facilityId: scope.id } }, include: { lines: { include: { canonicalProduct: true, supplierOffer: { include: { supplier: true } } } } } }),
    getFacilityBudget(scope.id),
  ]);
  if (!cart?.lines.length) return <main><PageHeader eyebrow="Acquisto" title="Carrello" description="Le tue selezioni dal catalogo governato." /><EmptyState title="Il carrello è vuoto" description="Aggiungi un prodotto dal catalogo per preparare una richiesta d’acquisto." /></main>;
  const subtotal = cart.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.supplierOffer.unitPrice), 0);
  const iva = cart.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.supplierOffer.unitPrice) * Number(line.supplierOffer.taxRate) / 100, 0);
  const total = subtotal + iva;
  const groups = Object.groupBy(cart.lines, (line) => line.supplierOffer.supplier.name);
  const autoApproved = total <= Number(context.assignment.approvalLimit) && total <= budget.available;
  return <main><PageHeader eyebrow="Acquisto" title="Carrello" description={`${cart.lines.length} righe · ${Object.keys(groups).length} fornitori`} /><div className="cart-layout"><div>{Object.entries(groups).map(([supplier, lines]) => <section className="supplier-group" key={supplier}><h2>{supplier}</h2>{lines!.map((line) => { const normalized = normalizeOfferPrice(line.canonicalProduct, line.supplierOffer); return <article className="cart-line" key={line.id}><div><strong>{line.canonicalProduct.name}</strong><span>{line.canonicalProduct.packageDescription} · {formatMoney(Number(line.supplierOffer.unitPrice))} / confezione</span><small>{normalized.normalizedLabel}</small></div><form action={updateCartLine}><input type="hidden" name="lineId" value={line.id} /><input aria-label={`Quantità ${line.canonicalProduct.name}`} name="quantity" type="number" min="1" defaultValue={Number(line.quantity)} /><button>Aggiorna</button></form><strong>{formatMoney(Number(line.quantity) * Number(line.supplierOffer.unitPrice))}</strong><form action={removeCartLine}><input type="hidden" name="lineId" value={line.id} /><button className="remove">Rimuovi</button></form></article>; })}</section>)}</div><aside className="checkout"><h2>Riepilogo richiesta</h2><dl><div><dt>Imponibile</dt><dd>{formatMoney(subtotal)}</dd></div><div><dt>IVA</dt><dd>{formatMoney(iva)}</dd></div><div className="total"><dt>Totale</dt><dd>{formatMoney(total)}</dd></div></dl><h3>Impatto sul budget</h3><div className="metrics-stack"><Metric label="Budget prima" value={formatMoney(budget.available)} /><Metric label="Questa richiesta" value={formatMoney(total)} /><Metric label="Budget residuo" value={formatMoney(budget.available - total)} /></div>{total > budget.available && <p className="warning">La richiesta supera il budget disponibile: la motivazione è obbligatoria.</p>}<div className="policy-preview"><strong>{autoApproved ? "Approvazione automatica" : "Richiede approvazione"}</strong><p>{autoApproved ? "Rientra nella tua autonomia di spesa e nel budget disponibile." : total > budget.available ? "Eccezione di budget: verrà instradata al responsabile previsto dalla policy." : "L’importo supera il tuo limite autonomo e richiede l’Area Manager."}</p></div><form action={submitRequisition} className="submit-form"><label>Motivazione<textarea name="justification" placeholder="Obbligatoria per eccezioni di budget" /></label><label>Consegna richiesta entro<input name="requiredByDate" type="date" /></label><button className="primary-cta">Invia richiesta d’acquisto</button></form></aside></div></main>;
}
