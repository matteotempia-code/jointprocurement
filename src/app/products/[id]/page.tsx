import { notFound } from "next/navigation";
import { DataTable, PageHeader, StatusIndicator } from "@/components/ui";
import { PriceComparison } from "@/components/price-comparison";
import { requireRoles } from "@/lib/auth";
import { compareOffers, formatDate, formatMoney, getComparablePrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRoles(["RSA_DIRECTOR", "AREA_MANAGER", "PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]); const { id } = await params;
  const product = await prisma.canonicalProduct.findUnique({ where: { id }, include: { category: true, offers: { include: { supplier: true, priceList: true } } } }); if (!product) notFound();
  const comparison = compareOffers(product.offers);
  return <main><PageHeader eyebrow={product.category.name} title={product.name} description={product.description ?? "Canonical product record"} /><section className="definition-grid"><div><span>Brand</span><strong>{product.brand ?? "—"}</strong></div><div><span>EAN</span><strong>{product.ean ?? "—"}</strong></div><div><span>Unit of measure</span><strong>{product.uom}</strong></div><div><span>Category</span><strong>{product.category.name}</strong></div></section>{product.offers.length > 1 && <PriceComparison offers={product.offers} />}<section className="section-heading"><div><p className="eyebrow">Current sourcing</p><h2>Supplier offers</h2></div><span>{product.offers.length} available</span></section><DataTable label="Supplier offers"><thead><tr><th>Supplier</th><th>Supplier SKU</th><th>Package</th><th>Unit price</th><th>Normalized</th><th>Price list</th><th>Validity</th><th>Status</th></tr></thead><tbody>{comparison.sorted.map((offer) => <tr key={offer.id} className={offer.preferred ? "preferred-row" : ""}><td><strong>{offer.supplier.name}</strong></td><td className="mono">{offer.supplierSku ?? "—"}</td><td>{offer.packageSize ? Number(offer.packageSize) : "—"}</td><td>{formatMoney(Number(offer.unitPrice))}</td><td><strong>{formatMoney(getComparablePrice(offer), 4)}</strong></td><td>{offer.priceList.name}</td><td>{formatDate(offer.priceList.validFrom)} – {formatDate(offer.priceList.validUntil)}</td><td>{offer.preferred ? <StatusIndicator active label="Preferred offer" /> : <span className="muted">Available</span>}</td></tr>)}</tbody></DataTable></main>;
}
