ALTER TYPE "IssueStatus" RENAME VALUE 'INVESTIGATING' TO 'UNDER_REVIEW';

CREATE TYPE "OutOfCatalogStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED');

ALTER TABLE "QualityIssue" ADD COLUMN "resolutionType" TEXT,
ADD COLUMN "resolutionNote" TEXT;

CREATE TABLE "Favorite" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "facilityId" TEXT NOT NULL,
  "canonicalProductId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Favorite_userId_facilityId_canonicalProductId_key" ON "Favorite"("userId", "facilityId", "canonicalProductId");
CREATE INDEX "Favorite_facilityId_idx" ON "Favorite"("facilityId");

CREATE TABLE "ShoppingList" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "facilityId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "description" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShoppingList_userId_facilityId_idx" ON "ShoppingList"("userId", "facilityId");

CREATE TABLE "ShoppingListItem" (
  "id" TEXT NOT NULL, "shoppingListId" TEXT NOT NULL, "canonicalProductId" TEXT NOT NULL,
  "quantity" DECIMAL(14,4) NOT NULL, CONSTRAINT "ShoppingListItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShoppingListItem_shoppingListId_canonicalProductId_key" ON "ShoppingListItem"("shoppingListId", "canonicalProductId");

CREATE TABLE "ApprovalDelegation" (
  "id" TEXT NOT NULL, "delegatorId" TEXT NOT NULL, "delegateId" TEXT NOT NULL, "organizationId" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL, "scopeId" TEXT, "approvalLimit" DECIMAL(14,2), "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalDelegation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ApprovalDelegation_delegateId_validFrom_validUntil_idx" ON "ApprovalDelegation"("delegateId", "validFrom", "validUntil");

CREATE TABLE "OutOfCatalogRequest" (
  "id" TEXT NOT NULL, "requestNumber" TEXT NOT NULL, "requesterId" TEXT NOT NULL, "organizationId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL, "categoryId" TEXT, "needDescription" TEXT NOT NULL, "quantity" DECIMAL(14,4) NOT NULL,
  "estimatedAmount" DECIMAL(14,2), "suggestedSupplier" TEXT, "justification" TEXT NOT NULL, "attachmentPath" TEXT,
  "status" "OutOfCatalogStatus" NOT NULL DEFAULT 'SUBMITTED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OutOfCatalogRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OutOfCatalogRequest_requestNumber_key" ON "OutOfCatalogRequest"("requestNumber");
CREATE INDEX "OutOfCatalogRequest_organizationId_status_idx" ON "OutOfCatalogRequest"("organizationId", "status");
CREATE INDEX "OutOfCatalogRequest_facilityId_createdAt_idx" ON "OutOfCatalogRequest"("facilityId", "createdAt");

ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT "ShoppingListItem_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalDelegation" ADD CONSTRAINT "ApprovalDelegation_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalDelegation" ADD CONSTRAINT "ApprovalDelegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutOfCatalogRequest" ADD CONSTRAINT "OutOfCatalogRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
