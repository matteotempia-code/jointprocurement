import { PERSONAS } from "../config.mjs";

export default async function approval(scene) {
  await scene.beat("approval-inbox", "Andrea apre la coda delle richieste da decidere.", "Le richieste operative sono separate dallo storico.", async () => {
    await scene.switchPersona(PERSONAS.andrea);
    await scene.goto("/approvals");
    await scene.assertText("Da decidere");
    await scene.focus(scene.page.getByText(/richieste richiedono attenzione/i).first());
  }, "analysis");
  const request = scene.page.getByRole("link", { name: /^PR-/ }).first();
  await scene.beat("open-cockpit", "La richiesta si apre nel Cockpit di approvazione.", "Andrea riceve identità, struttura, importo, urgenza e stato.", async () => {
    await scene.click(request);
    await scene.assertText("Cockpit di approvazione");
    await scene.focus(scene.page.locator(".approval-header").first());
    await scene.screenshot();
  }, "analysis");
  await scene.beat("decision-context", "Policy e impatto budget spiegano perché serve una decisione.", "Il sistema mostra il disponibile prima, questa richiesta e il residuo dopo.", async () => {
    await scene.focus(scene.page.locator(".approval-context-grid").first(), 2200);
  }, "analysis");
  await scene.beat("history-and-supplier", "Storico, anomalie e affidabilità fornitore completano il contesto.", "La decisione non richiede ricostruzioni fuori dal sistema.", async () => {
    await scene.page.getByText("Contesto storico", { exact: false }).first().scrollIntoViewIfNeeded();
    await scene.focus(scene.page.getByText("Segnali di anomalia", { exact: false }).first(), 1800);
  }, "analysis");
  await scene.beat("approve", "Andrea approva con una nota contestuale.", "L'approvazione aggiorna richiesta e ordini in una transazione coerente.", async () => {
    const form = scene.page.locator(".approval-actions");
    await form.scrollIntoViewIfNeeded();
    await scene.focus(form, 1600);
    await form.getByLabel("Nota della decisione").fill("Richiesta coerente con necessità, budget e storico della struttura.");
    await scene.click(form.getByRole("button", { name: "Approva" }));
    await scene.assertText("Decisione registrata");
  }, "analysis");
}
