// Guardia contro la doppia codifica UTF-8.
//
// Perche' esiste: lint, tsc e build non vedono il mojibake. Il 29/09/2026 era
// renderizzato sulla Control Tower, cioe' sulla pagina dell'amministratore delegato
// ("affidabilitA~A e rischi"), e 48 volte in una schermata di Confronto prezzi.
// Un commit "solo formattazione" ne aveva aggiunte sei senza che nessuno se ne
// accorgesse.
//
// Controlla il codice, non docs/: i documenti di design citano deliberatamente le
// sequenze sbagliate come prova del difetto, e correggerle li' cancellerebbe la prova.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src", "scripts", "tests", "prisma"];
const EXTENSIONS = /[.](tsx?|mjs|cjs|js|css|json)$/;

// Sequenze prodotte da UTF-8 letto come latin-1 o Windows-1252.
const SUSPECT = /[ÂÃâ][-¿ƒˆœž–—‘’‚“”†€™]/g;

const findings = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/node_modules|[.]next|[.]git/.test(p)) walk(p);
    } else if (EXTENSIONS.test(entry.name)) {
      const text = readFileSync(p, "utf8");
      let m;
      SUSPECT.lastIndex = 0;
      while ((m = SUSPECT.exec(text))) {
        const line = text.slice(0, m.index).split("\n").length;
        const points = [...m[0]]
          .map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"))
          .join(" ");
        findings.push(
          `${p}:${line}  ${points}  …${text.slice(Math.max(0, m.index - 35), m.index + 25).replace(/\s+/g, " ")}…`,
        );
      }
    }
  }
}

for (const root of ROOTS) walk(root);

if (findings.length === 0) {
  console.log("Codifica: nessuna doppia codifica UTF-8 nel codice.");
  process.exit(0);
}

console.error(`Codifica: ${findings.length} occorrenze di doppia codifica UTF-8.`);
console.error("Non correggerle a mano carattere per carattere: la sostituzione parziale");
console.error("lascia residui peggiori dell'originale. Le doppie vanno sostituite prima");
console.error("delle singole.\n");
for (const f of findings.slice(0, 40)) console.error("  " + f);
if (findings.length > 40) console.error(`  … e altre ${findings.length - 40}.`);
process.exit(1);
