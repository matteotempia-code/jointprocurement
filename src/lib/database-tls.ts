import type { PoolConfig } from "pg";

const unsafeSslModes = new Set(["allow", "prefer", "require", "no-verify"]);

function isLocalDatabase(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function verifiedPostgresConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

  if (sslMode && unsafeSslModes.has(sslMode)) {
    throw new Error(`DATABASE_URL uses insecure sslmode=${sslMode}; use sslmode=verify-full.`);
  }

  if (isLocalDatabase(url.hostname)) return { connectionString, max: 1 };
  if (sslMode !== "verify-full") {
    throw new Error("Remote DATABASE_URL must set sslmode=verify-full.");
  }

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
