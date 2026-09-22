import type { PoolConfig } from "pg";

function isLocalDatabase(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function verifiedPostgresConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

  if (sslMode === "no-verify") {
    throw new Error("DATABASE_URL must not use sslmode=no-verify.");
  }

  if (isLocalDatabase(url.hostname)) return { connectionString, max: 1 };

  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  return {
    connectionString,
    max: 1,
    ssl: {
      rejectUnauthorized: true,
      ...(ca ? { ca } : {}),
    },
  };
}
