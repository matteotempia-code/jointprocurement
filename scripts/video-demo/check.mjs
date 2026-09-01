import { fileURLToPath } from "node:url";
import { evaluateReadiness, printReadiness } from "./readiness.mjs";
import { startDemoServer, stopDemoServer } from "./runtime.mjs";

export async function checkDemoReadiness() {
  const server = await startDemoServer();
  try {
    const report = await evaluateReadiness({ checkApplication: true });
    printReadiness(report);
    if (report.overall !== "READY") throw new Error("Il video demo non è pronto: correggere le condizioni FAIL riportate sopra.");
    return report;
  } finally { stopDemoServer(server); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) checkDemoReadiness().catch((error) => { console.error(error.message); process.exitCode = 1; });
