import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // The develop demo can use its session pooler when the transaction endpoint
  // is unreachable from Vercel's serverless runtime.
  const connectionString = process.env.VERCEL_TARGET_ENV === "develop"
    ? process.env.DIRECT_URL ?? process.env.DATABASE_URL
    : process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
