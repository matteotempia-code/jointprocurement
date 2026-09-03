import Link from "next/link";
import { EmptyState, PageHeader, PriceBlock, StatusChip } from "@/components/ui";
import { getCurrentDemoUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeOfferPrice } from "@/lib/pricing/normalization";
import { statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

export default async function Cerca({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const context = await getCurrentDemoUser(), scope = await resolveScope(context.assignment), q = (await searchParams).q?.trim() ?? "";
  const privileged = context.roleCode !== "RSA_DIRECTOR";
  const [products, suppliers, orders, requests, facilities] = q ? await Promise.all([
    prisma.canonicalProduct.findMany({ where: { active: true, OR: [{ name: { contains: q, mode: "insensitive" } }, { brand: { contains: q, mode: "insensitive" } }, { manufacturerSku: { contains: q, mode: "insensitive" } }] }, include: { category: true, offers: { where: { active: true }, include: { supplier: true }, orderBy: { preferred: "desc" }, take: 1 } }, take: 8 }),
    privileged ? prisma.supplier.findMany({ where: { name: { contains: q, mode: "insensitive" } }, take: 6 }) : [],
    prisma.purchaseOrder.findMany({ where: { facilityId: { in: scope.facilityIds }, OR: [{ poNumber: { contains: q, mode: "insensitive" } }, { supplier: { name: { contains: q, mode: "insensitive" } } }] }, include: { supplier: true, facility: true }, take: 6 }),
    prisma.purchaseRequisition.findMany({ where: { facilityId: { in: scope.facilityIds }, OR: [{ requisitionNumber: { contains: q, mode: "insensitive" } }, { justification: { contains: q, mode: "insensitive" } }] }, include: { facility: true }, take: 6 }),
    context.roleCode === "AREA_MANAGER" ? prisma.facility.findMany({ where: { id: { in: scope.facilityIds }, name: { contains: q, mode: "insensitive" } }, include: { area: true }, take: 6 }) : [],
  ]) : [[], [], [], [], []];
  const groups = products.length + suppliers.length + orders.length + requests.length + facilities.length;
  return <main className="phase2-page phase2-search"><PageHeader eyebrow="Ricerca globale" title={q ? `Risultati per “${q}”` : "Trova ciò che ti serve"} description={`${scope.label} · risultati raggruppati per destinazione operativa`} />
    {!q ? <EmptyState title="Inizia dalla barra di ricerca" description="Inserisci prodotto, fornitore, struttura o numero documento." /> : !groups ? <EmptyState title="Nessun risultato nel tuo perimetro" description="Prova una descrizione, un codice o un numero documento diverso." /> : <div className="phase2-search-groups">
      {products.length > 0 && <section><h2>Prodotti <small>{products.length}</small></h2>{products.map((product) => { const offer = product.offers[0], normalized = offer ? normalizeOfferPrice(product, offer) : null; return <Link href={`/products/${product.id}`} key={product.id}><div><strong>{product.name}</strong><span>{product.category.name} · {product.brand ?? "Marca n.d."}</span></div>{offer && normalized ? <PriceBlock normalizedPrice={normalized.normalizedPrice} normalizedUom={product.consumptionUomLabel} packPrice={Number(offer.unitPrice)} packSize={product.packageDescription} variant="compact" /> : <span>Non confrontabile</span>}</Link>; })}</section>}
      {suppliers.length > 0 && <section><h2>Fornitori <small>{suppliers.length}</small></h2>{suppliers.map((supplier) => <Link href={`/suppliers/${supplier.id}`} key={supplier.id}><div><strong>{supplier.name}</strong><span>{supplier.vatNumber ?? "Partita IVA non indicata"}</span></div><StatusChip variant={supplier.active ? "ok" : "neutral"}>{supplier.active ? "Attivo" : "Non attivo"}</StatusChip></Link>)}</section>}
      {facilities.length > 0 && <section><h2>Strutture <small>{facilities.length}</small></h2>{facilities.map((facility) => <Link href={`/facilities/${facility.id}`} key={facility.id}><div><strong>{facility.name}</strong><span>{facility.area.name}</span></div><span>Apri →</span></Link>)}</section>}
      {requests.length > 0 && <section><h2>Richieste <small>{requests.length}</small></h2>{requests.map((request) => <Link href={`/requisitions/${request.id}`} key={request.id}><div><strong>{request.requisitionNumber}</strong><span>{request.facility.name}</span></div><StatusChip variant={request.status === "REJECTED" ? "danger" : request.status === "CLARIFICATION_REQUESTED" ? "warn" : "neutral"}>{statusLabel(request.status)}</StatusChip></Link>)}</section>}
      {orders.length > 0 && <section><h2>Ordini <small>{orders.length}</small></h2>{orders.map((order) => <Link href={`/orders/${order.id}`} key={order.id}><div><strong>{order.poNumber}</strong><span>{order.supplier.name} · {order.facility.name}</span></div><StatusChip variant={order.status === "RECEIVED" ? "ok" : "neutral"}>{statusLabel(order.status)}</StatusChip></Link>)}</section>}
    </div>}
  </main>;
}
