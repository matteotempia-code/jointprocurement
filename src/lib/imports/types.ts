export const importFields = [
  "supplierSku", "manufacturerSku", "ean", "description", "brand", "manufacturer", "category", "subcategory",
  "purchaseUom", "packageDescription", "unitsPerPackage", "consumptionUom", "grossPrice", "discount", "netPrice",
  "taxRate", "currency", "moq", "validFrom", "validUntil", "leadTimeDays", "notes",
] as const;

export type ImportField = (typeof importFields)[number];
export type SourceLocator = { sheet?: string; row?: number; column?: string; page?: number; paragraph?: number; table?: number; columns?: Record<string, string> };
export type ParsedRow = { values: Record<string, unknown>; locator: SourceLocator; rawSource: string };
export type XlsxRuntimeDiagnostic = {
  marker: "XLSX_RUNTIME_DIAG_V1";
  sourceByteLength: number;
  expectedByteLength: number | null;
  byteLengthMatches: boolean | null;
  firstFourBytesHex: string;
  zipSignature: boolean;
  sha256: string;
  expectedChecksumMatches: boolean | null;
  nodeVersion: string;
  parserName: string;
  parserVersion: string;
  moduleShapeKeys: string[];
  moduleDefaultExists: boolean;
  workbookConstructorExists: boolean;
  workbookCreated: boolean;
  beforeWorkbookLoad: boolean;
  afterWorkbookLoad: boolean;
  worksheetsLength: number | null;
  worksheetNames: string[];
  errorClass: string | null;
  errorMessage: string | null;
  stackOrigin: string | null;
};
export type ParsedDocument = { parserType: string; sheets: { name: string; records: number; selected: boolean }[]; rows: ParsedRow[]; textPreview?: string; runtimeDiagnostic?: XlsxRuntimeDiagnostic };

export type InterpretedFields = Partial<Record<ImportField, string | number | null>>;
export type NormalizedImport = InterpretedFields & {
  comparable: boolean;
  normalizedPrice: number | null;
  normalizedLabel: string;
  validationErrors: string[];
  warnings: string[];
};

export type MatchableProduct = {
  id: string;
  name: string;
  brand: string | null;
  manufacturerSku: string | null;
  ean: string | null;
  purchaseUom: string;
  unitsPerPackage: unknown;
  consumptionUom: string | null;
  category: { id: string; name: string; code: string };
  offers?: { supplierId: string; supplierSku: string | null }[];
};

export type SuggestedMatch = {
  canonicalProductId: string | null;
  matchType: "IDENTICAL" | "PROBABLE_MATCH" | "COMMERCIAL_SUBSTITUTE" | "FUNCTIONAL_EQUIVALENT" | "NEW_PRODUCT";
  score: number;
  reasons: string[];
  identifierMatches: string[];
  descriptionSimilarity: number;
  uomCompatibility: boolean | null;
  packagingCompatibility: boolean | null;
  categoryCompatibility: boolean | null;
  recommended: boolean;
};
