import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL;
  if (process.env.VERCEL_TARGET_ENV === "develop" && process.env.DIRECT_URL) {
    const direct = new URL(process.env.DIRECT_URL);
    const match = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(direct.hostname);
    if (match) {
      direct.hostname = "aws-1-eu-west-1.pooler.supabase.com";
      direct.port = "6543";
      direct.username = `postgres.${match[1]}`;
      direct.searchParams.set("pgbouncer", "true");
      connectionString = direct.toString();
    }
  }
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
