import path from "node:path";
import { PERSONAS, ROOT } from "../config.mjs";

export default async function smartImport(scene) {
  await scene.beat("import-work-queue", "Giulia apre la coda delle importazioni da gestire.", "Gli import che richiedono una decisione vengono prima dello storico.", async () => {
    await scene.switchPersona(PERSONAS.giulia);
    await scene.goto("/imports");
    await scene.assertText("Da gestire");
    await scene.focus(scene.page.locator(".import-work-queue, .import-attention-list").first());
  }, "analysis");

  await scene.beat("exceptions-first", "Un documento sporco mostra poche eccezioni rispetto alle righe interpretate.", "Il valore è lavorare sulle eccezioni, non leggere l'intero documento.", async () => {
    const dirty = scene.page.getByRole("link", { name: "offerta-caresupply-sporca.csv" }).first();
    const href = await dirty.getAttribute("href");
    await scene.goto(href);
    await scene.assertText("Revisione per eccezione");
    await scene.focus(scene.page.locator(".review-toolbar").first());
  }, "analysis");

  await scene.beat("uncertain-record", "La coda espone subito i record incerti e la loro causa.", "Giulia non deve leggere le righe affidabili: match, unità e confezioni ambigue arrivano prima.", async () => {
    await scene.focus(scene.page.locator("tr.review-row").first(), 2200);
    await scene.screenshot();
  }, "analysis");

  await scene.beat("upload-real-xlsx", "Giulia carica un file XLSX reale e seleziona il fornitore.", "Il file originale viene conservato; in questo ambiente lavora l'interpretazione locale.", async () => {
    await scene.goto("/imports/new");
    const input = scene.page.getByTestId("import-file");
    await input.setInputFiles(path.join(ROOT, "demo-imports", "listino-alfa-medical-2027.xlsx"));
    await scene.select(scene.page.getByRole("combobox", { name: /^Fornitore/ }), { label: "Alfa Medical" });
    await scene.focus(scene.page.locator(".import-honesty-note").first());
    await scene.click(scene.page.getByRole("button", { name: "Carica e interpreta" }));
    await scene.page.waitForURL((url) => /^\/imports\/(?!new(?:\/|$))[^/]+$/.test(url.pathname), { timeout: 60_000 });
    await scene.assertText("Revisione per eccezione");
  }, "analysis");

  const importPath = new URL(scene.page.url()).pathname;
  await scene.beat("column-mapping", "Il mapping colonne mostra cosa è stato riconosciuto automaticamente.", "Parser deterministico e mapping euristico restano modificabili prima della revisione.", async () => {
    await scene.goto(`${importPath}/mapping`);
    await scene.assertText("Mapping delle colonne");
    await scene.focus(scene.page.locator(".mapping-summary").first());
  }, "analysis");

  await scene.beat("interpreted-record", "Una riga pronta mostra confezione e prezzo normalizzato coerenti.", "Una scatola da cento a due euro e cinquanta diventa zero virgola zero due cinque per pezzo.", async () => {
    await scene.goto(`${importPath}?filtro=ready`);
    const row = scene.page.getByRole("link", { name: "Riga 1", exact: true }).first();
    await scene.click(row);
    await scene.assertText("Dato interpretato");
    await scene.focus(scene.page.locator(".record-decision-hero").first());
  }, "analysis");

  await scene.beat("matching-reasons", "Il match consigliato espone segnali e differenze.", "Il punteggio non è decorativo: la UI spiega perché il candidato è proposto.", async () => {
    await scene.focus(scene.page.getByText("Match consigliato", { exact: false }).first(), 1900);
  }, "explain");

  await scene.beat("provenance", "La provenienza si espande solo quando serve.", "Ogni campo conserva valore grezzo, interpretazione, normalizzazione e posizione sorgente.", async () => {
    const disclosure = scene.page.locator("details.provenance-disclosure");
    await disclosure.locator("summary").click();
    await scene.focus(disclosure, 2200);
  }, "analysis");

  await scene.beat("confirm-safe-batch", "Le proposte ad alta affidabilità vengono confermate insieme.", "Il controllo umano resta esplicito, ma non costringe a ripetere decisioni identiche.", async () => {
    await scene.goto(importPath);
    const button = scene.page.getByRole("button", { name: "Conferma tutte le proposte affidabili" });
    await scene.focus(button);
    await scene.click(button);
    await scene.assertText(/record pronti|Nessuna decisione|Pronto/i);
  }, "analysis");

  await scene.beat("publish-gate", "Il riepilogo rende espliciti record pronti e blocchi residui.", "Nessun dato entra nel catalogo prima del gate di pubblicazione.", async () => {
    await scene.goto(`${importPath}/summary`);
    await scene.assertText("Pronto per pubblicare?");
    await scene.focus(scene.page.locator(".publish-counts").first());
  }, "analysis");

  await scene.beat("publish", "Giulia conferma la nuova versione del listino.", "La pubblicazione è atomica, idempotente e conserva il collegamento alla fonte.", async () => {
    await scene.click(scene.page.getByRole("button", { name: "Pubblica importazione" }), { settle: false });
    const dialog = scene.page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    await scene.focus(dialog, 1600);
    await scene.click(dialog.getByRole("button", { name: "Pubblica", exact: true }));
    await scene.page.waitForURL(/pubblicato=/, { timeout: 60_000 });
    await scene.goto(`${importPath}/summary`);
    await scene.assertText("Importazione completata");
    await scene.focus(scene.page.locator(".publish-result").first());
  }, "analysis");
}
