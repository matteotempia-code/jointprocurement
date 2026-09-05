export function receiptNumberFromId(receiptId: string, receivedAt = new Date()) {
  const uniquePart = receiptId.replaceAll("-", "").slice(0, 16).toUpperCase();
  if (uniquePart.length < 16) throw new Error("Identificativo di ricezione non valido.");
  return `GR-${receivedAt.getUTCFullYear()}-${uniquePart}`;
}
