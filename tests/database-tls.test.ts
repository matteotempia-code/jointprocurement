import assert from "node:assert/strict";
import test from "node:test";
import { verifiedPostgresConfig } from "../src/lib/database-tls";

test("remote PostgreSQL requires full certificate and hostname verification", () => {
  for (const mode of ["no-verify", "require", "prefer", "allow"]) {
    assert.throws(
      () => verifiedPostgresConfig(`postgresql://user:pass@db.example.com:5432/app?sslmode=${mode}`),
      /insecure sslmode/,
    );
  }
  assert.throws(
    () => verifiedPostgresConfig("postgresql://user:pass@db.example.com:5432/app"),
    /sslmode=verify-full/,
  );

  const config = verifiedPostgresConfig(
    "postgresql://user:pass@db.example.com:5432/app?sslmode=verify-full",
  );
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert.equal(config.max, 1);
});

test("local PostgreSQL remains usable for development without TLS", () => {
  const connectionString = "postgresql://user:pass@127.0.0.1:5432/app";
  assert.deepEqual(verifiedPostgresConfig(connectionString), { connectionString, max: 1 });
});
