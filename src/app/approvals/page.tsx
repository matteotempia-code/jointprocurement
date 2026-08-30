import Link from "next/link";
import { DataTable, EmptyState, PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/pricing";
import { statusLabel } from "@/lib/presentation/status";

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ decision?: string }> }) {
  const context = await requireRoles(["AREA_MANAGER", "PROCUREMENT_MANAGER"]);
  const approvals = await prisma.approvalRequest.findMany({ where: { approverUserId: context.user.id }, include: { requisition: { include: { facility: true, requester: true } } }, orderBy: { requestedAt: "desc" } });
  const actionable = approvals.filter(({ status }) => status === "PENDING");
  const history = approvals.filter(({ status }) => status !== "PENDING");
  const decision = (await searchParams).decision;
  const table = (rows: typeof approvals, label: string) => <DataTable label={label}><thead><tr><th>Richiesta</th><th>Struttura</th><th>Richiedente</th><th>Importo</th><th>Budget residuo</th><th>Motivo</th><th>Inviata</th><th>Stato</th></tr></thead><tbody>{rows.map((approval) => <tr key={approval.id}><td><Link className="table-link" href={`/approvals/${approval.id}`}>{approval.requisition.requisitionNumber}</Link></td><td>{approval.requisition.facility.name}</td><td>{approval.requisition.requester.name}</td><td>{formatMoney(Number(approval.requisition.total))}</td><td>{formatMoney(Number(approval.requisition.budgetAfter))}</td><td>{approval.reason}</td><td>{formatDate(approval.requestedAt)}</td><td><StatusIndicator active={approval.status === "APPROVED"} label={statusLabel(approval.status)} /></td></tr>)}</tbody></DataTable>;
  return <main>{decision && <div className="success">Decisione registrata: {statusLabel(decision)}.</div>}<PageHeader eyebrow={context.roleCode === "AREA_MANAGER" ? "Governance di area" : "Eccezioni procurement"} title="Approvazioni" description="Richieste instradate dalla policy centrale degli acquisti." /><section><div className="section-heading"><div><p className="eyebrow">Da decidere</p><h2>{actionable.length} richieste richiedono attenzione</h2></div></div>{actionable.length ? table(actionable, "Richieste da decidere") : <EmptyState title="Nessuna decisione in sospeso" description="Non ci sono richieste assegnate al tuo perimetro di approvazione." />}</section>{history.length > 0 && <section className="workspace-section"><div className="section-heading"><div><p className="eyebrow">Storico</p><h2>Decisioni recenti</h2></div></div>{table(history.slice(0, 30), "Storico approvazioni")}</section>}</main>;
}
