import Link from "next/link";
import { addProposalToCart } from "@/app/buying-actions";
import { ArrowIcon } from "@/components/icons";
import { ProductImage } from "@/components/product-image";
import { Metric, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, formatPercent } from "@/lib/pricing";
import { getFacilityBudget } from "@/lib/procurement/budget";
import { preferredSpendShare } from "@/lib/procurement/preferred-spend";
import { statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

export default async function Home() {
  const context = await getCurrentUser();
  const scope = await resolveScope(context.assignment);
  if (context.roleCode === "RSA_DIRECTOR")
    return (
      <Director
        name={context.user.name}
        organizationId={context.organization.id}
        facilityId={scope.id}
        facility={scope.label}
      />
    );
  if (context.roleCode === "AREA_MANAGER")
    return <Area name={context.user.name} ids={scope.facilityIds} label={scope.label} />;
  if (context.roleCode === "PROCUREMENT_MANAGER")
    return (
      <Procurement name={context.user.name} organizationId={context.assignment.organizationId} />
    );
  if (context.roleCode === "FINANCE_CONTROLLER") {
    const [committed, received, open] = await Promise.all([
      prisma.purchaseOrder.aggregate({
        _sum: { total: true },
        where: { status: { not: "CANCELLED" } },
      }),
      prisma.purchaseOrder.aggregate({
        _sum: { total: true },
        where: { status: "RECEIVED" },
      }),
      prisma.purchaseOrder.count({
        where: {
          status: { in: ["ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"] },
        },
      }),
    ]);
    return (
      <main>
        <PageHeader
          eyebrow="Controllo finanziario"
          title="Impegni e ricezioni"
          description="Visibilità sugli acquisti prima dell’arrivo del ciclo fattura."
        />
        <div className="metrics-grid three">
          <Metric label="Spesa impegnata" value={formatMoney(Number(committed._sum.total ?? 0))} />
          <Metric label="Merce ricevuta" value={formatMoney(Number(received._sum.total ?? 0))} />
          <Metric label="Ordini aperti" value={open} />
        </div>
        <section className="future-panel">
          <h2>Prossima attivazione: riconciliazione fatture</h2>
          <p>
            Acquisizione fatture e controllo a tre vie non sono ancora operativi. I valori mostrati
            derivano da ordini e ricezioni reali della demo.
          </p>
        </section>
      </main>
    );
  }
  if (context.roleCode === "EXECUTIVE_SPONSOR")
    return (
      <main>
        <PageHeader
          eyebrow="Direzione"
          title="Control Tower"
          description="Prestazioni, rischi e opportunità del procurement congiunto."
        />
        <Link className="primary-cta" href="/control-tower">
          Apri la Control Tower <ArrowIcon />
        </Link>
      </main>
    );
  return (
    <main>
      <PageHeader
        eyebrow="Amministrazione"
        title={`Buongiorno, ${context.user.name.split(" ")[0]}`}
        description="Organizzazione, identità, perimetri e dati di base del procurement."
      />
      <div className="metrics-grid three">
        <Metric label="Utenti" value={await prisma.user.count()} />
        <Metric label="Strutture" value={await prisma.facility.count()} />
        <Metric
          label="Deleghe attive"
          value={await prisma.approvalDelegation.count({
            where: { active: true },
          })}
        />
      </div>
    </main>
  );
}

async function Director({
  name,
  organizationId,
  facilityId,
  facility,
}: {
  name: string;
  organizationId: string;
  facilityId: string;
  facility: string;
}) {
  const budget = await getFacilityBudget(facilityId);
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const [requests, pending, todayDeliveries, late, issues, frequent] = await Promise.all([
    prisma.purchaseRequisition.count({
      where: {
        facilityId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
        },
      },
    }),
    prisma.purchaseRequisition.count({
      where: { facilityId, status: "PENDING_APPROVAL" },
    }),
    prisma.purchaseOrder.count({
      where: {
        facilityId,
        expectedDeliveryDate: { gte: dayStart, lt: dayEnd },
        status: { not: "RECEIVED" },
      },
    }),
    prisma.purchaseOrder.count({
      where: {
        facilityId,
        expectedDeliveryDate: { lt: dayStart },
        status: { in: ["ISSUED", "ACKNOWLEDGED"] },
      },
    }),
    prisma.qualityIssue.count({
      where: {
        purchaseOrderLine: { purchaseOrder: { facilityId } },
        status: { in: ["OPEN", "UNDER_REVIEW"] },
      },
    }),
    prisma.purchaseRequisitionLine.groupBy({
      by: ["canonicalProductId"],
      where: { requisition: { facilityId, status: "APPROVED" } },
      _count: true,
      _sum: { quantity: true },
      orderBy: { _count: { canonicalProductId: "desc" } },
      take: 8,
    }),
  ]);
  // Terzo difetto di plurale trovato in tre pagine: '1 richieste', '1 volte',
  // '1 righe'. L'etichetta porta entrambe le forme invece di arrangiarsi con la s.
  const tasks = [
    {
      value: pending,
      one: "richiesta in approvazione",
      many: "richieste in approvazione",
      href: "/richieste",
    },
    {
      value: todayDeliveries,
      one: "consegna prevista oggi",
      many: "consegne previste oggi",
      href: "/consegne",
    },
    { value: late, one: "ordine in ritardo", many: "ordini in ritardo", href: "/consegne" },
    { value: issues, one: "problema aperto", many: "problemi aperti", href: "/non-conformita" },
  ].filter(({ value }) => value > 0);
  const products = await prisma.canonicalProduct.findMany({
    where: {
      organizationId,
      id: { in: frequent.map(({ canonicalProductId }) => canonicalProductId) },
    },
    include: {
      category: true,
      offers: {
        where: { active: true },
        orderBy: { preferred: "desc" },
        take: 1,
      },
    },
  });

  // CANONE.md Legge 2: la home propone, non chiede. La proposta nasce da quello che
  // questa struttura ha gia riordinato: quante volte, e in che quantita tipica. Non e
  // una previsione, e una media dichiarata — Legge 3, ogni numero dice da dove viene.
  // Un prodotto ordinato una volta sola non e un riordino abituale: e un acquisto
  // straordinario, e proporne diciassette ogni mese sarebbe un danno. Serve una storia.
  const MINIMO_RIORDINI = 3;
  const proposal = frequent
    .map((row) => {
      const product = products.find(({ id }) => id === row.canonicalProductId);
      const offer = product?.offers[0];
      if (!product || !offer) return null;
      const times = typeof row._count === "number" ? row._count : 0;
      const totalQuantity = Number(row._sum.quantity ?? 0);
      const quantity = Math.max(1, Math.round(totalQuantity / Math.max(1, times)));
      const unitPrice = Number(offer.unitPrice);
      return { product, offer, times, quantity, unitPrice, lineTotal: unitPrice * quantity };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null)
    .filter((line) => line.times >= MINIMO_RIORDINI);
  const proposalTotal = proposal.reduce((sum, line) => sum + line.lineTotal, 0);
  const month = today.toLocaleDateString("it-IT", { month: "long" });
  // Al massimo due: il canone vieta piu di due inviti su una pagina che ne ha gia uno.
  const decisions = tasks.slice(0, 2);
  return (
    <main className="phase1-page phase1-home">
      <section className="proposta">
        <div className="proposta-corpo">
          <p className="eyebrow">
            {facility} · riordino di {month}
          </p>
          <h1>
            {proposal.length
              ? `Il tuo riordino di ${month} è pronto, ${name.split(" ")[0]}.`
              : `Non ho ancora abbastanza storico per proporti un riordino.`}
          </h1>
          {proposal.length ? (
            <>
              <p className="proposta-sommario">
                {proposal.length} articoli, presi da quello che {facility} ha riordinato almeno{" "}
                {MINIMO_RIORDINI} volte con richieste approvate. Ogni riga dice quante volte e in
                che quantità tipica.
              </p>
              <ul className="proposta-righe">
                {proposal.map((line) => (
                  <li key={line.product.id}>
                    <ProductImage
                      name={line.product.name}
                      categoryCode={line.product.category.code}
                      className="product-packshot-riga"
                    />
                    <div className="proposta-identita">
                      <Link href={`/products/${line.product.id}`}>{line.product.name}</Link>
                      <small>
                        {line.product.brand} · {line.product.packageDescription}
                      </small>
                    </div>
                    <span className="proposta-perche">
                      ordinato {line.times} {line.times === 1 ? "volta" : "volte"} · di solito{" "}
                      {line.quantity}
                    </span>
                    <span className="proposta-quantita">{line.quantity}</span>
                    <span className="proposta-importo">{formatMoney(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="proposta-sommario">
              Servono alcune richieste approvate prima che possa riconoscere cosa riordini. Nel
              frattempo cerca quello che ti serve: da lì in avanti imparo.
            </p>
          )}
        </div>

        <aside className="proposta-scheda">
          <p>Totale della proposta</p>
          <strong>{formatMoney(proposalTotal)}</strong>
          <dl>
            <div>
              <dt>Righe</dt>
              <dd>{proposal.length}</dd>
            </div>
            <div>
              <dt>Budget disponibile</dt>
              <dd>{formatMoney(budget.available)}</dd>
            </div>
          </dl>
          {proposal.length ? (
            <form action={addProposalToCart}>
              {proposal.map((line) => (
                <div key={line.offer.id} hidden>
                  <input type="hidden" name="offerId" value={line.offer.id} />
                  <input type="hidden" name="quantity" value={line.quantity} />
                </div>
              ))}
              <button data-primary="true" className="primary-cta">
                Prepara il riordino
              </button>
            </form>
          ) : (
            <Link href="/catalog" data-primary="true" className="primary-cta">
              Cerca un prodotto
            </Link>
          )}
          <Link href="/catalog" className="proposta-secondaria">
            Scegli riga per riga
          </Link>
          <small>
            Nulla parte da qui: la proposta finisce nel carrello, e la richiesta la invii tu dopo
            averla rivista.
          </small>
        </aside>
      </section>

      {decisions.length > 0 && (
        <section className="decisioni">
          <p className="eyebrow">Serve una tua decisione</p>
          {decisions.map((task) => (
            <Link href={task.href} key={task.many}>
              <strong>
                {task.value} {task.value === 1 ? task.one : task.many}
              </strong>
              <ArrowIcon />
            </Link>
          ))}
        </section>
      )}
      <section className="budget-cockpit">
        <div>
          <p>Budget disponibile</p>
          <strong>{formatMoney(budget.available)}</strong>
          <span>
            su {formatMoney(budget.approved)} approvati · {formatPercent(budget.utilization)}{" "}
            utilizzato
          </span>
          <i>
            <b
              data-livello={budget.utilization >= 80 ? "attenzione" : "normale"}
              style={{ width: `${Math.min(100, budget.utilization)}%` }}
            />
          </i>
        </div>
        <dl>
          <div>
            <dt>Speso</dt>
            <dd>{formatMoney(budget.actual)}</dd>
          </div>
          <div>
            <dt>Impegnato</dt>
            <dd>{formatMoney(budget.committed)}</dd>
          </div>
          <div>
            <dt>Riservato</dt>
            <dd>{formatMoney(budget.reserved)}</dd>
          </div>
          <div>
            <dt>Richieste del mese</dt>
            <dd>{requests}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

async function Area({ name, ids, label }: { name: string; ids: string[]; label: string }) {
  const [budgets, orders, approvals, issues, facilities] = await Promise.all([
    prisma.budget.findMany({
      where: { facilityId: { in: ids }, status: "ACTIVE" },
    }),
    prisma.purchaseOrder.findMany({
      where: { facilityId: { in: ids }, status: { not: "CANCELLED" } },
    }),
    prisma.approvalRequest.count({
      where: { approver: { name }, status: "PENDING" },
    }),
    prisma.qualityIssue.count({
      where: {
        purchaseOrderLine: { purchaseOrder: { facilityId: { in: ids } } },
        status: { in: ["OPEN", "UNDER_REVIEW"] },
      },
    }),
    prisma.facility.findMany({
      where: { id: { in: ids } },
      include: { budgets: true, purchaseOrders: true },
    }),
  ]);
  const approved = budgets.reduce((sum, budget) => sum + Number(budget.approvedAmount), 0);
  const committed = orders.reduce((sum, order) => sum + Number(order.total), 0);
  return (
    <main>
      <PageHeader
        eyebrow="Home area"
        title={`Buongiorno, ${name.split(" ")[0]}`}
        description={`${label} · ${ids.length} strutture nel tuo perimetro`}
      />
      <section className="today-panel">
        <header>
          <p className="eyebrow">Decisioni</p>
          <h2>Cosa richiede attenzione</h2>
        </header>
        <div>
          <Link href="/approvals">
            <strong>{approvals}</strong>
            <span>approvazioni da decidere</span>
          </Link>
          <Link href="/non-conformita">
            <strong>{issues}</strong>
            <span>problemi aperti</span>
          </Link>
          <Link href="/consegne">
            <strong>
              {
                orders.filter(
                  (order) =>
                    order.expectedDeliveryDate < new Date() &&
                    ["ISSUED", "ACKNOWLEDGED"].includes(order.status),
                ).length
              }
            </strong>
            <span>consegne in ritardo</span>
          </Link>
        </div>
      </section>
      <div className="metrics-grid three">
        <Metric label="Budget area" value={formatMoney(approved)} />
        <Metric label="Impegnato" value={formatMoney(committed)} />
        <Metric label="Disponibile" value={formatMoney(approved - committed)} />
      </div>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Utilizzo</p>
            <h2>Strutture dell’area</h2>
          </div>
        </div>
        {facilities.map((facility) => {
          const budget = facility.budgets.reduce(
            (sum, item) => sum + Number(item.approvedAmount),
            0,
          );
          const spend = facility.purchaseOrders.reduce(
            (sum, order) => sum + Number(order.total),
            0,
          );
          return (
            <Link href={`/facilities/${facility.id}`} className="facility-util" key={facility.id}>
              <strong>{facility.name}</strong>
              <i>
                <b
                  style={{
                    width: `${Math.min(100, (spend / Math.max(budget, 1)) * 100)}%`,
                  }}
                />
              </i>
              <span>
                {formatMoney(spend)} / {formatMoney(budget)}
              </span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}

async function Procurement({ name, organizationId }: { name: string; organizationId: string }) {
  const [
    spend,
    requisitions,
    orders,
    suppliers,
    offers,
    issues,
    exceptions,
    delayed,
    priorityRequests,
    priorityIssues,
    priorityDeliveries,
    importQueue,
  ] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        status: { not: "CANCELLED" },
        issuedAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
      include: { lines: true },
    }),
    prisma.purchaseRequisition.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.purchaseOrder.count({
      where: {
        status: {
          in: ["ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED", "ISSUE"],
        },
      },
    }),
    prisma.supplier.count({ where: { organizationId, active: true } }),
    prisma.supplierOffer.findMany({ where: { organizationId, active: true } }),
    prisma.qualityIssue.count({
      where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
    }),
    prisma.purchaseRequisition.count({
      where: {
        policyDecision: "PROCUREMENT_APPROVAL",
        status: "PENDING_APPROVAL",
      },
    }),
    prisma.purchaseOrder.count({
      where: {
        expectedDeliveryDate: { lt: new Date() },
        status: { in: ["ISSUED", "ACKNOWLEDGED"] },
      },
    }),
    prisma.purchaseRequisition.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: { facility: true },
      orderBy: { submittedAt: "asc" },
      take: 2,
    }),
    prisma.qualityIssue.findMany({
      where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
      include: {
        purchaseOrderLine: {
          include: { purchaseOrder: { include: { supplier: true } } },
        },
      },
      orderBy: { openedAt: "asc" },
      take: 2,
    }),
    prisma.purchaseOrder.findMany({
      where: {
        expectedDeliveryDate: { lt: new Date() },
        status: { in: ["ISSUED", "ACKNOWLEDGED"] },
      },
      include: { supplier: true },
      orderBy: { expectedDeliveryDate: "asc" },
      take: 2,
    }),
    prisma.importJob.findMany({
      where: {
        sourceDocument: { organizationId },
        status: {
          in: ["NEEDS_REVIEW", "READY_TO_PUBLISH", "FAILED", "REQUIRES_PROVIDER"],
        },
      },
      include: { sourceDocument: { include: { supplier: true } } },
      orderBy: [{ reviewRequiredRecords: "desc" }, { createdAt: "asc" }],
      take: 3,
    }),
  ]);
  const observedSpend = spend.reduce((sum, order) => sum + Number(order.total), 0);
  const compliance = preferredSpendShare(
    spend.flatMap((order) =>
      order.lines.map((line) => ({
        supplierId: order.supplierId,
        canonicalProductId: line.canonicalProductId,
        amount: line.lineTotal,
      })),
    ),
    offers
      .filter((offer) => offer.preferred)
      .map((offer) => `${offer.supplierId}:${offer.canonicalProductId}`),
  );
  const offerGroups = new Map<string, typeof offers>();
  for (const offer of offers)
    offerGroups.set(offer.canonicalProductId, [
      ...(offerGroups.get(offer.canonicalProductId) ?? []),
      offer,
    ]);
  const priceAnomalies = [...offerGroups.values()].filter(
    (group) =>
      group.length > 1 &&
      Math.max(...group.map((offer) => Number(offer.normalizedUnitPrice))) /
        Math.max(0.0001, Math.min(...group.map((offer) => Number(offer.normalizedUnitPrice)))) >
        1.1,
  ).length;
  return (
    <main>
      <PageHeader
        eyebrow="Centro di controllo Procurement"
        title={`Buongiorno, ${name.split(" ")[0]}`}
        description="Prima le decisioni: eccezioni, ritardi e opportunità commerciali dell’intera rete."
      />
      <section className="attention-command">
        <header>
          <p className="eyebrow">Cosa richiede attenzione</p>
          <h2>Coda operativa</h2>
        </header>
        <div>
          <Link href="/approvals">
            <b>{requisitions}</b>
            <strong>Approvazioni ed eccezioni</strong>
            <span>{exceptions} sopra la soglia Procurement</span>
          </Link>
          <Link href="/consegne">
            <b>{delayed}</b>
            <strong>Consegne in ritardo</strong>
            <span>Ordini da sollecitare</span>
          </Link>
          <Link href="/non-conformita">
            <b>{issues}</b>
            <strong>Non conformità aperte</strong>
            <span>Qualità e quantità da risolvere</span>
          </Link>
          <Link href="/compare">
            <b>{priceAnomalies}</b>
            <strong>{priceAnomalies ? "Anomalie di prezzo" : "Prezzi sotto controllo"}</strong>
            <span>
              {priceAnomalies ? "Spread superiore al 10%" : "Nessuna anomalia significativa"}
            </span>
          </Link>
          {importQueue.length > 0 && (
            <Link href="/imports">
              <b>{importQueue.length}</b>
              <strong>Importazioni da verificare</strong>
              <span>
                {importQueue.reduce((sum, job) => sum + job.reviewRequiredRecords, 0)} eccezioni nei
                documenti
              </span>
            </Link>
          )}
        </div>
      </section>
      <div className="attention-details">
        {importQueue.map((job) => (
          <Link href={`/imports/${job.id}?filtro=attention`} key={job.id}>
            <span>Importazione</span>
            <strong>
              {job.sourceDocument.supplier?.name ?? "Fornitore da confermare"} ·{" "}
              {job.sourceDocument.originalFilename}
            </strong>
            <b>{job.reviewRequiredRecords} eccezioni</b>
          </Link>
        ))}
        {priorityRequests.map((request) => (
          <Link href="/approvals" key={request.id}>
            <span>Approvazione</span>
            <strong>
              {request.requisitionNumber} · {request.facility.name}
            </strong>
            <b>{formatMoney(Number(request.total))}</b>
          </Link>
        ))}
        {priorityDeliveries.map((order) => (
          <Link href={`/orders/${order.id}`} key={order.id}>
            <span>Consegna in ritardo</span>
            <strong>
              {order.poNumber} · {order.supplier.name}
            </strong>
            <b>{formatDate(order.expectedDeliveryDate)}</b>
          </Link>
        ))}
        {priorityIssues.map((issue) => (
          <Link href="/non-conformita" key={issue.id}>
            <span>Non conformità</span>
            <strong>
              {issue.purchaseOrderLine.purchaseOrder.supplier.name} · {statusLabel(issue.severity)}
            </strong>
            <b>{formatDate(issue.openedAt)}</b>
          </Link>
        ))}
      </div>
      <div className="metrics-grid four">
        <Metric label="Spesa osservata da inizio anno" value={formatMoney(observedSpend)} />
        <Metric label="Ordini aperti" value={orders} />
        <Metric label="Fornitori attivi" value={suppliers} />
        <Metric label="Conformità ai convenzionati" value={formatPercent(compliance)} />
      </div>
      <div className="opportunity-links">
        <Link href="/compare">
          <span>Analisi prezzi</span>
          <strong>Armonizza i prezzi dello stesso prodotto</strong>
          <ArrowIcon />
        </Link>
        <Link href="/categorie">
          <span>Gestione categorie</span>
          <strong>Concentrazione e copertura fornitori</strong>
          <ArrowIcon />
        </Link>
        <Link href="/suppliers">
          <span>Gestione fornitori</span>
          <strong>Prestazioni di consegna e qualità</strong>
          <ArrowIcon />
        </Link>
      </div>
    </main>
  );
}
