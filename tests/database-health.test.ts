import assert from "node:assert/strict";
import test from "node:test";
import { databaseHealth, databaseProjectRef } from "../src/lib/database-health";

test("database project ref is derived from Supabase pooler and direct URLs", () => {
  assert.equal(
    databaseProjectRef(
      "postgresql://postgres.kvrvprzojwqhqtqsxkgu:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
    ),
    "kvrvprzojwqhqtqsxkgu",
  );
  assert.equal(
    databaseProjectRef(
      "postgresql://postgres:secret@db.kvrvprzojwqhqtqsxkgu.supabase.co:5432/postgres",
    ),
    "kvrvprzojwqhqtqsxkgu",
  );
  assert.throws(
    () => databaseProjectRef("postgresql://postgres:secret@example.com:5432/postgres"),
    /does not identify/,
  );
});

test("database health reports only project identity and latest completed migration", async () => {
  const db = {
    $queryRaw: async () => [{ migration_name: "20260922170000_global_document_sequences" }],
  };
  const health = await databaseHealth(
    db as never,
    "postgresql://postgres.kvrvprzojwqhqtqsxkgu:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
  );
  assert.deepEqual(health, {
    status: "ok",
    databaseProjectRef: "kvrvprzojwqhqtqsxkgu",
    latestMigration: "20260922170000_global_document_sequences",
  });
});
