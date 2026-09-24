import assert from "node:assert/strict";

const required = (name) => {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required`);
  return value;
};

const baseUrl = required("QA_BASE_URL");
const expectedRef = required("EXPECTED_DEV_DATABASE_REF");
const expectedMigration = required("EXPECTED_DEV_LATEST_MIGRATION");
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
  : {};

const response = await fetch(new URL("/api/health/database", baseUrl), {
  headers,
  redirect: "manual",
});
assert.equal(response.status, 200, `Database health endpoint returned HTTP ${response.status}`);
const health = await response.json();
assert.equal(
  health.databaseProjectRef,
  expectedRef,
  `DEPLOYMENT DATABASE MISMATCH: expected ${expectedRef}, received ${health.databaseProjectRef ?? "missing"}`,
);
assert.equal(
  health.latestMigration,
  expectedMigration,
  `DEPLOYMENT MIGRATION MISMATCH: expected ${expectedMigration}, received ${health.latestMigration ?? "missing"}`,
);
console.log(
  JSON.stringify({
    status: "PASS",
    databaseProjectRef: health.databaseProjectRef,
    latestMigration: health.latestMigration,
  }),
);
