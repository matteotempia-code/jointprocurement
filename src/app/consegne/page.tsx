import Link from "next/link";
import { draftSupplierReminder } from "@/app/buying-actions";
import { PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";
import { deliveriesTodayWhere, overdueWhere, startOfDay } from "@/lib/procurement/kpi-definitions";
import { statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

export default async function Consegne() {
  const context = await requireRoles(["RSA_DIRECTOR", "AREA_MANAGER"]); const scope = await resolveScope(context.assignment);
  const orders = await prisma.purchaseOrder.findMany({ where: { facilityId: { in: scope.facilityIds }, status: { not: "CANCELLED" } }, include: { supplier: true, facility: true, lines: true, receipts: true }, orderBy: { expectedDeliveryDate: "asc" } });
  const now = new Date(), overdueIds = new Set((await prisma.purchaseOrder.findMany({ where: overdueWhere(scope, now), select: { id: true } })).map(({ id }) => id)), todayIds = new Set((await prisma.purchaseOrder.findMany({ where: deliveriesTodayWhere(scope, now), select: { id: true } })).map(({ id }) => id)), tomorrow = new Date(startOfDay(now).getTime() + 86_400_000);
  const groups = [{ title: "In ritardo", items: orders.filter(({ id }) => overdueIds.has(id)), overdue: true }, { title: "Oggi", items: orders.filter(({ id }) => todayIds.has(id)), overdue: false }, { title: "Prossime", items: orders.filter((order) => order.expectedDeliveryDate >= tomorrow && !["RECEIVED", "CANCELLED"].includes(order.status)), overdue: false }, { title: "Ricevute", items: orders.filter(({ status }) => status === "RECEIVED").slice(-20), overdue: false }];
  return <main><PageHeader eyebrow="Operatività" title="Consegne" description="Cosa arriva, cosa è in ritardo e cosa deve ancora essere verificato." /><div className="delivery-board">{groups.map((group) => <section key={group.title}><header><h2>{group.title}</h2><b>{group.items.length}</b></header>{group.items.length ? group.items.map((order) => <article key={order.id}><div><span>{order.facility.name}</span><Link href={`/orders/${order.id}`}>{order.poNumber}</Link><small>{order.supplier.name} · {order.lines.length} righe</small></div><div><b>{formatDate(order.expectedDeliveryDate)}</b><StatusIndicator active={order.status === "RECEIVED"} label={statusLabel(order.status)} /></div>{group.overdue ? <div className="row-actions"><form action={draftSupplierReminder}><input type="hidden" name="poId" value={order.id}/><button className="secondary-cta">Sollecita fornitore · bozza</button></form>{context.roleCode === "RSA_DIRECTOR" && <Link className="ghost-cta" href={`/orders/${order.id}/receive`}>Registra ricezione</Link>}</div> : context.roleCode === "RSA_DIRECTOR" && !["RECEIVED", "CANCELLED"].includes(order.status) && <Link className="secondary-cta" href={`/orders/${order.id}/receive`}>Registra ricezione</Link>}</article>) : <p className="quiet-empty">Nessuna consegna in questa sezione.</p>}</section>)}</div></main>;
}
