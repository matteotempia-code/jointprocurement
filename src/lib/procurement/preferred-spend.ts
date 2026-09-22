export type SpendLine = { supplierId: string; canonicalProductId: string; amount: unknown };

export function preferredSpendShare(lines: SpendLine[], preferredSupplierProducts: Iterable<string>) {
  const preferred = new Set(preferredSupplierProducts);
  const totals = lines.reduce((result, line) => {
    const amount = Number(line.amount);
    if (!Number.isFinite(amount) || amount < 0) return result;
    result.total += amount;
    if (preferred.has(`${line.supplierId}:${line.canonicalProductId}`)) result.preferred += amount;
    return result;
  }, { total: 0, preferred: 0 });
  return totals.total ? totals.preferred / totals.total * 100 : 0;
}
