import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const output = path.join(process.cwd(), "demo-imports");

function pdfFromLines(lines: string[]) {
  const escaped = lines.map((line) => line.replace(/[()\\]/g, (value) => `\\${value}`).replace(/[^ -~]/g, " "));
  const stream = `BT /F1 9 Tf 40 800 Td 12 TL ${escaped.map((line, index) => `${index ? "T* " : ""}(${line}) Tj`).join(" ")} ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let body = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(body)); body += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(body); body += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body, "ascii");
}

async function workbook(filename: string, rows: Record<string, unknown>[]) {
  const book = new ExcelJS.Workbook(); book.creator = "Joint Procurement OS Demo";
  const notes = book.addWorksheet("Note"); notes.addRow(["Documento dimostrativo", "Dati interamente fittizi"]);
  const sheet = book.addWorksheet("Listino");
  const headers = ["Codice art.", "Descrizione", "Marca", "EAN", "UM", "Pz/conf", "Prezzo netto", "IVA", "MOQ", "Valido dal", "Valido al", "Consegna giorni", "Categoria"];
  sheet.addRow(["Alfa Medical Demo", filename.replace(".xlsx", "")]); sheet.mergeCells("A1:M1"); sheet.addRow(["Valori commerciali fittizi — uso dimostrativo"]); sheet.mergeCells("A2:M2"); sheet.addRow([]); sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(headers.map((header) => row[header]))); sheet.views = [{ state: "frozen", ySplit: 4 }]; sheet.autoFilter = "A4:M4";
  sheet.columns.forEach((column, index) => { column.width = index === 1 ? 46 : 16; });
  await book.xlsx.writeFile(path.join(output, filename));
}

async function main() {
  await mkdir(output, { recursive: true });
  const products = await prisma.canonicalProduct.findMany({ take: 36, orderBy: { createdAt: "asc" }, include: { category: true, offers: { where: { preferred: true }, take: 1 } } });
  const base = products.map((product, index) => ({
    "Codice art.": `ALF-${String(index + 1).padStart(4, "0")}`, "Descrizione": product.name, Marca: product.brand, EAN: product.ean,
    UM: product.purchaseUom, "Pz/conf": Number(product.unitsPerPackage), "Prezzo netto": Number(product.offers[0]?.unitPrice ?? 2.5) * (1 + (index % 3 - 1) * .02),
    IVA: index % 9 === 0 ? 10 : 22, MOQ: index % 5 === 0 ? 2 : 1, "Valido dal": "01/01/2027", "Valido al": "31/12/2027", "Consegna giorni": 2 + index % 6, Categoria: product.category.name,
  }));
  const second = base.slice(1).map((row, index) => ({ ...row, "Prezzo netto": Number(row["Prezzo netto"]) * (index % 5 === 0 ? .92 : index % 4 === 0 ? 1.2 : 1.04), "Pz/conf": index === 7 ? Number(row["Pz/conf"]) * 2 : row["Pz/conf"], "Valido dal": "01/01/2028", "Valido al": "31/12/2028" }));
  second.push({ "Codice art.": "ALF-NEW-001", "Descrizione": "Schermo facciale antiappannamento regolabile — 10 pezzi", Marca: "NovaKit", EAN: "8099999999992", UM: "BOX", "Pz/conf": 10, "Prezzo netto": 14.6, IVA: 22, MOQ: 2, "Valido dal": "01/01/2028", "Valido al": "31/12/2028", "Consegna giorni": 4, Categoria: "DPI" });
  await workbook("listino-alfa-medical-2027.xlsx", base);
  await workbook("listino-alfa-medical-2028.xlsx", second);
  const csv = ["Listino sporco CareSupply", "codice;articolo;formato;um;prezzo;iva;minimo;categoria", ...base.slice(0, 18).map((row) => `${row["Codice art."]};${String(row.Descrizione).replace(/—/g, "-").replace("senza polvere", "s/polv")};CF ${row["Pz/conf"]};CF;${Number(row["Prezzo netto"]).toFixed(2).replace(".", ",")};${row.IVA};${row.MOQ};${row.Categoria}`)].join("\n");
  await writeFile(path.join(output, "offerta-caresupply-sporca.csv"), csv, "utf8");
  const pdfLines = ["LISTINO TESTUALE MEDIKA NETWORK", "Codice;Descrizione;UM;Pz/conf;Prezzo netto;IVA;Categoria", ...base.slice(18, 30).map((row) => `${row["Codice art."]};${row.Descrizione};${row.UM};${row["Pz/conf"]};${Number(row["Prezzo netto"]).toFixed(2)};${row.IVA};${row.Categoria}`), "NOTA: alcune unita richiedono conferma umana"];
  await writeFile(path.join(output, "listino-medika-testuale.pdf"), pdfFromLines(pdfLines));
  console.log(`Creati 4 documenti demo in ${output}`);
}

main().finally(() => prisma.$disconnect());
