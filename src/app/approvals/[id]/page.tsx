import { notFound } from "next/navigation";
import { decideApproval } from "@/app/buying-actions";
import {
  DataTable,
  EmptyRow,
  PageHeader,
  PriceBlock,
  StatusChip,
  StickyActionBar,
} from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, formatPercent } from "@/lib/pricing";
import { statusLabel } from "@/lib/presentation/status";
import { approvalSla } from "@/lib/procurement/approval-sla";
import { getSupplierMetrics } from "@/lib/procurement/metrics";

export default async function ApprovalCockpit({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["AREA_MANAGER", "PROCUREMENT_MANAGER"]);
  const approval = await prisma.approvalRequest.findFirst({
    where: { id: (await params).id, approverUserId: context.user.id },
    include: {
      requisition: {
        include: {
          facility: { include: { area: true } },
          requester: true,
          costCenter: true,
          lines: {
            include: { canonicalProduct: true, supplierOffer: { include: { supplier: true } } },
            take: 8,
          },
          approvals: { include: { approver: true }, orderBy: { requestedAt: "desc" } },
        },
      },
    },
  });
  if (!approval) notFound();
  const request = approval.requisition;
  const supplierIds = [...new Set(request.lines.map((line) => line.supplierOffer.supplierId))];
  const [budgets, orders, supplierContexts] = await Promise.all([
    prisma.budget.findMany({ where: { facilityId: request.facilityId, status: "ACTIVE" } }),
    prisma.purchaseOrder.findMany({
      where: { facilityId: request.facilityId, status: { not: "CANCELLED" } },
      select: { total: true },
    }),
    Promise.all(
      supplierIds.map(async (supplierId) => ({
        supplierId,
        metrics: await getSupplierMetrics(supplierId),
      })),
    ),
  ]);
  const approvedBudget = budgets.reduce((sum, item) => sum + Number(item.approvedAmount), 0);
  const spent = budgets.reduce((sum, item) => sum + Number(item.actualAmount), 0);
  const committed = orders.reduce((sum, item) => sum + Number(item.total), 0);
  const available = approvedBudget - spent - committed;
  const after = available - Number(request.total);
  const utilization = approvedBudget
    ? ((spent + committed + Number(request.total)) / approvedBudget) * 100
    : 0;
  const sla = approvalSla(approval.requestedAt);
  const nonPreferred = request.lines.filter((line) => !line.supplierOffer.preferred).length;
  const signals = [
    after < 0 ? "Il budget disponibile diventerebbe negativo." : null,
    nonPreferred ? `${nonPreferred} righe non convenzionate richiedono verifica.` : null,
  ].filter(Boolean);
  return (
    <main className="phase1-page phase1-cockpit">
      <PageHeader
        eyebrow="Cockpit di approvazione"
        title={request.requisitionNumber}
        description={`${request.facility.name} · richiesta da ${request.requester.name}`}
      />
      <div className="phase1-cockpit-metrics">
        <div>
          <span>Importo</span>
          <strong>{formatMoney(Number(request.total))}</strong>
        </div>
        <div className={`sla-${sla.state}`}>
          <span>Attesa</span>
          <strong>{sla.ageDays} gg</strong>
          <small>
            {sla.label} · target {sla.targetDays}
          </small>
        </div>
        <div>
          <span>Data richiesta</span>
          <strong>{formatDate(approval.requestedAt)}</strong>
        </div>
        <div>
          <span>Fornitori</span>
          <strong>{supplierIds.length}</strong>
          <small>
            {nonPreferred ? `${nonPreferred} non convenzionati` : "Tutti convenzionati"}
          </small>
        </div>
      </div>
      <section
        className={
          signals.length ? "phase1-decision-reason is-warning" : "phase1-decision-reason is-ok"
        }
      >
        <div>
          <span>Perché richiede una decisione</span>
          <h2>{approval.reason}</h2>
          <p>{request.policyExplanation}</p>
        </div>
        <StatusChip variant={signals.length ? "warn" : "ok"}>
          {signals.length ? `${signals.length} verifiche` : "Coerente"}
        </StatusChip>
      </section>
      {/* CANONE.md archetipo D: chi chiede, e con le sue parole, prima di ogni
          altra cosa. La motivazione stava in fondo alla pagina, dentro il secondo
          di due blocchi che ripetevano lo stesso contenuto. */}
      <section className="decisione-richiedente">
        <div className="decisione-chi">
          <span>{request.requester.name}</span>
          <small>
            {request.facility.name} · {request.facility.area.name} · {request.costCenter.name}
          </small>
        </div>
        {request.justification ? (
          <blockquote>«{request.justification}»</blockquote>
        ) : (
          <p className="decisione-senza-motivo">
            La richiesta non porta una motivazione scritta. Se non è evidente dalle righe, chiedila
            prima di decidere.
          </p>
        )}
      </section>
      <div className="decisione-fornitori">
        {supplierContexts.map(({ supplierId, metrics }) => {
          const supplier = request.lines.find(
            (line) => line.supplierOffer.supplierId === supplierId,
          )!.supplierOffer.supplier;
          return (
            <div key={supplierId}>
              <span>Affidabilità fornitore</span>
              <strong>{supplier.name}</strong>
              <small>
                {metrics.delivered >= 5
                  ? `${formatPercent(metrics.onTimeRate)} puntuali · ${formatPercent(metrics.completeRate)} complete su ${metrics.delivered} consegne`
                  : `Dati insufficienti: solo ${metrics.delivered} consegne osservate`}{" "}
                · {metrics.issues} problemi
              </small>
            </div>
          );
        })}
      </div>
      <div className="phase1-decision-grid">
        <section>
          <div className="section-heading">
            <div>
              <h2>Cosa si sta acquistando</h2>
              <p>
                {request.lines.length} righe · consegna richiesta{" "}
                {formatDate(request.requiredByDate)}
              </p>
            </div>
          </div>
          <DataTable label="Righe richiesta">
            <thead>
              <tr>
                <th>Prodotto</th>
                <th>Prezzo normalizzato</th>
                <th>Qtà</th>
                <th>Totale</th>
              </tr>
            </thead>
            <tbody>
              {request.lines.length ? (
                request.lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <strong>{line.descriptionSnapshot}</strong>
                      <span className="cell-detail">
                        {line.supplierSnapshot} · {line.canonicalProduct.packageDescription}
                      </span>
                    </td>
                    <td>
                      <PriceBlock
                        normalizedPrice={
                          line.normalizedUnitPrice ? Number(line.normalizedUnitPrice) : null
                        }
                        normalizedUom={line.canonicalProduct.consumptionUomLabel}
                        packPrice={Number(line.unitPrice)}
                        packSize={line.canonicalProduct.packageDescription}
                        variant="table"
                      />
                    </td>
                    <td className="num-cell">{Number(line.quantity)}</td>
                    <td className="num-cell">{formatMoney(Number(line.lineTotal))}</td>
                  </tr>
                ))
              ) : (
                <EmptyRow colSpan={4}>Nessuna riga</EmptyRow>
              )}
            </tbody>
          </DataTable>
        </section>
        <aside className="phase1-budget-impact">
          <span>Impatto sul budget</span>
          <h2>{request.facility.name} · periodo corrente</h2>
          <dl>
            <div>
              <dt>Approvato</dt>
              <dd>{formatMoney(approvedBudget)}</dd>
            </div>
            <div>
              <dt>Speso + impegnato</dt>
              <dd>{formatMoney(spent + committed)}</dd>
            </div>
            <div>
              <dt>Disponibile prima</dt>
              <dd>{formatMoney(available)}</dd>
            </div>
            <div>
              <dt>Questa richiesta</dt>
              <dd>− {formatMoney(Number(request.total))}</dd>
            </div>
            <div className="total">
              <dt>Residuo dopo</dt>
              <dd className={after < 0 ? "risk" : ""}>{formatMoney(after)}</dd>
            </div>
          </dl>
          <i>
            <b
              data-livello={utilization >= 80 ? "attenzione" : "normale"}
              style={{ width: `${Math.min(100, utilization)}%` }}
            />
          </i>
          <small>{formatPercent(utilization)} del budget utilizzato dopo la decisione</small>
          {/* CANONE.md archetipo D: cosa cambia se approvi. Il budget non basta:
              conta anche quando la merce arriva in reparto. */}
          <small className="decisione-consegna">
            Consegna richiesta per il {formatDate(request.requiredByDate)}. Ogni giorno di attesa la
            sposta di un giorno.
          </small>
        </aside>
      </div>
      {signals.length > 0 && (
        <section className="phase1-evidence-band">
          <strong>Elementi da verificare</strong>
          <span>{signals.join(" ")}</span>
        </section>
      )}
      <details className="phase1-archive">
        <summary>Audit e storico della richiesta</summary>
        <div>
          {request.approvals.map((item) => (
            <div key={item.id}>
              <span>
                {formatDate(item.requestedAt)} · {item.approver.name}
              </span>
              <StatusChip
                variant={
                  item.status === "APPROVED" ? "ok" : item.status === "PENDING" ? "warn" : "neutral"
                }
              >
                {statusLabel(item.status)}
              </StatusChip>
            </div>
          ))}
        </div>
      </details>
      {approval.status === "PENDING" && (
        <form id="approval-decision" action={decideApproval} className="phase1-decision-form">
          <input type="hidden" name="approvalId" value={approval.id} />
          <label>
            Nota alla decisione
            <textarea
              name="note"
              placeholder={`Serve per rifiutare o per chiedere una modifica a ${request.requester.name.split(" ")[0]}. Per approvare non è necessaria.`}
            />
          </label>
        </form>
      )}
      {approval.status === "PENDING" && (
        <StickyActionBar
          summary={
            <>
              <strong>{formatMoney(Number(request.total))}</strong>
              <span>
                {sla.ageDays} gg di attesa · dopo la decisione restano {formatMoney(after)}
              </span>
            </>
          }
        >
          {/* L'ordine non e casuale: prima l'alternativa legittima, poi quella
              distruttiva, e ultima la primaria, che dice quanto sta approvando.
              Prima 'Rifiuta' era il primo bottone che si leggeva. */}
          <button
            form="approval-decision"
            name="decision"
            value="CLARIFICATION_REQUESTED"
            className="secondary-cta"
          >
            Chiedi una modifica a {request.requester.name.split(" ")[0]}
          </button>
          <button
            form="approval-decision"
            name="decision"
            value="REJECTED"
            className="danger-button"
          >
            Rifiuta
          </button>
          <button
            form="approval-decision"
            name="decision"
            value="APPROVED"
            data-primary="true"
            className="primary-cta"
          >
            Approva {formatMoney(Number(request.total))}
          </button>
        </StickyActionBar>
      )}
    </main>
  );
}
