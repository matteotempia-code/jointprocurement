import Link from "next/link";
import { Num, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OrganizationPage() {
  const context = await requireRoles(["PROCUREMENT_ADMIN"]);
  const organization = await prisma.organization.findUnique({ where: { id: context.organization.id }, include: { legalEntities: { include: { areas: { include: { facilities: { include: { costCenters: true } } } } } } } });
  if (!organization) return null;
  const areas = organization.legalEntities.flatMap((entity) => entity.areas);
  const facilities = areas.flatMap((area) => area.facilities);
  const centers = facilities.flatMap((facility) => facility.costCenters);
  return <main className="phase2-page phase2-admin">
    <PageHeader eyebrow="Modello organizzativo" title="Organizzazione" description="Gerarchia dei perimetri operativi correnti; la modifica strutturale è riservata al futuro Organization Builder." />
    <section className="phase2-summary-strip"><div><span>Entità legali</span><strong><Num value={organization.legalEntities.length} /></strong></div><div><span>Aree</span><strong><Num value={areas.length} /></strong></div><div><span>Strutture</span><strong><Num value={facilities.length} /></strong></div><div><span>Centri di costo</span><strong><Num value={centers.length} /></strong></div></section>
    <section className="phase2-org-tree"><header><span>Organizzazione</span><h2>{organization.name}</h2></header>{organization.legalEntities.map((entity) => <details key={entity.id} open><summary><strong>{entity.name}</strong><span>Entità legale · {entity.areas.length} aree</span></summary><div>{entity.areas.map((area) => <details key={area.id}><summary><strong>{area.name}</strong><span>{area.facilities.length} strutture</span></summary><div className="phase2-org-facilities">{area.facilities.map((facility) => <Link href={`/facilities/${facility.id}`} key={facility.id}><strong>{facility.name}</strong><span>Struttura · {facility.costCenters.length} centri di costo</span></Link>)}</div></details>)}</div></details>)}</section>
  </main>;
}
