-- Per-field evidence, confidence and human confirmation for Smart Import.
CREATE TABLE "ImportedFieldValue" (
    "id" TEXT NOT NULL,
    "importedRecordId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "rawValue" JSONB,
    "interpretedValue" JSONB,
    "normalizedValue" JSONB,
    "humanValue" JSONB,
    "sourceLocator" JSONB NOT NULL,
    "extractionConfidence" DECIMAL(5,4),
    "mappingConfidence" DECIMAL(5,4),
    "normalizationConfidence" DECIMAL(5,4),
    "confirmedByUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportedFieldValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportedFieldValue_importedRecordId_fieldName_key" ON "ImportedFieldValue"("importedRecordId", "fieldName");
CREATE INDEX "ImportedFieldValue_importedRecordId_idx" ON "ImportedFieldValue"("importedRecordId");

ALTER TABLE "ImportedFieldValue" ADD CONSTRAINT "ImportedFieldValue_importedRecordId_fkey" FOREIGN KEY ("importedRecordId") REFERENCES "ImportedRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportedFieldValue" ADD CONSTRAINT "ImportedFieldValue_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
