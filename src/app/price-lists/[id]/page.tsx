import { notFound } from "next/navigation";
import { DataTable, FutureButton, PageHeader, StatusIndicator } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/pricing";
import { normalizeOfferPrice } from "@/lib/pricing/normalization";

export default async function ListinoDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRoles(["PROCUREMENT_MANAGER"]);
  const list = await prisma.priceList.findUnique({ where: { id: (await params).id }, include: { supplier: true, offers: { include: { canonicalProduct: true } } } });
  if (!list) notFound();
  return <main><PageHeader eyebrow={list.supplier.name} title={list.name} description={`${formatDate(list.validFrom)} – ${formatDate(list.validUntil)}`} action={<FutureButton>Importa listino</FutureButton>} /><section className="definition-grid"><div><span>Stato</span><StatusIndicator active={list.active} label={list.active ? "Attivo" : "Non attivo"} /></div><div><span>Articoli</span><strong>{list.offers.length}</strong></div><div><span>File sorgente</span><strong className="mono">{list.sourceFile ?? "—"}</strong></div></section><DataTable label="Articoli del listino"><thead><tr><th>Prodotto</th><th>Codice fornitore</th><th>Confezione</th><th>Prezzo</th><th>Prezzo normalizzato</th><th>Convenzionato</th></tr></thead><tbody>{list.offers.map((offer) => { const normalized = normalizeOfferPrice(offer.canonicalProduct, offer); return <tr key={offer.id}><td><strong>{offer.canonicalProduct.name}</strong></td><td className="mono">{offer.supplierSku ?? "—"}</td><td>{offer.canonicalProduct.packageDescription}</td><td>{formatMoney(Number(offer.unitPrice))}</td><td>{normalized.normalizedLabel}</td><td>{offer.preferred ? "Sì" : "No"}</td></tr>; })}</tbody></DataTable></main>;
}
