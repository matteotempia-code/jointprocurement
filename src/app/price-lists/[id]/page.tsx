import { notFound } from "next/navigation";
import { DataTable, FutureButton, PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { formatDate, formatMoney, getComparablePrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export default async function PriceListDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRoles(["PROCUREMENT_MANAGER"]); const { id } = await params; const list = await prisma.priceList.findUnique({ where: { id }, include: { supplier: true, offers: { include: { canonicalProduct: true } } } }); if (!list) notFound();
  return <main><PageHeader eyebrow={list.supplier.name} title={list.name} description={`${formatDate(list.validFrom)} – ${formatDate(list.validUntil)}`} action={<FutureButton>Import price list</FutureButton>} /><section className="definition-grid"><div><span>Status</span><StatusIndicator active={list.active} /></div><div><span>Items</span><strong>{list.offers.length}</strong></div><div><span>Source file</span><strong className="mono">{list.sourceFile ?? "—"}</strong></div></section><DataTable label="Price list items"><thead><tr><th>Product</th><th>Supplier SKU</th><th>Package</th><th>Price</th><th>Normalized price</th><th>Preferred</th></tr></thead><tbody>{list.offers.map((offer) => <tr key={offer.id}><td><strong>{offer.canonicalProduct.name}</strong></td><td className="mono">{offer.supplierSku ?? "—"}</td><td>{offer.packageSize ? Number(offer.packageSize) : "—"}</td><td>{formatMoney(Number(offer.unitPrice))}</td><td>{formatMoney(getComparablePrice(offer), 4)}</td><td>{offer.preferred ? "Yes" : "No"}</td></tr>)}</tbody></DataTable></main>;
}
