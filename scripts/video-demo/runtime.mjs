import { mkdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { PATHS, BASE_URL, PORT } from "./config.mjs";

export async function ensureDirectories() {
  await Promise.all(Object.values(PATHS).map((directory) => mkdir(directory, { recursive: true })));
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), windowsHide: true, stdio: options.quiet ? "pipe" : "inherit", env: { ...process.env, ...options.env } });
    let output = "";
    if (options.quiet) {
      child.stdout?.on("data", (chunk) => { output += chunk; });
      child.stderr?.on("data", (chunk) => { output += chunk; });
    }
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve({ code, output }) : reject(new Error(`${command} ${args.join(" ")} è terminato con exit code ${code}.\n${output}`)));
  });
}

export async function isApplicationReady(baseUrl = BASE_URL) {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2500) });
    return response.ok && (await response.text()).includes("Joint Procurement");
  } catch { return false; }
}

export async function startDemoServer() {
  if (await isApplicationReady()) return { process: null, reused: true, baseUrl: BASE_URL };
  await ensureDirectories();
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(PORT)], {
    cwd: process.cwd(), windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, VIDEO_DEMO_MODE: "1", NEXT_TELEMETRY_DISABLED: "1" },
  });
  let log = "";
  child.stdout.on("data", (chunk) => { log += chunk; });
  child.stderr.on("data", (chunk) => { log += chunk; });
  for (let attempt = 0; attempt < 180; attempt += 1) {
    if (await isApplicationReady()) {
      await writeFile(`${PATHS.reports}/server.log`, log, "utf8");
      return { process: child, reused: false, baseUrl: BASE_URL };
    }
    if (child.exitCode != null) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await writeFile(`${PATHS.reports}/server.log`, log, "utf8");
  stopDemoServer({ process: child, reused: false });
  throw new Error(`Il server demo non è diventato disponibile su ${BASE_URL}. Consulta ${PATHS.reports}/server.log.`);
}

export function stopDemoServer(server) {
  if (!server?.process || server.reused) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.process.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  else server.process.kill("SIGTERM");
}
