import { notFound } from "next/navigation";
import { decideApproval } from "@/app/buying-actions";
import { DataTable, EmptyRow, PageHeader, PriceBlock, StatusChip, StickyActionBar } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/pricing";
import { statusLabel } from "@/lib/presentation/status";
import { approvalSla } from "@/lib/procurement/approval-sla";
import { getSupplierMetrics } from "@/lib/procurement/metrics";

export default async function ApprovalCockpit({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["AREA_MANAGER", "PROCUREMENT_MANAGER"]);
  const approval = await prisma.approvalRequest.findFirst({ where: { id: (await params).id, approverUserId: context.user.id }, include: { requisition: { include: { facility: { include: { area: true } }, requester: true, costCenter: true, lines: { include: { canonicalProduct: true, supplierOffer: { include: { supplier: true } } }, take: 8 }, approvals: { include: { approver: true }, orderBy: { requestedAt: "desc" } } } } } });
  if (!approval) notFound();
  const request = approval.requisition;
  const supplierIds = [...new Set(request.lines.map((line) => line.supplierOffer.supplierId))];
  const [budgets, orders, supplierContexts] = await Promise.all([
    prisma.budget.findMany({ where: { facilityId: request.facilityId, status: "ACTIVE" } }),
    prisma.purchaseOrder.findMany({ where: { facilityId: request.facilityId, status: { not: "CANCELLED" } }, select: { total: true } }),
    Promise.all(supplierIds.map(async (supplierId) => ({ supplierId, metrics: await getSupplierMetrics(supplierId) }))),
  ]);
  const approvedBudget = budgets.reduce((sum, item) => sum + Number(item.approvedAmount), 0);
  const spent = budgets.reduce((sum, item) => sum + Number(item.actualAmount), 0);
  const committed = orders.reduce((sum, item) => sum + Number(item.total), 0);
  const available = approvedBudget - spent - committed;
  const after = available - Number(request.total);
  const utilization = approvedBudget ? (spent + committed + Number(request.total)) / approvedBudget * 100 : 0;
  const sla = approvalSla(approval.requestedAt);
  const nonPreferred = request.lines.filter((line) => !line.supplierOffer.preferred).length;
  const signals = [after < 0 ? "Il budget disponibile diventerebbe negativo." : null, nonPreferred ? `${nonPreferred} righe non convenzionate richiedono verifica.` : null].filter(Boolean);
  return <main className="phase1-page phase1-cockpit">
    <PageHeader eyebrow="Cockpit di approvazione" title={request.requisitionNumber} description={`${request.facility.name} · richiesta da ${request.requester.name}`} />
    <div className="phase1-cockpit-metrics"><div><span>Importo</span><strong>{formatMoney(Number(request.total))}</strong></div><div className={`sla-${sla.state}`}><span>Attesa</span><strong>{sla.ageDays} gg</strong><small>{sla.label} · target {sla.targetDays}</small></div><div><span>Data richiesta</span><strong>{formatDate(approval.requestedAt)}</strong></div><div><span>Fornitori</span><strong>{supplierIds.length}</strong><small>{nonPreferred ? `${nonPreferred} non convenzionati` : "Tutti convenzionati"}</small></div></div>
    <section className={signals.length ? "phase1-decision-reason is-warning" : "phase1-decision-reason is-ok"}><div><span>Perché richiede una decisione</span><h2>{approval.reason}</h2><p>{request.policyExplanation}</p></div><StatusChip variant={signals.length ? "warn" : "ok"}>{signals.length ? `${signals.length} verifiche` : "Coerente"}</StatusChip></section>
    <div className="phase1-reliability-strip"><div><span>Richiedente e perimetro</span><strong>{request.requester.name}</strong><small>{request.facility.name} · {request.costCenter.name}</small></div>{supplierContexts.map(({ supplierId, metrics }) => { const supplier = request.lines.find((line) => line.supplierOffer.supplierId === supplierId)!.supplierOffer.supplier; return <div key={supplierId}><span>Affidabilità fornitore</span><strong>{supplier.name}</strong><small>{metrics.delivered >= 5 ? `${metrics.onTimeRate.toFixed(1)}% puntuali · ${metrics.completeRate.toFixed(1)}% complete` : `Dati insufficienti · ${metrics.delivered} consegne`} · {metrics.issues} problemi</small></div>; })}</div>
    <div className="phase1-decision-grid"><section><div className="section-heading"><div><h2>Cosa si sta acquistando</h2><p>{request.lines.length} righe · consegna richiesta {formatDate(request.requiredByDate)}</p></div></div><DataTable label="Righe richiesta"><thead><tr><th>Prodotto</th><th>Prezzo normalizzato</th><th>Qtà</th><th>Totale</th></tr></thead><tbody>{request.lines.length ? request.lines.map((line) => <tr key={line.id}><td><strong>{line.descriptionSnapshot}</strong><span className="cell-detail">{line.supplierSnapshot} · {line.canonicalProduct.packageDescription}</span></td><td><PriceBlock normalizedPrice={line.normalizedUnitPrice ? Number(line.normalizedUnitPrice) : null} normalizedUom={line.canonicalProduct.consumptionUomLabel} packPrice={Number(line.unitPrice)} packSize={line.canonicalProduct.packageDescription} variant="table" /></td><td className="num-cell">{Number(line.quantity)}</td><td className="num-cell">{formatMoney(Number(line.lineTotal))}</td></tr>) : <EmptyRow colSpan={4}>Nessuna riga</EmptyRow>}</tbody></DataTable></section>
      <aside className="phase1-budget-impact"><span>Impatto sul budget</span><h2>{request.facility.name} · periodo corrente</h2><dl><div><dt>Approvato</dt><dd>{formatMoney(approvedBudget)}</dd></div><div><dt>Speso + impegnato</dt><dd>{formatMoney(spent + committed)}</dd></div><div><dt>Disponibile prima</dt><dd>{formatMoney(available)}</dd></div><div><dt>Questa richiesta</dt><dd>− {formatMoney(Number(request.total))}</dd></div><div className="total"><dt>Residuo dopo</dt><dd className={after < 0 ? "risk" : ""}>{formatMoney(after)}</dd></div></dl><i><b style={{ width: `${Math.min(100, utilization)}%` }} /></i><small>{utilization.toFixed(1)}% utilizzato dopo la decisione</small></aside></div>
    {signals.length > 0 && <section className="phase1-evidence-band"><strong>Elementi da verificare</strong><span>{signals.join(" ")}</span></section>}
    <div className="phase1-context-cards"><section><span>Richiedente e perimetro</span><h3>{request.requester.name}</h3><p>{request.facility.area.name} · {request.costCenter.name}</p>{request.justification && <blockquote>“{request.justification}”</blockquote>}</section><section><span>Affidabilità fornitori</span>{supplierContexts.map(({ supplierId, metrics }) => { const supplier = request.lines.find((line) => line.supplierOffer.supplierId === supplierId)!.supplierOffer.supplier; return <div className="phase1-supplier-context" key={supplierId}><strong>{supplier.name}</strong><small>{metrics.delivered >= 5 ? `${metrics.onTimeRate.toFixed(1)}% puntuali · ${metrics.completeRate.toFixed(1)}% complete` : `Dati insufficienti · ${metrics.delivered} consegne`} · {metrics.issues} problemi</small></div>; })}</section></div>
    <details className="phase1-archive"><summary>Audit e storico della richiesta</summary><div>{request.approvals.map((item) => <div key={item.id}><span>{formatDate(item.requestedAt)} · {item.approver.name}</span><StatusChip variant={item.status === "APPROVED" ? "ok" : item.status === "PENDING" ? "warn" : "neutral"}>{statusLabel(item.status)}</StatusChip></div>)}</div></details>
    {approval.status === "PENDING" && <form id="approval-decision" action={decideApproval} className="phase1-decision-form"><input type="hidden" name="approvalId" value={approval.id} /><label>Nota alla decisione<textarea name="note" placeholder="Obbligatoria per rifiutare o chiedere chiarimenti" /></label></form>}
    {approval.status === "PENDING" && <StickyActionBar summary={<><strong>{formatMoney(Number(request.total))}</strong><span>{sla.ageDays} gg di attesa · residuo {formatMoney(after)}</span></>}><button form="approval-decision" name="decision" value="REJECTED" className="danger-button">Rifiuta</button><button form="approval-decision" name="decision" value="CLARIFICATION_REQUESTED" className="secondary-cta">Chiedi chiarimenti</button><button form="approval-decision" name="decision" value="APPROVED" className="primary-cta">Approva</button></StickyActionBar>}
  </main>;
}
