import Link from "next/link";
import { ChevronIcon } from "@/components/icons";
import { PageHeader, ScopeBadge } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveScope } from "@/lib/scope";

export default async function FacilitiesPage() {
  const context = await requireRoles(["AREA_MANAGER"]); const scope = await resolveScope(context.assignment); const facilities = await prisma.facility.findMany({ where: { id: { in: scope.facilityIds } }, include: { area: true, costCenters: true }, orderBy: { name: "asc" } });
  return <main><PageHeader eyebrow="Area operations" title="Facilities" description={`Only facilities in ${scope.label} are visible.`} action={<ScopeBadge type={scope.type} label={scope.label} />} /><div className="facility-grid">{facilities.map((facility) => <Link href={`/facilities/${facility.id}`} key={facility.id} className="facility-card"><div className="facility-index">{String(facilities.indexOf(facility) + 1).padStart(2, "0")}</div><div><span>{facility.area.name}</span><h2>{facility.name}</h2><p>{facility.costCenters.length} cost centers</p></div><ChevronIcon /></Link>)}</div></main>;
}
