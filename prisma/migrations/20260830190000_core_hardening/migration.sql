ALTER TABLE "CanonicalProduct"
  ADD COLUMN "purchaseUom" TEXT NOT NULL DEFAULT 'PACK',
  ADD COLUMN "unitsPerPackage" DECIMAL(14,4),
  ADD COLUMN "consumptionUom" TEXT,
  ADD COLUMN "consumptionUomLabel" TEXT;

ALTER TABLE "Supplier"
  ADD COLUMN "paymentTerms" TEXT,
  ADD COLUMN "deliveryTerms" TEXT,
  ADD COLUMN "minimumOrderValue" DECIMAL(14,2),
  ADD COLUMN "freeShippingThreshold" DECIMAL(14,2),
  ADD COLUMN "commercialContact" JSONB,
  ADD COLUMN "orderContact" JSONB,
  ADD COLUMN "qualityContact" JSONB,
  ADD COLUMN "certificationPath" TEXT,
  ADD COLUMN "commercialDocumentPath" TEXT,
  ADD COLUMN "qualityDocumentPath" TEXT;

ALTER TABLE "ApprovalRequest" ADD COLUMN "delegationId" TEXT;
ALTER TABLE "ApprovalDelegation" ADD COLUMN "categoryId" TEXT;
CREATE INDEX "ApprovalDelegation_scopeType_scopeId_categoryId_idx" ON "ApprovalDelegation"("scopeType", "scopeId", "categoryId");
