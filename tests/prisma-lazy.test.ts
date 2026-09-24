import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { lazyPrismaClient } from "@/lib/prisma";

test("Prisma remains uninitialized until a database operation is requested", () => {
  let creations = 0;
  const fakeClient = {
    marker: "singleton",
    identify(this: { marker: string }) {
      return this.marker;
    },
  };
  const client = fakeClient as unknown as PrismaClient;
  const lazy = lazyPrismaClient(() => {
    creations += 1;
    return client;
  });

  assert.equal(creations, 0);
  assert.equal((lazy as unknown as { identify(): string }).identify(), "singleton");
  assert.equal(creations, 1);
  assert.equal((lazy as unknown as { identify(): string }).identify(), "singleton");
  assert.equal(creations, 1);
});
