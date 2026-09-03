import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";

const port = "3115"; const base = `http://localhost:${port}`; const output = path.join(process.cwd(), "artifacts", "tomorrow-price-list-readiness");
await mkdir(output, { recursive: true });
const server = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `npx next start -p ${port}`], { cwd: process.cwd(), stdio: "ignore", windowsHide: true });
async function ready() { try { return (await fetch(base)).ok; } catch { return false; } }
for (let i = 0; i < 80 && !(await ready()); i += 1) await new Promise((resolve) => setTimeout(resolve, 500));
if (!(await ready())) throw new Error("Server non disponibile");
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); }); page.on("pageerror", (error) => errors.push(error.message));
async function open(route) { const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle" }); if (!response?.ok()) throw new Error(`${route}: ${response?.status()}`); }
async function shot(name) { await page.screenshot({ path: path.join(output, name), fullPage: true }); }
try {
  await open("/"); const switcher = page.getByLabel(/^(Persona demo|Visualizza come)$/); const value = await switcher.locator("option").evaluateAll((options) => options.find((option) => option.textContent?.includes("Giulia Bianchi"))?.value); await switcher.selectOption(value); await page.waitForLoadState("networkidle"); await page.getByText("Giulia Bianchi", { exact: true }).last().waitFor();
  await open("/imports/cmtkojyag0000zsl921jzf6bp"); if (!(await page.locator("main").innerText()).includes("tomorrow-proof-medika-native.pdf")) throw new Error("Import PDF non visibile"); await shot("05-native-pdf-staging.png");
  await open("/imports/cmtko0job02o2fol94aoquvvl?filtro=attention"); await page.getByText("Da verificare", { exact: false }).first().waitFor(); await shot("06-human-review-required.png");
  await open("/categorie"); const category = await page.locator('main a[href^="/categorie/"]').first().getAttribute("href"); await open(category); await shot("07-category-navigation.png");
  const product = await page.locator('#opportunita a[href^="/products/"]').first().getAttribute("href"); await open(product); const rows = await page.getByRole("table", { name: "Confronto offerte fornitori" }).locator("tbody tr").count(); if (rows < 2) throw new Error(`Solo ${rows} offerta/e confrontabili`); await shot("08-cross-supplier-comparison.png");
  console.log(JSON.stringify({ comparisonRows: rows, consoleErrors: errors }, null, 2)); if (errors.length) process.exitCode = 1;
} finally { await browser.close(); server.kill(); }
