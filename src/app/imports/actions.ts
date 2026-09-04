"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { confirmRecommendedMatches, ingestDocument, publishImport, remapImport, reprocessImport, reprocessImportForSupplier, resetImportMapping } from "@/lib/imports/service";
import { importFields, type ImportField } from "@/lib/imports/types";
import { normalizeImportedFields } from "@/lib/imports/normalization";
import { applyBulkReview, BulkReviewValidationError, type BulkReviewAction } from "@/lib/imports/bulk-review";
import { normalizeOptionalGtin } from "@/lib/validation/gtin";

const allowedRoles = ["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"] as const;

function safeDecisionError(error: unknown) {
  if (error instanceof BulkReviewValidationError) return error.message;
  const actionablePrefixes = ["Seleziona ", "Il candidato ", "La riga ", "Questa importazione "];
  if (error instanceof Error && actionablePrefixes.some((prefix) => error.message.startsWith(prefix))) return error.message;
  return "La decisione non è stata salvata. Ricarica la pagina e riprova; se il problema continua, verifica autorizzazioni e stato del record.";
}

export type UploadImportState = { error?: string };

export async function uploadImport(_previous: UploadImportState, formData: FormData): Promise<UploadImportState> {
  try {
    const context = await requireRoles([...allowedRoles]);
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) return { error: "Seleziona un documento da importare." };
    const jobId = await ingestDocument({ buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, mimeType: file.type, supplierId: String(formData.get("supplierId") ?? "") || null, documentKind: String(formData.get("documentKind") ?? "PRICE_LIST"), notes: String(formData.get("notes") ?? ""), organizationId: context.assignment.organizationId, userId: context.user.id });
    redirect(`/imports/${jobId}?caricato=1`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw error;
    return { error: error instanceof Error ? error.message : "Non è stato possibile caricare il documento." };
  }
}

async function scopedJob(jobId: string) {
  const context = await requireRoles([...allowedRoles]);
  const job = await prisma.importJob.findFirstOrThrow({ where: { id: jobId, sourceDocument: { organizationId: context.assignment.organizationId } }, include: { sourceDocument: true } });
  return { context, job };
}

export async function acceptRecord(formData: FormData) {
  const recordId = String(formData.get("recordId")); const candidateId = String(formData.get("candidateId")); const jobId = String(formData.get("jobId"));
  const { context, job } = await scopedJob(jobId);
  const record = await prisma.importedRecord.findUniqueOrThrow({ where: { id: recordId }, select: { supplierSkuText: true } });
  let canonicalProductId = "";
  let changed = false;
  try {
    changed = await prisma.$transaction(async (tx) => {
      const candidate = await tx.productMatchCandidate.findFirstOrThrow({ where: { id: candidateId, importedRecord: { id: recordId, importJobId: jobId } } });
      if (!candidate.canonicalProductId) throw new Error("Il candidato non è collegato a un prodotto canonico.");
      canonicalProductId = candidate.canonicalProductId;
      const updated = await tx.importedRecord.updateMany({ where: { id: recordId, importJobId: jobId, status: { in: ["READY", "NEEDS_REVIEW"] } }, data: { canonicalProductId, status: "CONFIRMED", requiresReview: false, exceptionType: null } });
      if (!updated.count) {
        const current = await tx.importedRecord.findUniqueOrThrow({ where: { id: recordId } });
        if (current.status === "CONFIRMED" && current.canonicalProductId === canonicalProductId) return false;
        throw new Error("La riga è già stata decisa o è cambiata. Ricarica la pagina.");
      }
      await tx.productMatchCandidate.updateMany({ where: { importedRecordId: recordId }, data: { humanDecision: "REJECTED", decidedByUserId: context.user.id, decidedAt: new Date() } });
      await tx.productMatchCandidate.update({ where: { id: candidate.id }, data: { humanDecision: "ACCEPTED", decidedByUserId: context.user.id, decidedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorUserId: context.user.id, entityType: "IMPORTED_RECORD", entityId: recordId, action: "MATCH_ACCEPTED", metadata: { candidateId, canonicalProductId, importJobId: jobId } } });
      return true;
    });
  } catch (error) {
    redirect(`/imports/${jobId}/records/${recordId}?errore=${encodeURIComponent(safeDecisionError(error))}`);
  }
  if (changed && record.supplierSkuText && job.sourceDocument.supplierId) await prisma.procurementMemory.upsert({ where: { organizationId_supplierId_memoryType_lookupKey: { organizationId: context.assignment.organizationId, supplierId: job.sourceDocument.supplierId, memoryType: "SUPPLIER_SKU_PRODUCT", lookupKey: record.supplierSkuText.toLocaleLowerCase("it-IT") } }, update: { canonicalValue: { canonicalProductId }, sourceEntityId: recordId, confirmedByUserId: context.user.id }, create: { organizationId: context.assignment.organizationId, supplierId: job.sourceDocument.supplierId, memoryType: "SUPPLIER_SKU_PRODUCT", lookupKey: record.supplierSkuText.toLocaleLowerCase("it-IT"), canonicalValue: { canonicalProductId }, sourceEntityId: recordId, confirmedByUserId: context.user.id } });
  await refreshJob(jobId, context.user.id); redirect(`/imports/${jobId}?review=1`);
}

