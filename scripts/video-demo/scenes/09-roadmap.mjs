import { PERSONAS } from "../config.mjs";

export default async function roadmap(scene) {
  await scene.beat("available-now", "La chiusura riepiloga le capacità realmente disponibili.", "Il core copre acquisto, governance, esecuzione e intelligenza dei prezzi.", async () => {
    await scene.switchPersona(PERSONAS.davide);
    await scene.goto("/demo-roadmap");
    await scene.assertText("Disponibile ora");
    await scene.focus(scene.page.locator(".video-roadmap-now").first(), 2200);
    await scene.screenshot();
  }, "analysis");
  await scene.beat("next", "La roadmap futura è esplicitamente separata dal prodotto corrente.", "Fatture, sourcing, portale fornitori e OCR reale non vengono presentati come già operativi.", async () => {
    await scene.focus(scene.page.locator(".video-roadmap-next").first(), 2400);
  }, "analysis");
  await scene.beat("close", "Il video si chiude sull'identità Joint Procurement OS.", "Una base operativa verificabile, costruita interamente su dati dimostrativi sintetici.", async () => {
    await scene.focus(scene.page.locator(".video-roadmap-close").first(), 1800);
  }, "analysis");
}
