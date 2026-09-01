import { createHash, randomUUID } from "node:crypto";
import { Prisma, type ImportDocumentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activeInterpretationProvider, providerSupportsScannedDocuments } from "./provider";
import { normalizeImportedFields } from "./normalization";
import { parseDocument, supportedExtensions } from "./parser";
import { suggestMatches } from "./matching";
import type { ImportField, NormalizedImport } from "./types";
import { classifyPriceChange } from "./changes";
import { getDocumentStorage, locatorForNewDocument, readSourceDocument } from "@/lib/storage";
import { buildDocumentObjectKey, sanitizeDocumentFilename } from "@/lib/storage/keys";

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const allowedKinds = new Set<ImportDocumentKind>(["PRICE_LIST", "OFFER", "QUOTATION", "INFORMATIONAL_INVOICE", "OTHER"]);

function safeFilename(filename: string) {
  const base = sanitizeDocumentFilename(filename);
  const extension = base.toLocaleLowerCase("it-IT").split(".").pop() ?? "";
  if (!supportedExtensions.has(extension)) throw new Error("Formato non supportato.");
  return base;
}

const allowedMimeByExtension: Record<string, string[]> = {
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  csv: ["text/csv", "application/csv", "text/plain", "application/octet-stream", "application/vnd.ms-excel"],
  tsv: ["text/tab-separated-values", "text/plain", "application/octet-stream"],
  txt: ["text/plain", "application/octet-stream"],
  pdf: ["application/pdf", "application/octet-stream"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
  png: ["image/png", "application/octet-stream"],
  jpg: ["image/jpeg", "application/octet-stream"],
  jpeg: ["image/jpeg", "application/octet-stream"],
};

function validateMime(filename: string, mimeType: string) {
  if (!mimeType) return;
  const extension = filename.split(".").pop()?.toLocaleLowerCase("it-IT") ?? "";
  if (!allowedMimeByExtension[extension]?.includes(mimeType.toLocaleLowerCase("it-IT"))) throw new Error("Il tipo dichiarato del file non corrisponde all’estensione.");
}

function fieldEvidence(input: { recordId: string; raw: Record<string, unknown>; interpreted: Record<string, unknown>; normalized: Record<string, unknown>; mapping: Record<string, ImportField>; locator: Record<string, unknown>; extractionConfidence: number; mappingConfidence: number }) {
  return Object.entries(input.interpreted).map(([fieldName, interpretedValue]) => {
    const sourceColumn = Object.entries(input.mapping).find(([, field]) => field === fieldName)?.[0];
    const rawValue = sourceColumn ? input.raw[sourceColumn] : null;
    const normalizedValue = input.normalized[fieldName] ?? interpretedValue;
    return {
      importedRecordId: input.recordId,
      fieldName,
      rawValue: rawValue == null ? Prisma.JsonNull : rawValue as Prisma.InputJsonValue,
      interpretedValue: interpretedValue == null ? Prisma.JsonNull : interpretedValue as Prisma.InputJsonValue,
      normalizedValue: normalizedValue == null ? Prisma.JsonNull : normalizedValue as Prisma.InputJsonValue,
      sourceLocator: { ...input.locator, column: sourceColumn ?? null } as Prisma.InputJsonValue,
      extractionConfidence: input.extractionConfidence,
      mappingConfidence: input.mappingConfidence,
      normalizationConfidence: ["netPrice", "unitsPerPackage", "purchaseUom", "consumptionUom"].includes(fieldName) ? input.normalized.comparable ? 0.98 : 0.35 : 0.98,
      interpretationProvider: activeInterpretationProvider.id,
      providerModel: activeInterpretationProvider.modelVersion,
      schemaVersion: activeInterpretationProvider.schemaVersion,
      interpretedAt: new Date(),
    };
  });
}

type ProductWithCommercialOffers = Awaited<ReturnType<typeof loadMatchableProducts>>[number];

async function loadMatchableProducts() {
  return prisma.canonicalProduct.findMany({ include: { category: true, offers: { where: { active: true }, select: { supplierId: true, supplierSku: true, normalizedUnitPrice: true, packageSize: true, priceList: { select: { version: true, createdAt: true } } } } } });
}

function exceptionTypeFor(normalized: NormalizedImport, best: ReturnType<typeof suggestMatches>[number]) {
  const messages = [...normalized.validationErrors, ...normalized.warnings].join(" ").toLocaleLowerCase("it-IT");
  if (messages.includes("identificator") || messages.includes("gtin") || messages.includes("ean")) return "IDENTIFIER_CONFLICT";
  if (normalized.netPrice == null || messages.includes("prezzo")) return "PRICE_NOT_NORMALIZABLE";
  if (!normalized.purchaseUom || !normalized.consumptionUom || messages.includes("unità")) return "UOM_AMBIGUOUS";
  if (!normalized.unitsPerPackage || !normalized.comparable || messages.includes("confezion")) return best.packagingCompatibility === false ? "PACKAGE_CHANGE" : "PACKAGE_AMBIGUOUS";
  if (!best.canonicalProductId || best.matchType === "NEW_PRODUCT") return "NEW_PRODUCT";
  if (best.packagingCompatibility === false) return "PACKAGE_CHANGE";
  if (best.score < 0.88) return "UNCERTAIN_MATCH";
  if (!normalized.category) return "CATEGORY_UNCERTAIN";
  return null;
}

function stagingProjection(normalized: NormalizedImport, best: ReturnType<typeof suggestMatches>[number], products: ProductWithCommercialOffers[], supplierId?: string | null) {
  const product = products.find((item) => item.id === best.canonicalProductId);
  const supplierOffers = product?.offers.filter((offer) => offer.supplierId === supplierId).sort((a, b) => b.priceList.version - a.priceList.version || Number(b.priceList.createdAt) - Number(a.priceList.createdAt)) ?? [];
  const previous = supplierOffers[0];
  const comparableOffers = product?.offers.filter((offer) => offer.normalizedUnitPrice != null).sort((a, b) => Number(a.normalizedUnitPrice) - Number(b.normalizedUnitPrice)) ?? [];
  const bestCurrent = comparableOffers[0];
  const previousNormalized = previous?.normalizedUnitPrice == null ? null : Number(previous.normalizedUnitPrice);
  const nextNormalized = normalized.comparable && normalized.normalizedPrice != null ? Number(normalized.normalizedPrice) : null;
  const change = classifyPriceChange({ oldNormalizedPrice: previousNormalized, newNormalizedPrice: nextNormalized, oldPackageQuantity: previous?.packageSize == null ? null : Number(previous.packageSize), newPackageQuantity: normalized.unitsPerPackage == null ? null : Number(normalized.unitsPerPackage) });
  const searchText = [normalized.supplierSku, normalized.ean, normalized.manufacturerSku, normalized.description, normalized.brand].filter(Boolean).join(" ").toLocaleLowerCase("it-IT");
  return {
    searchText,
    supplierSkuText: normalized.supplierSku ? String(normalized.supplierSku) : null,
    eanText: normalized.ean ? String(normalized.ean) : null,
    normalizedPriceValue: nextNormalized,
    exceptionType: exceptionTypeFor(normalized, best),
    previousNormalizedPrice: previousNormalized,
    previousPackageSize: previous?.packageSize == null ? null : Number(previous.packageSize),
    priceDeltaAmount: change.deltaAmount,
    priceDeltaPercent: change.deltaPercent,
    changeType: change.kind,
    bestCurrentNormalizedPrice: bestCurrent?.normalizedUnitPrice == null ? null : Number(bestCurrent.normalizedUnitPrice),
  };
}

export async function ingestDocument(input: { buffer: Buffer; filename: string; mimeType: string; supplierId?: string | null; documentKind: string; notes?: string; organizationId: string; userId: string }) {
  if (!input.buffer.length) throw new Error("Il file è vuoto.");
  if (input.buffer.length > MAX_IMPORT_BYTES) throw new Error("Il file supera il limite di 8 MB.");
  const filename = safeFilename(input.filename);
  validateMime(filename, input.mimeType);
  const kind = allowedKinds.has(input.documentKind as ImportDocumentKind) ? input.documentKind as ImportDocumentKind : "OTHER";
  const checksum = createHash("sha256").update(input.buffer).digest("hex");
  const duplicate = await prisma.sourceDocument.findFirst({ where: { organizationId: input.organizationId, checksum }, orderBy: { uploadedAt: "desc" } });
  const version = (await prisma.sourceDocument.count({ where: { organizationId: input.organizationId, originalFilename: filename } })) + 1;
  const sourceDocumentId = randomUUID();
  const objectKey = buildDocumentObjectKey({ organizationId: input.organizationId, sourceDocumentId, checksum, filename });
  const locator = locatorForNewDocument(objectKey);
  const storage = getDocumentStorage(locator.provider);
  await storage.put(locator, input.buffer, input.mimeType || "application/octet-stream");
  let source: Awaited<ReturnType<typeof prisma.sourceDocument.create>>;
  let job: Awaited<ReturnType<typeof prisma.importJob.create>>;
  try {
    ({ source, job } = await prisma.$transaction(async (tx) => {
      const createdSource = await tx.sourceDocument.create({ data: { id: sourceDocumentId, organizationId: input.organizationId, supplierId: input.supplierId || null, uploadedByUserId: input.userId, originalFilename: filename, mimeType: input.mimeType || "application/octet-stream", fileSize: input.buffer.length, checksum, sourceType: filename.split(".").pop()?.toUpperCase() ?? "UNKNOWN", documentKind: kind, storagePath: objectKey, storageProvider: locator.provider, storageBucket: locator.bucket, storageObjectKey: locator.objectKey, version, status: "PROCESSING", metadata: { notes: input.notes || null, duplicateOf: duplicate?.id ?? null, interpretationMode: activeInterpretationProvider.label } } });
      const createdJob = await tx.importJob.create({ data: { sourceDocumentId: createdSource.id, status: "PARSING", parserType: null, interpretationProvider: activeInterpretationProvider.id, providerModel: activeInterpretationProvider.modelVersion, providerCapabilities: activeInterpretationProvider.capabilities, interpretationSchema: activeInterpretationProvider.schemaVersion, externalProcessing: activeInterpretationProvider.externalProcessing, startedAt: new Date(), createdByUserId: input.userId, version: 1 } });
      await tx.auditEvent.create({ data: { actorUserId: input.userId, entityType: "SOURCE_DOCUMENT", entityId: createdSource.id, action: "DOCUMENT_UPLOADED", metadata: { filename, checksum, duplicateOf: duplicate?.id ?? null, storageProvider: locator.provider } } });
      return { source: createdSource, job: createdJob };
    }));
  } catch (error) {
    await storage.delete(locator).catch(() => {});
    throw error;
  }
  try {
    const parsed = await parseDocument(input.buffer, filename);
    const { mapping, confidence: mappingConfidence } = activeInterpretationProvider.mapFields(parsed.rows);
    const interpreted = activeInterpretationProvider.interpretRows(parsed.rows, mapping);
    const products = await loadMatchableProducts();
    let review = 0; let ready = 0;
    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < parsed.rows.length; index += 1) {
        const normalized = normalizeImportedFields(interpreted[index]);
        const candidates = suggestMatches(normalized, products, input.supplierId);
        const best = candidates[0];
        const blocking = normalized.validationErrors.length > 0 || !normalized.comparable || !best.canonicalProductId || best.score < .88 || best.packagingCompatibility === false;
        if (blocking) review += 1; else ready += 1;
        await tx.importedRecord.create({ data: { importJobId: job.id, recordIndex: index + 1, rawSource: parsed.rows[index].rawSource, rawFields: parsed.rows[index].values as Prisma.InputJsonValue, interpretedFields: interpreted[index] as Prisma.InputJsonValue, normalizedFields: normalized as Prisma.InputJsonValue, sourceLocator: { ...parsed.rows[index].locator, columns: Object.fromEntries(Object.entries(mapping).map(([source, target]) => [target, source])) } as Prisma.InputJsonValue, ...stagingProjection(normalized, best, products, input.supplierId), extractionConfidence: parsed.parserType.includes("XLSX") || parsed.parserType.includes("CSV") ? 1 : .82, mappingConfidence, normalizationConfidence: normalized.comparable ? .98 : .35, matchConfidence: best.score, status: blocking ? "NEEDS_REVIEW" : "READY", requiresReview: blocking, validationErrors: normalized.validationErrors, warnings: [...normalized.warnings, ...(best.packagingCompatibility === false ? ["Confezione differente dal prodotto candidato"] : [])], canonicalProductId: blocking ? null : best.canonicalProductId, matchCandidates: { create: candidates.map((candidate) => ({ canonicalProductId: candidate.canonicalProductId, matchType: candidate.matchType, score: candidate.score, reasons: candidate.reasons, identifierMatches: candidate.identifierMatches, descriptionSimilarity: candidate.descriptionSimilarity, uomCompatibility: candidate.uomCompatibility, packagingCompatibility: candidate.packagingCompatibility, categoryCompatibility: candidate.categoryCompatibility, recommended: candidate.recommended })) } } });
      }
      for (let index = 0; index < parsed.rows.length; index += 1) {
        const record = await tx.importedRecord.findUniqueOrThrow({ where: { importJobId_recordIndex: { importJobId: job.id, recordIndex: index + 1 } } });
        const normalized = record.normalizedFields as Record<string, unknown>;
        await tx.importedFieldValue.createMany({ data: fieldEvidence({ recordId: record.id, raw: parsed.rows[index].values, interpreted: interpreted[index] as Record<string, unknown>, normalized, mapping, locator: parsed.rows[index].locator as Record<string, unknown>, extractionConfidence: parsed.parserType.includes("XLSX") || parsed.parserType.includes("CSV") ? 1 : 0.82, mappingConfidence }) });
      }
      await tx.importJob.update({ where: { id: job.id }, data: { status: parsed.rows.length ? "NEEDS_REVIEW" : "READY_TO_PUBLISH", parserType: parsed.parserType, totalRecords: parsed.rows.length, interpretedRecords: parsed.rows.length, reviewRequiredRecords: review, publishableRecords: ready, columnMapping: mapping, detectedSheets: parsed.sheets, summary: { textPreview: parsed.textPreview?.slice(0, 5000) ?? null, sourceHeaders: Object.keys(parsed.rows[0]?.values ?? {}), providerLabel: activeInterpretationProvider.label, providerIsAi: activeInterpretationProvider.isAi, exceptionRecords: review, duplicateDocumentId: duplicate?.id ?? null } } });
      await tx.sourceDocument.update({ where: { id: source.id }, data: { status: "PROCESSED" } });
      await tx.auditEvent.create({ data: { actorUserId: input.userId, entityType: "IMPORT_JOB", entityId: job.id, action: "IMPORT_STARTED", metadata: { parserType: parsed.parserType, totalRecords: parsed.rows.length, provider: activeInterpretationProvider.id } } });
    }, { maxWait: 10_000, timeout: 60_000 });
    return job.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore di interpretazione non identificato.";
    const needsProvider = !providerSupportsScannedDocuments() && /ocr|scansion|immagin|image/i.test(message);
    await prisma.$transaction([prisma.importJob.update({ where: { id: job.id }, data: { status: needsProvider ? "REQUIRES_PROVIDER" : "FAILED", failedAt: needsProvider ? null : new Date(), errorMessage: message } }), prisma.sourceDocument.update({ where: { id: source.id }, data: { status: needsProvider ? "REQUIRES_PROVIDER" : "FAILED" } }), prisma.auditEvent.create({ data: { actorUserId: input.userId, entityType: "IMPORT_JOB", entityId: job.id, action: needsProvider ? "IMPORT_REQUIRES_PROVIDER" : "IMPORT_FAILED", metadata: { message, provider: activeInterpretationProvider.id } } })]);
    return job.id;
  }
}

