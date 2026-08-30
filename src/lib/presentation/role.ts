export function roleNameLabel(name: string) {
  return ({
    "RSA Director": "Responsabile struttura RSA",
    "Area Manager": "Responsabile di area",
    "Joint Procurement Manager": "Responsabile Procurement congiunto",
    "Procurement Administrator": "Amministratore Procurement",
    "Finance Controller": "Controller finanziario",
    "Executive Sponsor": "Sponsor direzionale",
  } as Record<string, string>)[name] ?? name;
}
