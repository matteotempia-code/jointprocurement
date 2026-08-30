import Link from "next/link";
import { ChevronIcon } from "@/components/icons";
import { DataTable, FutureButton, PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pricing";

export default async function Listini() {
  await requireRoles(["PROCUREMENT_MANAGER"]);
  const lists = await prisma.priceList.findMany({ include: { supplier: true, _count: { select: { offers: true } } }, orderBy: { name: "asc" } });
  return <main><PageHeader eyebrow="Dati commerciali" title="Listini" description="Validità, copertura prodotti e condizioni economiche per fornitore." action={<FutureButton>Importa listino</FutureButton>} /><DataTable label="Listini fornitori"><thead><tr><th>Listino</th><th>Fornitore</th><th>Validità</th><th>Stato</th><th>Offerte</th><th>File sorgente</th><th /></tr></thead><tbody>{lists.map((list) => <tr key={list.id}><td><Link className="table-link" href={`/price-lists/${list.id}`}>{list.name}</Link></td><td>{list.supplier.name}</td><td>{formatDate(list.validFrom)} – {formatDate(list.validUntil)}</td><td><StatusIndicator active={list.active} label={list.active ? "Attivo" : "Non attivo"} /></td><td>{list._count.offers}</td><td className="mono">{list.sourceFile ?? "—"}</td><td><Link aria-label={`Apri ${list.name}`} href={`/price-lists/${list.id}`}><ChevronIcon /></Link></td></tr>)}</tbody></DataTable></main>;
}
