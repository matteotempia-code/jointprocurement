import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL;
  let connectionSource = "DATABASE_URL";
  if (process.env.VERCEL_TARGET_ENV === "develop" && process.env.DIRECT_URL) {
    const direct = new URL(process.env.DIRECT_URL);
    const match = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(direct.hostname);
    if (match) {
      direct.hostname = "aws-1-eu-west-1.pooler.supabase.com";
      direct.port = "6543";
      direct.username = `postgres.${match[1]}`;
      direct.searchParams.set("pgbouncer", "true");
      connectionString = direct.toString();
      connectionSource = "DIRECT_URL_POOLER";
    }
  }
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const target = new URL(connectionString);
  const projectRef = /^postgres\.([a-z0-9]+)$/.exec(decodeURIComponent(target.username))?.[1] ?? "unknown";
  console.info(JSON.stringify({ level: "info", message: "Prisma database target", connectionSource, projectRef }));
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
