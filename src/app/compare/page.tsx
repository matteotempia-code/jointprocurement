import Link from "next/link";
import { Num, PageHeader, Pagination, SearchField, StatusChip } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareOffers, getComparablePrice } from "@/lib/pricing";

const PAGE_SIZE = 12;
export default async function ConfrontoPrezzi({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  await requireRoles(["PROCUREMENT_MANAGER"]); const query = await searchParams, page = Math.max(1, Number(query.pagina ?? 1));
  const where = { active: true, offers: { some: { active: true } }, ...(query.q ? { name: { contains: query.q, mode: "insensitive" as const } } : {}) };
  const [total, products] = await Promise.all([prisma.canonicalProduct.count({ where }), prisma.canonicalProduct.findMany({ where, include: { category: true, offers: { where: { active: true }, include: { supplier: true } } }, orderBy: { name: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE })]);
  const comparisons = products.filter((item) => item.offers.length > 1).map((product) => ({ product, result: compareOffers(product.offers) })), pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <main className="phase2-page phase2-compare"><PageHeader eyebrow="Intelligence prezzi" title="Confronto offerte" description="Le differenze normalizzate sono dominanti; gli attributi identici restano secondari." />
    <form className="phase2-control-bar"><SearchField defaultValue={query.q} placeholder="Prodotto da confrontare" /><button className="secondary-cta">Cerca</button></form>
    <div className="phase2-comparison-list">{comparisons.map(({ product, result }) => <article key={product.id}><header><div><span>{product.category.name}</span><Link href={`/products/${product.id}`}>{product.name}</Link></div><StatusChip variant={result.spread > 20 ? "warn" : "neutral"}>{result.spread.toLocaleString("it-IT", { maximumFractionDigits: 1 })}% differenza</StatusChip></header><div>{result.sorted.slice(0, 4).map((offer, index) => <div className={index === 0 ? "is-best" : ""} key={offer.id}><span>{offer.supplier.name}{offer.preferred ? " · convenzionato" : ""}</span><strong><Num value={getComparablePrice(offer)} kind="currency" digits={4} /> / unità normalizzata</strong><StatusChip variant={index === 0 ? "ok" : "neutral"}>{index === 0 ? "Migliore" : `+${((getComparablePrice(offer) / getComparablePrice(result.lowest!) - 1) * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`}</StatusChip></div>)}</div></article>)}</div>
    <Pagination page={Math.min(page, pages)} pages={pages} pathname="/compare" params={{ q: query.q }} />
  </main>;
}
