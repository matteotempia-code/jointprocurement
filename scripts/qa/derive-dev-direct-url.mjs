import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";

const required = (name) => {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required`);
  return value;
};

const databaseUrl = new URL(required("DATABASE_URL"));
assert.equal(databaseUrl.port, "6543", "DATABASE_URL must use the transaction pooler on port 6543");
databaseUrl.port = "5432";

const directUrl = databaseUrl.toString();
console.log(`::add-mask::${directUrl}`);
await appendFile(required("GITHUB_ENV"), `DIRECT_URL=${directUrl}\n`, "utf8");
console.log("Derived DIRECT_URL for the session pooler on port 5432.");
