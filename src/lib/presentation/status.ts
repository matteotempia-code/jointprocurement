const labels: Record<string, string> = {
  DRAFT: "Bozza", SUBMITTED: "Inviata", PENDING_APPROVAL: "In approvazione",
  APPROVED: "Approvata", REJECTED: "Rifiutata", CLARIFICATION_REQUESTED: "Chiarimento richiesto",
  CANCELLED: "Annullata", PENDING: "Da decidere", ISSUED: "Inviato", ACKNOWLEDGED: "Confermato",
  PARTIALLY_RECEIVED: "Parzialmente ricevuto", RECEIVED: "Ricevuto", ISSUE: "Con problemi",
  COMPLETE: "Completa", PARTIAL: "Parziale", WITH_ISSUES: "Con problemi", OPEN: "Aperta",
  UNDER_REVIEW: "In valutazione", RESOLVED: "Risolta", CLOSED: "Chiusa", IN_STOCK: "Disponibile",
  LIMITED: "Disponibilità limitata", BACKORDER: "Su ordinazione", UNAVAILABLE: "Non disponibile",
  AUTO_APPROVE: "Approvazione automatica", AREA_MANAGER_APPROVAL: "Approvazione Area Manager",
  PROCUREMENT_APPROVAL: "Approvazione Procurement", ACTIVE: "Attivo", INACTIVE: "Non attivo",
  LOW: "Bassa", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Critica", MISSING: "Quantità mancante",
  DAMAGED: "Prodotto danneggiato", WRONG_ITEM: "Prodotto errato", QUALITY: "Problema qualitativo",
  EXPIRY: "Scadenza non conforme", PACKAGING: "Imballaggio non conforme", OTHER: "Altro",
  REQUISITION_CREATED: "Richiesta creata", POLICY_EVALUATED: "Policy valutata",
  REQUISITION_SUBMITTED: "Richiesta inviata", PURCHASE_REQUISITION: "Richiesta d’acquisto",
  PURCHASE_ORDER: "Ordine al fornitore", SHOPPING_LIST: "Lista ricorrente",
  CREATED: "Creata", CREATED_FROM_ORDER: "Creata da un ordine",
  LIST_USED: "Lista utilizzata", FAVORITE_ADDED: "Prodotto aggiunto ai preferiti", FAVORITE: "Preferito",
  APPROVAL_REQUESTED: "Approvazione richiesta", PO_CREATED: "Ordine creato",
  RECEIPT_CREATED: "Ricezione registrata", ISSUE_OPENED: "Non conformità aperta",
  DOCUMENT_UPLOADED: "Documento caricato", IMPORT_STARTED: "Lettura avviata",
  COLUMN_MAPPING_CHANGED: "Mapping colonne aggiornato", FIELD_CORRECTED: "Campo corretto",
  MATCH_ACCEPTED: "Corrispondenza confermata", MATCH_REJECTED: "Corrispondenza rifiutata",
  NEW_PRODUCT_CONFIRMED: "Nuovo prodotto confermato", RECORD_IGNORED: "Record ignorato",
  RECORD_NOT_COMPARABLE: "Record segnato non confrontabile", IMPORT_READY: "Importazione pronta",
  IMPORT_PUBLISHED: "Importazione pubblicata", IMPORT_FAILED: "Importazione non riuscita",
  IMPORT_REPROCESSED: "Documento rielaborato", SUPPLIER_CONFIRMED: "Fornitore confermato",
};

export function statusLabel(code: string) {
  return labels[code] ?? code.replaceAll("_", " ").toLocaleLowerCase("it-IT");
}

export function policyExplanationLabel(value: string | null | undefined) {
  if (!value) return "Esito della policy non disponibile.";
  const normalized = value.toLowerCase();
  if (normalized.includes("governed catalog") && normalized.includes("autonomous authority")) return "Acquisto da catalogo, entro il budget disponibile e nel limite di autonomia della struttura.";
  if (normalized.includes("available budget") && normalized.includes("area manager")) return "L’importo supera il limite autonomo della struttura e richiede l’approvazione dell’Area Manager.";
  if (normalized.includes("out of budget")) return "La richiesta supera il budget disponibile e richiede una valutazione esplicita.";
  if (normalized.includes("procurement")) return "La richiesta richiede una valutazione del Procurement in base alle soglie applicabili.";
  return value;
}
