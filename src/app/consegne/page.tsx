import Link from "next/link";
import { draftSupplierReminder } from "@/app/buying-actions";
import { Num, PageHeader, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";
import { startOfDay } from "@/lib/procurement/kpi-definitions";
import { statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

export default async function Consegne() {
  const context = await requireRoles(["RSA_DIRECTOR", "AREA_MANAGER"]), scope = await resolveScope(context.assignment), today = startOfDay(new Date()), tomorrow = new Date(today.getTime() + 86_400_000);
  const [active, received] = await Promise.all([
    prisma.purchaseOrder.findMany({ where: { facilityId: { in: scope.facilityIds }, status: { notIn: ["RECEIVED", "CANCELLED"] } }, include: { supplier: true, facility: true, _count: { select: { lines: true } } }, orderBy: { expectedDeliveryDate: "asc" }, take: 40 }),
    prisma.purchaseOrder.findMany({ where: { facilityId: { in: scope.facilityIds }, status: "RECEIVED" }, include: { supplier: true, facility: true, _count: { select: { lines: true } } }, orderBy: { expectedDeliveryDate: "desc" }, take: 12 }),
  ]);
  const overdue = active.filter((order) => order.expectedDeliveryDate < today), dueToday = active.filter((order) => order.expectedDeliveryDate >= today && order.expectedDeliveryDate < tomorrow), upcoming = active.filter((order) => order.expectedDeliveryDate >= tomorrow);
  const groups = [{ key: "overdue", title: "In ritardo", items: overdue, variant: "danger" as const }, { key: "today", title: "Oggi", items: dueToday, variant: "warn" as const }, { key: "upcoming", title: "Prossime", items: upcoming, variant: "neutral" as const }];
  return <main className="phase2-page phase2-deliveries"><PageHeader eyebrow="Operatività" title="Consegne" description={`${active.length} consegne operative · ${overdue.length} in ritardo · ${scope.label}`} />
    <section className="phase2-summary-strip"><div><span>In ritardo</span><strong>{overdue.length}</strong><small>Richiedono sollecito o ricezione</small></div><div><span>Oggi</span><strong>{dueToday.length}</strong><small>Da verificare</small></div><div><span>Prossime</span><strong>{upcoming.length}</strong><small>Programmate</small></div><div><span>Ricevute recenti</span><strong>{received.length}</strong><small>Archivio secondario</small></div></section>
    {groups.map((group) => <section className="phase2-queue" key={group.key}><div className="section-heading"><div><h2>{group.title}</h2><p>{group.key === "overdue" ? "Contatta il fornitore o registra la merce già arrivata." : group.key === "today" ? "Conferma l’arrivo appena verificato." : "Consegne pianificate in ordine cronologico."}</p></div><StatusChip variant={group.variant}>{group.items.length}</StatusChip></div><div className="phase2-operational-rows">{group.items.length ? group.items.map((order) => <article key={order.id}><Link href={`/orders/${order.id}`}><strong>{order.poNumber}</strong><span>{order.supplier.name}</span><small>{order.facility.name} · {order._count.lines} righe</small></Link><div className="num-cell"><strong>{formatDate(order.expectedDeliveryDate)}</strong><Num value={Number(order.total)} kind="currency" /></div><StatusChip variant={group.variant}>{statusLabel(order.status)}</StatusChip><div className="phase2-row-actions">{group.key === "overdue" && <form action={draftSupplierReminder}><input type="hidden" name="poId" value={order.id} /><button className="secondary-cta">Prepara sollecito</button></form>}{context.roleCode === "RSA_DIRECTOR" && <Link className={group.key === "overdue" ? "ghost-cta" : "secondary-cta"} href={`/orders/${order.id}/receive`}>Ricevi</Link>}</div></article>) : <p className="quiet-empty">Nessuna consegna in questa sezione.</p>}</div></section>)}
    <details className="phase2-secondary-section"><summary>Ricevute recentemente <span>{received.length}</span></summary><div className="phase2-operational-rows">{received.map((order) => <article key={order.id}><Link href={`/orders/${order.id}`}><strong>{order.poNumber}</strong><span>{order.supplier.name}</span><small>{order.facility.name}</small></Link><div className="num-cell"><strong>{formatDate(order.expectedDeliveryDate)}</strong><Num value={Number(order.total)} kind="currency" /></div><StatusChip variant="ok">Ricevuto</StatusChip></article>)}</div></details>
  </main>;
}
