import Link from "next/link";
import { EmptyState, PageHeader, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/pricing";
import { statusLabel } from "@/lib/presentation/status";
import { approvalSla } from "@/lib/procurement/approval-sla";

const PAGE_SIZE = 8;
export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ decision?: string; page?: string; age?: string }> }) {
  const context = await requireRoles(["AREA_MANAGER", "PROCUREMENT_MANAGER"]);
  const filters = await searchParams;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const approvals = await prisma.approvalRequest.findMany({ where: { approverUserId: context.user.id }, include: { requisition: { include: { facility: true, requester: true } } }, orderBy: { requestedAt: "asc" }, take: 160 });
  const actionable = approvals.filter(({ status, requestedAt }) => status === "PENDING" && (filters.age !== "overdue" || approvalSla(requestedAt).state === "overdue")).sort((a, b) => approvalSla(b.requestedAt).ageDays - approvalSla(a.requestedAt).ageDays || Number(b.requisition.total) - Number(a.requisition.total));
  const history = approvals.filter(({ status }) => status !== "PENDING");
  const visible = actionable.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(actionable.length / PAGE_SIZE));
  const overdue = actionable.filter(({ requestedAt }) => approvalSla(requestedAt).state === "overdue");
  const oldest = actionable[0] ? approvalSla(actionable[0].requestedAt).ageDays : 0;
  return <main className="phase1-page phase1-approvals">
    {filters.decision && <div className="success">Decisione registrata: {statusLabel(filters.decision)}.</div>}
    <PageHeader eyebrow={context.roleCode === "AREA_MANAGER" ? "Governance di area" : "Eccezioni procurement"} title="Decisioni da prendere" description="Priorità ordinate per anzianità, SLA e materialità." />
    {overdue.length > 0 && <div className="phase1-sla-alert"><strong>{overdue.length} decisioni oltre SLA</strong><span>La più anziana attende da {oldest} giorni. Le richieste critiche sono mostrate per prime.</span><Link href="/approvals?age=overdue">Mostra solo overdue</Link></div>}
    <div className="phase1-summary-strip"><Link href="/approvals"><span>Da decidere</span><strong>{actionable.length}</strong></Link><Link href="/approvals?age=overdue"><span>Oltre SLA</span><strong>{overdue.length}</strong></Link><div><span>Importo in coda</span><strong>{formatMoney(actionable.reduce((sum, item) => sum + Number(item.requisition.total), 0))}</strong></div><div><span>Più anziana</span><strong>{oldest} gg</strong></div></div>
    <div className="phase1-queue-toolbar"><div><strong>Coda operativa</strong><span>{actionable.length} richieste nel perimetro</span></div><form><select name="age" defaultValue={filters.age ?? "all"}><option value="all">Tutte le priorità</option><option value="overdue">Solo oltre SLA</option></select><button className="secondary-cta">Filtra</button></form></div>
    {visible.length ? <div className="phase1-approval-table" role="table" aria-label="Richieste da decidere"><div role="row" className="phase1-approval-head"><span>Richiesta</span><span>Contesto</span><span>Importo</span><span>Motivo</span><span>Attesa / SLA</span><span /></div>{visible.map((approval) => { const sla = approvalSla(approval.requestedAt); return <Link role="row" href={`/approvals/${approval.id}`} key={approval.id} className={`phase1-approval-row sla-${sla.state}`} aria-label={`Decidi ${approval.requisition.requisitionNumber}`}><div><strong>{approval.requisition.requisitionNumber}</strong><span>{approval.requisition.facility.name}</span></div><div><strong>{approval.requisition.requester.name}</strong><span>{formatDate(approval.requestedAt)}</span></div><strong className="num-cell">{formatMoney(Number(approval.requisition.total))}</strong><span>{approval.reason}</span><div className="sla-cell"><strong>{sla.ageDays} gg</strong><span>SLA +{Math.max(0, sla.ageDays - sla.targetDays)}</span></div><span className="row-disclosure" aria-hidden>→</span></Link>; })}</div> : <EmptyState title="Nessuna decisione in sospeso" description="Non ci sono richieste assegnate al tuo perimetro." />}
    {pageCount > 1 && <nav className="phase1-pagination"><Link aria-disabled={page <= 1} href={`/approvals?page=${Math.max(1, page - 1)}${filters.age ? `&age=${filters.age}` : ""}`}>Precedente</Link><span>{page} / {pageCount}</span><Link aria-disabled={page >= pageCount} href={`/approvals?page=${Math.min(pageCount, page + 1)}${filters.age ? `&age=${filters.age}` : ""}`}>Successiva</Link></nav>}
    {history.length > 0 && <details className="phase1-archive"><summary>Archivio decisioni · {history.length}</summary><div>{history.slice(0, 8).map((item) => <Link key={item.id} href={`/approvals/${item.id}`}><span>{item.requisition.requisitionNumber} · {item.requisition.facility.name}</span><StatusChip variant={item.status === "APPROVED" ? "ok" : "neutral"}>{statusLabel(item.status)}</StatusChip></Link>)}</div></details>}
  </main>;
}
