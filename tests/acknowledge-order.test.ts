import assert from "node:assert/strict";
import test from "node:test";
import { acknowledgePurchaseOrder } from "@/lib/procurement/acknowledge-order";

function databaseFor(count: number) {
  const writes: { where?: unknown; data?: unknown; audits: unknown[] } = { audits: [] };
  const database = {
    async $transaction<T>(operation: (tx: never) => Promise<T>) {
      return operation({
        purchaseOrder: {
          async updateMany(args: { where: unknown; data: unknown }) {
            writes.where = args.where;
            writes.data = args.data;
            return { count };
          },
        },
        auditEvent: {
          async create(args: unknown) {
            writes.audits.push(args);
            return {};
          },
        },
      } as never);
    },
  };
  return { database, writes };
}

test("acknowledgement scopes the order to the current organization and writes its audit", async () => {
  const { database, writes } = databaseFor(1);
  await acknowledgePurchaseOrder(database, {
    orderId: "po-1",
    organizationId: "org-current",
    actorUserId: "user-1",
    expectedDate: "2026-10-05",
  });

  assert.deepEqual(writes.where, { id: "po-1", organizationId: "org-current" });
  assert.equal(writes.audits.length, 1);
  assert.deepEqual(writes.audits[0], {
    data: {
      organizationId: "org-current",
      actorUserId: "user-1",
      entityType: "PURCHASE_ORDER",
      entityId: "po-1",
      action: "SUPPLIER_ACKNOWLEDGED",
      metadata: { organizationId: "org-current", expectedDate: "2026-10-05" },
    },
  });
});

test("cross-tenant acknowledgement fails without an audit write", async () => {
  const { database, writes } = databaseFor(0);
  await assert.rejects(
    acknowledgePurchaseOrder(database, {
      orderId: "po-other-tenant",
      organizationId: "org-current",
      actorUserId: "user-1",
    }),
    /Ordine non trovato/,
  );
  assert.equal(writes.audits.length, 0);
});

test("invalid expected dates fail before any database write", async () => {
  const { database, writes } = databaseFor(1);
  await assert.rejects(
    acknowledgePurchaseOrder(database, {
      orderId: "po-1",
      organizationId: "org-current",
      actorUserId: "user-1",
      expectedDate: "2026-02-31",
    }),
    /Data di consegna non valida/,
  );
  assert.equal(writes.where, undefined);
  assert.equal(writes.audits.length, 0);
});
