-- Move ordering metadata to the recurring-list item where it belongs.
ALTER TABLE "CartLine" DROP COLUMN "position";
ALTER TABLE IF EXISTS "ShoppingListItem" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