export async function correctAndAcceptRecord(formData: FormData) {
  const recordId = String(formData.get("recordId")); const jobId = String(formData.get("jobId")); const { context } = await scopedJob(jobId);
  const record = await prisma.importedRecord.findFirstOrThrow({ where: { id: recordId, importJobId: jobId }, include: { matchCandidates: { where: { recommended: true }, take: 1 } } });
  const current = record.normalizedFields as Record<string, unknown>;
  const interpreted = record.interpretedFields as Record<string, string | number | null>;
  const correctedInput = { ...interpreted, description: String(formData.get("description") || current.description), unitsPerPackage: Number(formData.get("unitsPerPackage") || current.unitsPerPackage), purchaseUom: String(formData.get("purchaseUom") || current.purchaseUom), consumptionUom: String(formData.get("consumptionUom") || current.consumptionUom), netPrice: Number(formData.get("netPrice") || current.netPrice) };
  const corrected = normalizeImportedFields(correctedInput);
  const candidate = record.matchCandidates[0];
  await prisma.$transaction(async (tx) => {
    await tx.importedRecord.update({ where: { id: recordId }, data: { normalizedFields: corrected as Prisma.InputJsonValue, humanOverride: correctedInput as Prisma.InputJsonValue, searchText: [corrected.supplierSku, corrected.ean, corrected.description, corrected.brand].filter(Boolean).join(" ").toLocaleLowerCase("it-IT"), supplierSkuText: corrected.supplierSku ? String(corrected.supplierSku) : null, eanText: corrected.ean ? String(corrected.ean) : null, normalizedPriceValue: corrected.normalizedPrice, exceptionType: candidate?.canonicalProductId && corrected.comparable ? null : corrected.comparable ? "UNCERTAIN_MATCH" : "PACKAGE_AMBIGUOUS", canonicalProductId: candidate?.canonicalProductId ?? null, status: candidate?.canonicalProductId && corrected.comparable ? "CONFIRMED" : "NEEDS_REVIEW", requiresReview: !(candidate?.canonicalProductId && corrected.comparable), normalizationConfidence: corrected.comparable ? 1 : 0.35, validationErrors: corrected.validationErrors, warnings: corrected.warnings } });
    await tx.importFieldCorrection.create({ data: { importedRecordId: recordId, fieldName: "normalizedFields", originalValue: current as Prisma.InputJsonValue, interpretedValue: record.interpretedFields as Prisma.InputJsonValue, correctedValue: corrected as Prisma.InputJsonValue, correctedByUserId: context.user.id } });
    for (const fieldName of ["description", "netPrice", "unitsPerPackage", "purchaseUom", "consumptionUom"] as const) {
      const humanValue = correctedInput[fieldName];
      const normalizedValue = corrected[fieldName];
      await tx.importedFieldValue.updateMany({ where: { importedRecordId: recordId, fieldName }, data: { humanValue: humanValue == null ? Prisma.JsonNull : humanValue as Prisma.InputJsonValue, normalizedValue: normalizedValue == null ? Prisma.JsonNull : normalizedValue as Prisma.InputJsonValue, normalizationConfidence: 1, confirmedByUserId: context.user.id, confirmedAt: new Date() } });
    }
    if (candidate) await tx.productMatchCandidate.update({ where: { id: candidate.id }, data: { humanDecision: "ACCEPTED", decidedByUserId: context.user.id, decidedAt: new Date() } });
    await tx.auditEvent.create({ data: { actorUserId: context.user.id, entityType: "IMPORTED_RECORD", entityId: recordId, action: "FIELD_CORRECTED", metadata: { fields: ["description", "netPrice", "unitsPerPackage", "purchaseUom", "consumptionUom"] } } });
  });
  await refreshJob(jobId, context.user.id); redirect(`/imports/${jobId}/records/${recordId}?corretto=1`);
}

