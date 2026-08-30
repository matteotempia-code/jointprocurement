import { DataTable, PageHeader, ScopeBadge, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/pricing";

async function scopeNames(assignments: { scopeType: string; scopeId: string | null }[]) {
  const ids = assignments.map((assignment) => assignment.scopeId).filter(Boolean) as string[];
  const [areas, facilities] = await Promise.all([prisma.area.findMany({ where: { id: { in: ids } } }), prisma.facility.findMany({ where: { id: { in: ids } } })]);
  return new Map([...areas, ...facilities].map((item) => [item.id, item.name]));
}
export default async function Utenti() {
  const context = await requireRoles(["PROCUREMENT_ADMIN"]);
  const assignments = await prisma.userAssignment.findMany({ where: { organizationId: context.organization.id }, include: { user: true, role: true, organization: true }, orderBy: { user: { name: "asc" } } });
  const names = await scopeNames(assignments);
  return <main><PageHeader eyebrow="Identità e poteri" title="Utenti" description="Il ruolo definisce cosa si può fare; lo scope definisce dove." /><aside className="principle-note"><b>Ruolo ≠ scope</b><span>Ogni assegnazione combina utente, ruolo, organizzazione, perimetro operativo e autonomia.</span></aside><DataTable label="Assegnazioni utente"><thead><tr><th>Utente</th><th>Ruolo</th><th>Organizzazione</th><th>Scope</th><th>Limite di approvazione</th><th>Stato</th></tr></thead><tbody>{assignments.map((assignment) => <tr key={assignment.id}><td><strong>{assignment.user.name}</strong><small className="cell-detail">{assignment.user.email}</small></td><td>{assignment.role.name}</td><td>{assignment.organization.name}</td><td><ScopeBadge type={assignment.scopeType} label={assignment.scopeType === "ORGANIZATION" ? assignment.organization.name : names.get(assignment.scopeId ?? "") ?? "Scope non disponibile"} /></td><td>{assignment.approvalLimit ? formatMoney(Number(assignment.approvalLimit)) : "—"}</td><td><StatusIndicator active={assignment.active} label={assignment.active ? "Attivo" : "Non attivo"} /></td></tr>)}</tbody></DataTable></main>;
}
