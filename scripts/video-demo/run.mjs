import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PATHS, SCENES, VIEWPORT, resolveScene } from "./config.mjs";
import { cleanVideoArtifacts } from "./clean.mjs";
import { DemoScene, installDemoCursor } from "./helpers.mjs";
import { prepareDemoState } from "./prepare.mjs";
import { evaluateReadiness, printReadiness } from "./readiness.mjs";
import { ensureDirectories, startDemoServer, stopDemoServer } from "./runtime.mjs";
import { validateVideos } from "./validate-videos.mjs";

function requestedScene() {
  const index = process.argv.indexOf("--scene");
  if (index < 0) return null;
  const value = process.argv[index + 1] ?? "";
  const scene = resolveScene(value);
  if (!scene) throw new Error(`Scena sconosciuta "${value}". Valori: ${SCENES.map((item) => item.aliases[0]).join(", ")}`);
  return scene;
}

async function recordScene(browser, definition) {
  const tempDirectory = `${PATHS.temporary}/${definition.id}`;
  await rm(tempDirectory, { recursive: true, force: true });
  await mkdir(tempDirectory, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT, screen: VIEWPORT, deviceScaleFactor: 1, locale: "it-IT", timezoneId: "Europe/Rome",
    colorScheme: "light", reducedMotion: "reduce", recordVideo: { dir: tempDirectory, size: VIEWPORT },
  });
  await installDemoCursor(context);
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const scene = new DemoScene(page, definition);
  const video = page.video();
  let failure;
  try {
    const sceneModule = await import(`./scenes/${definition.id}.mjs`);
    await sceneModule.default(scene);
    if (scene.consoleErrors.length) throw new Error(`Errori browser: ${scene.consoleErrors.join(" | ")}`);
    await scene.writeOutputs({ browser: "Chromium Playwright", viewport: VIEWPORT });
  } catch (error) {
    failure = error;
    await page.screenshot({ path: `${PATHS.reports}/${definition.id}-failure.png`, fullPage: false }).catch(() => {});
  } finally {
    await context.close();
  }
  const source = await video.path();
  const destination = failure ? `${PATHS.reports}/${definition.id}-failed.webm` : `${PATHS.clips}/${definition.id}.webm`;
  await copyFile(source, destination);
  if (failure) throw failure;
  return { scene: definition.id, status: "PASS", clip: destination };
}

export async function runVideoDemo() {
  const single = requestedScene();
  if (!single) await cleanVideoArtifacts(); else await ensureDirectories();
  await prepareDemoState();
  const server = await startDemoServer();
  let browser;
  const results = [];
  const selected = single ? [single] : SCENES;
  try {
    const readiness = await evaluateReadiness({ checkApplication: true });
    printReadiness(readiness);
    if (readiness.overall !== "READY") throw new Error("Demo non pronta per la registrazione.");
    browser = await chromium.launch({ headless: true });
    for (const definition of selected) {
      process.stdout.write(`\nRegistrazione ${definition.id}… `);
      try { results.push(await recordScene(browser, definition)); console.log("PASS"); }
      catch (error) { results.push({ scene: definition.id, status: "FAIL", error: error instanceof Error ? error.message : String(error) }); console.log("FAIL"); if (single) break; }
    }
    await browser.close(); browser = null;
    if (results.some((item) => item.status === "FAIL")) throw new Error(`Scene fallite: ${results.filter((item) => item.status === "FAIL").map((item) => item.scene).join(", ")}`);
    const validation = await validateVideos(selected);
    const durations = Object.fromEntries(validation.results.map((item) => [item.scene, item.durationSeconds]));
    for (const definition of selected) {
      const manifestPath = `${PATHS.manifests}/${definition.id}.json`;
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      manifest.encodedDurationMs = Math.round(durations[definition.id] * 1000);
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    }
    const report = { status: "PASS", recordedAt: new Date().toISOString(), mode: single ? "single-scene" : "complete", scenes: results, technicalValidation: validation };
    await writeFile(`${PATHS.reports}/recording.json`, JSON.stringify(report, null, 2), "utf8");
    console.log(`\nVIDEO DEMO: PASS\n${selected.length} clip registrate · ${validation.totalDurationSeconds.toFixed(1)} secondi complessivi.`);
    return report;
  } catch (error) {
    const report = { status: "FAIL", failedAt: new Date().toISOString(), mode: single ? "single-scene" : "complete", scenes: results, error: error instanceof Error ? error.message : String(error) };
    await writeFile(`${PATHS.reports}/recording.json`, JSON.stringify(report, null, 2), "utf8").catch(() => {});
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    stopDemoServer(server);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) runVideoDemo().catch((error) => { console.error(error); process.exitCode = 1; });
