import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";

const available = [
  "Acquisto guidato, Catalogo e Prodotto 360",
  "Preferiti e liste ricorrenti",
  "Richieste d’acquisto, policy e approvazioni",
  "Ordini, ricezioni e non conformità",
  "Budget, Fornitore 360 e Categoria 360",
  "Centro di controllo e Control Tower",
  "Importazione intelligente e matching prodotti",
  "Provenienza, revisione umana e versioni listino",
  "Intelligenza prezzi su valori normalizzati",
];

const next = [
  "Acquisizione fatture e riconciliazione a 3 o 4 vie",
  "Cockpit eccezioni Finance",
  "Sourcing strategico e richieste di offerta",
  "Portale fornitori e gestione contratti",
  "Qualifica fornitori e rischio esterno",
  "Pianificazione e aggregazione della domanda",
  "Tracciamento strutturato dei risparmi",
  "OCR e visione con provider documentale reale",
  "Elaborazione asincrona di documenti molto grandi",
];

export default async function DemoRoadmapPage() {
  await connection();
  if (process.env.VIDEO_DEMO_MODE !== "1") notFound();
  await requireRoles(["EXECUTIVE_SPONSOR"]);

  return <main className="video-roadmap">
    <PageHeader eyebrow="Presentazione demo" title="Un core operativo pronto. Una roadmap dichiarata." description="Le capacità disponibili sono separate con chiarezza dalle evoluzioni successive." />
    <div className="video-roadmap-grid">
      <section className="video-roadmap-now">
        <p className="eyebrow">Disponibile ora</p>
        <h2>Dal bisogno alla decisione, con tracciabilità</h2>
        <ul>{available.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
      </section>
      <section className="video-roadmap-next">
        <p className="eyebrow">Prossimamente</p>
        <h2>Estensioni pianificate, non ancora operative</h2>
        <p>Queste capacità appartengono alla roadmap e non sono presentate come disponibili nella versione corrente.</p>
        <ul>{next.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>
    <footer className="video-roadmap-close"><strong>Joint Procurement OS</strong><span>Anteo × Coopselios · demo con dati interamente sintetici</span></footer>
  </main>;
}