async function processExistingJob(input: { jobId: string; sourceDocumentId: string; buffer: Buffer; filename: string; supplierId: string | null; userId: string; mapping?: Record<string, ImportField> }) {
  const parsed = await parseDocument(input.buffer, input.filename);
  const automatic = activeInterpretationProvider.mapFields(parsed.rows);
  const mapping = input.mapping ?? automatic.mapping;
  const mappingConfidence = input.mapping ? 1 : automatic.confidence;
  const interpreted = activeInterpretationProvider.interpretRows(parsed.rows, mapping);
  const products = await loadMatchableProducts();
  let review = 0;
  let ready = 0;
  await prisma.$transaction(async (tx) => {
    await tx.importedRecord.deleteMany({ where: { importJobId: input.jobId } });
    for (let index = 0; index < parsed.rows.length; index += 1) {
      const normalized = normalizeImportedFields(interpreted[index]);
      const candidates = suggestMatches(normalized, products, input.supplierId);
      const best = candidates[0];
      const blocking = normalized.validationErrors.length > 0 || !normalized.comparable || !best.canonicalProductId || best.score < 0.88 || best.packagingCompatibility === false;
      if (blocking) review += 1; else ready += 1;
      await tx.importedRecord.create({ data: { importJobId: input.jobId, recordIndex: index + 1, rawSource: parsed.rows[index].rawSource, rawFields: parsed.rows[index].values as Prisma.InputJsonValue, interpretedFields: interpreted[index] as Prisma.InputJsonValue, normalizedFields: normalized as Prisma.InputJsonValue, sourceLocator: { ...parsed.rows[index].locator, columns: Object.fromEntries(Object.entries(mapping).map(([source, target]) => [target, source])) } as Prisma.InputJsonValue, ...stagingProjection(normalized, best, products, input.supplierId), extractionConfidence: parsed.parserType.includes("XLSX") || parsed.parserType.includes("CSV") ? 1 : 0.82, mappingConfidence, normalizationConfidence: normalized.comparable ? 0.98 : 0.35, matchConfidence: best.score, status: blocking ? "NEEDS_REVIEW" : "READY", requiresReview: blocking, validationErrors: normalized.validationErrors, warnings: [...normalized.warnings, ...(best.packagingCompatibility === false ? ["Confezione differente dal prodotto candidato"] : [])], canonicalProductId: blocking ? null : best.canonicalProductId, matchCandidates: { create: candidates.map((candidate) => ({ canonicalProductId: candidate.canonicalProductId, matchType: candidate.matchType, score: candidate.score, reasons: candidate.reasons, identifierMatches: candidate.identifierMatches, descriptionSimilarity: candidate.descriptionSimilarity, uomCompatibility: candidate.uomCompatibility, packagingCompatibility: candidate.packagingCompatibility, categoryCompatibility: candidate.categoryCompatibility, recommended: candidate.recommended })) } } });
    }
    for (let index = 0; index < parsed.rows.length; index += 1) {
      const record = await tx.importedRecord.findUniqueOrThrow({ where: { importJobId_recordIndex: { importJobId: input.jobId, recordIndex: index + 1 } } });
      const normalized = record.normalizedFields as Record<string, unknown>;
      await tx.importedFieldValue.createMany({ data: fieldEvidence({ recordId: record.id, raw: parsed.rows[index].values, interpreted: interpreted[index] as Record<string, unknown>, normalized, mapping, locator: parsed.rows[index].locator as Record<string, unknown>, extractionConfidence: parsed.parserType.includes("XLSX") || parsed.parserType.includes("CSV") ? 1 : 0.82, mappingConfidence }) });
    }
    await tx.importJob.update({ where: { id: input.jobId }, data: { status: parsed.rows.length ? "NEEDS_REVIEW" : "READY_TO_PUBLISH", parserType: parsed.parserType, totalRecords: parsed.rows.length, interpretedRecords: parsed.rows.length, reviewRequiredRecords: review, publishableRecords: ready, columnMapping: mapping, detectedSheets: parsed.sheets, failedAt: null, errorMessage: null, summary: { textPreview: parsed.textPreview?.slice(0, 5000) ?? null, sourceHeaders: Object.keys(parsed.rows[0]?.values ?? {}), providerLabel: activeInterpretationProvider.label, providerIsAi: activeInterpretationProvider.isAi, exceptionRecords: review } } });
    await tx.sourceDocument.update({ where: { id: input.sourceDocumentId }, data: { status: "PROCESSED" } });
  }, { maxWait: 10_000, timeout: 60_000 });
}

