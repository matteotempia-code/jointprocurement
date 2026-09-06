import Link from "next/link";
import { manageLegalEntity, updateOrganization } from "@/app/admin-actions";
import { AdminFeedback, AdminPanel } from "@/components/admin-crud";
import { Num, PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OrganizationPage({ searchParams }: { searchParams: Promise<{ esito?: string }> }) {
  const context = await requireRoles(["PROCUREMENT_ADMIN"]), query = await searchParams;
  const organization = await prisma.organization.findUnique({ where: { id: context.organization.id }, include: { legalEntities: { include: { areas: { include: { facilities: { include: { costCenters: true } } } } } } } });
  if (!organization) return null;
  const areas = organization.legalEntities.flatMap((entity) => entity.areas), facilities = areas.flatMap((area) => area.facilities), centers = facilities.flatMap((facility) => facility.costCenters);
  return <main className="phase2-page phase2-admin">
    <PageHeader eyebrow="Modello organizzativo" title="Organizzazione" description="Gestisci il tenant corrente e le entita legali; aree e strutture avanzate restano nel futuro Organization Builder." action={<AdminPanel label="Nuova entita legale"><form action={manageLegalEntity} className="admin-crud-form"><input type="hidden" name="intent" value="create" /><label>Nome<input name="name" required minLength={3} /></label><button className="primary-cta">Crea entita</button></form></AdminPanel>} />
    <AdminFeedback result={query.esito} />
    <form action={updateOrganization} className="admin-inline-editor"><label>Nome organizzazione<input name="name" defaultValue={organization.name} required minLength={3} /></label><button className="secondary-cta">Salva nome</button></form>
    <section className="phase2-summary-strip"><div><span>Entita legali</span><strong><Num value={organization.legalEntities.length} /></strong></div><div><span>Aree</span><strong><Num value={areas.length} /></strong></div><div><span>Strutture</span><strong><Num value={facilities.length} /></strong></div><div><span>Centri di costo</span><strong><Num value={centers.length} /></strong></div></section>
    <section className="phase2-org-tree"><header><span>Organizzazione</span><h2>{organization.name}</h2></header>{organization.legalEntities.map((entity) => <details key={entity.id} open><summary><strong>{entity.name}</strong><span>Entita legale - {entity.areas.length} aree</span></summary><div><form action={manageLegalEntity} className="admin-inline-editor"><input type="hidden" name="id" value={entity.id} /><label>Nome<input name="name" defaultValue={entity.name} required minLength={3} /></label><button name="intent" value="update">Aggiorna</button>{entity.areas.length === 0 && <button className="danger-secondary" name="intent" value="delete">Elimina vuota</button>}</form>{entity.areas.map((area) => <details key={area.id}><summary><strong>{area.name}</strong><span>{area.facilities.length} strutture</span></summary><div className="phase2-org-facilities">{area.facilities.map((facility) => <Link href={`/facilities/${facility.id}`} key={facility.id}><strong>{facility.name}</strong><span>Struttura - {facility.costCenters.length} centri di costo</span></Link>)}</div></details>)}</div></details>)}</section>
  </main>;
}
