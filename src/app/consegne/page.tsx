import Link from "next/link";
import { draftSupplierReminder, draftSupplierReminderGroup } from "@/app/buying-actions";
import { Num, PageHeader, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";
import { startOfDay } from "@/lib/procurement/kpi-definitions";
import { statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

// Sopra questa soglia il fornitore smette di essere una riga e diventa un gruppo:
// due ritardi si leggono, sedici no.
const RITARDI_PER_RAGGRUPPARE = 2;

type Ordine = {
  id: string;
  poNumber: string;
  expectedDeliveryDate: Date;
  total: unknown;
  supplierId: string;
  supplier: { name: string };
};

function perFornitore<T extends Ordine>(ordini: T[]) {
  const per = new Map<string, T[]>();
  for (const ordine of ordini) {
    const lista = per.get(ordine.supplierId) ?? [];
    lista.push(ordine);
    per.set(ordine.supplierId, lista);
  }
  const bundle = [];
  const singoli: T[] = [];
  for (const [supplierId, lista] of per) {
    if (lista.length > RITARDI_PER_RAGGRUPPARE) {
      const ordinati = [...lista].sort(
        (a, b) => a.expectedDeliveryDate.getTime() - b.expectedDeliveryDate.getTime(),
      );
      bundle.push({
        supplierId,
        supplier: ordinati[0].supplier.name,
        orders: ordinati,
        total: ordinati.reduce((somma, ordine) => somma + Number(ordine.total), 0),
      });
    } else {
      singoli.push(...lista);
    }
  }
  bundle.sort((a, b) => b.orders.length - a.orders.length);
  return { bundle, singoli };
}

export default async function Consegne() {
  const context = await requireRoles(["RSA_DIRECTOR", "AREA_MANAGER"]),
    scope = await resolveScope(context.assignment),
    today = startOfDay(new Date()),
    tomorrow = new Date(today.getTime() + 86_400_000);
  const [active, received] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: {
        facilityId: { in: scope.facilityIds },
        status: { notIn: ["RECEIVED", "CANCELLED"] },
      },
      include: { supplier: true, facility: true, _count: { select: { lines: true } } },
      orderBy: { expectedDeliveryDate: "asc" },
      take: 40,
    }),
    prisma.purchaseOrder.findMany({
      where: { facilityId: { in: scope.facilityIds }, status: "RECEIVED" },
      include: { supplier: true, facility: true, _count: { select: { lines: true } } },
      orderBy: { expectedDeliveryDate: "desc" },
      take: 12,
    }),
  ]);
  const overdue = active.filter((order) => order.expectedDeliveryDate < today),
    dueToday = active.filter(
      (order) => order.expectedDeliveryDate >= today && order.expectedDeliveryDate < tomorrow,
    ),
    upcoming = active.filter((order) => order.expectedDeliveryDate >= tomorrow);
  const groups = [
    { key: "overdue", title: "In ritardo", items: overdue, variant: "danger" as const },
    { key: "today", title: "Oggi", items: dueToday, variant: "warn" as const },
    { key: "upcoming", title: "Prossime", items: upcoming, variant: "neutral" as const },
  ];
  return (
    <main className="phase2-page phase2-deliveries">
      <PageHeader
        eyebrow="Operatività"
        title="Consegne"
        description={`${active.length} consegne operative · ${overdue.length} in ritardo · ${scope.label}`}
      />
      <section className="phase2-summary-strip">
        <div>
          <span>In ritardo</span>
          <strong>{overdue.length}</strong>
          <small>Richiedono sollecito o ricezione</small>
        </div>
        <div>
          <span>Oggi</span>
          <strong>{dueToday.length}</strong>
          <small>Da verificare</small>
        </div>
        <div>
          <span>Prossime</span>
          <strong>{upcoming.length}</strong>
          <small>Programmate</small>
        </div>
        <div>
          <span>Ricevute recenti</span>
          <strong>{received.length}</strong>
          <small>Archivio secondario</small>
        </div>
      </section>
      {groups
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section className="phase2-queue" key={group.key}>
            <div className="section-heading">
              <div>
                <h2>{group.title}</h2>
                <p>
                  {group.key === "overdue"
                    ? "Contatta il fornitore o registra la merce già arrivata."
                    : group.key === "today"
                      ? "Conferma l’arrivo appena verificato."
                      : "Consegne pianificate in ordine cronologico."}
                </p>
              </div>
              <StatusChip variant={group.variant}>{group.items.length}</StatusChip>
            </div>
            <div className="phase2-operational-rows">
              {/* CANONE.md archetipo B2: quaranta ritardi dello stesso fornitore sono
                una conversazione con quel fornitore, non quaranta righe. Sopra due
                ordini il fornitore diventa una riga sola. */}
              {perFornitore(group.items).bundle.map((bundle) => (
                <article key={`b-${bundle.supplierId}`} className="phase2-bundle">
                  <div>
                    <strong>{bundle.supplier}</strong>
                    <span>
                      {bundle.orders.length} consegne in ritardo, dal{" "}
                      {formatDate(bundle.orders[0].expectedDeliveryDate)}
                    </span>
                    <small>
                      {bundle.orders
                        .slice(0, 5)
                        .map((order) => order.poNumber)
                        .join(" · ")}
                      {bundle.orders.length > 5 ? ` e altri ${bundle.orders.length - 5}` : ""}
                    </small>
                  </div>
                  <div className="num-cell">
                    <Num value={bundle.total} kind="currency" />
                  </div>
                  <StatusChip variant={group.variant}>{bundle.orders.length}</StatusChip>
                  <div className="phase2-row-actions">
                    {group.key === "overdue" && (
                      <form action={draftSupplierReminderGroup}>
                        {bundle.orders.map((order) => (
                          <input key={order.id} type="hidden" name="poId" value={order.id} />
                        ))}
                        <button className="secondary-cta">
                          Sollecita {bundle.supplier} per tutte e {bundle.orders.length}
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
              {perFornitore(group.items).singoli.length ||
              perFornitore(group.items).bundle.length ? (
                perFornitore(group.items).singoli.map((order) => (
                  <article key={order.id}>
                    <Link href={`/orders/${order.id}`}>
                      <strong>{order.poNumber}</strong>
                      <span>{order.supplier.name}</span>
                      <small>
                        {order.facility.name} · {order._count.lines} righe
                      </small>
                    </Link>
                    <div className="num-cell">
                      <strong>{formatDate(order.expectedDeliveryDate)}</strong>
                      <Num value={Number(order.total)} kind="currency" />
                    </div>
                    <StatusChip variant={group.variant}>{statusLabel(order.status)}</StatusChip>
                    <div className="phase2-row-actions">
                      {group.key === "overdue" && (
                        <form action={draftSupplierReminder}>
                          <input type="hidden" name="poId" value={order.id} />
                          <button className="secondary-cta">Prepara sollecito</button>
                        </form>
                      )}
                      {context.roleCode === "RSA_DIRECTOR" && (
                        <Link
                          className={group.key === "overdue" ? "ghost-cta" : "secondary-cta"}
                          href={`/orders/${order.id}/receive`}
                        >
                          Ricevi
                        </Link>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <p className="quiet-empty">Nessuna consegna in questa sezione.</p>
              )}
            </div>
          </section>
        ))}
      <details className="phase2-secondary-section">
        <summary>
          Ricevute recentemente <span>{received.length}</span>
        </summary>
        <div className="phase2-operational-rows">
          {received.map((order) => (
            <article key={order.id}>
              <Link href={`/orders/${order.id}`}>
                <strong>{order.poNumber}</strong>
                <span>{order.supplier.name}</span>
                <small>{order.facility.name}</small>
              </Link>
              <div className="num-cell">
                <strong>{formatDate(order.expectedDeliveryDate)}</strong>
                <Num value={Number(order.total)} kind="currency" />
              </div>
              <StatusChip variant="ok">Ricevuto</StatusChip>
            </article>
          ))}
        </div>
      </details>
    </main>
  );
}
