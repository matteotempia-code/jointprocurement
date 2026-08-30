import type { ReactNode } from "react";
import { addOrderProductsToFavorites, createListFromOrder } from "@/app/buying-actions";
import { getCurrentDemoUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveScope } from "@/lib/scope";

export default async function OrderDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const context = await getCurrentDemoUser();
  if (context.roleCode !== "RSA_DIRECTOR") return children;
  const scope = await resolveScope(context.assignment);
  const order = await prisma.purchaseOrder.findFirst({ where: { id: (await params).id, facilityId: scope.id }, select: { id: true, poNumber: true } });
  if (!order) return children;
  return <><div className="context-action-bar"><div><strong>Acquisto ricorrente?</strong><span>Ritrova facilmente prodotti e quantità di {order.poNumber}.</span></div><div className="context-actions"><form action={addOrderProductsToFavorites}><input type="hidden" name="poId" value={order.id} /><button>Aggiungi ai preferiti</button></form><form action={createListFromOrder}><input type="hidden" name="poId" value={order.id} /><button className="secondary-cta">Crea lista da questo ordine</button></form></div></div>{children}</>;
}
