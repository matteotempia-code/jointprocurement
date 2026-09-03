import Link from "next/link";
import { Prisma } from "@prisma/client";
import { DataTable, EmptyRow, Num, PageHeader, Pagination, SearchField, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";
import { statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

const PAGE_SIZE = 20;

export default async function Ordini({ searchParams }: { searchParams: Promise<{ stato?: string; q?: string; timing?: string; pagina?: string }> }) {
  const context = await requireRoles(["RSA_DIRECTOR", "PROCUREMENT_MANAGER"]), scope = await resolveScope(context.assignment), query = await searchParams;
  const page = Math.max(1, Number(query.pagina ?? 1)), now = new Date();
  const where: Prisma.PurchaseOrderWhereInput = {
    facilityId: context.roleCode === "RSA_DIRECTOR" ? scope.id : { in: scope.facilityIds },
    ...(query.stato ? { status: query.stato as never } : {}),
    ...(query.q ? { OR: [{ poNumber: { contains: query.q, mode: "insensitive" } }, { supplier: { name: { contains: query.q, mode: "insensitive" } } }, { facility: { name: { contains: query.q, mode: "insensitive" } } }] } : {}),
    ...(query.timing === "overdue" ? { expectedDeliveryDate: { lt: now }, status: { notIn: ["RECEIVED", "CANCELLED"] } } : query.timing === "upcoming" ? { expectedDeliveryDate: { gte: now }, status: { notIn: ["RECEIVED", "CANCELLED"] } } : {}),
  };
  const [total, orders] = await Promise.all([prisma.purchaseOrder.count({ where }), prisma.purchaseOrder.findMany({ where, include: { supplier: true, facility: true, receipts: true, _count: { select: { lines: true } } }, orderBy: [{ expectedDeliveryDate: "asc" }, { issuedAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE })]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <main className="phase2-page phase2-list-page"><PageHeader eyebrow="Operatività ordini" title="Ordini" description={`${total} ordini nel filtro · priorità per data di consegna`} />
    <nav className="state-tabs" aria-label="Stato ordini">{[["", "Operativi"], ["ISSUED", "Da confermare"], ["ACKNOWLEDGED", "In consegna"], ["PARTIALLY_RECEIVED", "Parziali"], ["ISSUE", "Con problemi"], ["RECEIVED", "Ricevuti"]].map(([value, label]) => <Link className={(query.stato ?? "") === value ? "active" : ""} href={`/orders${value ? `?stato=${value}` : ""}`} key={value}>{label}</Link>)}</nav>
    <form className="phase2-control-bar"><SearchField defaultValue={query.q} placeholder="PO, fornitore o struttura" /><input type="hidden" name="stato" value={query.stato ?? ""} /><select name="timing" defaultValue={query.timing ?? ""}><option value="">Qualsiasi consegna</option><option value="overdue">In ritardo</option><option value="upcoming">In arrivo</option></select><button className="secondary-cta">Filtra</button></form>
    <DataTable label="Ordini di acquisto"><thead><tr><th>Ordine</th><th>Fornitore / struttura</th><th className="num-cell">Importo</th><th>Consegna</th><th>Ricezione</th><th>Stato</th><th aria-label="Apri" /></tr></thead><tbody>{orders.length ? orders.map((order) => { const overdue = order.expectedDeliveryDate < now && !["RECEIVED", "CANCELLED"].includes(order.status); return <tr className={overdue ? "is-priority" : ""} key={order.id}><td><Link className="table-link" href={`/orders/${order.id}`}>{order.poNumber}</Link><small className="cell-detail">Emesso {formatDate(order.issuedAt)} · {order._count.lines} righe</small></td><td>{order.supplier.name}<small className="cell-detail">{order.facility.name}</small></td><td className="num-cell"><Num value={Number(order.total)} kind="currency" /></td><td className={overdue ? "risk" : ""}>{formatDate(order.expectedDeliveryDate)}<small className="cell-detail">{overdue ? "In ritardo" : "Data prevista"}</small></td><td>{order.receipts.length ? `${order.receipts.length} registrazioni` : "Da ricevere"}</td><td><StatusChip variant={order.status === "RECEIVED" ? "ok" : overdue || order.status === "ISSUE" ? "danger" : order.status === "PARTIALLY_RECEIVED" ? "warn" : "neutral"}>{statusLabel(order.status)}</StatusChip></td><td><Link className="row-disclosure" aria-label={`Apri ${order.poNumber}`} href={`/orders/${order.id}`}>→</Link></td></tr>; }) : <EmptyRow colSpan={7}>Nessun ordine nel filtro.</EmptyRow>}</tbody></DataTable>
    <Pagination page={Math.min(page, pages)} pages={pages} pathname="/orders" params={{ stato: query.stato, q: query.q, timing: query.timing }} />
  </main>;
}
