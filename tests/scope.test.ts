import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

test("demo facility and area assignments resolve to their exact seeded scope", async () => {
  const assignments = await prisma.userAssignment.findMany({ where: { user: { email: { in: ["lucia.ferri@demo.local", "andrea.riva@demo.local"] } } }, include: { user: true } });
  const lucia = assignments.find((a) => a.user.email.startsWith("lucia"));
  const andrea = assignments.find((a) => a.user.email.startsWith("andrea"));
  assert.equal(lucia?.scopeType, "FACILITY");
  assert.equal(andrea?.scopeType, "AREA");
  const facility = await prisma.facility.findUnique({ where: { id: lucia?.scopeId ?? "" } });
  const area = await prisma.area.findUnique({ where: { id: andrea?.scopeId ?? "" }, include: { facilities: true } });
  assert.equal(facility?.name, "RSA Aurora");
  assert.deepEqual(area?.facilities.map((f) => f.name).sort(), ["Casa Serena", "RSA Aurora", "Residenza San Michele"]);
});

test.after(async () => { await prisma.$disconnect(); });
