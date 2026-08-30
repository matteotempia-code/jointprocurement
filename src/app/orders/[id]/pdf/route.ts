import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/pricing";
import { resolveScope } from "@/lib/scope";

function pdf(lines: string[]) {
  const escape = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
  const content = ["BT", "/F1 10 Tf", "50 790 Td", ...lines.flatMap((line, index) => [index ? "0 -18 Td" : "", `(${escape(line)}) Tj`]).filter(Boolean), "ET"].join("\n");
  const objects = ["1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj", "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj", "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj", `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`, "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj"];
  let output = "%PDF-1.4\n"; const offsets = [0];
  for (const object of objects) { offsets.push(output.length); output += `${object}\n`; }
  const xref = output.length;
  output += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(output);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["RSA_DIRECTOR", "PROCUREMENT_MANAGER"]);
  const scope = await resolveScope(context.assignment);
  const order = await prisma.purchaseOrder.findFirst({ where: { id: (await params).id, organizationId: context.organization.id, ...(context.roleCode === "RSA_DIRECTOR" ? { facilityId: { in: scope.facilityIds } } : {}) }, include: { supplier: true, organization: true, facility: true, lines: true } });
  if (!order) return new Response("Ordine non trovato", { status: 404 });
  const lines = ["JOINT PROCUREMENT OS — ORDINE AL FORNITORE", order.poNumber, "", `Acquirente: ${order.organization.name}`, `Fornitore: ${order.supplier.name}`, `Consegna: ${order.facility.name} — ${order.deliveryLocation}`, "", "RIGHE ORDINE", ...order.lines.map((line) => `${Number(line.quantity)} x ${line.descriptionSnapshot} a ${formatMoney(Number(line.unitPrice))} = ${formatMoney(Number(line.lineTotal))}`), "", `Imponibile: ${formatMoney(Number(order.subtotal))}`, `IVA: ${formatMoney(Number(order.taxTotal))}`, `TOTALE: ${formatMoney(Number(order.total))}`, "", "Documento dimostrativo — privo di firma digitale."];
  return new Response(pdf(lines), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${order.poNumber}.pdf"` } });
}
