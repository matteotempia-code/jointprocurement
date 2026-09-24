export type ProcurementLimitConfiguration = {
  limitType: "MONETARY" | "QUANTITY";
  periodStart: Date;
  periodEnd: Date;
  canonicalProductId?: string | null;
  categoryId?: string | null;
  maximumAmount?: unknown;
  maximumQuantity?: unknown;
  quantityUom?: string | null;
};

export function requireFiniteProcurementLimitMaximum(
  input: Pick<ProcurementLimitConfiguration, "limitType" | "maximumAmount" | "maximumQuantity">,
) {
  const maximum = Number(
    input.limitType === "MONETARY" ? input.maximumAmount : input.maximumQuantity,
  );
  if (!Number.isFinite(maximum)) {
    throw new Error("La configurazione del limite non è valida: il massimo deve essere finito.");
  }
  return maximum;
}

function positiveNumber(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${field} è obbligatorio.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${field} deve essere un numero positivo.`);
  }
  return parsed;
}

export function validateProcurementLimit(input: ProcurementLimitConfiguration) {
  if (!input.canonicalProductId && !input.categoryId) {
    throw new Error("Il limite deve indicare un prodotto o una categoria.");
  }
  if (input.canonicalProductId && input.categoryId) {
    throw new Error("Il limite non può indicare contemporaneamente prodotto e categoria.");
  }
  if (
    !(input.periodStart instanceof Date) ||
    !(input.periodEnd instanceof Date) ||
    !Number.isFinite(input.periodStart.getTime()) ||
    !Number.isFinite(input.periodEnd.getTime()) ||
    input.periodEnd <= input.periodStart
  ) {
    throw new Error("Il periodo del limite non è valido.");
  }
  if (input.limitType === "MONETARY") {
    if (input.maximumQuantity !== null && input.maximumQuantity !== undefined) {
      throw new Error("Un limite monetario non può avere una quantità massima.");
    }
    return {
      maximumAmount: positiveNumber(input.maximumAmount, "L'importo massimo"),
      maximumQuantity: null,
    };
  }
  if (input.maximumAmount !== null && input.maximumAmount !== undefined) {
    throw new Error("Un limite quantitativo non può avere un importo massimo.");
  }
  if (!input.quantityUom?.trim()) {
    throw new Error("L'unità di misura è obbligatoria per un limite quantitativo.");
  }
  return {
    maximumAmount: null,
    maximumQuantity: positiveNumber(input.maximumQuantity, "La quantità massima"),
  };
}
