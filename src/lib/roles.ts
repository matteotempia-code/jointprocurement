export const roleCodes = [
  "RSA_DIRECTOR",
  "AREA_MANAGER",
  "PROCUREMENT_MANAGER",
  "PROCUREMENT_ADMIN",
  "FINANCE_CONTROLLER",
  "EXECUTIVE_SPONSOR",
] as const;

export type RoleCode = (typeof roleCodes)[number];

export const homeByRole: Record<RoleCode, string> = {
  RSA_DIRECTOR: "/",
  AREA_MANAGER: "/",
  PROCUREMENT_MANAGER: "/",
  PROCUREMENT_ADMIN: "/",
  FINANCE_CONTROLLER: "/",
  EXECUTIVE_SPONSOR: "/control-tower",
};

export const navigationByRole: Record<RoleCode, { label: string; href: string }[]> = {
  RSA_DIRECTOR: [
    { label: "Home", href: "/" },
    { label: "Catalogo", href: "/catalog" },
    { label: "Preferiti", href: "/preferiti" },
    { label: "Liste", href: "/liste" },
    { label: "Carrello", href: "/cart" },
    { label: "Richieste", href: "/richieste" },
    { label: "Ordini", href: "/orders" },
    { label: "Consegne", href: "/consegne" },
    { label: "Budget", href: "/budget" },
    { label: "Problemi", href: "/non-conformita" },
  ],
  AREA_MANAGER: [
    { label: "Home area", href: "/" },
    { label: "Approvazioni", href: "/approvals" },
    { label: "Strutture", href: "/facilities" },
    { label: "Budget", href: "/budget" },
    { label: "Consegne critiche", href: "/consegne" },
    { label: "Problemi", href: "/non-conformita" },
  ],
  PROCUREMENT_MANAGER: [
    { label: "Centro di controllo", href: "/" },
    { label: "Da gestire", href: "/approvals" },
    { label: "Prodotti", href: "/products" },
    { label: "Evidenze tecniche", href: "/technical-documents" },
    { label: "Categorie", href: "/categorie" },
    { label: "Fornitori", href: "/suppliers" },
    { label: "Listini", href: "/price-lists" },
    { label: "Importazioni", href: "/imports" },
    { label: "Confronto prezzi", href: "/compare" },
    { label: "Ordini", href: "/orders" },
    { label: "Non conformità", href: "/non-conformita" },
    { label: "Budget", href: "/budget" },
  ],
  PROCUREMENT_ADMIN: [
    { label: "Home", href: "/" },
    { label: "Organizzazione", href: "/organization" },
    { label: "Utenti e poteri", href: "/users" },
    { label: "Deleghe", href: "/deleghe" },
    { label: "Prodotti", href: "/products" },
    { label: "Evidenze tecniche", href: "/technical-documents" },
    { label: "Categorie", href: "/categorie" },
    { label: "Fornitori", href: "/suppliers" },
    { label: "Importazioni", href: "/imports" },
  ],
  FINANCE_CONTROLLER: [{ label: "Home", href: "/" }],
  EXECUTIVE_SPONSOR: [{ label: "Control Tower", href: "/control-tower" }],
};

export const procurementRoles: RoleCode[] = ["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"];

// Chi puo' aprire che cosa. CANONE.md §7.2, decisa dal committente il 25/09/2026:
// la ricerca globale restituisce SOLO cio' che il profilo puo' aprire. Senza questa
// mappa la Legge 5 si viola al primo tasto premuto — un risultato che porta a una
// pagina di rifiuto e' peggio di nessun risultato.
//
// I valori non sono inventati: ricalcano i requireRoles delle pagine di dettaglio.
// Se una pagina cambia guardia, cambia anche qui, e la prova e' il test che le
// confronta.
export const searchableByRole: Record<RoleCode, Array<keyof typeof searchableGuards>> = {
  RSA_DIRECTOR: ["products", "orders", "requests"],
  AREA_MANAGER: ["products", "requests", "facilities"],
  PROCUREMENT_MANAGER: ["products", "suppliers", "orders", "requests"],
  PROCUREMENT_ADMIN: ["products", "suppliers", "facilities"],
  FINANCE_CONTROLLER: [],
  EXECUTIVE_SPONSOR: [],
};

// Le guardie reali delle pagine di dettaglio, copiate una per una.
export const searchableGuards = {
  products: ["RSA_DIRECTOR", "AREA_MANAGER", "PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"],
  suppliers: ["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"],
  orders: ["RSA_DIRECTOR", "PROCUREMENT_MANAGER"],
  requests: ["RSA_DIRECTOR", "AREA_MANAGER", "PROCUREMENT_MANAGER"],
  facilities: ["AREA_MANAGER", "PROCUREMENT_ADMIN"],
} as const satisfies Record<string, readonly RoleCode[]>;

export function canSearch(role: RoleCode, kind: keyof typeof searchableGuards) {
  return (searchableByRole[role] as string[]).includes(kind);
}
