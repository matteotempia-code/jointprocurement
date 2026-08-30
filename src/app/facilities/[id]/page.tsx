import { notFound } from "next/navigation";
import { DataTable, PageHeader, ScopeBadge } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveScope } from "@/lib/scope";

export default async function FacilityDetail({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["AREA_MANAGER"]); const scope = await resolveScope(context.assignment); const { id } = await params; if (!scope.facilityIds.includes(id)) notFound(); const facility = await prisma.facility.findUnique({ where: { id }, include: { area: { include: { legalEntity: true } }, costCenters: true } }); if (!facility) notFound();
  return <main><PageHeader eyebrow={facility.area.name} title={facility.name} description={facility.area.legalEntity.name} action={<ScopeBadge type="AREA" label={scope.label} />} /><section className="section-heading"><div><p className="eyebrow">Struttura organizzativa</p><h2>Centri di costo</h2></div></section><DataTable label="Centri di costo"><thead><tr><th>Codice</th><th>Nome</th><th>Struttura</th></tr></thead><tbody>{facility.costCenters.map((center) => <tr key={center.id}><td className="mono">{center.code}</td><td><strong>{center.name}</strong></td><td>{facility.name}</td></tr>)}</tbody></DataTable></main>;
}
