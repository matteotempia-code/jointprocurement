import type ExcelJS from "exceljs";
import mammoth from "mammoth";
import { knownHeaderScore } from "./mapping";
import type { ParsedDocument, ParsedRow } from "./types";

const textExtensions = new Set(["csv", "tsv", "txt"]);
export const supportedExtensions = new Set(["xlsx", "xls", "csv", "tsv", "pdf", "docx", "txt", "png", "jpg", "jpeg"]);

function extension(filename: string) { return filename.toLocaleLowerCase("it-IT").split(".").pop() ?? ""; }
function cellValue(value: ExcelJS.CellValue): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && value && "result" in value) return value.result;
  if (typeof value === "object" && value && "text" in value) return value.text;
  return value ?? "";
}

export async function parseSpreadsheet(buffer: Buffer): Promise<ParsedDocument> {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("Il file XLSX non è valido o è incompleto: archivio workbook non riconosciuto.");
  }
  const excelModule = await import("exceljs");
  const excelRuntime = (excelModule.default ?? excelModule) as typeof ExcelJS;
  if (typeof excelRuntime.Workbook !== "function") throw new Error("Il parser XLSX non è disponibile nel runtime server.");
  const workbook = new excelRuntime.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "workbook non leggibile";
    throw new Error(`Il file XLSX non è valido o è incompleto: ${detail}`, { cause: error });
  }
  const worksheets = workbook.worksheets;
  if (!Array.isArray(worksheets) || worksheets.length === 0) throw new Error("Il file XLSX non contiene fogli di lavoro leggibili.");
  const sheets: ParsedDocument["sheets"] = [];
  let selectedRows: ParsedRow[] = [];
  let selectedScore = -1;
  let selectedPreview = "";
  for (const worksheet of worksheets) {
    const matrix: unknown[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => matrix.push((row.values as ExcelJS.CellValue[]).slice(1).map(cellValue)));
    let headerIndex = 0;
    let score = 0;
    for (let index = 0; index < Math.min(matrix.length, 20); index += 1) {
      const candidateScore = knownHeaderScore(matrix[index]);
      if (candidateScore > score) { score = candidateScore; headerIndex = index; }
    }
    const headers = matrix[headerIndex]?.map((value, index) => String(value || `Colonna ${index + 1}`).trim()) ?? [];
    const rows = matrix.slice(headerIndex + 1).filter((values) => values.some((value) => String(value ?? "").trim())).map((values, index) => {
      const mapped = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
      return { values: mapped, rawSource: values.map((value) => String(value ?? "")).join(" | "), locator: { sheet: worksheet.name, row: headerIndex + index + 2 } };
    });
    const candidate = score >= 2 && !/note|istruz|legenda/i.test(worksheet.name);
    sheets.push({ name: worksheet.name, records: rows.length, selected: false });
    if (candidate && score > selectedScore) { selectedScore = score; selectedRows = rows; selectedPreview = matrix.slice(0, 20).map((values) => values.map(String).join(" | ")).join("\n"); sheets.forEach((sheet) => { sheet.selected = sheet.name === worksheet.name; }); }
  }
  if (!selectedRows.length) throw new Error("Non è stata identificata una tabella prodotti nel workbook.");
  return { parserType: "XLSX_DETERMINISTIC", sheets, rows: selectedRows, textPreview: selectedPreview.slice(0, 5000) };
}

function parseDelimitedLine(line: string, delimiter: string) {
  const result: string[] = []; let current = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { result.push(current.trim()); current = ""; }
    else current += char;
  }
  result.push(current.trim()); return result;
}

export function parseDelimited(text: string): ParsedDocument {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const candidates = [";", "\t", ","];
  const delimiter = candidates.sort((a, b) => parseDelimitedLine(lines[0] ?? "", b).length - parseDelimitedLine(lines[0] ?? "", a).length)[0];
  let headerIndex = 0; let best = 0;
  for (let index = 0; index < Math.min(lines.length, 20); index += 1) { const score = knownHeaderScore(parseDelimitedLine(lines[index], delimiter)); if (score > best) { best = score; headerIndex = index; } }
  if (best < 2) throw new Error("Non è stata identificata una riga di intestazione riconoscibile.");
  const headers = parseDelimitedLine(lines[headerIndex], delimiter);
  const rows = lines.slice(headerIndex + 1).map((line, index) => ({ values: Object.fromEntries(headers.map((header, column) => [header, parseDelimitedLine(line, delimiter)[column] ?? ""])), rawSource: line, locator: { row: headerIndex + index + 2 } }));
  return { parserType: "CSV_DETERMINISTIC", sheets: [{ name: "Dati", records: rows.length, selected: true }], rows };
}

function parseTextTable(text: string, parserType: string): ParsedDocument {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tableLines = lines.filter((line) => /[;|\t]/.test(line));
  if (tableLines.length >= 2) { const parsed = parseDelimited(tableLines.join("\n")); return { ...parsed, parserType, textPreview: text.slice(0, 5000), rows: parsed.rows.map((row) => ({ ...row, locator: { ...row.locator, ...(parserType.startsWith("PDF") ? { page: 1 } : { table: 1 }) } })) }; }
  throw new Error("Non è stata identificata una tabella prodotti nel testo del documento.");
}

export async function parseDocument(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const ext = extension(filename);
  if (!supportedExtensions.has(ext)) throw new Error("Formato non supportato. Usa XLSX, CSV, TSV, PDF, DOCX, TXT o un’immagine.");
  if (ext === "xls") throw new Error("Il formato XLS binario legacy è stato conservato, ma il parser locale non può leggerlo in sicurezza. Salvalo come XLSX o CSV e riprova.");
  if (["png", "jpg", "jpeg"].includes(ext)) throw new Error("Interpretazione automatica delle immagini non disponibile in questo ambiente. Il documento è stato conservato per una futura elaborazione OCR.");
  if (ext === "xlsx") return parseSpreadsheet(buffer);
  if (textExtensions.has(ext)) return parseDelimited(buffer.toString("utf8"));
  if (ext === "docx") { const result = await mammoth.extractRawText({ buffer }); return parseTextTable(result.value, "DOCX_TEXT_DETERMINISTIC"); }
  if (ext === "pdf") {
    const { extractPdfText } = await import("./pdf-parser");
    const text = await extractPdfText(buffer);
    if (!text.trim()) throw new Error("PDF senza testo estraibile. OCR non disponibile in questo ambiente.");
    return parseTextTable(text, "PDF_TEXT_DETERMINISTIC");
  }
  throw new Error("Formato non supportato.");
}
