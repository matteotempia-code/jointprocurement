CREATE TABLE "DocumentSequence" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "value" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentSequence_value_check" CHECK ("value" > 0)
);

CREATE UNIQUE INDEX "DocumentSequence_organizationId_documentType_year_key"
  ON "DocumentSequence"("organizationId", "documentType", "year");
CREATE INDEX "DocumentSequence_organizationId_year_idx"
  ON "DocumentSequence"("organizationId", "year");

ALTER TABLE "DocumentSequence"
  ADD CONSTRAINT "DocumentSequence_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
