import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable, EmptyRow, Num, PageHeader, ScopeBadge, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";
import { statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

export default async function FacilityDetail({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["AREA_MANAGER", "PROCUREMENT_ADMIN"]), scope = await resolveScope(context.assignment), { id } = await params;
  if (!scope.facilityIds.includes(id)) notFound();
  const [facility, owner, openIssues] = await Promise.all([
    prisma.facility.findUnique({ where: { id }, include: { area: { include: { legalEntity: true } }, costCenters: true, budgets: { orderBy: { periodEnd: "desc" }, take: 1 }, procurementLimits: { where: { active: true }, include: { canonicalProduct: true, category: true }, take: 8 }, requisitions: { orderBy: { createdAt: "desc" }, take: 6 }, purchaseOrders: { include: { supplier: true }, orderBy: { issuedAt: "desc" }, take: 6 } } }),
    prisma.userAssignment.findFirst({ where: { active: true, scopeType: "FACILITY", scopeId: id, role: { code: "RSA_DIRECTOR" } }, include: { user: true } }),
    prisma.qualityIssue.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] }, purchaseOrderLine: { purchaseOrder: { facilityId: id } } } }),
  ]);
  if (!facility) notFound();
  const budget = facility.budgets[0], available = budget ? Number(budget.approvedAmount) - Number(budget.actualAmount) : null;
  return <main className="phase2-page phase2-facility-detail"><PageHeader eyebrow={facility.area.name} title={facility.name} description={`${facility.area.legalEntity.name} · ${owner?.user.name ?? "Responsabile non assegnato"}`} action={<ScopeBadge type="AREA" label={scope.label} />} />
    <section className="phase2-summary-strip"><div><span>Budget disponibile</span><strong>{available == null ? "n.d." : <Num value={available} kind="currency" />}</strong><small>Periodo corrente · dopo impegni</small></div><div><span>Richieste recenti</span><strong><Num value={facility.requisitions.length} /></strong><small>Finestra visibile</small></div><div><span>Ordini recenti</span><strong><Num value={facility.purchaseOrders.length} /></strong></div><div><span>Problemi aperti</span><strong><Num value={openIssues} /></strong><StatusChip variant={openIssues ? "warn" : "ok"}>{openIssues ? "Da seguire" : "Nessuna criticità"}</StatusChip></div></section>
    <nav className="phase2-anchor-tabs" aria-label="Sezioni struttura"><a href="#overview">Overview</a><a href="#people">Persone</a><a href="#limits">Budget e limiti</a><a href="#activity">Richieste e ordini</a><a href="#problems">Problemi</a></nav>
    <section id="overview" className="phase2-facility-overview"><div><span>Indirizzo</span><strong>{facility.address ?? "Non indicato"}</strong></div><div><span>Centri di costo</span><strong>{facility.costCenters.length}</strong></div><div id="people"><span>Responsabile acquisti</span><strong>{owner?.user.name ?? "Non assegnato"}</strong></div><div><span>Perimetro</span><strong>{facility.area.name}</strong></div></section>
    <details id="limits" className="phase2-secondary-section" open><summary>Budget e limiti · {facility.procurementLimits.length}</summary><div><DataTable label="Limiti della struttura"><thead><tr><th>Oggetto</th><th>Periodo</th><th>Tipo</th><th className="num-cell">Limite</th></tr></thead><tbody>{facility.procurementLimits.length ? facility.procurementLimits.map((limit) => <tr key={limit.id}><td>{limit.canonicalProduct?.name ?? limit.category?.name ?? "Perimetro generale"}</td><td>{formatDate(limit.periodStart)}–{formatDate(limit.periodEnd)}</td><td>{limit.limitType === "MONETARY" ? "Valore" : "Quantità"}</td><td className="num-cell">{limit.limitType === "MONETARY" ? <Num value={Number(limit.maximumAmount ?? 0)} kind="currency" /> : `${Number(limit.maximumQuantity ?? 0).toLocaleString("it-IT")} ${limit.quantityUom ?? "unità"}`}</td></tr>) : <EmptyRow colSpan={4}>Nessun limite specifico.</EmptyRow>}</tbody></DataTable></div></details>
    <details id="activity" className="phase2-secondary-section"><summary>Richieste e ordini recenti</summary><div className="phase2-split"><section><h2>Richieste</h2>{facility.requisitions.map((item) => <Link href={`/requisitions/${item.id}`} key={item.id}><strong>{item.requisitionNumber}</strong><span>{statusLabel(item.status)}</span></Link>)}</section><section><h2>Ordini</h2>{facility.purchaseOrders.map((item) => <Link href={`/orders/${item.id}`} key={item.id}><strong>{item.poNumber}</strong><span>{item.supplier.name} · {statusLabel(item.status)}</span></Link>)}</section></div></details>
    <details id="problems" className="phase2-secondary-section"><summary>Problemi · {openIssues}</summary><div><Link className="secondary-cta" href="/non-conformita">Apri non conformità dell’area</Link></div></details>
  </main>;
}
