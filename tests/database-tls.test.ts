import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
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
    "postgresql://user:pass@db.example.com:5432/app?sslmode=require&pgbouncer=true",
  );
  assert.equal(config.ssl && typeof config.ssl === "object" && config.ssl.rejectUnauthorized, true);
  const certificate = new X509Certificate((config.ssl as { ca: string }).ca);
  assert.equal(certificate.subject, "C=US\nST=Delware\nL=New Castle\nO=Supabase Inc\nCN=Supabase Root 2021 CA");
  assert.equal(certificate.fingerprint256, "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA");
  assert.equal(config.connectionString, "postgresql://user:pass@db.example.com:5432/app?pgbouncer=true");
  assert.equal(config.max, 1);
  } finally {
    if (previousCa === undefined) delete process.env.DATABASE_CA_CERT;
    else process.env.DATABASE_CA_CERT = previousCa;
  }
});

test("DATABASE_CA_CERT remains an optional verified CA override", () => {
  const previousCa = process.env.DATABASE_CA_CERT;
  process.env.DATABASE_CA_CERT = "override-ca";
  try {
    const config = verifiedPostgresConfig("postgresql://user:pass@db.example.com:5432/app");
    assert.equal((config.ssl as { ca: string }).ca, "override-ca");
    assert.equal((config.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized, true);
  } finally {
    if (previousCa === undefined) delete process.env.DATABASE_CA_CERT;
    else process.env.DATABASE_CA_CERT = previousCa;
  }
});

test("local PostgreSQL remains usable for development without TLS", () => {
  const connectionString = "postgresql://user:pass@127.0.0.1:5432/app";
  assert.deepEqual(verifiedPostgresConfig(connectionString), { connectionString, max: 1 });
});
