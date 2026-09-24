import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

test("catalog reads and writes cannot cross organization boundaries", async () => {
  const marker = `tenant-isolation-${randomUUID()}`;
  const [organizationA, organizationB] = await Promise.all([
    prisma.organization.create({ data: { name: `${marker}-a` } }),
    prisma.organization.create({ data: { name: `${marker}-b` } }),
  ]);

  try {
    const [categoryA, categoryB, supplierA, supplierB] = await Promise.all([
      prisma.category.create({
        data: { organizationId: organizationA.id, code: "TEST", name: "Tenant A" },
      }),
      prisma.category.create({
        data: { organizationId: organizationB.id, code: "TEST", name: "Tenant B" },
      }),
      prisma.supplier.create({
        data: { organizationId: organizationA.id, name: "Supplier A", vatNumber: "ISO-SHARED" },
      }),
      prisma.supplier.create({
        data: { organizationId: organizationB.id, name: "Supplier B", vatNumber: "ISO-SHARED" },
      }),
    ]);
    const [productA, productB] = await Promise.all([
      prisma.canonicalProduct.create({
        data: {
          organizationId: organizationA.id,
          categoryId: categoryA.id,
          name: "Product A",
          uom: "EA",
        },
      }),
      prisma.canonicalProduct.create({
        data: {
          organizationId: organizationB.id,
          categoryId: categoryB.id,
          name: "Product B",
          uom: "EA",
        },
      }),
    ]);
    const [priceListA, priceListB] = await Promise.all([
      prisma.priceList.create({
        data: { organizationId: organizationA.id, supplierId: supplierA.id, name: "List A" },
      }),
      prisma.priceList.create({
        data: { organizationId: organizationB.id, supplierId: supplierB.id, name: "List B" },
      }),
    ]);

    await prisma.supplierOffer.create({
      data: {
        organizationId: organizationA.id,
        supplierId: supplierA.id,
        canonicalProductId: productA.id,
        priceListId: priceListA.id,
        unitPrice: 1,
      },
    });
    await prisma.auditEvent.create({
      data: {
        organizationId: organizationB.id,
        entityType: "TENANT_TEST",
        entityId: marker,
        action: "CREATED",
        metadata: {},
      },
    });

    assert.deepEqual(
      await prisma.canonicalProduct.findMany({
        where: { organizationId: organizationA.id },
        select: { id: true },
      }),
      [{ id: productA.id }],
    );
    assert.equal(
      await prisma.auditEvent.count({
        where: { organizationId: organizationA.id, entityId: marker },
      }),
      0,
    );

    await assert.rejects(
      prisma.supplierOffer.create({
        data: {
          organizationId: organizationA.id,
          supplierId: supplierB.id,
          canonicalProductId: productA.id,
          priceListId: priceListA.id,
          unitPrice: 2,
        },
      }),
    );
    await assert.rejects(
      prisma.supplierOffer.create({
        data: {
          organizationId: organizationA.id,
          supplierId: supplierA.id,
          canonicalProductId: productB.id,
          priceListId: priceListB.id,
          unitPrice: 2,
        },
      }),
    );
  } finally {
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationA.id, organizationB.id] } },
    });
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
