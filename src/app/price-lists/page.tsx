import Link from "next/link";
import { ChevronIcon } from "@/components/icons";
import { DataTable, FutureButton, PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { formatDate } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export default async function PriceListsPage() {
  await requireRoles(["PROCUREMENT_MANAGER"]); const lists = await prisma.priceList.findMany({ include: { supplier: true, _count: { select: { offers: true } } }, orderBy: { name: "asc" } });
  return <main><PageHeader eyebrow="Commercial data" title="Price Lists" description="Supplier lists, validity windows and item coverage." action={<FutureButton>Import price list</FutureButton>} /><DataTable label="Price lists"><thead><tr><th>List</th><th>Supplier</th><th>Validity</th><th>Status</th><th>Offers</th><th>Source file</th><th /></tr></thead><tbody>{lists.map((list) => <tr key={list.id}><td><Link className="table-link" href={`/price-lists/${list.id}`}>{list.name}</Link></td><td>{list.supplier.name}</td><td>{formatDate(list.validFrom)} – {formatDate(list.validUntil)}</td><td><StatusIndicator active={list.active} /></td><td>{list._count.offers}</td><td className="mono">{list.sourceFile ?? "—"}</td><td><Link aria-label={`Open ${list.name}`} href={`/price-lists/${list.id}`}><ChevronIcon /></Link></td></tr>)}</tbody></DataTable></main>;
}
