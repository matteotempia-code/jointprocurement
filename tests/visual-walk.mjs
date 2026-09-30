// Passata visiva per il canone di interfaccia.
//
// Non verifica niente e non asserisce niente: visita le pagine e le fotografa.
// E' deliberatamente diverso da tests/browser-qa.mjs, che e' un viaggio dentro il
// ciclo di acquisto e si ferma legittimamente quando uno stato non torna. Per
// giudicare la grafica serve invece che la passata arrivi sempre in fondo, anche
// quando una pagina e' rotta: una pagina rotta e' essa stessa una prova.
//
// Per ogni persona demo legge le voci di navigazione che il prodotto le mostra e
// visita quelle. Cosi' non c'e' un elenco di rotte da tenere allineato a mano, e
// si vede esattamente cosa ciascun profilo ha davanti.
//
//   QA_BASE_URL=https://... npm run qa:walk

import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.QA_BASE_URL ?? `http://localhost:${process.env.QA_PORT ?? "3107"}`;
const root = "artifacts/canone-walk";
const bypassHeaders = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
  : {};

const slug = (value) =>
  value
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "home";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  extraHTTPHeaders: bypassHeaders,
});
const page = await context.newPage();

const report = [];
let captured = 0;

async function visit(directory, href) {
  const name = `${slug(href)}.png`;
  try {
    const response = await page.goto(new URL(href, base).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    // networkidle e' un lusso: se la pagina continua a parlare, la si fotografa
    // com'e' invece di rinunciare allo scatto.
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: `${directory}/${name}`, fullPage: true });
    captured += 1;
    report.push({ directory, href, status: response?.status() ?? 0, captured: name });
  } catch (error) {
    report.push({ directory, href, error: String(error).split("\n")[0], captured: null });
  }
}

await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });

const switcher = page.getByLabel(/^(Persona demo|Visualizza come)$/);
const personas = await switcher
  .locator("option")
  .evaluateAll((options) => options.map((o) => ({ value: o.value, label: o.textContent?.trim() })));

if (!personas.length) throw new Error(`Nessuna persona demo su ${base}. DEMO_MODE e' attivo?`);
console.log(`${personas.length} persone demo trovate su ${base}`);

for (const persona of personas) {
  const directory = `${root}/${slug(persona.label ?? persona.value)}`;
  await mkdir(directory, { recursive: true });

  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  await switcher.selectOption(persona.value);
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});

  // Le voci che il prodotto mostra a questa persona, non un elenco scritto a mano.
  const hrefs = await page
    .locator("nav a[href^='/']")
    .evaluateAll((links) => [...new Set(links.map((l) => l.getAttribute("href")))]);
  const routes = ["/", ...hrefs.filter((h) => h && h !== "/")];
  console.log(`${persona.label}: ${routes.length} rotte`);

  for (const href of routes) {
    await visit(directory, href);

    // Gli archetipi C (scheda) e D (decisione) vivono solo dietro un
    // identificativo: senza questo passo non finiscono mai nelle prove, ed e' la
    // lacuna che la revisione aveva dovuto dichiarare. Dall'elenco appena
    // fotografato si prende il primo dettaglio e si fotografa anche quello.
    if (href === "/") continue;
    const detail = await page
      .locator(`a[href^="${href}/"]`)
      .first()
      .getAttribute("href")
      .catch(() => null);
    if (detail && detail !== href) await visit(directory, detail);
  }
}

// Il telefono solo per la persona che lo usa davvero: il direttore di struttura.
const phone = await context.newPage();
await phone.setViewportSize({ width: 390, height: 844 });
const phoneDirectory = `${root}/telefono`;
await mkdir(phoneDirectory, { recursive: true });
for (const href of ["/", "/cart", "/consegne", "/richieste"]) {
  const name = `${slug(href)}.png`;
  try {
    await phone.goto(new URL(href, base).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await phone.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await phone.screenshot({ path: `${phoneDirectory}/${name}`, fullPage: true });
    captured += 1;
    report.push({ directory: phoneDirectory, href, captured: name });
  } catch (error) {
    report.push({ directory: phoneDirectory, href, error: String(error).split("\n")[0] });
  }
}

await mkdir(root, { recursive: true });
await writeFile(`${root}/report.json`, JSON.stringify({ base, captured, report }, null, 2), "utf8");

const failed = report.filter((entry) => entry.error);
console.log(`\n${captured} schermate scattate. ${failed.length} pagine non catturate.`);
for (const entry of failed) console.log(`  ${entry.href}: ${entry.error}`);

await browser.close();

// La passata non fallisce se una pagina non si apre: lo scopo e' avere le prove di
// quelle che si aprono. Il report dice quali mancano e perche.
