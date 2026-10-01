import assert from "node:assert/strict";
import test from "node:test";
import { roleCodes, searchableByRole, searchableGuards, canSearch } from "@/lib/roles";

// CANONE.md §7.2: la ricerca globale restituisce solo cio che il profilo puo
// aprire. La mappa searchableByRole ricalca a mano le guardie delle pagine di
// dettaglio, e una copia a mano diverge: questo test e la prova che non lo faccia.
test("la ricerca non offre mai un risultato che il profilo non puo aprire", () => {
  for (const role of roleCodes) {
    for (const kind of Object.keys(searchableGuards) as (keyof typeof searchableGuards)[]) {
      const guard = searchableGuards[kind] as readonly string[];
      if (canSearch(role, kind)) {
        assert.ok(
          guard.includes(role),
          `${role} puo cercare "${kind}" ma la pagina di dettaglio non lo lascia entrare`,
        );
      }
    }
  }
});

test("un profilo senza perimetro non cerca nulla", () => {
  assert.deepEqual(searchableByRole.FINANCE_CONTROLLER, []);
  assert.deepEqual(searchableByRole.EXECUTIVE_SPONSOR, []);
});
