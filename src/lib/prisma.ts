import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { verifiedPostgresConfig } from "@/lib/database-tls";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  return new PrismaClient({
    adapter: new PrismaPg(verifiedPostgresConfig(connectionString)),
  });
}

function singletonPrismaClient() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

export function lazyPrismaClient(factory: () => PrismaClient = singletonPrismaClient) {
  let client: PrismaClient | undefined;
  const resolve = () => (client ??= factory());

  return new Proxy({} as PrismaClient, {
    get(_target, property) {
      const resolved = resolve();
      const value = Reflect.get(resolved, property, resolved);
      return typeof value === "function" ? value.bind(resolved) : value;
    },
  });
}

export const prisma = lazyPrismaClient();
