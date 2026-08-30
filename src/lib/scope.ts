import "server-only";

import { prisma } from "@/lib/prisma";

export type ScopeType = "ORGANIZATION" | "AREA" | "FACILITY";
export type ScopeResolution = { type: ScopeType; id: string; label: string; organization: string; area?: string; facility?: string; facilityIds: string[] };

export async function resolveScope(assignment: { scopeType: string; scopeId: string | null; organizationId: string }): Promise<ScopeResolution> {
  const type = assignment.scopeType as ScopeType;
  if (type === "FACILITY" && assignment.scopeId) {
    const facility = await prisma.facility.findUnique({ where: { id: assignment.scopeId }, include: { area: { include: { legalEntity: { include: { organization: true } } } } } });
    if (!facility) throw new Error("Facility scope is invalid");
    return { type, id: facility.id, label: facility.name, organization: facility.area.legalEntity.organization.name, area: facility.area.name, facility: facility.name, facilityIds: [facility.id] };
  }
  if (type === "AREA" && assignment.scopeId) {
    const area = await prisma.area.findUnique({ where: { id: assignment.scopeId }, include: { facilities: true, legalEntity: { include: { organization: true } } } });
    if (!area) throw new Error("Area scope is invalid");
    return { type, id: area.id, label: area.name, organization: area.legalEntity.organization.name, area: area.name, facilityIds: area.facilities.map((f) => f.id) };
  }
  const organization = await prisma.organization.findUnique({ where: { id: assignment.organizationId }, include: { legalEntities: { include: { areas: { include: { facilities: true } } } } } });
  if (!organization) throw new Error("Organization scope is invalid");
  return { type: "ORGANIZATION", id: organization.id, label: organization.name, organization: organization.name, facilityIds: organization.legalEntities.flatMap((l) => l.areas.flatMap((a) => a.facilities.map((f) => f.id))) };
}
