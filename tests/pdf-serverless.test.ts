import assert from "node:assert/strict";
import test from "node:test";

test("Smart Import server modules and non-PDF parsing do not initialize PDF.js globals", async () => {
  assert.equal("DOMMatrix" in globalThis, false);

  // service is the module imported by the /imports/new Server Action graph.
  process.env.DATABASE_URL ??= "postgresql://smoke:smoke@127.0.0.1:5432/smoke";
  await import("../src/lib/imports/service");
  const { parseDocument } = await import("../src/lib/imports/parser");

  assert.equal("DOMMatrix" in globalThis, false);
  const parsed = await parseDocument(
    Buffer.from("Codice;Descrizione;Prezzo\nCSV-1;Guanto demo;2,50"),
    "listino.csv",
  );
  assert.equal(parsed.parserType, "CSV_DETERMINISTIC");
  assert.equal("DOMMatrix" in globalThis, false);
});
