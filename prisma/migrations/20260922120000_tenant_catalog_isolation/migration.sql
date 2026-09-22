-- Existing catalog rows predate tenant ownership. Backfill them into the
-- oldest organization, which is the legacy owner, before enforcing NOT NULL.
ALTER TABLE "Supplier" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Category" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "CanonicalProduct" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "PriceList" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "SupplierOffer" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AuditEvent" ADD COLUMN "organizationId" TEXT;

WITH legacy_org AS (
  SELECT "id" FROM "Organization" ORDER BY "createdAt", "id" LIMIT 1
)
UPDATE "Supplier" SET "organizationId" = (SELECT "id" FROM legacy_org);
WITH legacy_org AS (
  SELECT "id" FROM "Organization" ORDER BY "createdAt", "id" LIMIT 1
)
UPDATE "Category" SET "organizationId" = (SELECT "id" FROM legacy_org);
UPDATE "CanonicalProduct" product
SET "organizationId" = category."organizationId"
FROM "Category" category
WHERE product."categoryId" = category."id";
UPDATE "PriceList" list
SET "organizationId" = supplier."organizationId"
FROM "Supplier" supplier
WHERE list."supplierId" = supplier."id";
UPDATE "SupplierOffer" offer
SET "organizationId" = list."organizationId"
FROM "PriceList" list
WHERE offer."priceListId" = list."id";
UPDATE "AuditEvent" event
SET "organizationId" = assignment."organizationId"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "organizationId"
  FROM "UserAssignment"
  WHERE "active" = true
  ORDER BY "userId", "createdAt", "id"
) assignment
WHERE event."actorUserId" = assignment."userId";
WITH legacy_org AS (
  SELECT "id" FROM "Organization" ORDER BY "createdAt", "id" LIMIT 1
)
UPDATE "AuditEvent" SET "organizationId" = (SELECT "id" FROM legacy_org) WHERE "organizationId" IS NULL;

ALTER TABLE "Supplier" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "CanonicalProduct" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "PriceList" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "SupplierOffer" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AuditEvent" ALTER COLUMN "organizationId" SET NOT NULL;

DROP INDEX IF EXISTS "Supplier_vatNumber_key";
DROP INDEX IF EXISTS "Category_code_key";
CREATE UNIQUE INDEX "Supplier_organizationId_vatNumber_key" ON "Supplier"("organizationId", "vatNumber");
CREATE UNIQUE INDEX "Supplier_id_organizationId_key" ON "Supplier"("id", "organizationId");
CREATE INDEX "Supplier_organizationId_active_idx" ON "Supplier"("organizationId", "active");
CREATE UNIQUE INDEX "Category_organizationId_code_key" ON "Category"("organizationId", "code");
CREATE UNIQUE INDEX "Category_id_organizationId_key" ON "Category"("id", "organizationId");
CREATE UNIQUE INDEX "CanonicalProduct_id_organizationId_key" ON "CanonicalProduct"("id", "organizationId");
CREATE INDEX "CanonicalProduct_organizationId_active_idx" ON "CanonicalProduct"("organizationId", "active");
CREATE UNIQUE INDEX "PriceList_id_organizationId_key" ON "PriceList"("id", "organizationId");
CREATE INDEX "PriceList_organizationId_active_idx" ON "PriceList"("organizationId", "active");
CREATE INDEX "SupplierOffer_organizationId_active_idx" ON "SupplierOffer"("organizationId", "active");
CREATE INDEX "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt");

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanonicalProduct" DROP CONSTRAINT "CanonicalProduct_categoryId_fkey";
ALTER TABLE "CanonicalProduct" ADD CONSTRAINT "CanonicalProduct_categoryId_organizationId_fkey" FOREIGN KEY ("categoryId", "organizationId") REFERENCES "Category"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CanonicalProduct" ADD CONSTRAINT "CanonicalProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceList" DROP CONSTRAINT "PriceList_supplierId_fkey";
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_supplierId_organizationId_fkey" FOREIGN KEY ("supplierId", "organizationId") REFERENCES "Supplier"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierOffer" DROP CONSTRAINT "SupplierOffer_supplierId_fkey";
ALTER TABLE "SupplierOffer" DROP CONSTRAINT "SupplierOffer_canonicalProductId_fkey";
ALTER TABLE "SupplierOffer" DROP CONSTRAINT "SupplierOffer_priceListId_fkey";
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_supplierId_organizationId_fkey" FOREIGN KEY ("supplierId", "organizationId") REFERENCES "Supplier"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_canonicalProductId_organizationId_fkey" FOREIGN KEY ("canonicalProductId", "organizationId") REFERENCES "CanonicalProduct"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_priceListId_organizationId_fkey" FOREIGN KEY ("priceListId", "organizationId") REFERENCES "PriceList"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
