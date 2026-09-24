import assert from "node:assert/strict";

const required = (name) => {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required`);
  return value;
};

const expectedRef = required("EXPECTED_DEV_DATABASE_REF");

function validate(name, expectedPort) {
  const value = required(name);
  const url = new URL(value);
  const identity = `${decodeURIComponent(url.username)}@${url.hostname}`;
  assert.ok(identity.includes(expectedRef), `${name} must point to canonical DEV project ${expectedRef}`);
  assert.equal(url.port, expectedPort, `${name} must use port ${expectedPort}`);
  assert.notEqual(url.searchParams.get("sslmode"), "no-verify", `${name} must not disable TLS verification`);
}

validate("DATABASE_URL", "6543");
validate("DIRECT_URL", "5432");
console.log(`DEV database configuration targets ${expectedRef} with the required pooler modes.`);
