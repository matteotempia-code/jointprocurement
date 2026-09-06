import { processTechnicalBatch } from "@/lib/technical-intelligence/service";

async function processChunk(batchId: string, organizationId: string) {
  "use step";
  const batch = await processTechnicalBatch(batchId, organizationId, 3);
  const pending = batch.items.filter(
    (item) => item.status === "QUEUED" || item.status === "PROCESSING",
  ).length;
  const retryable = batch.items.filter(
    (item) => item.status === "FAILED" && item.attempts < item.maxAttempts,
  ).length;
  return { status: batch.status, pending, retryable };
}

export async function technicalBatchWorkflow(batchId: string, organizationId: string) {
  "use workflow";
  for (let chunk = 0; chunk < 500; chunk += 1) {
    const result = await processChunk(batchId, organizationId);
    if (result.pending === 0 && result.retryable === 0) return result;
  }
  throw new Error("Il lotto non ha raggiunto uno stato terminale entro 500 chunk.");
}
