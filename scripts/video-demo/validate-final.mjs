import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const finalDir = path.join(root, "artifacts/video-demo/final");
const report = JSON.parse(fs.readFileSync(path.join(finalDir, "assembly-report.json"), "utf8"));
const required = ["joint-procurement-demo-v1.mp4", "joint-procurement-demo-v1-subtitled.mp4", "joint-procurement-demo-it.srt", "joint-procurement-demo-it.vtt"];
for (const name of required) {
  const file = path.join(finalDir, name);
  if (!fs.existsSync(file) || fs.statSync(file).size < (name.endsWith(".mp4") ? 1_000_000 : 50)) throw new Error(`Invalid final artifact: ${name}`);
}

function probe(file) {
  return JSON.parse(execFileSync(ffprobeStatic.path, ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
}

const validation = { generatedAt: new Date().toISOString(), files: [], sampleFrames: [], result: "PASS" };
for (const name of required.filter((x) => x.endsWith(".mp4"))) {
  const file = path.join(finalDir, name);
  const data = probe(file);
  const video = data.streams.find((x) => x.codec_type === "video");
  const audio = data.streams.find((x) => x.codec_type === "audio");
  const errors = [];
  if (video?.codec_name !== "h264" || video.width !== 1920 || video.height !== 1080 || video.pix_fmt !== "yuv420p") errors.push("video codec/geometry/pixel format");
  if (audio?.codec_name !== "aac" || Number(audio.sample_rate) !== 48000) errors.push("audio codec/sample rate");
  if (!audio || !video) errors.push("missing stream");
  if (Number(data.format.duration) < 780 || Number(data.format.duration) > 920) errors.push("duration outside 13–15 minute target");
  if (errors.length) throw new Error(`${name}: ${errors.join(", ")}`);
  validation.files.push({ name, size: fs.statSync(file).size, duration: Number(data.format.duration), video: { codec: video.codec_name, width: video.width, height: video.height, pixelFormat: video.pix_fmt, frameRate: video.avg_frame_rate }, audio: { codec: audio.codec_name, sampleRate: audio.sample_rate, channels: audio.channels } });
}

const master = path.join(finalDir, required[0]);
const points = [2];
let cursor = report.introDuration;
for (const scene of report.scenes) { points.push(cursor + Math.min(4, scene.finalSceneDuration / 2)); cursor += scene.finalSceneDuration; }
points.push(report.totalMasterDuration - 2);
const framesDir = path.join(finalDir, "validation-frames");
fs.mkdirSync(framesDir, { recursive: true });
points.forEach((at, index) => {
  const output = path.join(framesDir, `${String(index).padStart(2, "0")}-${at.toFixed(2).replace(".", "_")}s.png`);
  execFileSync(ffmpegPath, ["-y", "-ss", at.toFixed(3), "-i", master, "-frames:v", "1", output], { stdio: "ignore" });
  if (fs.statSync(output).size < 10_000) throw new Error(`Invalid sampled frame at ${at}s`);
  validation.sampleFrames.push({ at, file: path.relative(root, output), size: fs.statSync(output).size });
});
fs.writeFileSync(path.join(finalDir, "validation-report.json"), JSON.stringify(validation, null, 2) + "\n");
console.log("Final video validation PASS");
