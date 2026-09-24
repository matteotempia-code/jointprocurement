import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

type DemoEnvironment = Record<string, string | undefined>;

export const DEMO_USER_COOKIE = "jpo-demo-session";

export function demoModeEnabled(environment: DemoEnvironment = process.env) {
  return environment.DEMO_MODE === "true";
}

function demoSessionKey(environment: DemoEnvironment = process.env) {
  const secret =
    environment.DEMO_SESSION_SECRET?.trim() || environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("DEMO_SESSION_SECRET is required when DEMO_MODE=true.");
  return createHash("sha256").update(secret).digest();
}

export function sealDemoUserId(userId: string, environment: DemoEnvironment = process.env) {
  if (!demoModeEnabled(environment)) throw new Error("Demo identity is disabled.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", demoSessionKey(environment), iv);
  const encrypted = Buffer.concat([cipher.update(userId, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString("base64url")).join(".");
}

export function openDemoUserId(
  token: string | undefined,
  environment: DemoEnvironment = process.env,
) {
  if (!demoModeEnabled(environment)) throw new Error("Demo identity is disabled.");
  if (!token) return null;
  try {
    const [ivValue, tagValue, encryptedValue, extra] = token.split(".");
    if (!ivValue || !tagValue || !encryptedValue || extra) return null;
    const iv = Buffer.from(ivValue, "base64url");
    const tag = Buffer.from(tagValue, "base64url");
    const encrypted = Buffer.from(encryptedValue, "base64url");
    if (
      iv.toString("base64url") !== ivValue ||
      tag.toString("base64url") !== tagValue ||
      encrypted.toString("base64url") !== encryptedValue
    )
      return null;
    const decipher = createDecipheriv("aes-256-gcm", demoSessionKey(environment), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
