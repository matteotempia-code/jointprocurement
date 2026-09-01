import { PERSONAS } from "../config.mjs";

export default async function procurement(scene) {
  await scene.beat("control-center", "Giulia entra nel Centro di controllo Procurement.", "La pagina parte dalle eccezioni che richiedono attenzione.", async () => {
    await scene.switchPersona(PERSONAS.giulia);
    await scene.assertText("Coda operativa");
    await scene.focus(scene.page.locator(".attention-command").first());
    await scene.screenshot();
  }, "analysis");
  await scene.beat("actionable-priority", "Una priorità mostra gravità, anzianità e contesto.", "La coda indica dove intervenire prima, senza cercare tra moduli separati.", async () => {
    const queue = scene.page.locator(".procurement-queue, .attention-list").first();
    if (await queue.count()) await scene.focus(queue, 1900);
    else await scene.focus(scene.page.getByText("Cosa richiede attenzione", { exact: false }).first());
  }, "analysis");
  await scene.beat("supplier-directory", "Giulia apre il portafoglio fornitori.", "Ogni fornitore collega spesa, offerta, consegne e qualità.", async () => {
    await scene.goto("/suppliers");
    const supplierLink = scene.page.getByRole("table").getByRole("link").first();
    await scene.click(supplierLink);
    await scene.assertText("Fornitore 360");
    await scene.focus(scene.page.locator(".definition-grid").first());
  }, "analysis");
  await scene.beat("supplier-performance", "Dipendenza e performance rendono leggibile il rischio commerciale.", "Quota spesa, copertura e campione osservato evitano score opachi.", async () => {
    const performance = scene.page.locator(".supplier-performance-strip").first();
    await scene.focus(performance, 1900);
  }, "analysis");
  await scene.beat("category-360", "La lettura passa dalla singola controparte alla categoria.", "Categoria 360 unisce domanda, concentrazione e segnali di prezzo.", async () => {
    await scene.goto("/categorie");
    const category = scene.page.getByRole("link", { name: /spesa osservata/i }).first();
    await scene.click(category);
    await scene.assertText("Priorità della categoria");
    await scene.focus(scene.page.getByText("Priorità della categoria", { exact: true }).first());
  }, "analysis");
}
