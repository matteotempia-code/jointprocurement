import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

const testDirectory = path.join(process.cwd(), "tests");
const files = (await readdir(testDirectory))
  .filter((name) => name.endsWith(".test.ts"))
  .sort()
  .map((name) => path.join("tests", name));

const child = spawn(process.execPath, ["--import", "tsx", "--test", "--test-concurrency=1", ...files], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

let tap = "";
const forward = (stream, destination) => {
  stream.on("data", (chunk) => {
    const text = chunk.toString();
    tap = `${tap}${text}`.slice(-2_000_000);
    destination.write(text);
  });
};

forward(child.stdout, process.stdout);
forward(child.stderr, process.stderr);

const exitCode = await new Promise((resolve) => child.on("close", (code) => resolve(code ?? 1)));
if (exitCode !== 0 && process.env.GITHUB_ACTIONS === "true") {
  const failedNames = [...tap.matchAll(/^not ok \d+ - (.+)$/gm)]
    .map((match) => match[1].replace(/[^\p{L}\p{N} .,:()/_-]/gu, "").slice(0, 180));
  const summary = failedNames.length ? failedNames.join(" | ") : "test process exited without a TAP failure name";
  console.error(`::error title=Sanitized test failures::${summary}`);
}

process.exitCode = exitCode;
