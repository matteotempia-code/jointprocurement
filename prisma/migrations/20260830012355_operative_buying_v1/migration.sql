-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLARIFICATION_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PolicyOutcome" AS ENUM ('AUTO_APPROVE', 'AREA_MANAGER_APPROVAL', 'PROCUREMENT_APPROVAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CLARIFICATION_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'ISSUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('COMPLETE', 'PARTIAL', 'WITH_ISSUES');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('MISSING', 'DAMAGED', 'WRONG_ITEM', 'QUALITY', 'EXPIRY', 'PACKAGING', 'LATE_DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('IN_STOCK', 'LIMITED', 'BACKORDER', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "CanonicalProduct" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "certificationPath" TEXT,
ADD COLUMN     "datasheetPath" TEXT,
ADD COLUMN     "declarationPath" TEXT,
ADD COLUMN     "imagePath" TEXT,
ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "manufacturerSku" TEXT,
ADD COLUMN     "packageDescription" TEXT,
ADD COLUMN     "safetySheetPath" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "technicalAttributes" JSONB;

-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- AlterTable
ALTER TABLE "SupplierOffer" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'IN_STOCK',
ADD COLUMN     "contractReference" TEXT,
ADD COLUMN     "leadTimeDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "moq" DECIMAL(14,4) NOT NULL DEFAULT 1,
ADD COLUMN     "packageUnit" TEXT,
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 22,
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OfferPriceHistory" (
    "id" TEXT NOT NULL,
    "supplierOfferId" TEXT NOT NULL,
    "price" DECIMAL(14,4) NOT NULL,
    "normalizedPrice" DECIMAL(14,6) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "areaId" TEXT,
    "facilityId" TEXT,
    "costCenterId" TEXT,
    "categoryId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "approvedAmount" DECIMAL(14,2) NOT NULL,
    "actualAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "BudgetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartLine" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "canonicalProductId" TEXT NOT NULL,
    "supplierOfferId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequisition" (
    "id" TEXT NOT NULL,
    "requisitionNumber" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "costCenterId" TEXT NOT NULL,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "taxTotal" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "justification" TEXT,
    "requiredByDate" TIMESTAMP(3),
    "policyDecision" "PolicyOutcome" NOT NULL,
    "policyExplanation" TEXT NOT NULL,
    "policyEvaluation" JSONB NOT NULL,
    "budgetBefore" DECIMAL(14,2) NOT NULL,
    "budgetAfter" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequisitionLine" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "canonicalProductId" TEXT NOT NULL,
    "supplierOfferId" TEXT NOT NULL,
    "descriptionSnapshot" TEXT NOT NULL,
    "supplierSnapshot" TEXT NOT NULL,
    "supplierSkuSnapshot" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "normalizedUnitPrice" DECIMAL(14,6),
    "taxRate" DECIMAL(5,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PurchaseRequisitionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "approverAssignmentId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "level" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "decisionNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "deliveryLocation" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'ISSUED',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "taxTotal" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3) NOT NULL,
    "supplierAcknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "canonicalProductId" TEXT NOT NULL,
    "descriptionSnapshot" TEXT NOT NULL,
    "supplierSkuSnapshot" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReceiptStatus" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "purchaseOrderLineId" TEXT NOT NULL,
    "quantityOrdered" DECIMAL(14,4) NOT NULL,
    "quantityReceived" DECIMAL(14,4) NOT NULL,
    "quantityAccepted" DECIMAL(14,4) NOT NULL,
    "quantityRejected" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "ReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityIssue" (
    "id" TEXT NOT NULL,
    "receiptLineId" TEXT,
    "purchaseOrderLineId" TEXT NOT NULL,
    "issueType" "IssueType" NOT NULL,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "affectedQuantity" DECIMAL(14,4) NOT NULL,
    "description" TEXT NOT NULL,
    "attachmentPath" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "QualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfferPriceHistory_supplierOfferId_effectiveAt_idx" ON "OfferPriceHistory"("supplierOfferId", "effectiveAt");

-- CreateIndex
CREATE INDEX "Budget_organizationId_periodStart_periodEnd_idx" ON "Budget"("organizationId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Budget_facilityId_categoryId_idx" ON "Budget"("facilityId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_facilityId_key" ON "Cart"("userId", "facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "CartLine_cartId_supplierOfferId_key" ON "CartLine"("cartId", "supplierOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequisition_requisitionNumber_key" ON "PurchaseRequisition"("requisitionNumber");

-- CreateIndex
CREATE INDEX "PurchaseRequisition_facilityId_createdAt_idx" ON "PurchaseRequisition"("facilityId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequisition_status_idx" ON "PurchaseRequisition"("status");

-- CreateIndex
CREATE INDEX "PurchaseRequisitionLine_requisitionId_idx" ON "PurchaseRequisitionLine"("requisitionId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_approverUserId_status_idx" ON "ApprovalRequest"("approverUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_facilityId_status_idx" ON "PurchaseOrder"("facilityId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_issuedAt_idx" ON "PurchaseOrder"("supplierId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNumber_key" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "QualityIssue_status_openedAt_idx" ON "QualityIssue"("status", "openedAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "CanonicalProduct_categoryId_subcategory_idx" ON "CanonicalProduct"("categoryId", "subcategory");

-- AddForeignKey
ALTER TABLE "OfferPriceHistory" ADD CONSTRAINT "OfferPriceHistory_supplierOfferId_fkey" FOREIGN KEY ("supplierOfferId") REFERENCES "SupplierOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_supplierOfferId_fkey" FOREIGN KEY ("supplierOfferId") REFERENCES "SupplierOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisitionLine" ADD CONSTRAINT "PurchaseRequisitionLine_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisitionLine" ADD CONSTRAINT "PurchaseRequisitionLine_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisitionLine" ADD CONSTRAINT "PurchaseRequisitionLine_supplierOfferId_fkey" FOREIGN KEY ("supplierOfferId") REFERENCES "SupplierOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_approverAssignmentId_fkey" FOREIGN KEY ("approverAssignmentId") REFERENCES "UserAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "PurchaseRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_receiptLineId_fkey" FOREIGN KEY ("receiptLineId") REFERENCES "ReceiptLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