export async function confirmNewProduct(formData: FormData) {
  const recordId = String(formData.get("recordId")); const jobId = String(formData.get("jobId")); const { context } = await scopedJob(jobId);
  const categoryId = String(formData.get("categoryId") ?? "");
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) redirect(`/imports/${jobId}/records/${recordId}?errore=${encodeURIComponent("Seleziona una categoria esistente prima di confermare il nuovo prodotto.")}`);
  const record = await prisma.importedRecord.findFirstOrThrow({ where: { id: recordId, importJobId: jobId } });
  const currentOverride = (record.humanOverride ?? {}) as Record<string, unknown>;
  const currentNormalized = record.normalizedFields as Record<string, unknown>;
  const productOverride = {
    description: String(formData.get("description") ?? currentNormalized.description ?? ""),
    brand: String(formData.get("brand") ?? currentNormalized.brand ?? "") || null,
    ean: normalizeOptionalGtin(formData.get("ean") ?? (currentNormalized.ean == null ? null : String(currentNormalized.ean))),
    manufacturerSku: String(formData.get("manufacturerSku") ?? currentNormalized.manufacturerSku ?? "") || null,
    purchaseUom: String(formData.get("purchaseUom") ?? currentNormalized.purchaseUom ?? "BOX"),
    unitsPerPackage: Number(formData.get("unitsPerPackage") ?? currentNormalized.unitsPerPackage ?? 1),
    consumptionUom: String(formData.get("consumptionUom") ?? currentNormalized.consumptionUom ?? "PIECE"),
  };
  const normalized = normalizeImportedFields({ ...(record.interpretedFields as Record<string, string | number | null>), ...currentNormalized, ...productOverride });
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.importedRecord.updateMany({ where: { id: recordId, importJobId: jobId, status: { in: ["READY", "NEEDS_REVIEW"] } }, data: { canonicalProductId: null, status: "NEW_PRODUCT_CONFIRMED", requiresReview: false, exceptionType: null, normalizedFields: normalized as Prisma.InputJsonValue, normalizedPriceValue: normalized.normalizedPrice, searchText: [productOverride.description, productOverride.brand, productOverride.ean, productOverride.manufacturerSku].filter(Boolean).join(" ").toLocaleLowerCase("it-IT"), humanOverride: { ...currentOverride, ...productOverride, categoryId, categoryName: category.name } as Prisma.InputJsonValue } });
      if (!updated.count) {
        const current = await tx.importedRecord.findUniqueOrThrow({ where: { id: recordId } });
        if (current.status === "NEW_PRODUCT_CONFIRMED") return;
        throw new Error("La riga è già stata decisa o è cambiata. Ricarica la pagina.");
      }
      await tx.productMatchCandidate.updateMany({ where: { importedRecordId: recordId }, data: { humanDecision: "CREATE_NEW", decidedByUserId: context.user.id, decidedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorUserId: context.user.id, entityType: "IMPORTED_RECORD", entityId: recordId, action: "NEW_PRODUCT_CONFIRMED", metadata: { categoryId, categoryName: category.name, importJobId: jobId } } });
    });
  } catch (error) {
    redirect(`/imports/${jobId}/records/${recordId}?errore=${encodeURIComponent(safeDecisionError(error))}`);
  }
  await refreshJob(jobId, context.user.id); redirect(`/imports/${jobId}?nuovo=confermato`);
}

