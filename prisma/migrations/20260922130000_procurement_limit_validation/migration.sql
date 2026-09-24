ALTER TABLE "ProcurementLimit"
  DROP CONSTRAINT "ProcurementLimit_scope_check";

ALTER TABLE "ProcurementLimit"
  ADD CONSTRAINT "ProcurementLimit_scope_check" CHECK (
    (("canonicalProductId" IS NOT NULL)::integer + ("categoryId" IS NOT NULL)::integer) = 1
    AND "periodEnd" > "periodStart"
    AND (
      (
        "limitType" = 'MONETARY'
        AND "maximumAmount" IS NOT NULL
        AND "maximumAmount" <> 'NaN'::numeric
        AND "maximumAmount" > 0
        AND "maximumQuantity" IS NULL
        AND "quantityUom" IS NULL
      )
      OR
      (
        "limitType" = 'QUANTITY'
        AND "maximumQuantity" IS NOT NULL
        AND "maximumQuantity" <> 'NaN'::numeric
        AND "maximumQuantity" > 0
        AND "maximumAmount" IS NULL
        AND length(btrim("quantityUom")) > 0
      )
    )
  );
