import { createEvidenceRequirement, setEvidenceRequirementActive } from "@/app/technical-documents/actions";
import { DataTable, EmptyRow, PageHeader, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const types = ["TECHNICAL_SHEET", "SDS", "DECLARATION_OF_CONFORMITY", "CE_DOCUMENT", "CERTIFICATE", "MANUAL", "TEST_REPORT", "REGULATORY_DOCUMENT", "OTHER_TECHNICAL"];

export default async function TechnicalRequirements() {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const [requirements, categories] = await Promise.all([
    prisma.technicalEvidenceRequirement.findMany({ where: { organizationId: context.organization.id }, include: { category: true }, orderBy: [{ category: { name: "asc" } }, { label: "asc" }] }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <main className="phase2-page">
    <PageHeader eyebrow="Product Intelligence" title="Requisiti tecnici per categoria" description="Regole documentali e attributi critici configurabili per organizzazione." />
    <form action={createEvidenceRequirement} className="technical-requirement-form">
      <label>Categoria<select name="categoryId" required>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
      <label>Tipo<select name="requirementType"><option value="DOCUMENT">Documento</option><option value="ATTRIBUTE">Attributo</option></select></label>
      <label>Documento<select name="documentType"><option value="">—</option>{types.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label>Chiave attributo<input name="attributeKey" placeholder="es. aql" /></label>
      <label>Etichetta<input name="label" required minLength={3} /></label>
      <label><input type="checkbox" name="equivalenceCritical" /> Critico per equivalenza</label>
      <label><input type="checkbox" name="validityRequired" /> Validità richiesta</label>
      <button className="primary-cta">Aggiungi requisito</button>
    </form>
    <DataTable label="Requisiti">
      <thead><tr><th>Categoria</th><th>Requisito</th><th>Tipo</th><th>Equivalenza</th><th>Validità</th><th>Stato</th><th /></tr></thead>
      <tbody>{requirements.length ? requirements.map((item) => <tr key={item.id}><td>{item.category.name}</td><td>{item.label}</td><td>{item.documentType ?? item.attributeKey}</td><td><StatusChip variant={item.equivalenceCritical ? "warn" : "neutral"}>{item.equivalenceCritical ? "Critico" : "Informativo"}</StatusChip></td><td>{item.validityRequired ? "Richiesta" : "Non richiesta"}</td><td><StatusChip variant={item.active ? "ok" : "neutral"}>{item.active ? "Attivo" : "Disattivato"}</StatusChip></td><td><form action={setEvidenceRequirementActive}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={String(!item.active)} /><button className="text-link">{item.active ? "Disattiva" : "Riattiva"}</button></form></td></tr>) : <EmptyRow colSpan={7}>Nessun requisito configurato.</EmptyRow>}</tbody>
    </DataTable>
  </main>;
}
