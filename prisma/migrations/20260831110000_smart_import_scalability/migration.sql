ALTER TYPE "SourceDocumentStatus" ADD VALUE IF NOT EXISTS 'REQUIRES_PROVIDER';
ALTER TYPE "ImportJobStatus" ADD VALUE IF NOT EXISTS 'REQUIRES_PROVIDER';

ALTER TABLE "ImportJob"
  ADD COLUMN "providerModel" TEXT,
  ADD COLUMN "providerCapabilities" JSONB,
  ADD COLUMN "interpretationSchema" TEXT NOT NULL DEFAULT 'smart-import-v1',
  ADD COLUMN "externalProcessing" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ImportedRecord"
  ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "supplierSkuText" TEXT,
  ADD COLUMN "eanText" TEXT,
  ADD COLUMN "normalizedPriceValue" DECIMAL(18,6),
  ADD COLUMN "exceptionType" TEXT,
  ADD COLUMN "previousNormalizedPrice" DECIMAL(18,6),
  ADD COLUMN "previousPackageSize" DECIMAL(14,4),
  ADD COLUMN "priceDeltaAmount" DECIMAL(18,6),
  ADD COLUMN "priceDeltaPercent" DECIMAL(12,4),
  ADD COLUMN "changeType" TEXT,
  ADD COLUMN "bestCurrentNormalizedPrice" DECIMAL(18,6);

ALTER TABLE "ImportedFieldValue"
  ADD COLUMN "interpretationProvider" TEXT,
  ADD COLUMN "providerModel" TEXT,
  ADD COLUMN "schemaVersion" TEXT,
  ADD COLUMN "interpretedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "ImportedRecord_importJobId_status_idx";
CREATE INDEX "ImportJob_sourceDocumentId_status_idx" ON "ImportJob"("sourceDocumentId", "status");
CREATE INDEX "ImportedRecord_importJobId_status_recordIndex_idx" ON "ImportedRecord"("importJobId", "status", "recordIndex");
CREATE INDEX "ImportedRecord_importJobId_exceptionType_idx" ON "ImportedRecord"("importJobId", "exceptionType");
CREATE INDEX "ImportedRecord_importJobId_matchConfidence_idx" ON "ImportedRecord"("importJobId", "matchConfidence");
CREATE INDEX "ImportedRecord_importJobId_changeType_priceDeltaPercent_idx" ON "ImportedRecord"("importJobId", "changeType", "priceDeltaPercent");
