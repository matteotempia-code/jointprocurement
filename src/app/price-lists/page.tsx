import Link from "next/link";
import { ChevronIcon } from "@/components/icons";
import { DataTable, EmptyRow, Num, PageHeader, Pagination, SearchField, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";

const PAGE_SIZE = 20;

export default async function Listini({ searchParams }: { searchParams: Promise<{ q?: string; stato?: string; pagina?: string }> }) {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.pagina ?? "1", 10) || 1);
  const where = {
    ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" as const } }, { supplier: { name: { contains: query.q, mode: "insensitive" as const } } }] } : {}),
    ...(query.stato === "active" ? { active: true } : query.stato === "history" ? { active: false } : {}),
  };
  const [total, lists] = await Promise.all([
    prisma.priceList.count({ where }),
    prisma.priceList.findMany({ where, include: { supplier: true, sourceDocument: true, _count: { select: { offers: true } } }, orderBy: [{ active: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <main className="phase2-page phase2-list-page">
    <PageHeader eyebrow="Dati commerciali" title="Listini" description={`${total} versioni nel filtro · validità e fonte verificabili`} action={<Link className="primary-cta" href="/imports/new">Importa listino</Link>} />
    <form className="phase2-control-bar"><SearchField defaultValue={query.q} placeholder="Listino o fornitore" /><select name="stato" defaultValue={query.stato ?? "all"}><option value="all">Attivi e storici</option><option value="active">Solo attivi</option><option value="history">Solo storici</option></select><button className="secondary-cta">Applica</button></form>
    <section className="phase2-queue"><div className="section-heading"><div><h2>Versioni commerciali</h2><p>Gli storici restano consultabili senza dominare il lavoro corrente.</p></div><span>{lists.length} mostrati su {total}</span></div>
      <DataTable label="Listini fornitori"><thead><tr><th>Listino</th><th>Fornitore</th><th>Versione</th><th>Validità</th><th>Stato</th><th className="num-cell">Offerte</th><th>Fonte</th><th /></tr></thead><tbody>{lists.length ? lists.map((list) => <tr key={list.id}><td><Link className="table-link" href={`/price-lists/${list.id}`}>{list.name}</Link></td><td>{list.supplier.name}</td><td>v{list.version}</td><td>{formatDate(list.validFrom)} – {formatDate(list.validUntil)}</td><td><StatusIndicator active={list.active} label={list.active ? "Attivo" : "Storico"} /></td><td className="num-cell"><Num value={list._count.offers} /></td><td>{list.sourceDocument ? <span>Importazione verificata<span className="cell-detail mono">{list.sourceDocument.originalFilename}</span></span> : <span>Seed / inserimento diretto<span className="cell-detail mono">{list.sourceFile ?? "—"}</span></span>}</td><td><Link aria-label={`Apri ${list.name}`} href={`/price-lists/${list.id}`}><ChevronIcon /></Link></td></tr>) : <EmptyRow colSpan={8}>Nessun listino nel filtro.</EmptyRow>}</tbody></DataTable>
      <Pagination page={Math.min(page, pages)} pages={pages} pathname="/price-lists" params={{ q: query.q, stato: query.stato }} />
    </section>
  </main>;
}
