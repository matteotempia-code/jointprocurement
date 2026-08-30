-- DropIndex
DROP INDEX "ApprovalDelegation_scopeType_scopeId_categoryId_idx";

-- AlterTable
ALTER TABLE "CartLine" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;
