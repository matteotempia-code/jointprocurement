import { z } from "zod";

const identifier = z
  .string()
  .trim()
  .min(1)
  .max(191)
  .regex(/^[^\u0000-\u001f\u007f]+$/);
const finiteQuantity = z.coerce.number().finite().max(1_000_000);

export const procurementActionSchemas = {
  id: identifier,
  positiveQuantity: finiteQuantity.gt(0),
  removableQuantity: finiteQuantity.min(0),
  decision: z.enum(["APPROVED", "REJECTED", "CLARIFICATION_REQUESTED"]),
  qualityStatus: z.enum(["UNDER_REVIEW", "RESOLVED", "CLOSED"]),
  direction: z.enum(["up", "down"]),
} as const;

export function actionId(value: FormDataEntryValue | null, field: string) {
  const parsed = procurementActionSchemas.id.safeParse(value);
  if (!parsed.success) throw new Error(`Valore ${field} non valido.`);
  return parsed.data;
}

export function actionQuantity(
  value: FormDataEntryValue | number | null,
  options?: { removable?: boolean },
) {
  const schema = options?.removable
    ? procurementActionSchemas.removableQuantity
    : procurementActionSchemas.positiveQuantity;
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error("Quantità non valida.");
  return parsed.data;
}
