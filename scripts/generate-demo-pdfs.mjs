import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "public", "documents");

const documents = [
  ["scheda-tecnica-demo.pdf", "SCHEDA TECNICA DEMO", "Dispositivo professionale sintetico - Modello JP-100", [
    ["Identificazione", "Codice: DEMO-JP-100 | Lotto: FAC-SIMILE | Origine: dataset dimostrativo"],
    ["Caratteristiche", "Materiale dimostrativo, confezione da 100 unita, uso professionale."],
    ["Conservazione", "Conservare in luogo asciutto tra 5 C e 30 C. Proteggere dalla luce."],
    ["Nota", "Documento sintetico senza validita tecnica, commerciale o regolatoria."],
  ]],
  ["scheda-sicurezza-demo.pdf", "SCHEDA DI SICUREZZA DEMO", "Fac-simile informativo - Prodotto sintetico JP-SAFE", [
    ["Classificazione", "Prodotto dimostrativo non classificato. Nessuna sostanza reale dichiarata."],
    ["Precauzioni", "Uso professionale simulato. Evitare contatto e dispersione accidentale."],
    ["Primo intervento", "In un caso reale consultare sempre la scheda ufficiale del produttore."],
    ["Nota", "Fac-simile privo di validita legale, sanitaria o regolatoria."],
  ]],
  ["certificazione-demo.pdf", "CERTIFICAZIONE DEMO", "Attestazione sintetica per il catalogo Joint Procurement OS", [
    ["Oggetto", "Referenza dimostrativa DEMO-CERT-001."],
    ["Dichiarazione", "Il presente asset verifica esclusivamente il flusso documentale software."],
    ["Validita", "Nessuna. Non certifica prodotti, imprese, processi o conformita reali."],
    ["Tracciabilita", "Emesso automaticamente dal generatore repository - revisione 1."],
  ]],
  ["dichiarazione-conformita-demo.pdf", "DICHIARAZIONE DI CONFORMITA DEMO", "FAC-SIMILE - Nessun fabbricante o soggetto reale", [
    ["Prodotto", "Articolo sintetico JP-CONFORM-001, creato per test e presentazioni."],
    ["Dichiarazione", "I dati sono inventati e non attestano conformita a norme o direttive."],
    ["Responsabilita", "Non utilizzare il documento per acquisti, gare o verifiche regolatorie."],
    ["Stato", "Documento demo controllato - revisione 1."],
  ]],
].map(([file, title, subtitle, sections]) => ({ file, title, subtitle, sections }));

function escapePdfText(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function createPdf(document) {
  const commands = [
    "0.10 0.25 0.38 rg", "40 770 515 42 re f",
    "BT /F1 19 Tf 1 1 1 rg 58 786 Td", `(${escapePdfText(document.title)}) Tj ET`,
    "BT /F1 11 Tf 0.16 0.20 0.24 rg 58 748 Td", `(${escapePdfText(document.subtitle)}) Tj ET`,
    "0.82 0.86 0.89 RG 40 728 m 555 728 l S",
  ];
  let y = 690;
  for (const [heading, body] of document.sections) {
    commands.push(
      `BT /F1 12 Tf 0.10 0.25 0.38 rg 58 ${y} Td (${escapePdfText(heading)}) Tj ET`,
      `BT /F1 10 Tf 0.16 0.20 0.24 rg 58 ${y - 20} Td (${escapePdfText(body)}) Tj ET`,
    );
    y -= 78;
  }
  commands.push(
    "0.94 0.96 0.97 rg 40 105 515 70 re f",
    "BT /F1 11 Tf 0.72 0.12 0.12 rg 58 148 Td (DEMO / FAC-SIMILE) Tj ET",
    "BT /F1 9 Tf 0.24 0.28 0.31 rg 58 128 Td (Dati interamente sintetici. Nessun dato personale o fornitore reale.) Tj ET",
    "BT /F1 8 Tf 0.40 0.44 0.47 rg 58 60 Td (Joint Procurement OS - fixture documentale riproducibile) Tj ET",
  );
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n% DEMO FAC-SIMILE\n";
  const offsets = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "ascii");
}

await mkdir(outputDirectory, { recursive: true });
for (const document of documents) await writeFile(path.join(outputDirectory, document.file), createPdf(document));
console.log(`Generated ${documents.length} synthetic demo PDFs in ${outputDirectory}`);
