import { PERSONAS } from "../config.mjs";

export default async function opening(scene) {
  await scene.beat("rsa-home", "La piattaforma si apre sull'ambiente operativo della struttura.", "Una sola piattaforma parte dal lavoro quotidiano della struttura.", async () => {
    await scene.switchPersona(PERSONAS.lucia);
    await scene.assertText("Cosa ti serve oggi");
    await scene.focus(scene.page.getByText("Cosa ti serve oggi", { exact: false }).first());
  }, "explain");
  await scene.beat("procurement-role", "Il cambio persona rivela il Centro di controllo Procurement.", "La stessa base dati cambia profondità per chi governa fornitori e prezzi.", async () => {
    await scene.switchPersona(PERSONAS.giulia);
    await scene.assertText("Coda operativa");
    await scene.focus(scene.page.getByText("Coda operativa", { exact: false }).first());
  }, "explain");
  await scene.beat("executive-role", "La vista Executive riduce l'operatività a sintesi direzionale.", "La direzione vede rischi e opportunità senza rumore operativo.", async () => {
    await scene.switchPersona(PERSONAS.davide);
    await scene.assertText("Control Tower");
    await scene.screenshot();
  }, "analysis");
}
