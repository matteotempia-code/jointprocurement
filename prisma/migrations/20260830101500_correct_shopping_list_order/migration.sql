-- Move ordering metadata to the recurring-list item where it belongs.
ALTER TABLE "CartLine" DROP COLUMN "position";
ALTER TABLE "ShoppingListItem" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
