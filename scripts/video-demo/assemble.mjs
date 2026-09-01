import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const artifacts = path.join(root, "artifacts/video-demo");
const clipsDir = path.join(artifacts, "clips");
const audioDir = path.join(artifacts, "audio");
const narrationDir = path.join(artifacts, "narration");
const finalDir = path.join(artifacts, "final");
const workDir = path.join(finalDir, ".work");
const ffprobePath = ffprobeStatic.path;
const transition = 0.35;
const introDuration = 5;
const outroDuration = 5;
const scenes = [
  ["01-opening", "Lucia Ferri · Giulia Bianchi · Davide Romano"],
  ["02-guided-buying", "Lucia Ferri · Responsabile RSA"],
  ["03-approval", "Andrea Riva · Responsabile Area"],
  ["04-procurement", "Giulia Bianchi · Joint Procurement Manager"],
  ["05-orders-receiving", "Ordini e ricezione"],
  ["06-smart-import", "Smart Import"],
  ["07-price-intelligence", "Price Intelligence"],
  ["08-executive", "Davide Romano · Executive Sponsor"],
  ["09-roadmap", "Roadmap"],
];

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function run(binary, args, options = {}) {
  execFileSync(binary, args, { cwd: root, stdio: "inherit", ...options });
}

function probe(file) {
  return JSON.parse(execFileSync(ffprobePath, ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
}

function duration(file) {
  return Number(probe(file).format.duration);
}

function escapeDrawtext(value) {
  return value.replaceAll("\\", "/").replaceAll(":", "\\:").replaceAll("'", "’");
}

function timestamp(seconds, vtt = false) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const x = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${vtt ? "." : ","}${String(x).padStart(3, "0")}`;
}

function wrap(text, limit = 48) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > limit && line) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 2).join("\n");
}

function cueText(slug) {
  const md = fs.readFileSync(path.join(narrationDir, `${slug}.md`), "utf8");
  const match = md.match(/## DRAFT NARRATION\s+([\s\S]*?)(?:\n##|\n>)/);
  if (!match) throw new Error(`Narration cue missing for ${slug}`);
  return match[1].trim().replace(/\s+/g, " ");
}

function makeCard(output, durationSeconds, title, subtitle, detail) {
  const font = escapeDrawtext("C:/Windows/Fonts/segoeui.ttf");
  const bold = escapeDrawtext("C:/Windows/Fonts/seguisb.ttf");
  const filters = [
    `drawtext=fontfile='${bold}':text='${escapeDrawtext(title)}':fontcolor=0x22211f:fontsize=66:x=(w-text_w)/2:y=375`,
    `drawtext=fontfile='${font}':text='${escapeDrawtext(subtitle)}':fontcolor=0x4d4a45:fontsize=31:x=(w-text_w)/2:y=475`,
    `drawtext=fontfile='${font}':text='${escapeDrawtext(detail)}':fontcolor=0x77716a:fontsize=23:x=(w-text_w)/2:y=540`,
    `fade=t=in:st=0:d=0.7,fade=t=out:st=${(durationSeconds - 0.7).toFixed(2)}:d=0.7`,
  ].join(",");
  run(ffmpegPath, ["-y", "-f", "lavfi", "-i", `color=c=0xf4f1eb:s=1920x1080:r=30:d=${durationSeconds}`, "-f", "lavfi", "-i", `anullsrc=r=48000:cl=stereo:d=${durationSeconds}`, "-vf", filters, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", output]);
}

fs.mkdirSync(audioDir, { recursive: true });
fs.mkdirSync(finalDir, { recursive: true });
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

const zipPath = path.resolve(arg("--voiceover") || process.env.VOICEOVER_ZIP_PATH || path.join(audioDir, "joint_procurement_voiceover.zip"));
if (!fs.existsSync(zipPath)) throw new Error(`Voiceover ZIP not found: ${zipPath}`);
new AdmZip(zipPath).extractAllTo(audioDir, true);

for (const [slug] of scenes) {
  for (const [folder, extension] of [[clipsDir, "webm"], [audioDir, "mp3"]]) {
    const file = path.join(folder, `${slug}.${extension}`);
    if (!fs.existsSync(file) || fs.statSync(file).size === 0) throw new Error(`Required input missing: ${file}`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  toolchain: { ffmpeg: ffmpegPath, ffprobe: ffprobePath },
  voiceoverZip: path.relative(root, zipPath),
  introDuration,
  outroDuration,
  transitionDuration: transition,
  encoding: { video: "H.264", resolution: "1920x1080", fps: 30, pixelFormat: "yuv420p", crf: 20, audio: "AAC 48 kHz stereo 192 kbps", faststart: true },
  subtitleMethod: "Repository narration cue sheets, sentence segmented and aligned inside each final voice track; editorial cue subtitles, not word-level transcription.",
  scenes: [],
  warnings: [],
};

const segments = [];
const intro = path.join(workDir, "00-intro.mp4");
makeCard(intro, introDuration, "Joint Procurement OS", "Anteo × Coopselios", "AI-Native Joint Procurement Operating System");
segments.push(intro);

let masterCursor = introDuration;
const subtitleCues = [];
for (const [slug, label] of scenes) {
  const video = path.join(clipsDir, `${slug}.webm`);
  const audio = path.join(audioDir, `${slug}.mp3`);
  const videoDuration = duration(video);
  const audioDuration = duration(audio);
  const lead = slug === "01-opening" ? 0.5 : slug === "09-roadmap" ? 0.7 : 0.9;
  const tail = 0.75;
  const finalDuration = Math.max(videoDuration, lead + audioDuration + tail);
  const extension = Math.max(0, finalDuration - videoDuration);
  const output = path.join(workDir, `${slug}.mp4`);
  const fadeOut = Math.max(0, finalDuration - transition);
  const font = escapeDrawtext("C:/Windows/Fonts/segoeui.ttf");
  const vf = [
    `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x161616`,
    `fps=30`,
    extension > 0.005 ? `tpad=stop_mode=clone:stop_duration=${extension.toFixed(3)}` : null,
    `drawtext=fontfile='${font}':text='${escapeDrawtext(label)}':fontcolor=0x24211f:fontsize=25:box=1:boxcolor=0xf4f1ebdd:boxborderw=15:x=64:y=64:enable='between(t,0.7,3.2)'`,
    `fade=t=in:st=0:d=${transition},fade=t=out:st=${fadeOut.toFixed(3)}:d=${transition}`,
  ].filter(Boolean).join(",");
  const delay = Math.round(lead * 1000);
  const af = `loudnorm=I=-16:TP=-1:LRA=11,adelay=${delay}|${delay},apad=pad_dur=${finalDuration.toFixed(3)},atrim=0:${finalDuration.toFixed(3)},afade=t=in:st=0:d=0.08,afade=t=out:st=${Math.max(0, finalDuration - 0.25).toFixed(3)}:d=0.25`;
  run(ffmpegPath, ["-y", "-i", video, "-i", audio, "-vf", vf, "-af", af, "-t", finalDuration.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k", output]);
  segments.push(output);

  const text = cueText(slug);
  const phrases = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) || [text];
  const available = audioDuration / phrases.length;
  phrases.forEach((phrase, index) => {
    const start = masterCursor + lead + index * available;
    const end = Math.min(masterCursor + lead + audioDuration, start + Math.max(2.2, available - 0.15));
    subtitleCues.push({ start, end, text: wrap(phrase) });
  });
  report.scenes.push({ scene: slug, videoSource: path.relative(root, video), videoDuration, audioSource: path.relative(root, audio), audioDuration, narrationStartOffset: lead, visualExtension: extension, playbackSpeedChange: 0, finalSceneDuration: finalDuration, transitionDuration: transition, warnings: extension ? [`Final-frame hold ${extension.toFixed(3)}s`] : [] });
  masterCursor += finalDuration;
}

const outro = path.join(workDir, "10-outro.mp4");
makeCard(outro, outroDuration, "Joint Procurement OS", "Procurement semplice per chi acquista.", "Intelligence per chi governa.");
segments.push(outro);

const concatFile = path.join(workDir, "concat.txt");
fs.writeFileSync(concatFile, segments.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join("\n") + "\n");
const cleanMaster = path.join(finalDir, "joint-procurement-demo-v1.mp4");
const musicPath = process.env.MUSIC_PATH ? path.resolve(process.env.MUSIC_PATH) : undefined;
const voiceMaster = musicPath ? path.join(workDir, "voice-only-master.mp4") : cleanMaster;
run(ffmpegPath, ["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", "-movflags", "+faststart", voiceMaster]);
if (musicPath) {
  if (!fs.existsSync(musicPath)) throw new Error(`Optional MUSIC_PATH does not exist: ${musicPath}`);
  run(ffmpegPath, ["-y", "-i", voiceMaster, "-stream_loop", "-1", "-i", musicPath, "-filter_complex", "[1:a]volume=0.025[music];[music][0:a]sidechaincompress=threshold=0.015:ratio=10:attack=30:release=500[ducked];[0:a][ducked]amix=inputs=2:duration=first:dropout_transition=2[mix]", "-map", "0:v", "-map", "[mix]", "-c:v", "copy", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k", "-movflags", "+faststart", "-shortest", cleanMaster]);
}

const srt = subtitleCues.map((cue, i) => `${i + 1}\n${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}\n`).join("\n");
const vtt = `WEBVTT\n\n${subtitleCues.map((cue) => `${timestamp(cue.start, true)} --> ${timestamp(cue.end, true)}\n${cue.text}\n`).join("\n")}`;
const srtPath = path.join(finalDir, "joint-procurement-demo-it.srt");
const vttPath = path.join(finalDir, "joint-procurement-demo-it.vtt");
fs.writeFileSync(srtPath, srt, "utf8");
fs.writeFileSync(vttPath, vtt, "utf8");

const subtitled = path.join(finalDir, "joint-procurement-demo-v1-subtitled.mp4");
const subtitleFilterPath = srtPath.replaceAll("\\", "/").replace(":", "\\:").replaceAll("'", "\\'");
run(ffmpegPath, ["-y", "-i", cleanMaster, "-vf", `subtitles='${subtitleFilterPath}':force_style='FontName=Segoe UI,FontSize=19,PrimaryColour=&H00FFFFFF,OutlineColour=&H99000000,BorderStyle=3,BackColour=&H80000000,Outline=1,Shadow=0,MarginV=34,Alignment=2'`, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", subtitled]);

report.totalMasterDuration = duration(cleanMaster);
report.music = musicPath ? { path: path.relative(root, musicPath), mode: "quiet ducked bed under narration" } : { mode: "voice only" };
report.outputs = [cleanMaster, subtitled, srtPath, vttPath].map((file) => ({ path: path.relative(root, file), size: fs.statSync(file).size, duration: file.endsWith(".mp4") ? duration(file) : undefined }));
report.executiveCut = "OMITTED: coherent 3–4 minute cut requires shortened narration; supplied narration was not rewritten or replaced.";
fs.writeFileSync(path.join(finalDir, "assembly-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`Final master: ${cleanMaster}`);
