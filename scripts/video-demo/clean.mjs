import { rm, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PATHS } from "./config.mjs";

export async function cleanVideoArtifacts() {
  const expected = /[\\/]artifacts[\\/]video-demo$/i;
  if (!expected.test(PATHS.root)) throw new Error(`Percorso di pulizia non sicuro: ${PATHS.root}`);
  await rm(PATHS.root, { recursive: true, force: true });
  await Promise.all(Object.values(PATHS).map((directory) => mkdir(directory, { recursive: true })));
  console.log(`VIDEO DEMO CLEAN: PASS\nRipulito esclusivamente ${PATHS.root}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) cleanVideoArtifacts().catch((error) => { console.error(error); process.exitCode = 1; });
