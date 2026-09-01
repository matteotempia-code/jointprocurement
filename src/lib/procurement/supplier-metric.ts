export const SUPPLIER_METRIC_MIN_OBSERVATIONS = 5;
export type SupplierMetricResult = { observations: number; evaluable: boolean; value: number | null; label: string };
export function supplierMetric(value: number, observations: number, label: string, threshold = SUPPLIER_METRIC_MIN_OBSERVATIONS): SupplierMetricResult {
  const evaluable = observations >= threshold;
  return { observations, evaluable, value: evaluable ? value : null, label: evaluable ? `${value.toFixed(1)}%` : `Dati insufficienti · ${observations} ${observations === 1 ? "consegna" : "consegne"}` };
}
