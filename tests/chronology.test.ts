import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

test("la cronologia demo rispetta il ciclo richiesta, approvazione e ordine", async () => {
  const requests = await prisma.purchaseRequisition.findMany({
    include: { approvals: true, purchaseOrders: true },
  });

  for (const request of requests) {
    if (!request.submittedAt) continue;
    assert.ok(request.createdAt <= request.submittedAt, `${request.requisitionNumber}: creazione successiva all’invio`);
    if (request.requiredByDate) assert.ok(request.requiredByDate >= request.submittedAt, `${request.requisitionNumber}: consegna richiesta precedente all’invio`);
    for (const approval of request.approvals) {
      assert.ok(approval.requestedAt >= request.submittedAt, `${request.requisitionNumber}: approvazione richiesta prima dell’invio`);
      if (approval.decidedAt) assert.ok(approval.decidedAt >= approval.requestedAt, `${request.requisitionNumber}: decisione precedente alla richiesta`);
    }
    for (const order of request.purchaseOrders) {
      assert.ok(order.issuedAt >= request.submittedAt, `${order.poNumber}: ordine precedente alla richiesta`);
      assert.ok(order.expectedDeliveryDate >= order.issuedAt, `${order.poNumber}: consegna prevista precedente all’emissione`);
    }
  }
});

test("ricezioni e non conformità non precedono gli eventi di origine", async () => {
  const receipts = await prisma.receipt.findMany({ include: { purchaseOrder: true, lines: { include: { qualityIssues: true } } } });
  for (const receipt of receipts) {
    assert.ok(receipt.receivedAt >= receipt.purchaseOrder.issuedAt, `${receipt.receiptNumber}: ricezione precedente all’ordine`);
    for (const line of receipt.lines) {
      for (const issue of line.qualityIssues) {
        assert.ok(issue.openedAt >= receipt.receivedAt, `${issue.id}: non conformità precedente alla ricezione`);
        if (issue.resolvedAt) assert.ok(issue.resolvedAt >= issue.openedAt, `${issue.id}: risoluzione precedente all’apertura`);
      }
    }
  }
});

test.after(async () => { await prisma.$disconnect(); });
