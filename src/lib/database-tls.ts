import type { PoolConfig } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const bundledSupabaseCaPath = join(process.cwd(), "certificates", "supabase-root-2021-ca.crt");

function postgresCaCertificate() {
  const override = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  return override || readFileSync(bundledSupabaseCaPath, "utf8").trim();
}

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

  for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(parameter);
  return {
    connectionString: url.toString(),
    max: 1,
    ssl: {
      rejectUnauthorized: true,
      ca: postgresCaCertificate(),
    },
  };
}
