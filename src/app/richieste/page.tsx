import Link from "next/link";
import { createOutOfCatalogRequest } from "@/app/buying-actions";
import { PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/pricing";
import { policyExplanationLabel, statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

export default async function Richieste() {
  const context = await requireRoles(["RSA_DIRECTOR"]);
  const scope = await resolveScope(context.assignment);
  const [requests, exceptions, categories] = await Promise.all([
    prisma.purchaseRequisition.findMany({ where: { facilityId: scope.id }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.outOfCatalogRequest.findMany({ where: { facilityId: scope.id }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <main><PageHeader eyebrow="Acquisti" title="Richieste d’acquisto" description="Segui ogni richiesta dal bisogno iniziale fino alla conversione in ordine." />
    <div className="segmented"><a href="#catalogo">Da catalogo <b>{requests.length}</b></a><a href="#fuori-catalogo">Fuori catalogo <b>{exceptions.length}</b></a></div>
    <section id="catalogo" className="workspace-section"><h2>Richieste recenti</h2><div className="table-wrap"><table><thead><tr><th>Richiesta</th><th>Data</th><th>Stato</th><th>Esito policy</th><th>Totale</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td><Link className="table-link" href={`/requisitions/${request.id}`}>{request.requisitionNumber}</Link></td><td>{formatDate(request.createdAt)}</td><td><StatusIndicator active={request.status === "APPROVED"} label={statusLabel(request.status)} /></td><td>{policyExplanationLabel(request.policyExplanation)}</td><td>{formatMoney(Number(request.total))}</td></tr>)}</tbody></table></div></section>
    <section id="fuori-catalogo" className="workspace-section split-panel"><div><p className="eyebrow">Eccezione governata</p><h2>Non trovi il prodotto?</h2><p>Descrivi il bisogno: Procurement potrà valutare alternativa, fornitore e inserimento a catalogo.</p><form action={createOutOfCatalogRequest} className="stack-form"><label>Descrizione del bisogno<textarea name="description" required minLength={8} /></label><div><label>Categoria<select name="categoryId"><option value="">Da classificare</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Quantità<input type="number" name="quantity" min="1" defaultValue="1" /></label></div><div><label>Importo stimato<input name="estimatedAmount" type="number" min="0" step="0.01" /></label><label>Fornitore suggerito<input name="supplier" /></label></div><label>Motivazione<textarea name="justification" required minLength={8} /></label><button className="primary-cta">Invia a Procurement</button></form></div><div className="exception-list"><h3>Richieste aperte</h3>{exceptions.map((request) => <article key={request.id}><strong>{request.requestNumber}</strong><span>{request.needDescription}</span><small>{statusLabel(request.status)} · {formatDate(request.createdAt)}</small></article>)}</div></section>
  </main>;
}
