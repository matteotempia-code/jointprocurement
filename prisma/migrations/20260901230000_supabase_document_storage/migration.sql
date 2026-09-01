-- Preserve legacy fixture/local locators while adding an explicit cloud object locator.
ALTER TABLE "SourceDocument"
  ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN "storageBucket" TEXT,
  ADD COLUMN "storageObjectKey" TEXT;

CREATE INDEX "SourceDocument_organizationId_storageProvider_idx"
  ON "SourceDocument"("organizationId", "storageProvider");
