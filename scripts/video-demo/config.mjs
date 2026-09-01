import path from "node:path";

export const ROOT = process.cwd();
export const OUTPUT = path.join(ROOT, "artifacts", "video-demo");
export const PATHS = {
  root: OUTPUT,
  clips: path.join(OUTPUT, "clips"),
  screenshots: path.join(OUTPUT, "screenshots"),
  manifests: path.join(OUTPUT, "manifests"),
  narration: path.join(OUTPUT, "narration"),
  reports: path.join(OUTPUT, "reports"),
  temporary: path.join(OUTPUT, ".playwright-video"),
};
export const PORT = Number(process.env.VIDEO_DEMO_PORT ?? 3117);
export const BASE_URL = process.env.VIDEO_DEMO_BASE_URL ?? `http://localhost:${PORT}`;
export const VIEWPORT = { width: 1920, height: 1080 };

export const PAUSES = {
  short: 750,
  read: 1800,
  explain: 3000,
  analysis: 4200,
};

export const PERSONAS = {
  lucia: "Lucia Ferri",
  andrea: "Andrea Riva",
  giulia: "Giulia Bianchi",
  marco: "Marco Villa",
  elena: "Elena Conti",
  davide: "Davide Romano",
};

export const SCENES = [
  {
    id: "01-opening", aliases: ["opening", "01"], persona: "Lucia Ferri → Giulia Bianchi → Davide Romano",
    purpose: "Mostrare un'unica piattaforma che adatta profondità e priorità al ruolo.", targetDuration: "30–45 secondi",
    voiceIntent: "Aprire con il principio di una sola base dati e complessità diversa per ogni persona.",
    narration: "Joint Procurement OS riunisce acquisto operativo, governance procurement e lettura direzionale. Ogni persona entra nello stesso sistema, ma vede soltanto le decisioni e gli strumenti coerenti con il proprio ruolo.",
  },
  {
    id: "02-guided-buying", aliases: ["guided-buying", "buying", "02"], persona: "Lucia Ferri",
    purpose: "Dimostrare l'acquisto guidato dal bisogno alla richiesta.", targetDuration: "2–3 minuti", pace: 2.4,
    voiceIntent: "Rendere evidente la semplicità consumer con regole e budget applicati sotto la superficie.",
    narration: "Lucia parte da un bisogno concreto. Cerca i guanti, legge confezione e prezzo normalizzato, sceglie la quantità e arriva al carrello. Prima dell'invio vede già l'impatto sul budget e il percorso di approvazione previsto.",
  },
  {
    id: "03-approval", aliases: ["approval", "approvazione", "03"], persona: "Andrea Riva",
    purpose: "Mostrare una decisione di approvazione completa di contesto.", targetDuration: "1,5–2 minuti", pace: 2.8,
    voiceIntent: "Spiegare che il responsabile approva con budget, policy, storico e anomalie davanti.",
    narration: "Andrea riceve una richiesta già contestualizzata. Il sistema spiega perché serve una decisione, calcola il budget residuo e mette in evidenza storico, fornitore e anomalie. L'approvazione non è un gesto cieco.",
  },
  {
    id: "04-procurement", aliases: ["procurement", "04"], persona: "Giulia Bianchi",
    purpose: "Mostrare il governo per eccezione, rischio e opportunità.", targetDuration: "1,5–2 minuti", pace: 2,
    voiceIntent: "Collegare coda operativa, rischio fornitore e segnali di categoria.",
    narration: "Giulia parte da ciò che richiede attenzione. Da una priorità può scendere nel Fornitore 360, capire dipendenza e affidabilità, e poi leggere la categoria come insieme di prezzi, domanda e opportunità commerciali.",
  },
  {
    id: "05-orders-receiving", aliases: ["orders-receiving", "receiving", "orders", "05"], persona: "Lucia Ferri",
    purpose: "Seguire la decisione approvata fino alla ricezione e al problema operativo.", targetDuration: "1–1,5 minuti", pace: 1.4,
    voiceIntent: "Mostrare continuità e tracciabilità dall'ordine alla merce ricevuta.",
    narration: "La decisione approvata diventa un ordine tracciabile. Lucia vede consegna e quantità residue, registra una ricezione parziale e segnala una difformità sulla stessa riga dell'ordine.",
  },
  {
    id: "06-smart-import", aliases: ["smart-import", "import", "06"], persona: "Giulia Bianchi",
    purpose: "Dimostrare staging, revisione per eccezione, matching, provenienza e pubblicazione.", targetDuration: "3–4 minuti", pace: 2,
    voiceIntent: "Rendere concreto il principio: il sistema propone, l'umano conferma, la fonte resta sempre visibile.",
    narration: "Smart Import conserva il documento originale, interpreta localmente le righe e porta in primo piano soltanto le eccezioni. Ogni proposta di matching è spiegata; la provenienza arriva fino alla cella sorgente. Solo dopo la conferma umana i dati entrano in una nuova versione del listino.",
  },
  {
    id: "07-price-intelligence", aliases: ["price-intelligence", "prices", "07"], persona: "Giulia Bianchi",
    purpose: "Trasformare una nuova versione di listino in variazioni commerciali leggibili.", targetDuration: "1,5–2 minuti", pace: 1.8,
    voiceIntent: "Evidenziare aumenti e cambi confezione sul prezzo normalizzato, non sul prezzo nominale.",
    narration: "La seconda versione del listino diventa immediatamente confrontabile. Aumenti, riduzioni e cambi confezione sono separati. Quando la confezione raddoppia, il sistema confronta il costo per unità di consumo e non confonde il prezzo della scatola con il prezzo reale.",
  },
  {
    id: "08-executive", aliases: ["executive", "08"], persona: "Davide Romano",
    purpose: "Dare alla direzione una sintesi di performance, rischi e opportunità.", targetDuration: "45–75 secondi", pace: 2.2,
    voiceIntent: "Chiudere il valore operativo in una lettura direzionale essenziale.",
    narration: "La Control Tower elimina il rumore operativo. Davide vede spesa, conformità, rischio e opportunità, con un confronto sintetico tra le organizzazioni e la possibilità di scendere nel dettaglio solo quando serve.",
  },
  {
    id: "09-roadmap", aliases: ["roadmap", "close", "09"], persona: "Davide Romano",
    purpose: "Separare con trasparenza ciò che è disponibile dalla roadmap futura.", targetDuration: "45–60 secondi", pace: 2.5,
    voiceIntent: "Concludere senza presentare le evoluzioni future come capacità già operative.",
    narration: "Il core operativo è già disponibile: acquisto, governance, esecuzione e intelligenza prezzi. Le estensioni successive — fatture, sourcing, portale fornitori e document intelligence esterna — restano esplicitamente nella roadmap.",
  },
];

export function resolveScene(value) {
  if (!value) return null;
  const normalized = String(value).replace(/^--scene=?/, "").trim().toLocaleLowerCase("it-IT");
  return SCENES.find((scene) => scene.id === normalized || scene.aliases.includes(normalized)) ?? null;
}
