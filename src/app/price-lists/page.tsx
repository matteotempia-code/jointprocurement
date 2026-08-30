import Link from "next/link";
import { ChevronIcon } from "@/components/icons";
import { DataTable, PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";

export default async function Listini() {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const lists = await prisma.priceList.findMany({ include: { supplier: true, sourceDocument: true, _count: { select: { offers: true } } }, orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
  return <main><PageHeader eyebrow="Dati commerciali" title="Listini" description="Validità, versioni, fonte e condizioni economiche per fornitore." action={<Link className="primary-cta" href="/imports/new">Importa listino</Link>} /><DataTable label="Listini fornitori"><thead><tr><th>Listino</th><th>Fornitore</th><th>Versione</th><th>Validità</th><th>Stato</th><th>Offerte</th><th>Fonte</th><th /></tr></thead><tbody>{lists.map((list) => <tr key={list.id}><td><Link className="table-link" href={`/price-lists/${list.id}`}>{list.name}</Link></td><td>{list.supplier.name}</td><td>v{list.version}</td><td>{formatDate(list.validFrom)} – {formatDate(list.validUntil)}</td><td><StatusIndicator active={list.active} label={list.active ? "Attivo" : "Storico"} /></td><td>{list._count.offers}</td><td>{list.sourceDocument ? <span>Importazione verificata<span className="cell-detail mono">{list.sourceDocument.originalFilename}</span></span> : <span>Seed / inserimento diretto<span className="cell-detail mono">{list.sourceFile ?? "—"}</span></span>}</td><td><Link aria-label={`Apri ${list.name}`} href={`/price-lists/${list.id}`}><ChevronIcon /></Link></td></tr>)}</tbody></DataTable></main>;
}
