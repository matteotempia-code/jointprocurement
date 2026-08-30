import { PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OrganizationPage() {
  const context = await requireRoles(["PROCUREMENT_ADMIN"]); const organization = await prisma.organization.findUnique({ where: { id: context.organization.id }, include: { legalEntities: { include: { areas: { include: { facilities: { include: { costCenters: true } } } } } } } }); if (!organization) return null;
  return <main><PageHeader eyebrow="Modello organizzativo" title="Organizzazione" description="Struttura legale e gerarchia dei perimetri operativi." /><div className="org-tree"><div className="org-root"><span>Organizzazione</span><h2>{organization.name}</h2></div>{organization.legalEntities.map((entity) => <section key={entity.id} className="tree-level"><header><span>Entità legale</span><h3>{entity.name}</h3></header>{entity.areas.map((area) => <div key={area.id} className="area-branch"><div><span>Area</span><strong>{area.name}</strong></div><div className="tree-facilities">{area.facilities.map((facility) => <article key={facility.id}><span>Struttura</span><h4>{facility.name}</h4><ul>{facility.costCenters.map((center) => <li key={center.id}><i /> <span><b>{center.code}</b> {center.name}</span></li>)}</ul></article>)}</div></div>)}</section>)}</div></main>;
}