export async function remapImport(jobId: string, mapping: Record<string, ImportField>, actorUserId: string, organizationId: string) {
  const job = await prisma.importJob.findFirstOrThrow({ where: { id: jobId, sourceDocument: { organizationId } }, include: { sourceDocument: true } });
  const buffer = await readSourceDocument(job.sourceDocument);
  await processExistingJob({ jobId, sourceDocumentId: job.sourceDocumentId, buffer, filename: job.sourceDocument.originalFilename, supplierId: job.sourceDocument.supplierId, userId: actorUserId, mapping });
  await prisma.auditEvent.create({ data: { actorUserId, entityType: "IMPORT_JOB", entityId: jobId, action: "COLUMN_MAPPING_CHANGED", metadata: { mapping } } });
}

export async function resetImportMapping(jobId: string, actorUserId: string, organizationId: string) {
  const job = await prisma.importJob.findFirstOrThrow({ where: { id: jobId, sourceDocument: { organizationId } }, include: { sourceDocument: true } });
  const buffer = await readSourceDocument(job.sourceDocument);
  await processExistingJob({ jobId, sourceDocumentId: job.sourceDocumentId, buffer, filename: job.sourceDocument.originalFilename, supplierId: job.sourceDocument.supplierId, userId: actorUserId });
  await prisma.auditEvent.create({ data: { actorUserId, entityType: "IMPORT_JOB", entityId: jobId, action: "COLUMN_MAPPING_CHANGED", metadata: { resetToAutomatic: true } } });
}

