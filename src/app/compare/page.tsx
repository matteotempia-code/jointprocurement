import Link from "next/link";
import { Metric, PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareOffers, formatMoney, getComparablePrice } from "@/lib/pricing";

export default async function ConfrontoPrezzi() {
  await requireRoles(["PROCUREMENT_MANAGER"]);
  const products = await prisma.canonicalProduct.findMany({ where: { offers: { some: {} } }, include: { category: true, offers: { include: { supplier: true } } } });
  const comparable = products.filter((product) => product.offers.length > 1);
  const comparisons = comparable.map((product) => ({ product, result: compareOffers(product.offers) }));
  const supplierCount = new Set(comparable.flatMap((product) => product.offers.map((offer) => offer.supplierId))).size;
  const average = comparisons.length ? comparisons.reduce((sum, comparison) => sum + comparison.result.spread, 0) / comparisons.length : 0;
  const opportunity = comparisons.reduce((sum, comparison) => sum + Math.max(0, comparison.result.preferred ? getComparablePrice(comparison.result.preferred) - getComparablePrice(comparison.result.lowest!) : 0), 0);
  return <main><PageHeader eyebrow="Intelligence prezzi" title="Confronto prezzi" description="Offerte normalizzate sulla stessa unità di consumo e allineate al prodotto canonico." /><div className="metrics-grid four"><Metric label="Prodotti confrontabili" value={comparable.length} /><Metric label="Fornitori rappresentati" value={supplierCount} /><Metric label="Differenza media" value={`${average.toFixed(1)}%`} /><Metric label="Opportunità osservata" value={formatMoney(opportunity, 4)} detail="Stima demo · una unità normalizzata" /></div><div className="comparison-list">{comparisons.map(({ product, result }) => <article className="compare-card" key={product.id}><header><div><span>{product.category.name}</span><Link href={`/products/${product.id}`}>{product.name}</Link></div><strong>{result.spread.toFixed(1)}% di differenza</strong></header><div className="offer-bars">{result.sorted.map((offer) => <div key={offer.id} className="offer-bar"><div><b>{offer.supplier.name}</b>{offer.preferred && <StatusIndicator active label="Convenzionato" />}</div><strong>{formatMoney(getComparablePrice(offer), 4)}</strong></div>)}</div><footer><span>Differenza {formatMoney(result.deltaEuro, 4)}</span><b>{result.preferredDelta === 0 ? "Migliore offerta disponibile" : `L’offerta convenzionata è superiore del ${result.preferredDelta.toFixed(1)}%`}</b></footer></article>)}</div></main>;
}
