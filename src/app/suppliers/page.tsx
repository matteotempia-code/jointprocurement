import Link from "next/link";
import { ChevronIcon } from "@/components/icons";
import { DataTable, PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SuppliersPage() {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]); const suppliers = await prisma.supplier.findMany({ include: { priceLists: { where: { active: true } }, offers: true }, orderBy: { name: "asc" } });
  return <main><PageHeader eyebrow="Supplier network" title="Suppliers" description="Identity, active commercial coverage and preferred offer footprint." /><DataTable label="Suppliers"><thead><tr><th>Supplier</th><th>VAT</th><th>Status</th><th>Active price lists</th><th>Offers</th><th>Preferred offers</th><th /></tr></thead><tbody>{suppliers.map((supplier) => <tr key={supplier.id}><td><Link className="table-link" href={`/suppliers/${supplier.id}`}>{supplier.name}</Link></td><td className="mono">{supplier.vatNumber ?? "—"}</td><td><StatusIndicator active={supplier.active} /></td><td>{supplier.priceLists.length}</td><td>{supplier.offers.length}</td><td>{supplier.offers.filter((offer) => offer.preferred).length}</td><td><Link aria-label={`Open ${supplier.name}`} href={`/suppliers/${supplier.id}`}><ChevronIcon /></Link></td></tr>)}</tbody></DataTable></main>;
}
