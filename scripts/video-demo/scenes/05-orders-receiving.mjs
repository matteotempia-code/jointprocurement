import { PERSONAS } from "../config.mjs";

export default async function ordersReceiving(scene) {
  await scene.beat("orders", "Lucia apre gli ordini della struttura.", "Richiesta e decisione continuano in un oggetto operativo distinto.", async () => {
    await scene.switchPersona(PERSONAS.lucia);
    await scene.goto("/orders");
    await scene.focus(scene.page.getByRole("table").first());
  }, "analysis");
  await scene.beat("po-detail", "Il dettaglio ordine riunisce righe, consegna, condizioni e origine.", "Ogni quantità resta riconciliata con ricezioni e problemi.", async () => {
    const order = scene.page.getByRole("link", { name: /^PO-/ }).first();
    await scene.click(order);
    await scene.assertText("Ordine al fornitore");
    await scene.focus(scene.page.locator(".order-command").first());
    await scene.screenshot();
  }, "analysis");
  await scene.beat("delivery-board", "La bacheca consegne separa ritardi, oggi, prossime e ricevute.", "La struttura vede subito cosa richiede un'azione.", async () => {
    await scene.goto("/consegne");
    await scene.focus(scene.page.locator(".delivery-board").first());
  }, "analysis");
  await scene.beat("receive", "Lucia apre una ricezione ancora disponibile.", "Il flusso parte dalle quantità residue reali.", async () => {
    const receive = scene.page.getByRole("link", { name: "Registra ricezione" }).first();
    await scene.click(receive);
    await scene.assertText("Registra consegna");
    await scene.focus(scene.page.locator(".receive-form fieldset").first());
  }, "analysis");
  await scene.beat("partial-with-issue", "Viene registrata una consegna parziale con una non conformità.", "Quantità ricevuta, accettata e problematica restano tracciate sulla riga.", async () => {
    const row = scene.page.locator(".receive-form fieldset").first();
    const received = row.locator('input[name^="received-"]');
    const maximum = Number(await received.getAttribute("max") ?? 1);
    await received.fill(String(Math.max(1, maximum - 1)));
    await row.locator('select[name^="issue-"]').selectOption("DAMAGED");
    await row.locator('input[name^="affected-"]').fill("1");
    await row.locator('input[name^="issueNote-"]').fill("Una confezione presenta un danno visibile al ricevimento.");
    await scene.click(scene.page.getByRole("button", { name: "Conferma ricezione" }));
    await scene.assertText("Ricezione registrata");
  }, "analysis");
}
