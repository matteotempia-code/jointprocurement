import { chromium } from "playwright";

const baseURL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

async function switchTo(label) {
  await page.goto(baseURL);
  await page.locator("#demo-user").selectOption({ label });
  await page.waitForLoadState("networkidle");
}

async function expectText(text) {
  await page.getByText(text, { exact: false }).first().waitFor();
}

try {
  await switchTo("Lucia Ferri · RSA Director");
  await expectText("Buongiorno, Lucia"); await expectText("RSA Aurora");
  await page.getByRole("link", { name: "Vai al catalogo" }).click(); await expectText("Guanto nitrile");
  await page.locator(".catalog-row").first().click(); await expectText("Supplier offers"); await expectText("Preferred offer");

  await switchTo("Andrea Riva · Area Manager");
  await expectText("Area Piemonte"); await page.getByRole("link", { name: "Facilities", exact: true }).click();
  await expectText("Residenza San Michele");
  if (await page.getByText("Villa Serena", { exact: true }).count()) throw new Error("Out-of-scope facility is visible to Area Manager");

  await switchTo("Giulia Bianchi · Joint Procurement Manager");
  await page.getByRole("link", { name: "Products", exact: true }).click(); await expectText("Price spread");
  await page.getByRole("link", { name: "Compare", exact: true }).click(); await expectText("Comparable products");
  await page.getByRole("link", { name: "Price Lists", exact: true }).click(); await expectText("Coming in next milestone");
  await page.getByRole("link", { name: "Suppliers", exact: true }).click(); await page.getByRole("link", { name: "Alfa Medical", exact: true }).click(); await expectText("Offered products");

  await switchTo("Marco Villa · Procurement Administrator");
  await page.getByRole("link", { name: "Organization", exact: true }).click(); await expectText("Legal entity");
  await page.getByRole("link", { name: "Users", exact: true }).click(); await expectText("Role ≠ scope");

  await switchTo("Elena Conti · Finance Controller"); await expectText("Finance workspace");
  if (await page.getByRole("link", { name: "Products", exact: true }).count()) throw new Error("Procurement navigation is visible to Finance");

  await switchTo("Davide Romano · Executive Sponsor");
  await page.getByRole("link", { name: "Control Tower", exact: true }).click(); await expectText("Price harmonization opportunities");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload(); await page.getByRole("button", { name: "Open navigation" }).click(); await expectText("Demo environment");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error("Unexpected horizontal page overflow at mobile viewport");
  if (errors.length) throw new Error(`Browser console errors:\n${errors.join("\n")}`);
  console.log("Browser QA passed: 6 personas, required journeys, role navigation, scope exclusion, and 390px mobile shell.");
} finally {
  await browser.close();
}
