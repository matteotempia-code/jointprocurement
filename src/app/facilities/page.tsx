import Link from "next/link";
import { DataTable, EmptyRow, Num, PageHeader, Pagination, SearchField, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveScope } from "@/lib/scope";

const PAGE_SIZE = 20;
export default async function FacilitiesPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const context = await requireRoles(["AREA_MANAGER"]), scope = await resolveScope(context.assignment), query = await searchParams, page = Math.max(1, Number(query.pagina ?? 1));
  const where = { id: { in: scope.facilityIds }, ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" as const } }, { area: { name: { contains: query.q, mode: "insensitive" as const } } }] } : {}) };
  const [total, facilities] = await Promise.all([prisma.facility.count({ where }), prisma.facility.findMany({ where, include: { area: { include: { legalEntity: true } }, budgets: { orderBy: { periodEnd: "desc" }, take: 1 }, _count: { select: { requisitions: true, purchaseOrders: true, procurementLimits: true } } }, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE })]);
  const assignments = await prisma.userAssignment.findMany({ where: { active: true, scopeType: "FACILITY", scopeId: { in: facilities.map((item) => item.id) }, role: { code: "RSA_DIRECTOR" } }, include: { user: true } });
  const owners = new Map(assignments.map((item) => [item.scopeId, item.user.name])), pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <main className="phase2-page phase2-facilities"><PageHeader eyebrow="Perimetro area" title="Strutture" description={`${total} strutture in ${scope.label} · attività e controllo economico`} />
    <form className="phase2-control-bar"><SearchField defaultValue={query.q} placeholder="Struttura o area" /><button className="secondary-cta">Cerca</button></form>
    <DataTable label="Strutture"><thead><tr><th>Struttura</th><th>Responsabile</th><th className="num-cell">Richieste</th><th className="num-cell">Ordini</th><th className="num-cell">Limiti</th><th>Budget corrente</th><th /></tr></thead><tbody>{facilities.length ? facilities.map((facility) => { const budget = facility.budgets[0], ratio = budget && Number(budget.approvedAmount) ? Number(budget.actualAmount) / Number(budget.approvedAmount) * 100 : null; return <tr key={facility.id}><td><Link className="table-link" href={`/facilities/${facility.id}`}>{facility.name}</Link><small className="cell-detail">{facility.area.name} · {facility.area.legalEntity.name}</small></td><td>{owners.get(facility.id) ?? "Non assegnato"}</td><td className="num-cell"><Num value={facility._count.requisitions} /></td><td className="num-cell"><Num value={facility._count.purchaseOrders} /></td><td className="num-cell"><Num value={facility._count.procurementLimits} /></td><td>{ratio == null ? <StatusChip variant="neutral">Non disponibile</StatusChip> : <StatusChip variant={ratio >= 90 ? "danger" : ratio >= 80 ? "warn" : "ok"}>{ratio.toLocaleString("it-IT", { maximumFractionDigits: 1 })}% utilizzato</StatusChip>}</td><td><Link className="row-disclosure" aria-label={`Apri ${facility.name}`} href={`/facilities/${facility.id}`}>→</Link></td></tr>; }) : <EmptyRow colSpan={7}>Nessuna struttura nel filtro.</EmptyRow>}</tbody></DataTable>
    <Pagination page={Math.min(page, pages)} pages={pages} pathname="/facilities" params={{ q: query.q }} />
  </main>;
}
