CREATE TYPE "OperationalAttachmentKind" AS ENUM ('OUT_OF_CATALOG', 'RECEIPT', 'QUALITY_ISSUE');
CREATE TYPE "ProcurementLimitType" AS ENUM ('MONETARY', 'QUANTITY');

CREATE TABLE "ProcurementLimit" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "canonicalProductId" TEXT,
  "categoryId" TEXT,
  "costCenterId" TEXT,
  "limitType" "ProcurementLimitType" NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "maximumAmount" DECIMAL(14,2),
  "maximumQuantity" DECIMAL(14,4),
  "quantityUom" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProcurementLimit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProcurementLimit_scope_check" CHECK (
    ("canonicalProductId" IS NOT NULL OR "categoryId" IS NOT NULL)
    AND (("limitType" = 'MONETARY' AND "maximumAmount" IS NOT NULL AND "maximumQuantity" IS NULL)
      OR ("limitType" = 'QUANTITY' AND "maximumQuantity" IS NOT NULL AND "maximumAmount" IS NULL))
  )
);

CREATE TABLE "OperationalAttachment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "kind" "OperationalAttachmentKind" NOT NULL,
  "outOfCatalogRequestId" TEXT,
  "receiptId" TEXT,
  "qualityIssueId" TEXT,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "storageProvider" TEXT NOT NULL,
  "storageBucket" TEXT,
  "storageObjectKey" TEXT NOT NULL,
  "immutableAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OperationalAttachment_owner_check" CHECK (
    num_nonnulls("outOfCatalogRequestId", "receiptId", "qualityIssueId") = 1
  )
);

CREATE INDEX "ProcurementLimit_facilityId_periodStart_periodEnd_idx" ON "ProcurementLimit"("facilityId", "periodStart", "periodEnd");
CREATE INDEX "ProcurementLimit_canonicalProductId_active_idx" ON "ProcurementLimit"("canonicalProductId", "active");
CREATE INDEX "ProcurementLimit_categoryId_active_idx" ON "ProcurementLimit"("categoryId", "active");
CREATE INDEX "OperationalAttachment_organizationId_createdAt_idx" ON "OperationalAttachment"("organizationId", "createdAt");
CREATE INDEX "OperationalAttachment_outOfCatalogRequestId_idx" ON "OperationalAttachment"("outOfCatalogRequestId");
CREATE INDEX "OperationalAttachment_receiptId_idx" ON "OperationalAttachment"("receiptId");
CREATE INDEX "OperationalAttachment_qualityIssueId_idx" ON "OperationalAttachment"("qualityIssueId");

ALTER TABLE "ProcurementLimit" ADD CONSTRAINT "ProcurementLimit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcurementLimit" ADD CONSTRAINT "ProcurementLimit_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcurementLimit" ADD CONSTRAINT "ProcurementLimit_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcurementLimit" ADD CONSTRAINT "ProcurementLimit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcurementLimit" ADD CONSTRAINT "ProcurementLimit_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OperationalAttachment" ADD CONSTRAINT "OperationalAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalAttachment" ADD CONSTRAINT "OperationalAttachment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalAttachment" ADD CONSTRAINT "OperationalAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OperationalAttachment" ADD CONSTRAINT "OperationalAttachment_outOfCatalogRequestId_fkey" FOREIGN KEY ("outOfCatalogRequestId") REFERENCES "OutOfCatalogRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalAttachment" ADD CONSTRAINT "OperationalAttachment_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OperationalAttachment" ADD CONSTRAINT "OperationalAttachment_qualityIssueId_fkey" FOREIGN KEY ("qualityIssueId") REFERENCES "QualityIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
