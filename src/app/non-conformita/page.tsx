import Link from "next/link";
import { Prisma } from "@prisma/client";
import { resolveQualityIssueGroup } from "@/app/buying-actions";
import { EmptyState, PageHeader, Pagination, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";
import { statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

// Si paginano i GRUPPI, non i casi. Paginare i casi era il modo di nascondere la
// ripetizione invece di toglierla: venti righe identiche su tre pagine restano
// venti righe identiche.
const PAGE_SIZE = 12;
// Oltre questo tetto la pagina smette di raggruppare in memoria e lo dice.
const TETTO_CASI = 500;

const gravita = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 } as Record<string, number>;

const nomiDistinti = (allegati: { originalFilename: string }[]) =>
  new Set(allegati.map((allegato) => allegato.originalFilename)).size;

export default async function Problemi({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string; severita?: string; pagina?: string }>;
}) {
  const context = await requireRoles(["RSA_DIRECTOR", "AREA_MANAGER", "PROCUREMENT_MANAGER"]),
    scope = await resolveScope(context.assignment),
    query = await searchParams,
    page = Math.max(1, Number(query.pagina ?? 1));
  const where: Prisma.QualityIssueWhereInput = {
    purchaseOrderLine: {
      purchaseOrder: {
        organizationId: context.organization.id,
        ...(context.roleCode === "PROCUREMENT_MANAGER"
          ? {}
          : { facilityId: { in: scope.facilityIds } }),
      },
    },
    ...(query.stato ? { status: query.stato as never } : {}),
    ...(query.severita ? { severity: query.severita as never } : {}),
  };
  const [total, issues, open, review, critical, resolved] = await Promise.all([
    prisma.qualityIssue.count({ where }),
    prisma.qualityIssue.findMany({
      where,
      include: {
        attachments: true,
        purchaseOrderLine: {
          include: {
            purchaseOrder: { include: { supplier: true, facility: true } },
            canonicalProduct: true,
          },
        },
      },
      orderBy: [{ severity: "desc" }, { openedAt: "asc" }],
      take: TETTO_CASI,
    }),
    prisma.qualityIssue.count({ where: { ...where, status: "OPEN" } }),
    prisma.qualityIssue.count({ where: { ...where, status: "UNDER_REVIEW" } }),
    prisma.qualityIssue.count({
      where: {
        ...where,
        severity: { in: ["HIGH", "CRITICAL"] },
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    }),
    prisma.qualityIssue.count({ where: { ...where, status: { in: ["RESOLVED", "CLOSED"] } } }),
  ]);

  // CANONE.md archetipo B2: si raggruppa per l'entita su cui si agisce, non per il
  // record. Un problema di qualita si risolve parlando con UN fornitore di UN
  // prodotto: e quella la cosa su cui si decide.
  type Gruppo = {
    chiave: string;
    fornitore: string;
    prodotto: string;
    tipo: string;
    casi: typeof issues;
    unita: number;
    piuVecchia: Date;
    gravitaMax: string;
    strutture: Set<string>;
    aperti: number;
  };
  const perChiave = new Map<string, Gruppo>();
  for (const issue of issues) {
    const ordine = issue.purchaseOrderLine.purchaseOrder;
    const chiave = `${ordine.supplierId}|${issue.purchaseOrderLine.canonicalProductId}|${issue.issueType}`;
    const esistente = perChiave.get(chiave);
    const chiuso = ["RESOLVED", "CLOSED"].includes(issue.status);
    if (!esistente) {
      perChiave.set(chiave, {
        chiave,
        fornitore: ordine.supplier.name,
        prodotto: issue.purchaseOrderLine.canonicalProduct.name,
        tipo: issue.issueType,
        casi: [issue],
        unita: Number(issue.affectedQuantity),
        piuVecchia: issue.openedAt,
        gravitaMax: issue.severity,
        strutture: new Set([ordine.facility.name]),
        aperti: chiuso ? 0 : 1,
      });
      continue;
    }
    esistente.casi.push(issue);
    esistente.unita += Number(issue.affectedQuantity);
    if (issue.openedAt < esistente.piuVecchia) esistente.piuVecchia = issue.openedAt;
    if ((gravita[issue.severity] ?? 0) > (gravita[esistente.gravitaMax] ?? 0))
      esistente.gravitaMax = issue.severity;
    esistente.strutture.add(ordine.facility.name);
    if (!chiuso) esistente.aperti += 1;
  }
  const gruppi = [...perChiave.values()].sort(
    (a, b) =>
      (gravita[b.gravitaMax] ?? 0) - (gravita[a.gravitaMax] ?? 0) ||
      b.casi.length - a.casi.length ||
      a.piuVecchia.getTime() - b.piuVecchia.getTime(),
  );
  const pages = Math.max(1, Math.ceil(gruppi.length / PAGE_SIZE));
  const visibili = gruppi.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="phase2-page phase2-issues">
      <PageHeader
        eyebrow="Qualità fornitura"
        title="Non conformità"
        description={
          gruppi.length === total
            ? `${total} casi, uno per problema`
            : `${total} casi raggruppati in ${gruppi.length} problemi: stesso fornitore, stesso prodotto, stessa difformità`
        }
      />
      <section className="phase2-summary-strip">
        {open > 0 && (
          <div>
            <span>Aperte</span>
            <strong>{open}</strong>
            <small>Da assegnare o valutare</small>
          </div>
        )}
        {review > 0 && (
          <div>
            <span>In valutazione</span>
            <strong>{review}</strong>
            <small>Con owner operativo</small>
          </div>
        )}
        {critical > 0 && (
          <div>
            <span>Alta priorità</span>
            <strong>{critical}</strong>
            <small>Aperte o in valutazione</small>
          </div>
        )}
        {resolved > 0 && (
          <div>
            <span>Risolte</span>
            <strong>{resolved}</strong>
            <small>Nel filtro corrente</small>
          </div>
        )}
      </section>
      {total > TETTO_CASI && (
        <p className="phase2-tetto" role="status">
          Sto raggruppando i primi {TETTO_CASI} casi su {total}. Restringi con i filtri per vederli
          tutti.
        </p>
      )}
      <form className="phase2-control-bar">
        <select name="stato" defaultValue={query.stato ?? ""}>
          <option value="">Tutti gli stati</option>
          <option value="OPEN">Aperte</option>
          <option value="UNDER_REVIEW">In valutazione</option>
          <option value="RESOLVED">Risolte</option>
          <option value="CLOSED">Chiuse</option>
        </select>
        <select name="severita" defaultValue={query.severita ?? ""}>
          <option value="">Tutte le gravità</option>
          <option value="CRITICAL">Critica</option>
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Media</option>
          <option value="LOW">Bassa</option>
        </select>
        <button className="secondary-cta">Filtra</button>
      </form>
      {visibili.length ? (
        <section className="phase2-issue-list">
          {visibili.map((gruppo) => {
            const uno = gruppo.casi.length === 1;
            const primo = gruppo.casi[0];
            const allegati = gruppo.casi.flatMap((caso) => caso.attachments);
            return (
              <article key={gruppo.chiave}>
                <header>
                  <div>
                    <span>
                      {statusLabel(gruppo.tipo)} · {gruppo.fornitore}
                    </span>
                    <h2>{gruppo.prodotto}</h2>
                    <p>
                      {uno
                        ? primo.description
                        : `${gruppo.casi.length} casi uguali, ${gruppo.unita} unità in tutto. Il più vecchio è aperto dal ${formatDate(gruppo.piuVecchia)}.`}
                    </p>
                  </div>
                  <StatusChip
                    variant={
                      gruppo.aperti === 0
                        ? "ok"
                        : gruppo.gravitaMax === "CRITICAL"
                          ? "danger"
                          : "warn"
                    }
                  >
                    {statusLabel(gruppo.gravitaMax)} ·{" "}
                    {gruppo.aperti === 0 ? "Tutti chiusi" : `${gruppo.aperti} aperti`}
                  </StatusChip>
                </header>
                <div className="phase2-issue-meta">
                  <span>
                    {gruppo.strutture.size === 1
                      ? [...gruppo.strutture][0]
                      : `${gruppo.strutture.size} strutture`}
                  </span>
                  <span>{gruppo.unita} unità</span>
                  <span>Dal {formatDate(gruppo.piuVecchia)}</span>
                  {gruppo.casi.slice(0, 6).map((caso) => (
                    <Link key={caso.id} href={`/orders/${caso.purchaseOrderLine.purchaseOrder.id}`}>
                      {caso.purchaseOrderLine.purchaseOrder.poNumber}
                    </Link>
                  ))}
                  {gruppo.casi.length > 6 && <span>e altri {gruppo.casi.length - 6} ordini</span>}
                </div>
                {allegati.length > 0 && (
                  <div className="phase2-attachments">
                    {/* I nomi erano tutti uguali: quattro chip identiche piu un
                        contatore non sono informazione, sono la stessa ripetizione
                        in piccolo. O si mostrano i nomi distinti, o il conteggio. */}
                    {nomiDistinti(allegati) <= 3 ? (
                      <>
                        {allegati.slice(0, 3).map((attachment) => (
                          <Link key={attachment.id} href={`/attachments/${attachment.id}`}>
                            {attachment.originalFilename}
                          </Link>
                        ))}
                        {allegati.length > 3 && <span>e altre {allegati.length - 3}</span>}
                      </>
                    ) : (
                      <Link href={`/attachments/${allegati[0].id}`}>
                        {allegati.length} evidenze allegate
                      </Link>
                    )}
                  </div>
                )}
                {context.roleCode === "PROCUREMENT_MANAGER" && gruppo.aperti > 0 && (
                  <form action={resolveQualityIssueGroup} className="phase2-resolution-form">
                    {gruppo.casi
                      .filter((caso) => !["RESOLVED", "CLOSED"].includes(caso.status))
                      .map((caso) => (
                        <input key={caso.id} type="hidden" name="issueId" value={caso.id} />
                      ))}
                    <select name="status" aria-label="Decisione">
                      <option value="UNDER_REVIEW">Prendi in carico</option>
                      <option value="RESOLVED">Risolvi</option>
                      <option value="CLOSED">Chiudi</option>
                    </select>
                    <select name="resolutionType" aria-label="Esito">
                      <option value="replacement">Sostituzione</option>
                      <option value="credit">Nota di credito attesa</option>
                      <option value="accepted">Accettato</option>
                      <option value="rejected">Contestato</option>
                    </select>
                    <input name="note" placeholder="Nota di risoluzione" />
                    <button className="secondary-cta">
                      {uno ? "Salva decisione" : `Decidi per tutti e ${gruppo.aperti}`}
                    </button>
                  </form>
                )}
              </article>
            );
          })}
          <Pagination
            page={Math.min(page, pages)}
            pages={pages}
            pathname="/non-conformita"
            params={{ stato: query.stato, severita: query.severita }}
          />
        </section>
      ) : (
        <EmptyState
          title="Nessuna non conformità"
          description="Le difformità registrate in ricezione compariranno qui con evidenze e stato."
        />
      )}
    </main>
  );
}
