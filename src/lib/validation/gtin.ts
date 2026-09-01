export function isValidGtin(value: string) {
  if (!/^\d{13}$|^\d{14}$/.test(value) || /^0+$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === check;
}

export function normalizeOptionalGtin(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  if (!isValidGtin(normalized)) throw new Error("Inserisci un EAN-13 o GTIN-14 valido, incluso il carattere di controllo.");
  return normalized;
}
