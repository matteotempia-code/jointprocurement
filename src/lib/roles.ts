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
  RSA_DIRECTOR: [{ label: "Home", href: "/" }, { label: "Catalog", href: "/catalog" }],
  AREA_MANAGER: [{ label: "Home", href: "/" }, { label: "Facilities", href: "/facilities" }, { label: "Catalog", href: "/catalog" }],
  PROCUREMENT_MANAGER: [{ label: "Home", href: "/" }, { label: "Products", href: "/products" }, { label: "Price Lists", href: "/price-lists" }, { label: "Suppliers", href: "/suppliers" }, { label: "Compare", href: "/compare" }],
  PROCUREMENT_ADMIN: [{ label: "Home", href: "/" }, { label: "Organization", href: "/organization" }, { label: "Users", href: "/users" }, { label: "Products", href: "/products" }, { label: "Suppliers", href: "/suppliers" }],
  FINANCE_CONTROLLER: [{ label: "Home", href: "/" }],
  EXECUTIVE_SPONSOR: [{ label: "Control Tower", href: "/control-tower" }],
};

export const procurementRoles: RoleCode[] = ["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"];
