import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.QA_BASE_URL;
assert.ok(base, "QA_BASE_URL must identify the immutable Vercel develop deployment.");

const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
  : {};
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1366, height: 768 },
  extraHTTPHeaders: headers,
});
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("tree hydrated")) errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

async function open(path) {
  const response = await page.goto(new URL(path, base).toString(), {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  assert.equal(response?.status(), 200, `GET ${path}`);
  await page.locator("main").waitFor();
}

async function switchTo(name) {
  await open("/");
  const switcher = page.getByLabel(/^(Persona demo|Visualizza come)$/);
  const value = await switcher.locator("option").evaluateAll(
    (options, expected) => options.find((option) => option.textContent?.includes(expected))?.value,
    name,
  );
  assert.ok(value, `Demo persona ${name} is available`);
  await switcher.selectOption(value);
  await page.getByText(name, { exact: true }).last().waitFor();
}

try {
  await open("/");
  await switchTo("Giulia Bianchi");

  const routes = [
    ["/imports/new", /Importa|Nuova importazione/i],
    ["/products", /Prodotti/i],
    ["/suppliers", /Fornitori/i],
    ["/orders", /Ordini/i],
  ];
  for (const [path, expected] of routes) {
    await open(path);
    assert.match(await page.locator("main").innerText(), expected, path);
  }

  await open("/imports");
  assert.match(await page.locator("main").innerText(), /Importazioni/i);
  const reviewHrefs = await page.getByRole("link", { name: "Continua revisione" }).evaluateAll((links) => (
    [...new Set(links.map((link) => link.getAttribute("href")).filter(Boolean))]
  ));
  assert.ok(reviewHrefs.length, "At least one DEV Smart Import review job is available");

  let reviewHref;
  for (const href of reviewHrefs) {
    await open(href);
    if (await page.getByRole("link", { name: /^Riga \d+$/ }).count()) {
      reviewHref = href;
      break;
    }
  }
  assert.ok(reviewHref, "At least one Smart Import job has a reviewable record");
  const reviewText = await page.locator("main").innerText();
  assert.match(reviewText, /Revisione per eccezione/i);
  assert.match(reviewText, /Da verificare/i);
  assert.ok(await page.locator('select[name="bulkAction"]').count(), "Bulk decision control is rendered");
  assert.ok(await page.getByRole("button", { name: "Applica decisione" }).count(), "Review apply action is rendered");

  const recordLink = page.getByRole("link", { name: /^Riga \d+$/ }).first();
  await recordLink.click();
  await page.waitForLoadState("networkidle");
  assert.match(await page.locator("main").innerText(), /Revisione record|Documento/i);

  assert.deepEqual(errors, [], `Browser errors: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ status: "PASS", deployment: new URL(base).host, routes: routes.map(([path]) => path), review: reviewHref }));
} finally {
  await browser.close();
}
