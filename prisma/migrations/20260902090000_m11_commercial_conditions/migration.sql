ALTER TABLE "Supplier"
  ADD COLUMN "shippingFeeBelowThreshold" DECIMAL(14,2),
  ADD COLUMN "surchargeBelowMinimum" DECIMAL(14,2),
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR';

ALTER TABLE "PurchaseOrder"
  ADD COLUMN "shippingFee" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "commercialPolicy" JSONB,
  ADD COLUMN "commercialOverrideReason" TEXT;
