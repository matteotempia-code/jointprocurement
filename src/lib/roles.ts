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
  RSA_DIRECTOR: [{ label: "Home", href: "/" }, { label: "Catalogo", href: "/catalog" }, { label: "Preferiti", href: "/preferiti" }, { label: "Liste", href: "/liste" }, { label: "Carrello", href: "/cart" }, { label: "Richieste", href: "/richieste" }, { label: "Ordini", href: "/orders" }, { label: "Consegne", href: "/consegne" }, { label: "Budget", href: "/budget" }, { label: "Problemi", href: "/non-conformita" }],
  AREA_MANAGER: [{ label: "Home area", href: "/" }, { label: "Approvazioni", href: "/approvals" }, { label: "Strutture", href: "/facilities" }, { label: "Budget", href: "/budget" }, { label: "Consegne critiche", href: "/consegne" }, { label: "Problemi", href: "/non-conformita" }],
  PROCUREMENT_MANAGER: [{ label: "Centro di controllo", href: "/" }, { label: "Da gestire", href: "/approvals" }, { label: "Prodotti", href: "/products" }, { label: "Categorie", href: "/categorie" }, { label: "Fornitori", href: "/suppliers" }, { label: "Listini", href: "/price-lists" }, { label: "Importazioni", href: "/imports" }, { label: "Confronto prezzi", href: "/compare" }, { label: "Ordini", href: "/orders" }, { label: "Non conformità", href: "/non-conformita" }, { label: "Budget", href: "/budget" }],
  PROCUREMENT_ADMIN: [{ label: "Home", href: "/" }, { label: "Organizzazione", href: "/organization" }, { label: "Utenti e poteri", href: "/users" }, { label: "Deleghe", href: "/deleghe" }, { label: "Prodotti", href: "/products" }, { label: "Categorie", href: "/categorie" }, { label: "Fornitori", href: "/suppliers" }, { label: "Importazioni", href: "/imports" }],
  FINANCE_CONTROLLER: [{ label: "Home", href: "/" }],
  EXECUTIVE_SPONSOR: [{ label: "Control Tower", href: "/control-tower" }],
};

export const procurementRoles: RoleCode[] = ["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"];
