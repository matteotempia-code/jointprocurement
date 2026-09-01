import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { receiveOrder } from "@/app/buying-actions";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/presentation/status";
import { resolveScope } from "@/lib/scope";

const issueTypes = ["", "MISSING", "DAMAGED", "WRONG_ITEM", "QUALITY", "EXPIRY", "PACKAGING", "OTHER"] as const;

export default async function ReceivePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["RSA_DIRECTOR"]);
  const scope = await resolveScope(context.assignment);
  const { id } = await params;
  const order = await prisma.purchaseOrder.findFirst({
    where: { id, facilityId: scope.id, status: { notIn: ["RECEIVED", "CANCELLED"] } },
    include: { supplier: true, lines: { include: { receiptLines: true } } },
  });
  if (!order) notFound();

  return <main>
    <PageHeader eyebrow="Ricezione merce" title="Registra consegna" description={`${order.poNumber} · ${order.supplier.name}`} />
    <form action={receiveOrder} className="receive-form">
      <input type="hidden" name="poId" value={order.id} />
      <div className="receive-head"><span>Prodotto</span><span>Ordinato / ricevuto</span><span>Ricevuto ora</span><span>Non conformità</span></div>
      {order.lines.map((line) => {
        const received = line.receiptLines.reduce((sum, receipt) => sum + Number(receipt.quantityReceived), 0);
        const remaining = Number(line.quantity) - received;
        return <fieldset key={line.id}>
          <div><strong>{line.descriptionSnapshot}</strong><small>{line.supplierSkuSnapshot}</small></div>
          <div><b>{Number(line.quantity)}</b><small>{received} già ricevuti · {remaining} residui</small></div>
          <label><span>Quantità ricevuta</span><input name={`received-${line.id}`} type="number" min="0" max={remaining} step="1" defaultValue={remaining} /></label>
          <div className="issue-fields">
            <label><span>Segnala problema</span><select name={`issue-${line.id}`}>{issueTypes.map((type) => <option key={type} value={type}>{type ? statusLabel(type) : "Nessun problema"}</option>)}</select></label>
            <label><span>Quantità interessata</span><input name={`affected-${line.id}`} type="number" min="0" max={remaining} defaultValue="0" /></label>
            <label><span>Nota</span><input name={`issueNote-${line.id}`} placeholder="Descrivi la difformità" /></label>
          </div>
        </fieldset>;
      })}
      <label className="notes">Note di consegna<textarea name="notes" placeholder="Condizioni, documento di trasporto, osservazioni" /></label>
      <button className="primary-cta">Conferma tutto come ordinato</button>
      <p className="muted">Le quantità residue sono precompilate. Modificale o segnala una non conformità solo se la consegna differisce dall’ordine.</p>
    </form>
  </main>;
}
