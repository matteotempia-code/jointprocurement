import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable, Metric, PageHeader, StatusIndicator } from "@/components/ui";
import { Timeline } from "@/components/timeline";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/pricing";
import { policyExplanationLabel, statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";
import { answerClarification } from "@/app/buying-actions";

export default async function RequisitionDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; clarification?: string }> }) {
  const context = await requireRoles(["RSA_DIRECTOR", "AREA_MANAGER", "PROCUREMENT_MANAGER"]);
  const scope = await resolveScope(context.assignment);
  const request = await prisma.purchaseRequisition.findFirst({ where: { id: (await params).id, organizationId: context.organization.id, ...(context.roleCode !== "PROCUREMENT_MANAGER" ? { facilityId: { in: scope.facilityIds } } : {}) }, include: { facility: true, requester: true, lines: true, approvals: { include: { approver: true } }, purchaseOrders: { include: { supplier: true } } } });
  if (!request) notFound();
  const events = [
    { id: `${request.id}-created`, action: "REQUISITION_CREATED", createdAt: request.createdAt, actor: request.requester, metadata: null },
    ...(request.submittedAt ? [{ id: `${request.id}-submitted`, action: "REQUISITION_SUBMITTED", createdAt: request.submittedAt, actor: request.requester, metadata: { explanation: request.policyExplanation } }] : []),
    ...request.approvals.map((approval) => ({ id: approval.id, action: approval.status, createdAt: approval.decidedAt ?? approval.requestedAt, actor: approval.approver, metadata: null })),
    ...request.purchaseOrders.map((order) => ({ id: order.id, action: "PO_CREATED", createdAt: order.createdAt, actor: null, metadata: { poNumber: order.poNumber } })),
  ];
  const clarification = request.approvals.filter((approval) => approval.status === "CLARIFICATION_REQUESTED").at(-1);
  return <main className="phase2-page phase2-cockpit">
    {(await searchParams).created && <div className="success">Richiesta creata. La policy è stata applicata e il prossimo passaggio è già definito.</div>}
    <PageHeader eyebrow="Richiesta d’acquisto" title={request.requisitionNumber} description={`${request.facility.name} · ${request.requester.name}`} />
    <div className="detail-status"><StatusIndicator active={request.status === "APPROVED"} label={statusLabel(request.status)} /><span>Inviata {formatDate(request.submittedAt)}</span></div>
    <div className="metrics-grid four"><Metric label="Imponibile" value={formatMoney(Number(request.subtotal))} /><Metric label="IVA" value={formatMoney(Number(request.taxTotal))} /><Metric label="Totale" value={formatMoney(Number(request.total))} /><Metric label="Budget residuo" value={formatMoney(Number(request.budgetAfter))} /></div>
    <section className="policy-panel"><p className="eyebrow">Esito della policy</p><h2>{statusLabel(request.policyDecision)}</h2><p>{policyExplanationLabel(request.policyExplanation)}</p>{request.justification && <blockquote>{request.justification}</blockquote>}</section>
    {request.status === "CLARIFICATION_REQUESTED" && clarification && context.user.id === request.requesterId && <section className="clarification-panel"><div><p className="eyebrow">Chiarimento richiesto</p><h2>{clarification.decisionNote}</h2><p>Richiesto da {clarification.approver.name} il {formatDate(clarification.decidedAt)}. L’esito originario della policy resta invariato.</p></div><form action={answerClarification}><input type="hidden" name="requisitionId" value={request.id} /><label>Risposta<textarea name="answer" required minLength={3} /></label><label>Motivazione aggiornata<textarea name="justification" defaultValue={request.justification ?? ""} /></label>{request.lines.map((line) => <label key={line.id}>{line.descriptionSnapshot}<input type="number" min="0.0001" step="0.0001" name={`quantity-${line.id}`} defaultValue={Number(line.quantity)} /></label>)}<button className="primary-cta">Rispondi e reinvia</button></form></section>}
    <DataTable label="Prodotti richiesti"><thead><tr><th>Prodotto</th><th>Fornitore</th><th>Codice fornitore</th><th>Quantità</th><th>Prezzo unitario</th><th>Totale</th></tr></thead><tbody>{request.lines.map((line) => <tr key={line.id}><td><strong>{line.descriptionSnapshot}</strong></td><td>{line.supplierSnapshot}</td><td>{line.supplierSkuSnapshot}</td><td>{Number(line.quantity)}</td><td>{formatMoney(Number(line.unitPrice))}</td><td>{formatMoney(Number(line.lineTotal))}</td></tr>)}</tbody></DataTable>
    {request.purchaseOrders.length > 0 && <section className="linked-orders"><h2>Ordini al fornitore generati</h2>{request.purchaseOrders.map((order) => <Link key={order.id} href={`/orders/${order.id}`}><span>{order.poNumber}</span><strong>{order.supplier.name}</strong></Link>)}</section>}
    <details className="phase2-secondary-section"><summary>Cronologia e audit <span>{events.length}</span></summary><Timeline events={events} /></details>
  </main>;
}
