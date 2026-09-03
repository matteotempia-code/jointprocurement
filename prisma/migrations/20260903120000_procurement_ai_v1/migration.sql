CREATE TABLE "PriceListCommercialCondition" (
  "id" TEXT NOT NULL, "priceListId" TEXT NOT NULL, "conditionType" TEXT NOT NULL, "numericValue" DECIMAL(14,4), "textValue" TEXT, "currency" TEXT,
  "sourceEvidence" TEXT NOT NULL, "reasoningSummary" TEXT, "confidence" DECIMAL(5,4) NOT NULL, "interpretationProvider" TEXT NOT NULL, "providerModel" TEXT,
  "humanConfirmationState" TEXT NOT NULL DEFAULT 'PENDING', "confirmedByUserId" TEXT, "confirmedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceListCommercialCondition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PriceListCommercialCondition_priceListId_conditionType_sourceEvidence_key" ON "PriceListCommercialCondition"("priceListId", "conditionType", "sourceEvidence");
CREATE INDEX "PriceListCommercialCondition_priceListId_humanConfirmationState_idx" ON "PriceListCommercialCondition"("priceListId", "humanConfirmationState");
ALTER TABLE "PriceListCommercialCondition" ADD CONSTRAINT "PriceListCommercialCondition_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceListCommercialCondition" ADD CONSTRAINT "PriceListCommercialCondition_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "ProcurementMemory" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "supplierId" TEXT, "memoryType" TEXT NOT NULL, "lookupKey" TEXT NOT NULL, "canonicalValue" JSONB NOT NULL, "sourceEntityId" TEXT, "confirmedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ProcurementMemory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProcurementMemory_organizationId_supplierId_memoryType_lookupKey_key" ON "ProcurementMemory"("organizationId", "supplierId", "memoryType", "lookupKey");
CREATE INDEX "ProcurementMemory_organizationId_memoryType_idx" ON "ProcurementMemory"("organizationId", "memoryType");
ALTER TABLE "ProcurementMemory" ADD CONSTRAINT "ProcurementMemory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcurementMemory" ADD CONSTRAINT "ProcurementMemory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcurementMemory" ADD CONSTRAINT "ProcurementMemory_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "ProcurementAICall" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "importJobId" TEXT, "provider" TEXT NOT NULL, "model" TEXT NOT NULL, "operation" TEXT NOT NULL, "latencyMs" INTEGER NOT NULL,
  "inputTokens" INTEGER, "outputTokens" INTEGER, "totalTokens" INTEGER, "estimatedCostUsd" DECIMAL(12,6), "resultState" TEXT NOT NULL, "errorCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcurementAICall_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProcurementAICall_organizationId_createdAt_idx" ON "ProcurementAICall"("organizationId", "createdAt");
CREATE INDEX "ProcurementAICall_importJobId_operation_idx" ON "ProcurementAICall"("importJobId", "operation");
ALTER TABLE "ProcurementAICall" ADD CONSTRAINT "ProcurementAICall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcurementAICall" ADD CONSTRAINT "ProcurementAICall_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
