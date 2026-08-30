CREATE TYPE "SourceDocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');
CREATE TYPE "ImportJobStatus" AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'INTERPRETING', 'INTERPRETED', 'NEEDS_REVIEW', 'READY_TO_PUBLISH', 'PUBLISHING', 'PUBLISHED', 'FAILED');
CREATE TYPE "ImportDocumentKind" AS ENUM ('PRICE_LIST', 'OFFER', 'QUOTATION', 'INFORMATIONAL_INVOICE', 'OTHER');
CREATE TYPE "ImportRecordStatus" AS ENUM ('READY', 'NEEDS_REVIEW', 'CONFIRMED', 'NEW_PRODUCT_CONFIRMED', 'NON_COMPARABLE', 'IGNORED', 'PUBLISHED', 'FAILED');
CREATE TYPE "ProductMatchType" AS ENUM ('IDENTICAL', 'PROBABLE_MATCH', 'COMMERCIAL_SUBSTITUTE', 'FUNCTIONAL_EQUIVALENT', 'NEW_PRODUCT');
CREATE TYPE "MatchHumanDecision" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CREATE_NEW', 'NOT_COMPARABLE');

ALTER TABLE "PriceList" ADD COLUMN "importJobId" TEXT, ADD COLUMN "previousVersionId" TEXT, ADD COLUMN "publishedAt" TIMESTAMP(3), ADD COLUMN "publishedByUserId" TEXT, ADD COLUMN "sourceDocumentId" TEXT, ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SupplierOffer" ADD COLUMN "importedRecordId" TEXT, ADD COLUMN "sourceDocumentId" TEXT;

CREATE TABLE "SourceDocument" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "supplierId" TEXT, "uploadedByUserId" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "fileSize" INTEGER NOT NULL, "checksum" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL, "documentKind" "ImportDocumentKind" NOT NULL, "storagePath" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'ORGANIZATION_PRIVATE', "status" "SourceDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
  "metadata" JSONB, "version" INTEGER NOT NULL DEFAULT 1, "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportJob" (
  "id" TEXT NOT NULL, "sourceDocumentId" TEXT NOT NULL, "status" "ImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
  "parserType" TEXT, "interpretationProvider" TEXT NOT NULL DEFAULT 'LOCAL_HEURISTIC', "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3), "failedAt" TIMESTAMP(3), "errorMessage" TEXT, "totalRecords" INTEGER NOT NULL DEFAULT 0,
  "interpretedRecords" INTEGER NOT NULL DEFAULT 0, "reviewRequiredRecords" INTEGER NOT NULL DEFAULT 0,
  "publishableRecords" INTEGER NOT NULL DEFAULT 0, "publishedRecords" INTEGER NOT NULL DEFAULT 0,
  "columnMapping" JSONB, "detectedSheets" JSONB, "summary" JSONB, "createdByUserId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportedRecord" (
  "id" TEXT NOT NULL, "importJobId" TEXT NOT NULL, "recordIndex" INTEGER NOT NULL, "rawSource" TEXT NOT NULL,
  "rawFields" JSONB NOT NULL, "interpretedFields" JSONB NOT NULL, "normalizedFields" JSONB NOT NULL, "sourceLocator" JSONB NOT NULL,
  "extractionConfidence" DECIMAL(5,4), "mappingConfidence" DECIMAL(5,4), "normalizationConfidence" DECIMAL(5,4), "matchConfidence" DECIMAL(5,4),
  "status" "ImportRecordStatus" NOT NULL DEFAULT 'NEEDS_REVIEW', "requiresReview" BOOLEAN NOT NULL DEFAULT true,
  "validationErrors" JSONB, "warnings" JSONB, "humanOverride" JSONB, "canonicalProductId" TEXT, "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportedRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductMatchCandidate" (
  "id" TEXT NOT NULL, "importedRecordId" TEXT NOT NULL, "canonicalProductId" TEXT, "matchType" "ProductMatchType" NOT NULL,
  "score" DECIMAL(5,4) NOT NULL, "reasons" JSONB NOT NULL, "identifierMatches" JSONB, "descriptionSimilarity" DECIMAL(65,30),
  "uomCompatibility" BOOLEAN, "packagingCompatibility" BOOLEAN, "categoryCompatibility" BOOLEAN,
  "recommended" BOOLEAN NOT NULL DEFAULT false, "humanDecision" "MatchHumanDecision" NOT NULL DEFAULT 'PENDING',
  "decidedByUserId" TEXT, "decidedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductMatchCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportFieldCorrection" (
  "id" TEXT NOT NULL, "importedRecordId" TEXT NOT NULL, "fieldName" TEXT NOT NULL, "originalValue" JSONB,
  "interpretedValue" JSONB, "correctedValue" JSONB NOT NULL, "correctedByUserId" TEXT NOT NULL,
  "correctedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ImportFieldCorrection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SourceDocument_organizationId_uploadedAt_idx" ON "SourceDocument"("organizationId", "uploadedAt");
CREATE INDEX "SourceDocument_checksum_idx" ON "SourceDocument"("checksum");
CREATE INDEX "ImportJob_status_createdAt_idx" ON "ImportJob"("status", "createdAt");
CREATE UNIQUE INDEX "ImportJob_sourceDocumentId_version_key" ON "ImportJob"("sourceDocumentId", "version");
CREATE INDEX "ImportedRecord_importJobId_status_idx" ON "ImportedRecord"("importJobId", "status");
CREATE UNIQUE INDEX "ImportedRecord_importJobId_recordIndex_key" ON "ImportedRecord"("importJobId", "recordIndex");
CREATE INDEX "ProductMatchCandidate_importedRecordId_recommended_idx" ON "ProductMatchCandidate"("importedRecordId", "recommended");
CREATE INDEX "ImportFieldCorrection_importedRecordId_correctedAt_idx" ON "ImportFieldCorrection"("importedRecordId", "correctedAt");
CREATE UNIQUE INDEX "PriceList_importJobId_key" ON "PriceList"("importJobId");
CREATE INDEX "PriceList_supplierId_version_idx" ON "PriceList"("supplierId", "version");
CREATE INDEX "PriceList_sourceDocumentId_idx" ON "PriceList"("sourceDocumentId");
CREATE UNIQUE INDEX "SupplierOffer_importedRecordId_key" ON "SupplierOffer"("importedRecordId");
CREATE INDEX "SupplierOffer_sourceDocumentId_idx" ON "SupplierOffer"("sourceDocumentId");

ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "PriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "SourceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "SourceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_importedRecordId_fkey" FOREIGN KEY ("importedRecordId") REFERENCES "ImportedRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "SourceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportedRecord" ADD CONSTRAINT "ImportedRecord_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportedRecord" ADD CONSTRAINT "ImportedRecord_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductMatchCandidate" ADD CONSTRAINT "ProductMatchCandidate_importedRecordId_fkey" FOREIGN KEY ("importedRecordId") REFERENCES "ImportedRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductMatchCandidate" ADD CONSTRAINT "ProductMatchCandidate_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportFieldCorrection" ADD CONSTRAINT "ImportFieldCorrection_importedRecordId_fkey" FOREIGN KEY ("importedRecordId") REFERENCES "ImportedRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportFieldCorrection" ADD CONSTRAINT "ImportFieldCorrection_correctedByUserId_fkey" FOREIGN KEY ("correctedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
