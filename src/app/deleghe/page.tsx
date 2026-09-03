import { DataTable, EmptyRow, Num, PageHeader, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";

export default async function Deleghe() {
  const context = await requireRoles(["PROCUREMENT_ADMIN"]), now = new Date();
  const rows = await prisma.approvalDelegation.findMany({ where: { delegator: { assignments: { some: { organizationId: context.organization.id } } } }, include: { delegator: true, delegate: true }, orderBy: [{ active: "desc" }, { validUntil: "asc" }] });
  const ids = rows.flatMap((row) => row.scopeId ? [row.scopeId] : []), [areas, facilities] = await Promise.all([prisma.area.findMany({ where: { id: { in: ids } } }), prisma.facility.findMany({ where: { id: { in: ids } } })]);
  const scopeNames = new Map([...areas, ...facilities].map((item) => [item.id, item.name]));
  const status = (row: typeof rows[number]) => !row.active || row.validUntil < now ? ["Scaduta", "neutral"] as const : row.validFrom > now ? ["Futura", "warn"] as const : ["Attiva", "ok"] as const;
  const active = rows.filter((row) => status(row)[0] === "Attiva").length, future = rows.filter((row) => status(row)[0] === "Futura").length;
  return <main className="phase2-page phase2-admin"><PageHeader eyebrow="Poteri e continuità" title="Deleghe di approvazione" description="Chi può decidere, in quale perimetro e fino a quando." />
    <section className="phase2-summary-strip"><div><span>Attive</span><strong><Num value={active} /></strong></div><div><span>Future</span><strong><Num value={future} /></strong></div><div><span>Scadute</span><strong><Num value={rows.length - active - future} /></strong></div><div><span>Principio</span><strong>Potere circoscritto</strong><small>Periodo, scope e limite</small></div></section>
    <DataTable label="Deleghe"><thead><tr><th>Delegante</th><th>Delegato</th><th>Scope</th><th>Validità</th><th className="num-cell">Limite</th><th>Stato</th></tr></thead><tbody>{rows.length ? rows.map((row) => { const [label, variant] = status(row); return <tr key={row.id}><td><strong>{row.delegator.name}</strong></td><td>{row.delegate.name}</td><td>{scopeNames.get(row.scopeId ?? "") ?? (row.scopeType === "ORGANIZATION" ? context.organization.name : row.scopeType)}<small className="cell-detail">{row.scopeType}</small></td><td>{formatDate(row.validFrom)} – {formatDate(row.validUntil)}</td><td className="num-cell">{row.approvalLimit ? <Num value={Number(row.approvalLimit)} kind="currency" /> : "Senza limite specifico"}</td><td><StatusChip variant={variant}>{label}</StatusChip></td></tr>; }) : <EmptyRow colSpan={6}>Nessuna delega configurata.</EmptyRow>}</tbody></DataTable>
  </main>;
}
