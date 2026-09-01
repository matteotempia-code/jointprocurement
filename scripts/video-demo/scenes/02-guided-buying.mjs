import { PERSONAS } from "../config.mjs";

export default async function guidedBuying(scene) {
  await scene.beat("need-first", "Lucia parte dalla ricerca del bisogno.", "L'acquisto inizia da una domanda naturale, non da un codice gestionale.", async () => {
    await scene.switchPersona(PERSONAS.lucia);
    await scene.assertText("Cosa ti serve oggi");
    await scene.focus(scene.page.getByPlaceholder(/Cerca un prodotto o descrivi/i).first());
  }, "explain");
  await scene.beat("catalog-search", "Lucia cerca guanti nitrile nel catalogo.", "La ricerca porta subito ai prodotti acquistabili e convenzionati.", async () => {
    await scene.goto("/catalog");
    const search = scene.page.getByPlaceholder(/Cerca per nome prodotto/i);
    await scene.type(search, "guanti nitrile");
    await scene.click(scene.page.getByRole("button", { name: "Mostra risultati" }));
    await scene.assertText(/prodott[oi] trovat[oi]/i);
  }, "analysis");
  const productLink = scene.page.getByRole("link", { name: /Guanto nitrile senza polvere M/i }).first();
  await scene.beat("catalog-result", "La riga rende leggibili confezione, costo unitario e consegna.", "Prezzo confezione e prezzo per guanto restano distinti.", async () => {
    await scene.focus(productLink.locator("xpath=ancestor::article"));
  }, "explain");
  await scene.beat("product-360", "Lucia apre il Prodotto 360.", "Prima di acquistare vede cosa contiene la confezione, il fornitore e il costo normalizzato.", async () => {
    await scene.click(productLink);
    await scene.assertText("Offerta convenzionata");
    await scene.focus(scene.page.locator(".buy-box").first());
    await scene.screenshot();
  }, "analysis");
  await scene.beat("favorite", "Il prodotto viene salvato tra i preferiti.", "I prodotti ricorrenti restano disponibili senza ripetere la ricerca.", async () => {
    const summary = scene.page.locator("summary").filter({ hasText: "Altre azioni" }).first();
    if (await summary.count()) {
      await scene.click(summary, { settle: false });
      const favorite = scene.page.getByRole("button", { name: /preferit/i }).first();
      if (await favorite.count()) await scene.click(favorite);
    }
  }, "read");
  await scene.beat("add-quantity", "Lucia seleziona venti confezioni e aggiunge al carrello.", "La quantità è esplicita e l'offerta attiva resta collegata alla riga.", async () => {
    const quantity = scene.page.locator('.buy-box input[name="quantity"]');
    await quantity.fill("20");
    await scene.click(scene.page.getByRole("button", { name: "Aggiungi al carrello", exact: true }).first());
    await scene.pause("short");
    await scene.goto("/cart");
  }, "analysis");
  await scene.beat("budget-policy", "Il carrello mostra totale, budget e policy prima dell'invio.", "La governance è visibile prima della decisione, non dopo.", async () => {
    await scene.assertText("Impatto sul budget");
    await scene.focus(scene.page.locator(".checkout").first(), 1800);
  }, "analysis");
  await scene.beat("submit-request", "Lucia invia la richiesta d'acquisto.", "Il sistema salva snapshot economici e applica il percorso previsto dalla policy.", async () => {
    await scene.page.getByLabel("Motivazione", { exact: true }).fill("Scorta mensile per le attività assistenziali della struttura.");
    await scene.click(scene.page.getByRole("button", { name: "Invia richiesta d’acquisto" }));
    await scene.assertText(/PR-2026-/);
    await scene.focus(scene.page.locator(".page-header").first());
  }, "analysis");
}
