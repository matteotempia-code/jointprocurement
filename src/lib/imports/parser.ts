import { createHash } from "node:crypto";
import mammoth from "mammoth";
import { knownHeaderScore } from "./mapping";
import type { ParsedDocument, ParsedRow, XlsxRuntimeDiagnostic } from "./types";

const textExtensions = new Set(["csv", "tsv", "txt"]);
export const supportedExtensions = new Set(["xlsx", "xls", "csv", "tsv", "pdf", "docx", "txt", "png", "jpg", "jpeg"]);

function extension(filename: string) { return filename.toLocaleLowerCase("it-IT").split(".").pop() ?? ""; }
function cellValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value ?? "";
}

class XlsxRuntimeDiagnosticError extends Error {
  constructor(public readonly diagnostic: XlsxRuntimeDiagnostic, cause: unknown) {
    super(`${diagnostic.marker}: ${diagnostic.errorMessage ?? "errore XLSX non identificato"}`, { cause });
    this.name = "XlsxRuntimeDiagnosticError";
  }
}

export function xlsxRuntimeDiagnosticFromError(error: unknown) {
  return error instanceof XlsxRuntimeDiagnosticError ? error.diagnostic : null;
}

export async function parseSpreadsheet(buffer: Buffer, expected?: { byteLength?: number; checksum?: string }): Promise<ParsedDocument> {
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const diagnostic: XlsxRuntimeDiagnostic = {
    marker: "XLSX_RUNTIME_DIAG_V1",
    sourceByteLength: buffer.length,
    expectedByteLength: expected?.byteLength ?? null,
    byteLengthMatches: expected?.byteLength == null ? null : buffer.length === expected.byteLength,
    firstFourBytesHex: buffer.subarray(0, 4).toString("hex"),
    zipSignature: buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b,
    sha256,
    expectedChecksumMatches: expected?.checksum == null ? null : sha256 === expected.checksum,
    nodeVersion: process.version,
    parserName: "read-excel-file",
    parserVersion: "9.3.10",
    moduleShapeKeys: [],
    moduleDefaultExists: false,
    workbookConstructorExists: false,
    workbookCreated: false,
    beforeWorkbookLoad: false,
    afterWorkbookLoad: false,
    worksheetsLength: null,
    worksheetNames: [],
    errorClass: null,
    errorMessage: null,
    stackOrigin: null,
  };
  try {
    if (!diagnostic.zipSignature) throw new Error("Il file XLSX non è valido o è incompleto: archivio workbook non riconosciuto.");
    const readerModule = await import("read-excel-file/node");
    diagnostic.moduleShapeKeys = Object.keys(readerModule).sort().slice(0, 40);
    diagnostic.moduleDefaultExists = typeof readerModule.default === "function";
    diagnostic.workbookConstructorExists = false;
    if (!diagnostic.moduleDefaultExists) throw new Error("Il parser XLSX non è disponibile nel runtime server.");
    diagnostic.workbookCreated = true;
    diagnostic.beforeWorkbookLoad = true;
    const worksheets = await readerModule.default(buffer);
    diagnostic.afterWorkbookLoad = true;
    diagnostic.worksheetsLength = Array.isArray(worksheets) ? worksheets.length : null;
    diagnostic.worksheetNames = Array.isArray(worksheets) ? worksheets.map((sheet) => sheet.sheet).slice(0, 30) : [];
    if (!Array.isArray(worksheets) || worksheets.length === 0) throw new Error("Il file XLSX non contiene fogli di lavoro leggibili.");

    const sheets: ParsedDocument["sheets"] = [];
    let selectedRows: ParsedRow[] = [];
    let selectedScore = -1;
    let selectedPreview = "";
    for (const worksheet of worksheets) {
      // Preserve the former ExcelJS `eachRow({ includeEmpty: false })` contract:
      // completely blank rows are omitted, while blank cells inside a row remain.
      const matrix = worksheet.data
        .filter((row) => row.some((value) => value !== null && value !== ""))
        .map((row) => row.map(cellValue));
      let headerIndex = 0;
      let score = 0;
      for (let index = 0; index < Math.min(matrix.length, 20); index += 1) {
        const candidateScore = knownHeaderScore(matrix[index]);
        if (candidateScore > score) { score = candidateScore; headerIndex = index; }
      }
      const headers = matrix[headerIndex]?.map((value, index) => String(value || `Colonna ${index + 1}`).trim()) ?? [];
      const rows = matrix.slice(headerIndex + 1).filter((values) => values.some((value) => String(value ?? "").trim())).map((values, index) => {
        const mapped = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
        return { values: mapped, rawSource: values.map((value) => String(value ?? "")).join(" | "), locator: { sheet: worksheet.sheet, row: headerIndex + index + 2 } };
      });
      const candidate = score >= 2 && !/note|istruz|legenda/i.test(worksheet.sheet);
      sheets.push({ name: worksheet.sheet, records: rows.length, selected: false });
      if (candidate && score > selectedScore) { selectedScore = score; selectedRows = rows; selectedPreview = matrix.slice(0, 20).map((values) => values.map(String).join(" | ")).join("\n"); sheets.forEach((sheet) => { sheet.selected = sheet.name === worksheet.sheet; }); }
    }
    if (!selectedRows.length) throw new Error("Non è stata identificata una tabella prodotti nel workbook.");
    return { parserType: "XLSX_DETERMINISTIC", sheets, rows: selectedRows, textPreview: selectedPreview.slice(0, 5000), runtimeDiagnostic: diagnostic };
  } catch (error) {
    diagnostic.errorClass = error instanceof Error ? error.name : typeof error;
    diagnostic.errorMessage = error instanceof Error ? error.message : "workbook non leggibile";
    diagnostic.stackOrigin = error instanceof Error ? error.stack?.split("\n").slice(1).map((line) => line.trim()).find(Boolean) ?? null : null;
    throw new XlsxRuntimeDiagnosticError(diagnostic, error);
  }
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

export async function parseDocument(buffer: Buffer, filename: string, expected?: { byteLength?: number; checksum?: string }): Promise<ParsedDocument> {
  const ext = extension(filename);
  if (!supportedExtensions.has(ext)) throw new Error("Formato non supportato. Usa XLSX, CSV, TSV, PDF, DOCX, TXT o un’immagine.");
  if (ext === "xls") throw new Error("Il formato XLS binario legacy è stato conservato, ma il parser locale non può leggerlo in sicurezza. Salvalo come XLSX o CSV e riprova.");
  if (["png", "jpg", "jpeg"].includes(ext)) throw new Error("Interpretazione automatica delle immagini non disponibile in questo ambiente. Il documento è stato conservato per una futura elaborazione OCR.");
  if (ext === "xlsx") return parseSpreadsheet(buffer, expected);
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
