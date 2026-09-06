import Link from "next/link";
import {
  decideTechnicalEquivalence,
  runTechnicalComparison,
} from "@/app/technical-documents/actions";
import { DataTable, EmptyRow, PageHeader, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canonicalPair } from "@/lib/technical-intelligence/engine";

export default async function TechnicalCompare({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; evaluated?: string; error?: string; saved?: string }>;
}) {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const query = await searchParams;
  const ids = (query.ids ?? "").split(",").filter(Boolean).slice(0, 2);
  const products = await prisma.canonicalProduct.findMany({
    where: { id: { in: ids }, active: true },
    include: {
      category: true,
      offers: {
        where: { active: true },
        include: { supplier: true },
        orderBy: { normalizedUnitPrice: "asc" },
      },
    },
  });
  const selectableProducts = products.length === 2 ? [] : await prisma.canonicalProduct.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } });
  let assessment = null;
  let attributes: Awaited<ReturnType<typeof prisma.technicalProductAttribute.findMany>> = [];
  if (ids.length === 2) {
    const [a, b] = canonicalPair(ids[0], ids[1]);
    [assessment, attributes] = await Promise.all([
      prisma.productEquivalenceAssessment.findUnique({
        where: {
          organizationId_productAId_productBId: {
            organizationId: context.organization.id,
            productAId: a,
            productBId: b,
          },
        },
        include: { missingEvidence: true, savingOpportunities: true },
      }),
      prisma.technicalProductAttribute.findMany({
        where: {
          organizationId: context.organization.id,
          canonicalProductId: { in: ids },
          reviewState: { in: ["EXTRACTED", "CONFIRMED"] },
          technicalDocumentVersion: { status: "READY" },
        },
      }),
    ]);
  }
  const keys = [...new Set(attributes.map((item) => item.attributeKey))];
  return (
    <main className="phase2-page">
      <PageHeader
        eyebrow="Product Intelligence"
        title="Confronto tecnico"
        description="Differenze, evidenze e risultato restano separati dal semplice confronto descrittivo."
      />
      {query.error && <p className="warning" role="alert">{query.error}</p>}
      {query.saved && <p className="success" role="status">Decisione salvata.</p>}
      {products.length !== 2 && <form action={runTechnicalComparison} className="technical-requirement-form"><label>Prodotto A<select name="productAId" required>{selectableProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label>Prodotto B<select name="productBId" required>{selectableProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><button className="primary-cta">Confronta evidenze</button></form>}
      {products.length === 2 && (
        <>
          <section className="technical-comparison-head">
            {products.map((product) => (
              <div key={product.id}>
                <h2>{product.name}</h2>
                <p>{product.category.name}</p>
                <strong>
                  {product.offers[0]?.normalizedUnitPrice
                    ? `${Number(product.offers[0].normalizedUnitPrice).toLocaleString("it-IT")} € / ${product.consumptionUomLabel}`
                    : "Prezzo non confrontabile"}
                </strong>
                <Link href={`/products/${product.id}`}>Apri Product 360</Link>
              </div>
            ))}
          </section>
          <form action={runTechnicalComparison}>
            <input type="hidden" name="productAId" value={products[0].id} />
            <input type="hidden" name="productBId" value={products[1].id} />
            <button className="primary-cta">
              {assessment ? "Ricalcola con le evidenze correnti" : "Valuta equivalenza"}
            </button>
          </form>
          {assessment && (
            <section className="technical-assessment">
              <StatusChip
                variant={
                  assessment.result === "IDENTICAL" || assessment.result === "FUNCTIONALLY_EQUIVALENT"
                    ? "ok"
                    : assessment.result === "NOT_EQUIVALENT"
                      ? "danger"
                      : "warn"
                }
              >
                {assessment.result}
              </StatusChip>
              <StatusChip variant={assessment.reviewStatus === "HUMAN_APPROVED" ? "ok" : assessment.reviewStatus === "HUMAN_REJECTED" ? "danger" : "warn"}>
                {assessment.reviewStatus}
              </StatusChip>
              <strong>Confidenza {Math.round(Number(assessment.confidence) * 100)}%</strong>
              <p>{assessment.explanation}</p>
              {assessment.missingEvidence.map((item) => (
                <p key={item.id}><b>Manca {item.requiredField ?? item.requiredDocumentType}</b> · {item.suggestedEvidence}</p>
              ))}
              {assessment.result === "FUNCTIONALLY_EQUIVALENT" && (
                <form action={decideTechnicalEquivalence} className="technical-decision-form">
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <input type="hidden" name="evidenceFingerprint" value={assessment.evidenceFingerprint} />
                  <input type="hidden" name="ids" value={ids.join(",")} />
                  <label>Motivazione<input name="reason" required minLength={5} /></label>
                  <button name="decision" value="APPROVE" className="primary-cta">Approva equivalenza</button>
                  <button name="decision" value="REJECT" className="danger-cta">Rifiuta</button>
                </form>
              )}
              {assessment.savingOpportunities.map((saving) => (
                <p key={saving.id}>
                  <b>{saving.type}</b> · {saving.savingPercent === null ? "nessun saving difendibile" : `${Number(saving.savingPercent).toFixed(1)}%`}
                </p>
              ))}
            </section>
          )}
          <DataTable label="Matrice attributi tecnici">
            <thead><tr><th>Attributo</th>{products.map((product) => <th key={product.id}>{product.name}</th>)}</tr></thead>
            <tbody>
              {keys.length ? keys.map((key) => (
                <tr key={key}>
                  <td>{attributes.find((item) => item.attributeKey === key)?.label ?? key}</td>
                  {products.map((product) => <td key={product.id}>{attributes.find((item) => item.attributeKey === key && item.canonicalProductId === product.id)?.valueText ?? "Evidenza mancante"}</td>)}
                </tr>
              )) : <EmptyRow colSpan={3}>Nessun attributo tecnico approvato per il confronto.</EmptyRow>}
            </tbody>
          </DataTable>
        </>
      )}
    </main>
  );
}
