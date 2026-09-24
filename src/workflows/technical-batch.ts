import { processTechnicalBatch } from "@/lib/technical-intelligence/service";

async function processChunk(batchId: string, organizationId: string) {
  "use step";
  let result = { status: "PROCESSING", pending: 1, retryable: 0 };
  for (let group = 0; group < 50; group += 1) {
    const batch = await processTechnicalBatch(batchId, organizationId, 2);
    const pending = batch.items.filter(
      (item) => item.status === "QUEUED" || item.status === "PROCESSING",
    ).length;
    const retryable = batch.items.filter(
      (item) => item.status === "FAILED" && item.attempts < item.maxAttempts,
    ).length;
    result = { status: batch.status, pending, retryable };
    if (pending === 0 && retryable === 0) break;
  }
  return result;
}

export async function technicalBatchWorkflow(batchId: string, organizationId: string) {
  "use workflow";
  for (let chunk = 0; chunk < 5000; chunk += 1) {
    const result = await processChunk(batchId, organizationId);
    if (result.pending === 0 && result.retryable === 0) return result;
  }
  throw new Error("Il lotto non ha raggiunto uno stato terminale entro 5.000 chunk.");
}