export async function markRecord(formData: FormData) {
  const recordId = String(formData.get("recordId")); const jobId = String(formData.get("jobId")); const decision = String(formData.get("decision")); const { context } = await scopedJob(jobId);
  if (!["NON_COMPARABLE", "IGNORED"].includes(decision)) redirect(`/imports/${jobId}/records/${recordId}?errore=${encodeURIComponent("Seleziona una decisione valida.")}`);
  const nonComparable = decision === "NON_COMPARABLE";
  try {
    await prisma.$transaction(async (tx) => {
      const record = await tx.importedRecord.findFirstOrThrow({ where: { id: recordId, importJobId: jobId } });
      const nextStatus = nonComparable ? "NON_COMPARABLE" : "IGNORED";
      if (["PUBLISHED", "CONFIRMED", "NEW_PRODUCT_CONFIRMED"].includes(record.status)) throw new Error("La riga è già stata decisa e non può essere riclassificata.");
      const updated = await tx.importedRecord.updateMany({ where: { id: recordId, importJobId: jobId, status: { in: ["READY", "NEEDS_REVIEW"] } }, data: { status: nextStatus, requiresReview: false } });
      if (!updated.count) {
        if (record.status === nextStatus) return;
        throw new Error("La riga è già stata decisa o è cambiata. Ricarica la pagina.");
      }
      await tx.auditEvent.create({ data: { actorUserId: context.user.id, entityType: "IMPORTED_RECORD", entityId: recordId, action: nonComparable ? "RECORD_NOT_COMPARABLE" : "RECORD_IGNORED", metadata: { importJobId: jobId } } });
    });
  } catch (error) {
    redirect(`/imports/${jobId}/records/${recordId}?errore=${encodeURIComponent(safeDecisionError(error))}`);
  }
  await refreshJob(jobId, context.user.id); redirect(`/imports/${jobId}?review=1`);
}

export async function approveHighConfidence(formData: FormData) {
  const jobId = String(formData.get("jobId")); const { context } = await scopedJob(jobId);
  let confirmed = 0;
  try {
    confirmed = await confirmRecommendedMatches(jobId, context.user.id, context.assignment.organizationId, .88);
  } catch (error) {
    redirect(`/imports/${jobId}?errore=${encodeURIComponent(safeDecisionError(error))}`);
  }
  if (!confirmed) redirect(`/imports/${jobId}?errore=${encodeURIComponent("Nessuna proposta è più confermabile. Ricarica la pagina e verifica le righe aggiornate.")}`);
  await refreshJob(jobId, context.user.id); redirect(`/imports/${jobId}?alta=approvata`);
}

export async function bulkReviewRecords(formData: FormData) {
  const jobId = String(formData.get("jobId"));
  const action = String(formData.get("bulkAction"));
  const recordIds = formData.getAll("recordId").map(String).filter(Boolean).slice(0, 100);
  const { context } = await scopedJob(jobId);
  if (!recordIds.length) redirect(`/imports/${jobId}?filtro=attenzione&errore=${encodeURIComponent("Seleziona almeno una riga prima di applicare una decisione.")}`);
  if (!["ACCEPT_RECOMMENDED", "ASSIGN_CATEGORY", "NON_COMPARABLE", "IGNORE"].includes(action)) redirect(`/imports/${jobId}?filtro=attenzione&errore=${encodeURIComponent("Seleziona un’azione multipla valida.")}`);
  let changed = 0;
  try {
    ({ changed } = await applyBulkReview(prisma, { jobId, recordIds, action: action as BulkReviewAction, actorUserId: context.user.id, categoryId: String(formData.get("categoryId") ?? "") || undefined }));
  } catch (error) {
    redirect(`/imports/${jobId}?filtro=attenzione&errore=${encodeURIComponent(safeDecisionError(error))}`);
  }
  await refreshJob(jobId, context.user.id);
  revalidatePath(`/imports/${jobId}`);
  redirect(`/imports/${jobId}?filtro=attenzione&batch=${changed}`);
}

