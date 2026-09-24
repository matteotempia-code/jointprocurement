import { z } from "zod";
import { importFields, type ImportField, type InterpretedFields } from "./types";

const numericFields = new Set<ImportField>([
  "unitsPerPackage",
  "grossPrice",
  "discount",
  "netPrice",
  "taxRate",
  "moq",
  "leadTimeDays",
]);
const textValue = z.string().trim().min(1);
const numericValue = z.union([
  z.number().finite(),
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => Number.isFinite(Number(value.replace(",", ".")))),
]);
const eanValue = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().regex(/^\d{8,14}$/));

export function mergeAiInterpretedFields(
  deterministic: InterpretedFields,
  ai: InterpretedFields,
): InterpretedFields {
  const merged = { ...deterministic };
  for (const field of importFields) {
    const value = ai[field];
    if (value === null || value === undefined) continue;
    const schema = field === "ean" ? eanValue : numericFields.has(field) ? numericValue : textValue;
    const parsed = schema.safeParse(value);
    if (parsed.success) merged[field] = parsed.data;
  }
  return merged;
}
