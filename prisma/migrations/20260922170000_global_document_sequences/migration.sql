CREATE TEMPORARY TABLE "DocumentSequenceSeed" AS
SELECT "documentType", "year", MAX("value") AS "value"
FROM "DocumentSequence"
GROUP BY "documentType", "year";

TRUNCATE TABLE "DocumentSequence";
DROP INDEX "DocumentSequence_organizationId_documentType_year_key";
DROP INDEX "DocumentSequence_organizationId_year_idx";
ALTER TABLE "DocumentSequence" DROP CONSTRAINT "DocumentSequence_organizationId_fkey";
ALTER TABLE "DocumentSequence" DROP COLUMN "organizationId";
CREATE UNIQUE INDEX "DocumentSequence_documentType_year_key" ON "DocumentSequence"("documentType", "year");

INSERT INTO "DocumentSequence" ("id", "documentType", "year", "value", "createdAt", "updatedAt")
SELECT 'seq_' || md5("documentType" || "year"::text || random()::text), "documentType", "year", "value", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "DocumentSequenceSeed";

WITH existing_numbers AS (
  SELECT 'REQUISITION' AS "documentType", substring("requisitionNumber" from '^PR-([0-9]{4})-')::int AS "year", substring("requisitionNumber" from '^PR-[0-9]{4}-([0-9]{6})')::int AS "value" FROM "PurchaseRequisition" WHERE "requisitionNumber" ~ '^PR-[0-9]{4}-[0-9]{6}'
  UNION ALL
  SELECT 'PURCHASE_ORDER', substring("poNumber" from '^PO-([0-9]{4})-')::int, substring("poNumber" from '^PO-[0-9]{4}-([0-9]{6})')::int FROM "PurchaseOrder" WHERE "poNumber" ~ '^PO-[0-9]{4}-[0-9]{6}'
  UNION ALL
  SELECT 'OUT_OF_CATALOG', substring("requestNumber" from '^FC-([0-9]{4})-')::int, substring("requestNumber" from '^FC-[0-9]{4}-([0-9]{6})')::int FROM "OutOfCatalogRequest" WHERE "requestNumber" ~ '^FC-[0-9]{4}-[0-9]{6}'
  UNION ALL
  SELECT 'RECEIPT', substring("receiptNumber" from '^GR-([0-9]{4})-')::int, substring("receiptNumber" from '^GR-[0-9]{4}-([0-9]{6})')::int FROM "Receipt" WHERE "receiptNumber" ~ '^GR-[0-9]{4}-[0-9]{6}'
), maxima AS (
  SELECT "documentType", "year", MAX("value") AS "value" FROM existing_numbers GROUP BY "documentType", "year"
)
INSERT INTO "DocumentSequence" ("id", "documentType", "year", "value", "createdAt", "updatedAt")
SELECT 'seq_' || md5("documentType" || "year"::text || random()::text), "documentType", "year", "value", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM maxima
ON CONFLICT ("documentType", "year") DO UPDATE
SET "value" = GREATEST("DocumentSequence"."value", EXCLUDED."value"), "updatedAt" = CURRENT_TIMESTAMP;

DROP TABLE "DocumentSequenceSeed";