export async function publishImportAction(formData: FormData) {
  const jobId = String(formData.get("jobId")); const { context } = await scopedJob(jobId);
  const list = await publishImport(jobId, context.user.id, context.assignment.organizationId);
  revalidatePath("/imports"); revalidatePath("/price-lists"); redirect(`/imports/${jobId}?pubblicato=${list.id}`);
}

export async function retryImport(formData: FormData) {
  const jobId = String(formData.get("jobId")); const { context } = await scopedJob(jobId);
  const nextJobId = await reprocessImport(jobId, context.user.id, context.assignment.organizationId);
  redirect(`/imports/${nextJobId}?rielaborato=1`);
}

export async function updateColumnMapping(formData: FormData) {
  const jobId = String(formData.get("jobId"));
  const { context, job } = await scopedJob(jobId);
  const current = (job.columnMapping ?? {}) as Record<string, string>;
  const submittedHeaders = JSON.parse(String(formData.get("headers") ?? "[]")) as unknown;
  const headers = Array.isArray(submittedHeaders) ? submittedHeaders.map(String).filter((header) => header.length <= 160).slice(0, 80) : Object.keys(current);
  const mapping: Record<string, ImportField> = {};
  for (const header of headers) {
    const value = String(formData.get(`mapping:${header}`) ?? "");
    if (importFields.includes(value as ImportField)) mapping[header] = value as ImportField;
  }
  if (!Object.keys(mapping).length) throw new Error("Mantieni almeno una colonna riconosciuta.");
  await remapImport(jobId, mapping, context.user.id, context.assignment.organizationId);
  redirect(`/imports/${jobId}/mapping?salvato=1`);
}

export async function resetColumnMapping(formData: FormData) {
  const jobId = String(formData.get("jobId"));
  const { context } = await scopedJob(jobId);
  await resetImportMapping(jobId, context.user.id, context.assignment.organizationId);
  redirect(`/imports/${jobId}/mapping?automatico=1`);
}

export async function confirmImportSupplier(formData: FormData) {
  const jobId = String(formData.get("jobId"));
  const supplierId = String(formData.get("supplierId"));
  const { context, job } = await scopedJob(jobId);
  const supplier = await prisma.supplier.findFirstOrThrow({ where: { id: supplierId, active: true } });
  await reprocessImportForSupplier(jobId, supplier.id, context.user.id, context.assignment.organizationId);
  await prisma.auditEvent.create({ data: { actorUserId: context.user.id, entityType: "SOURCE_DOCUMENT", entityId: job.sourceDocumentId, action: "SUPPLIER_CONFIRMED", metadata: { supplierId: supplier.id, supplierName: supplier.name, matchingRecomputed: true } } });
  revalidatePath(`/imports/${jobId}`);
  redirect(`/imports/${jobId}?fornitore=confermato`);
}

async function refreshJob(jobId: string, actorUserId: string) {
  const records = await prisma.importedRecord.findMany({ where: { importJobId: jobId }, select: { status: true } });
  const review = records.filter((record) => record.status === "NEEDS_REVIEW").length;
  const proposed = records.filter((record) => record.status === "READY").length;
  const publishable = records.filter((record) => ["CONFIRMED", "NEW_PRODUCT_CONFIRMED"].includes(record.status)).length;
  const current = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId }, select: { status: true } });
  await prisma.importJob.update({ where: { id: jobId }, data: { status: review + proposed ? "NEEDS_REVIEW" : "READY_TO_PUBLISH", reviewRequiredRecords: review, publishableRecords: publishable } });
  if (!review && !proposed && current.status !== "READY_TO_PUBLISH") await prisma.auditEvent.create({ data: { actorUserId, entityType: "IMPORT_JOB", entityId: jobId, action: "IMPORT_READY", metadata: { publishableRecords: publishable } } });
  revalidatePath(`/imports/${jobId}`);
  revalidatePath(`/imports/${jobId}/summary`);
}
