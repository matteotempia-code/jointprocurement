import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";

const required = (name) => {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required`);
  return value;
};

const token = required("VERCEL_TOKEN");
const projectId = required("VERCEL_PROJECT_ID");
const teamId = required("VERCEL_TEAM_ID");
const expectedSha = required("EXPECTED_GIT_SHA");
const target = process.env.VERCEL_TARGET?.trim() || "develop";
const outputFile = required("GITHUB_OUTPUT");
const deadline = Date.now() + 12 * 60_000;

function commitSha(deployment) {
  return deployment.meta?.githubCommitSha
    ?? deployment.meta?.gitCommitSha
    ?? deployment.gitSource?.sha
    ?? null;
}

async function deployments() {
  const query = new URLSearchParams({ projectId, teamId, limit: "100", target });
  const response = await fetch(`https://api.vercel.com/v6/deployments?${query}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Vercel deployments API returned HTTP ${response.status}`);
  const payload = await response.json();
  return payload.deployments ?? [];
}

while (Date.now() < deadline) {
  const matching = (await deployments()).filter((deployment) => commitSha(deployment) === expectedSha);
  const ready = matching.find((deployment) => deployment.readyState === "READY" || deployment.state === "READY");
  if (ready) {
    const url = `https://${ready.url}`;
    await appendFile(outputFile, `url=${url}\n`, "utf8");
    console.log(`Vercel ${target} deployment for ${expectedSha.slice(0, 12)} is READY.`);
    process.exit(0);
  }

  const failed = matching.find((deployment) => (deployment.readyState ?? deployment.state) === "ERROR");
  if (failed) throw new Error(`Vercel ${target} deployment for this commit ended in ${failed.readyState ?? failed.state}.`);

  console.log(`Waiting for Vercel ${target} deployment for ${expectedSha.slice(0, 12)}...`);
  await new Promise((resolve) => setTimeout(resolve, 15_000));
}

throw new Error(`Timed out waiting for Vercel ${target} deployment for ${expectedSha}.`);
