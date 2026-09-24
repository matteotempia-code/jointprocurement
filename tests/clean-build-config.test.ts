import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("clean builds generate Prisma explicitly and have a harmless database placeholder", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as {
    scripts: Record<string, string | undefined>;
  };
  const prismaConfig = await readFile(new URL("../prisma.config.ts", import.meta.url), "utf8");

  assert.equal(packageJson.scripts.build, "prisma generate && next build");
  assert.equal(packageJson.scripts.prebuild, undefined);
  assert.match(prismaConfig, /process\.env\.DIRECT_URL\?\.trim\(\)/);
  assert.match(prismaConfig, /postgresql:\/\/prisma:prisma@localhost:5432\/prisma/);
});
