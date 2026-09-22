import type { PrismaClient } from "@prisma/client";

const SUPABASE_PROJECT_REF = /^[a-z0-9]{20}$/;

export function databaseProjectRef(connectionString: string) {
  const url = new URL(connectionString);
  const hostnameMatch = url.hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/);
  if (hostnameMatch) return hostnameMatch[1];

  const username = decodeURIComponent(url.username);
  const usernameMatch = username.match(/^postgres\.([a-z0-9]{20})$/);
  if (usernameMatch && SUPABASE_PROJECT_REF.test(usernameMatch[1])) return usernameMatch[1];

  throw new Error("DATABASE_URL does not identify a Supabase project ref");
}

export async function databaseHealth(
  db: Pick<PrismaClient, "$queryRaw">,
  connectionString: string,
) {
  const migrations = await db.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name
    FROM _prisma_migrations
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    ORDER BY finished_at DESC
    LIMIT 1
  `;
  const latestMigration = migrations[0]?.migration_name;
  if (!latestMigration) throw new Error("No completed Prisma migration found");

  return {
    status: "ok" as const,
    databaseProjectRef: databaseProjectRef(connectionString),
    latestMigration,
  };
}
