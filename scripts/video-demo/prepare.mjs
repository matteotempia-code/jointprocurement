import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PATHS } from "./config.mjs";
import { ensureDirectories, runCommand } from "./runtime.mjs";

export async function prepareDemoState() {
  await ensureDirectories();
  const startedAt = new Date();
  await runCommand(process.execPath, ["--import", "tsx", "prisma/seed.ts"]);
  await runCommand(process.execPath, ["--import", "tsx", "scripts/generate-demo-imports.ts"]);
  const report = { status: "PASS", strategy: "Prisma seed completo + rigenerazione documenti demo", startedAt: startedAt.toISOString(), completedAt: new Date().toISOString(), syntheticDataOnly: true };
  await writeFile(`${PATHS.reports}/prepare.json`, JSON.stringify(report, null, 2), "utf8");
  console.log("\nVIDEO DEMO PREPARE: PASS\nDati, documenti e workflow demo sono stati ripristinati in modo deterministico.");
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) prepareDemoState().catch((error) => { console.error(error); process.exitCode = 1; });
