import assert from "node:assert/strict";
import test from "node:test";
import { demoModeEnabled, openDemoUserId, sealDemoUserId } from "@/lib/demo-session";
import { supabaseAuthConfig } from "@/lib/supabase/config";

const demoEnvironment = { DEMO_MODE: "true", DEMO_SESSION_SECRET: "a-test-secret-that-is-long-and-random" };

test("demo identity is refused unless DEMO_MODE is exactly true", () => {
  assert.equal(demoModeEnabled({ DEMO_MODE: "TRUE" }), false);
  assert.equal(demoModeEnabled({ DEMO_MODE: "false" }), false);
  assert.throws(() => sealDemoUserId("user-1", { DEMO_MODE: "false", DEMO_SESSION_SECRET: "secret" }), /disabled/);
  assert.throws(() => openDemoUserId("token", { DEMO_MODE: "false", DEMO_SESSION_SECRET: "secret" }), /disabled/);
});

test("demo persona cookie is confidential, authenticated and rejects tampering", () => {
  const token = sealDemoUserId("user-sensitive-id", demoEnvironment);
  assert.ok(!token.includes("user-sensitive-id"));
  assert.equal(openDemoUserId(token, demoEnvironment), "user-sensitive-id");
  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.equal(openDemoUserId(tampered, demoEnvironment), null);
});

test("Supabase Auth requires a publishable key and never falls back to the service role", () => {
  const previous = { ...process.env };
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-must-not-be-used";
    assert.deepEqual(supabaseAuthConfig(), { url: "https://project.supabase.co", publishableKey: "publishable-key" });
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    assert.throws(() => supabaseAuthConfig(), /not configured/);
  } finally {
    process.env = previous;
  }
});