export async function reprocessImport(jobId: string, actorUserId: string, organizationId: string) {
  const previous = await prisma.importJob.findFirstOrThrow({ where: { id: jobId, sourceDocument: { organizationId } }, include: { sourceDocument: true } });
  const buffer = await readSourceDocument(previous.sourceDocument);
  const nextVersion = (await prisma.importJob.aggregate({ where: { sourceDocumentId: previous.sourceDocumentId }, _max: { version: true } }))._max.version! + 1;
  const next = await prisma.importJob.create({ data: { sourceDocumentId: previous.sourceDocumentId, status: "PARSING", interpretationProvider: activeInterpretationProvider.id, providerModel: activeInterpretationProvider.modelVersion, providerCapabilities: activeInterpretationProvider.capabilities, interpretationSchema: activeInterpretationProvider.schemaVersion, externalProcessing: activeInterpretationProvider.externalProcessing, startedAt: new Date(), createdByUserId: actorUserId, version: nextVersion } });
  try {
    await processExistingJob({ jobId: next.id, sourceDocumentId: previous.sourceDocumentId, buffer, filename: previous.sourceDocument.originalFilename, supplierId: previous.sourceDocument.supplierId, userId: actorUserId });
    await prisma.auditEvent.create({ data: { actorUserId, entityType: "IMPORT_JOB", entityId: next.id, action: "IMPORT_REPROCESSED", metadata: { previousJobId: previous.id, version: nextVersion } } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore di rielaborazione non identificato.";
    const needsProvider = !providerSupportsScannedDocuments() && /ocr|scansion|immagin|image/i.test(message);
    await prisma.importJob.update({ where: { id: next.id }, data: { status: needsProvider ? "REQUIRES_PROVIDER" : "FAILED", failedAt: needsProvider ? null : new Date(), errorMessage: message } });
  }
  return next.id;
}

export async function publishImport(jobId: string, actorUserId: string, organizationId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const job = await tx.importJob.findFirstOrThrow({ where: { id: jobId, sourceDocument: { organizationId } }, include: { sourceDocument: true, publishedPriceList: true, records: { include: { canonicalProduct: true } } } });
    if (job.publishedPriceList) return job.publishedPriceList;
    if (!job.sourceDocument.supplierId) throw new Error("Conferma il fornitore prima della pubblicazione.");
    const blocking = job.records.filter((record) => !["CONFIRMED", "NEW_PRODUCT_CONFIRMED", "NON_COMPARABLE", "IGNORED"].includes(record.status));
    if (blocking.length) throw new Error(`${blocking.length} record richiedono ancora verifica.`);
    await tx.importJob.update({ where: { id: job.id }, data: { status: "PUBLISHING" } });
    const preferredProductIds = new Set((await tx.supplierOffer.findMany({
      where: { supplierId: job.sourceDocument.supplierId, active: true, preferred: true },
      select: { canonicalProductId: true },
    })).map((offer) => offer.canonicalProductId));
    const previous = await tx.priceList.findFirst({ where: { supplierId: job.sourceDocument.supplierId, active: true }, orderBy: [{ version: "desc" }, { createdAt: "desc" }] });
    const normalizedRecords = job.records.map((record) => record.normalizedFields as NormalizedImport);
    const validStarts = normalizedRecords.map((record) => record.validFrom).filter(Boolean).map((value) => new Date(String(value)));
    const validEnds = normalizedRecords.map((record) => record.validUntil).filter(Boolean).map((value) => new Date(String(value)));
    const validFrom = validStarts.length ? new Date(Math.min(...validStarts.map(Number))) : new Date();
    const validUntil = validEnds.length ? new Date(Math.max(...validEnds.map(Number))) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));
    const list = await tx.priceList.create({ data: { name: `${job.sourceDocument.originalFilename.replace(/\.[^.]+$/, "")} · v${(previous?.version ?? 0) + 1}`, supplierId: job.sourceDocument.supplierId, sourceFile: job.sourceDocument.originalFilename, sourceDocumentId: job.sourceDocument.id, importJobId: job.id, previousVersionId: previous?.id, version: (previous?.version ?? 0) + 1, active: true, publishedByUserId: actorUserId, publishedAt: new Date(), validFrom, validUntil } });
    if (previous) {
      await tx.priceList.update({ where: { id: previous.id }, data: { active: false } });
      await tx.supplierOffer.updateMany({ where: { priceListId: previous.id }, data: { active: false } });
    }
    let published = 0;
    for (const record of job.records) {
      if (["IGNORED", "NON_COMPARABLE"].includes(record.status)) continue;
      const normalized = record.normalizedFields as NormalizedImport;
      let productId = record.canonicalProductId;
      if (record.status === "NEW_PRODUCT_CONFIRMED") {
        const humanOverride = (record.humanOverride ?? {}) as Record<string, unknown>;
        const categoryId = String(humanOverride.categoryId ?? "");
        if (!categoryId) throw new Error(`Categoria non confermata per il record ${record.recordIndex}.`);
        const category = await tx.category.findUniqueOrThrow({ where: { id: categoryId } });
        const product = await tx.canonicalProduct.create({ data: { name: String(normalized.description), shortDescription: "Creato da importazione con conferma umana.", brand: normalized.brand ? String(normalized.brand) : null, manufacturer: normalized.manufacturer ? String(normalized.manufacturer) : null, manufacturerSku: normalized.manufacturerSku ? String(normalized.manufacturerSku) : null, ean: normalized.ean ? String(normalized.ean) : null, uom: String(normalized.purchaseUom), purchaseUom: String(normalized.purchaseUom), unitsPerPackage: Number(normalized.unitsPerPackage), consumptionUom: String(normalized.consumptionUom), consumptionUomLabel: String(normalized.consumptionUom) === "PIECE" ? "pezzo" : String(normalized.consumptionUom).toLocaleLowerCase("it-IT"), packageDescription: normalized.packageDescription ? String(normalized.packageDescription) : null, categoryId: category.id, subcategory: normalized.subcategory ? String(normalized.subcategory) : null, active: true } });
        productId = product.id;
        await tx.auditEvent.create({ data: { actorUserId, entityType: "CANONICAL_PRODUCT", entityId: product.id, action: "NEW_PRODUCT_CONFIRMED", metadata: { importedRecordId: record.id, sourceDocumentId: job.sourceDocument.id } } });
      }
      if (!productId || !normalized.comparable || normalized.netPrice === null) continue;
      const offer = await tx.supplierOffer.create({ data: { supplierId: job.sourceDocument.supplierId, canonicalProductId: productId, priceListId: list.id, supplierSku: normalized.supplierSku ? String(normalized.supplierSku) : null, packageSize: Number(normalized.unitsPerPackage), packageUnit: String(normalized.purchaseUom), unitPrice: Number(normalized.netPrice), normalizedUnitPrice: Number(normalized.normalizedPrice), currency: String(normalized.currency ?? "EUR"), moq: Number(normalized.moq ?? 1), leadTimeDays: Number(normalized.leadTimeDays ?? 3), taxRate: Number(normalized.taxRate ?? 22), validFrom: normalized.validFrom ? new Date(String(normalized.validFrom)) : list.validFrom, validUntil: normalized.validUntil ? new Date(String(normalized.validUntil)) : list.validUntil, preferred: preferredProductIds.has(productId), active: true, sourceDocumentId: job.sourceDocument.id, importedRecordId: record.id } });
      await tx.offerPriceHistory.create({ data: { supplierOfferId: offer.id, price: offer.unitPrice, normalizedPrice: offer.normalizedUnitPrice!, effectiveAt: list.validFrom ?? new Date() } });
      await tx.importedRecord.update({ where: { id: record.id }, data: { status: "PUBLISHED", canonicalProductId: productId, publishedAt: new Date() } });
      published += 1;
    }
    await tx.importJob.update({ where: { id: job.id }, data: { status: "PUBLISHED", publishedRecords: published, completedAt: new Date() } });
    await tx.auditEvent.create({ data: { actorUserId, entityType: "IMPORT_JOB", entityId: job.id, action: "IMPORT_PUBLISHED", metadata: { priceListId: list.id, publishedRecords: published, sourceDocumentId: job.sourceDocument.id } } });
    return list;
  });
  return result;
}
