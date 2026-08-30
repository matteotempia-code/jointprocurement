import { CheckIcon } from "@/components/icons";
import { compareOffers, formatMoney, getComparablePrice } from "@/lib/pricing";

type Offer = { id: string; preferred: boolean; normalizedUnitPrice: unknown; unitPrice: unknown; supplier: { name: string } };
export function PriceComparison({ offers }: { offers: Offer[] }) {
  const comparison = compareOffers(offers);
  if (!comparison.lowest) return null;
  return <div className="comparison-strip"><div><span>Miglior prezzo unitario</span><strong>{formatMoney(getComparablePrice(comparison.lowest), 4)}</strong><small>{comparison.lowest.supplier.name}</small></div><div><span>Differenza osservata</span><strong>{comparison.spread.toFixed(1)}%</strong><small>{formatMoney(comparison.deltaEuro, 4)} per unità normalizzata</small></div><div className="comparison-result"><CheckIcon /><p><strong>{comparison.preferredDelta === 0 ? "Migliore disponibile" : `Il convenzionato è ${comparison.preferredDelta.toFixed(1)}% sopra il migliore`}</strong><span>Calcolato sui listini correnti</span></p></div></div>;
}
