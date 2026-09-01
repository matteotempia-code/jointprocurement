import { PERSONAS } from "../config.mjs";

export default async function priceIntelligence(scene) {
  await scene.beat("second-version", "Giulia apre la seconda versione del listino Alfa Medical.", "Il documento viene confrontato con la versione precedente sul prezzo normalizzato.", async () => {
    await scene.switchPersona(PERSONAS.giulia);
    await scene.goto("/imports");
    const href = await scene.page.getByRole("link", { name: "listino-alfa-medical-2028.xlsx" }).first().getAttribute("href");
    await scene.goto(`${href}/changes`);
    await scene.assertText("Cosa è cambiato");
    await scene.focus(scene.page.locator(".price-intelligence-summary").first());
    await scene.screenshot();
  }, "analysis");
  const basePath = new URL(scene.page.url()).pathname.replace(/\/changes$/, "");
  await scene.beat("increases", "Il filtro Aumenti isola le variazioni commerciali rilevanti.", "Le priorità emergono senza scorrere l'intero listino.", async () => {
    await scene.goto(`${basePath}/changes?tipo=increases&ordine=increase&rilevanti=1`);
    await scene.focus(scene.page.locator(".top-change-grid").first());
  }, "analysis");
  await scene.beat("increase-detail", "Un aumento mostra precedente, nuovo e migliore corrente.", "La posizione del nuovo prezzo è leggibile rispetto al mercato interno disponibile.", async () => {
    const detail = scene.page.getByRole("link", { name: "Apri dettaglio" }).first();
    await scene.click(detail);
    await scene.assertText("Dato interpretato");
    await scene.focus(scene.page.locator(".record-decision-hero").first());
  }, "analysis");
  await scene.beat("packaging-change", "Un cambio confezione viene letto sul costo per unità di consumo.", "Il sistema non scambia l'aumento del prezzo scatola con un aumento reale per pezzo.", async () => {
    await scene.goto(`${basePath}/changes?tipo=packaging`);
    await scene.assertText("Confezioni cambiate");
    await scene.focus(scene.page.locator(".packaging-change-section").first(), 2300);
  }, "analysis");
  await scene.beat("old-new-summary", "La sintesi old-versus-new separa aumenti, riduzioni, nuovi e rimossi.", "Un documento commerciale diventa una mappa di decisioni procurement.", async () => {
    await scene.goto(`${basePath}/changes`);
    await scene.focus(scene.page.locator(".old-new-overview").first());
  }, "analysis");
}
