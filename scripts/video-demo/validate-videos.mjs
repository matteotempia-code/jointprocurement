import { access, readFile, stat, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { PATHS, SCENES, VIEWPORT } from "./config.mjs";
import { ensureDirectories } from "./runtime.mjs";

export async function validateVideos(sceneDefinitions = SCENES) {
  await ensureDirectories();
  const playerPath = `${PATHS.reports}/video-validator.html`;
  await writeFile(playerPath, "<!doctype html><html><body style='margin:0;background:#111'><video id='v' muted playsinline></video><canvas id='c' width='160' height='90'></canvas></body></html>", "utf8");
  const browser = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files"] });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const results = [];
  try {
    await page.goto(pathToFileURL(playerPath).href);
    for (const definition of sceneDefinitions) {
      const clipPath = `${PATHS.clips}/${definition.id}.webm`;
      const stillPath = `${PATHS.screenshots}/${definition.id}.png`;
      await access(clipPath); await access(stillPath);
      const info = await stat(clipPath);
      const relativeVideo = `../clips/${definition.id}.webm`;
      const decoded = await page.evaluate(async (source) => {
        const video = document.getElementById("v");
        const canvas = document.getElementById("c");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        video.src = source;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("metadata timeout")), 20_000);
          video.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
          video.onerror = () => { clearTimeout(timer); reject(new Error(`media error ${video.error?.code ?? "unknown"}`)); };
        });
        const frames = [];
        for (const ratio of [.18, .5, .82]) {
          const time = Math.max(0, Math.min(video.duration - .05, video.duration * ratio));
          await new Promise((resolve) => { video.onseeked = resolve; video.currentTime = time; });
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let sum = 0; const luminances = [];
          for (let index = 0; index < pixels.length; index += 16) { const value = .2126 * pixels[index] + .7152 * pixels[index + 1] + .0722 * pixels[index + 2]; sum += value; luminances.push(value); }
          const mean = sum / luminances.length;
          const variance = luminances.reduce((total, value) => total + (value - mean) ** 2, 0) / luminances.length;
          frames.push({ atSeconds: Number(time.toFixed(2)), meanLuminance: Number(mean.toFixed(2)), variance: Number(variance.toFixed(2)), nonBlack: mean > 8 && variance > 4 });
        }
        return { durationSeconds: Number(video.duration.toFixed(3)), width: video.videoWidth, height: video.videoHeight, frames };
      }, relativeVideo);
      const manifest = JSON.parse(await readFile(`${PATHS.manifests}/${definition.id}.json`, "utf8"));
      const pass = info.size > 350_000 && decoded.durationSeconds > 5 && decoded.width === VIEWPORT.width && decoded.height === VIEWPORT.height && decoded.frames.every((frame) => frame.nonBlack) && manifest.visualBeats.length > 0 && manifest.consoleErrors.length === 0;
      results.push({ scene: definition.id, status: pass ? "PASS" : "FAIL", bytes: info.size, ...decoded, expectedPageVerifiedBy: `screenshots/${definition.id}.png`, consoleErrors: manifest.consoleErrors });
    }
  } finally { await browser.close(); }
  const report = { checkedAt: new Date().toISOString(), method: "Decodifica Chromium WebM + campionamento luminanza/varianza al 18%, 50% e 82%", ffprobeAvailable: false, overall: results.every((item) => item.status === "PASS") ? "PASS" : "FAIL", totalDurationSeconds: Number(results.reduce((sum, item) => sum + item.durationSeconds, 0).toFixed(3)), results };
  await writeFile(`${PATHS.reports}/technical-validation.json`, JSON.stringify(report, null, 2), "utf8");
  if (report.overall !== "PASS") throw new Error(`Validazione tecnica video fallita: ${results.filter((item) => item.status === "FAIL").map((item) => item.scene).join(", ")}`);
  return report;
}
