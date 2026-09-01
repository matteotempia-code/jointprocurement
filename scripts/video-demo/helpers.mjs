import { writeFile } from "node:fs/promises";
import { BASE_URL, PATHS, PAUSES } from "./config.mjs";

const cursorInit = () => {
  const install = () => {
    if (document.getElementById("__jp_demo_cursor")) return;
    const cursor = document.createElement("div");
    cursor.id = "__jp_demo_cursor";
    cursor.setAttribute("aria-hidden", "true");
    Object.assign(cursor.style, {
      position: "fixed", zIndex: "2147483646", left: "50%", top: "48%", width: "13px", height: "13px",
      border: "1.5px solid rgba(28,25,21,.88)", borderRadius: "50%", background: "rgba(255,255,255,.82)",
      boxShadow: "0 2px 7px rgba(28,25,21,.2)", pointerEvents: "none", opacity: ".34",
      transform: "translate(-50%,-50%)", transition: "left .42s cubic-bezier(.2,.75,.25,1), top .42s cubic-bezier(.2,.75,.25,1), opacity .18s, transform .18s",
    });
    document.documentElement.append(cursor);
    window.__jpVideoCursor = {
      move(x, y) { cursor.style.opacity = ".92"; cursor.style.left = `${x}px`; cursor.style.top = `${y}px`; cursor.style.transform = "translate(-50%,-50%) scale(1)"; clearTimeout(window.__jpCursorIdle); window.__jpCursorIdle = setTimeout(() => { cursor.style.opacity = ".3"; }, 1400); },
      click() { cursor.style.transform = "translate(-50%,-50%) scale(.72)"; setTimeout(() => { cursor.style.transform = "translate(-50%,-50%) scale(1)"; }, 180); },
    };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
};

function slug(value) { return value.toLocaleLowerCase("it-IT").replace(/[^a-z0-9à-ÿ]+/g, "-").replace(/^-|-$/g, ""); }

export class DemoScene {
  constructor(page, definition) {
    this.page = page;
    this.definition = definition;
    this.startedAt = Date.now();
    this.beats = [];
    this.stillTaken = false;
    this.consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("favicon")) this.consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => this.consoleErrors.push(error.message));
  }

  elapsed() { return Date.now() - this.startedAt; }
  async pause(kind = "read") {
    const scale = Number(process.env.VIDEO_DEMO_PACE ?? 1) * Number(this.definition.pace ?? 1);
    await this.page.waitForTimeout(Math.max(120, Math.round((PAUSES[kind] ?? Number(kind) ?? PAUSES.read) * scale)));
  }
  async settle() {
    await this.page.waitForLoadState("domcontentloaded").catch(() => {});
    await this.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  }
  async beat(id, description, suggestedNarration, action, pause = "read") {
    const startMs = this.elapsed();
    await action();
    await this.pause(pause);
    this.beats.push({ id, startMs, endMs: this.elapsed(), description, suggestedNarration });
  }
  async goto(path, options = {}) {
    const response = await this.page.goto(new URL(path, BASE_URL).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (!response?.ok()) throw new Error(`GET ${path}: HTTP ${response?.status() ?? "nessuna risposta"}`);
    // Next's loading boundary can briefly render a skeleton <main> beside the
    // resolved page. The final main is always the last visible one.
    await this.page.locator("main").last().waitFor({ state: "visible" });
    await this.settle();
    if (options.pause !== false) await this.pause(options.pause ?? "read");
  }
  async moveTo(locator) {
    await locator.waitFor({ state: "visible" });
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error("Elemento senza coordinate visibili.");
    const x = box.x + Math.min(box.width * .55, box.width - 8);
    const y = box.y + box.height * .5;
    await this.page.evaluate(({ x, y }) => window.__jpVideoCursor?.move(x, y), { x, y });
    await this.page.mouse.move(x, y, { steps: 24 });
    await this.page.waitForTimeout(480);
  }
  async focus(locator, duration = 1350) {
    await locator.waitFor({ state: "visible" });
    await locator.scrollIntoViewIfNeeded();
    await locator.evaluate((element, ms) => {
      const previous = { outline: element.style.outline, outlineOffset: element.style.outlineOffset, transition: element.style.transition };
      element.style.transition = "outline-color .2s ease, box-shadow .2s ease";
      element.style.outline = "2px solid rgba(61,53,41,.44)";
      element.style.outlineOffset = "5px";
      element.style.boxShadow = "0 0 0 9px rgba(244,242,239,.78)";
      setTimeout(() => { element.style.outline = previous.outline; element.style.outlineOffset = previous.outlineOffset; element.style.transition = previous.transition; element.style.boxShadow = ""; }, ms);
    }, duration);
    await this.pause(Math.min(duration, 1400));
  }
  async click(locator, { settle = true } = {}) {
    await this.moveTo(locator);
    await this.page.evaluate(() => window.__jpVideoCursor?.click());
    await locator.click();
    if (settle) await this.settle();
  }
  async type(locator, value, delay = 72) {
    await this.moveTo(locator);
    await locator.click();
    await locator.fill("");
    await locator.pressSequentially(value, { delay });
  }
  async select(locator, option) {
    await this.moveTo(locator);
    await locator.selectOption(option);
    await this.settle();
  }
  async switchPersona(name) {
    await this.goto("/", { pause: "short" });
    const switcher = this.page.getByLabel("Visualizza come", { exact: true });
    const value = await switcher.locator("option").evaluateAll((options, expected) => options.find((option) => option.textContent?.includes(expected))?.value, name);
    if (!value) throw new Error(`Persona demo non disponibile: ${name}`);
    await this.moveTo(switcher);
    await switcher.selectOption(value);
    // The switcher uses a server action. On a brand-new context hydration can
    // finish a fraction after the change, so submit the real form if needed.
    await this.page.waitForTimeout(350);
    if (!await this.page.getByText(name, { exact: true }).last().isVisible().catch(() => false)) {
      await switcher.evaluate((element) => element.form?.requestSubmit());
    }
    await this.settle();
    await this.page.getByText(name, { exact: true }).last().waitFor();
    await this.pause("explain");
  }
  async screenshot() {
    await this.page.screenshot({ path: `${PATHS.screenshots}/${this.definition.id}.png`, fullPage: false });
    this.stillTaken = true;
  }
  async assertText(value) { await this.page.getByText(value, { exact: false }).first().waitFor({ state: "visible" }); }
  async writeOutputs(technical = {}) {
    if (!this.stillTaken) await this.screenshot();
    const durationMs = this.elapsed();
    const manifest = {
      scene: this.definition.id, persona: this.definition.persona, purpose: this.definition.purpose,
      durationMs, recordedAt: new Date().toISOString(), viewport: { width: 1920, height: 1080 },
      visualBeats: this.beats, technical, consoleErrors: this.consoleErrors,
    };
    await writeFile(`${PATHS.manifests}/${this.definition.id}.json`, JSON.stringify(manifest, null, 2), "utf8");
    const cue = `# ${this.definition.id}\n\n## VISUAL\n\n${this.definition.purpose}\n\n${this.beats.map((beat) => `- ${Math.round(beat.startMs / 100) / 10}s–${Math.round(beat.endMs / 100) / 10}s — ${beat.description}`).join("\n")}\n\n## VOICE INTENT\n\n${this.definition.voiceIntent}\n\n## DRAFT NARRATION\n\n${this.definition.narration}\n\n## TARGET DURATION\n\n${this.definition.targetDuration}\n\n> Bozza provvisoria: riscrivere dopo il montaggio. Tono calmo, concreto e senza promesse non dimostrate.\n`;
    await writeFile(`${PATHS.narration}/${this.definition.id}.md`, cue, "utf8");
    return manifest;
  }
}

export async function installDemoCursor(context) { await context.addInitScript(cursorInit); }
export function selectorSlug(value) { return slug(value); }
