ALTER TABLE "Organization"
  ADD COLUMN "vatDeductibilityPercent" DECIMAL(5,2) NOT NULL DEFAULT 100;

ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_vatDeductibilityPercent_check"
  CHECK (
    "vatDeductibilityPercent" <> 'NaN'::numeric
    AND "vatDeductibilityPercent" >= 0
    AND "vatDeductibilityPercent" <= 100
  );
