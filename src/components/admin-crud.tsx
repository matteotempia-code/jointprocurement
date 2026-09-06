import type { ReactNode } from "react";

const messages: Record<string, string> = {
  salvata: "Modifica salvata.", salvato: "Modifica salvata.", duplicato: "Esiste gia un record con gli stessi identificativi.",
  "dati-non-validi": "Controlla i dati inseriti.", "nome-non-valido": "Inserisci un nome di almeno tre caratteri.",
  "entita-in-uso": "L'entita contiene aree e non puo essere eliminata.", "utente-in-uso": "L'utente ha attivita collegate: e possibile solo disattivarlo.",
  "auto-disattivazione-vietata": "Non puoi disattivare la tua assegnazione corrente.", "ruolo-non-valido": "Seleziona un ruolo valido.",
  "scope-non-valido": "Le persone devono appartenere all'organizzazione corrente.", conflitto: "Esiste gia una delega sovrapposta.", "categoria-in-uso": "La categoria e referenziata e non puo essere eliminata.",
};
export function AdminFeedback({ result }: { result?: string }) { if (!result) return null; const ok = result === "salvata" || result === "salvato"; return <p role="status" className={`admin-feedback ${ok ? "is-ok" : "is-error"}`}>{messages[result] ?? "Operazione non completata."}</p>; }
export function AdminPanel({ label, children }: { label: string; children: ReactNode }) { return <details className="admin-crud-panel"><summary className="primary-cta">{label}</summary>{children}</details>; }
