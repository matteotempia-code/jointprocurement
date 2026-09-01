import { PERSONAS } from "../config.mjs";

export default async function executive(scene) {
  await scene.beat("executive-home", "Davide entra nella sintesi direzionale.", "La Control Tower riduce il sistema a pochi indicatori con definizioni coerenti.", async () => {
    await scene.switchPersona(PERSONAS.davide);
    await scene.assertText("Control Tower");
    const open = scene.page.getByRole("link", { name: /Apri la Control Tower/i });
    if (await open.count()) await scene.click(open);
    await scene.focus(scene.page.locator(".metrics-grid, .executive-metrics").first());
    await scene.screenshot();
  }, "analysis");
  await scene.beat("opportunities", "Le principali opportunità sono limitate alle più significative.", "La direzione vede dove si crea valore senza dettagli operativi minuti.", async () => {
    await scene.focus(scene.page.getByText(/Opportunità/i).first(), 1800);
  }, "analysis");
  await scene.beat("risks", "I rischi operativi e commerciali completano la lettura.", "Ritardi, qualità e conformità restano leggibili nello stesso quadro.", async () => {
    await scene.focus(scene.page.getByText(/Rischi/i).first(), 1800);
  }, "analysis");
  await scene.beat("organizations", "Anteo e Coopselios sono confrontate senza perdere il perimetro comune.", "Il modello joint mantiene separazione organizzativa e visione aggregata.", async () => {
    await scene.focus(scene.page.getByText(/Anteo.*Coopselios|Coopselios.*Anteo/i).first(), 1900);
  }, "analysis");
}
