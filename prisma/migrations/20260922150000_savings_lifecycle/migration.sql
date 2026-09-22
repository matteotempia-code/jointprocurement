ALTER TABLE "TechnicalSavingOpportunity"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "SavingOpportunityStatus" RENAME TO "SavingOpportunityStatus_old";

CREATE TYPE "SavingOpportunityStatus" AS ENUM (
  'IDENTIFIED',
  'NEGOTIATED',
  'CONTRACTED',
  'REALIZED',
  'OPEN',
  'REVIEW_REQUIRED',
  'ACCEPTED',
  'DISMISSED',
  'STALE'
);

ALTER TABLE "TechnicalSavingOpportunity"
  ALTER COLUMN "status" TYPE "SavingOpportunityStatus"
  USING (
    CASE
      WHEN "status"::text = 'OPEN' THEN 'IDENTIFIED'
      ELSE "status"::text
    END
  )::"SavingOpportunityStatus";

DROP TYPE "SavingOpportunityStatus_old";

ALTER TABLE "TechnicalSavingOpportunity"
  ALTER COLUMN "status" SET DEFAULT 'IDENTIFIED';
