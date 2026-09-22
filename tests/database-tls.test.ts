import assert from "node:assert/strict";
import test from "node:test";
import { verifiedPostgresConfig } from "../src/lib/database-tls";

test("remote PostgreSQL requires full certificate and hostname verification", () => {
  const previousCa = process.env.DATABASE_CA_CERT;
  delete process.env.DATABASE_CA_CERT;
  try {
  assert.throws(
    () => verifiedPostgresConfig("postgresql://user:pass@db.example.com:5432/app?sslmode=no-verify"),
    /must not use sslmode=no-verify/,
  );

  const config = verifiedPostgresConfig(
    "postgresql://user:pass@db.example.com:5432/app",
  );
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert.equal(config.max, 1);
  } finally {
    if (previousCa === undefined) delete process.env.DATABASE_CA_CERT;
    else process.env.DATABASE_CA_CERT = previousCa;
  }
});

test("local PostgreSQL remains usable for development without TLS", () => {
  const connectionString = "postgresql://user:pass@127.0.0.1:5432/app";
  assert.deepEqual(verifiedPostgresConfig(connectionString), { connectionString, max: 1 });
});
