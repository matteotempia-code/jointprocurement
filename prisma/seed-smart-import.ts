import type { PrismaClient } from "@prisma/client";

type SeedEntity = { id: string };
type SeedProduct = SeedEntity & { name: string; brand: string | null; purchaseUom: string; unitsPerPackage: { toString(): string } | null; consumptionUom: string | null; consumptionUomLabel: string | null };
type SeedOffer = { canonicalProductId: string; supplierSku: string | null; unitPrice: { toString(): string } };

export async function seedSmartImports(args: { prisma: PrismaClient; organization: SeedEntity; suppliers: SeedEntity[]; uploader: SeedEntity; products: SeedProduct[]; offers: SeedOffer[]; now: Date; day: number }) {
  const { prisma, organization, suppliers, uploader, products, offers, now, day } = args;
  const definitions = [
    { filename: "listino-alfa-medical-2027.xlsx", kind: "PRICE_LIST" as const, status: "PUBLISHED" as const, records: 36, review: 0, published: 36, daysAgo: 70 },
    { filename: "listino-alfa-medical-2028.xlsx", kind: "PRICE_LIST" as const, status: "NEEDS_REVIEW" as const, records: 36, review: 4, published: 0, daysAgo: 2 },
    { filename: "offerta-caresupply-sporca.csv", kind: "OFFER" as const, status: "NEEDS_REVIEW" as const, records: 18, review: 6, published: 0, daysAgo: 1 },
  ];
  const productsWithOffers = products.filter((product) => offers.some((item) => item.canonicalProductId === product.id));

  for (let importIndex = 0; importIndex < definitions.length; importIndex += 1) {
    const definition = definitions[importIndex];
    const supplier = importIndex === 2 ? suppliers[1] : suppliers[0];
    const uploadedAt = new Date(now.getTime() - definition.daysAgo * day);
    const source = await prisma.sourceDocument.create({ data: {
      organizationId: organization.id, supplierId: supplier.id, uploadedByUserId: uploader.id,
      originalFilename: definition.filename, mimeType: definition.filename.endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileSize: importIndex === 2 ? 4_820 : 18_432, checksum: `demo-smart-import-${importIndex + 1}`, sourceType: "FILE_UPLOAD",
      documentKind: definition.kind, storagePath: `demo-imports/${definition.filename}`, visibility: "ORGANIZATION_PRIVATE", status: "PROCESSED",
      metadata: { seeded: true, interpretation: "LOCAL_HEURISTIC" }, version: 1, uploadedAt,
    } });
    const job = await prisma.importJob.create({ data: {
      sourceDocumentId: source.id, status: definition.status, parserType: definition.filename.endsWith(".csv") ? "CSV_DETERMINISTIC" : "XLSX_DETERMINISTIC",
      interpretationProvider: "LOCAL_HEURISTIC", providerModel: "heuristics-2",
      providerCapabilities: { nativePdf: true, scannedPdf: false, images: false, tables: true, ocr: false, vision: false, structuredOutput: true },
      interpretationSchema: "smart-import-v2", externalProcessing: false, startedAt: uploadedAt, completedAt: new Date(uploadedAt.getTime() + 120_000),
      totalRecords: definition.records, interpretedRecords: definition.records, reviewRequiredRecords: definition.review,
      publishableRecords: definition.records - definition.review, publishedRecords: definition.published,
      columnMapping: { "Codice art.": "supplierSku", Descrizione: "description", "Pz/conf": "unitsPerPackage", "Prezzo netto": "netPrice", UM: "purchaseUom" },
      detectedSheets: [{ name: "Listino", selected: true, records: definition.records }],
      summary: { providerLabel: "Interpretazione locale", providerIsAi: false, sourceHeaders: ["Codice art.", "Descrizione", "Pz/conf", "Prezzo netto", "UM"] },
      createdByUserId: uploader.id, version: 1, createdAt: uploadedAt,
    } });
    await prisma.auditEvent.createMany({ data: [
      { actorUserId: uploader.id, entityType: "SOURCE_DOCUMENT", entityId: source.id, action: "DOCUMENT_UPLOADED", metadata: { seeded: true, filename: definition.filename }, createdAt: uploadedAt },
      { actorUserId: uploader.id, entityType: "IMPORT_JOB", entityId: job.id, action: "IMPORT_STARTED", metadata: { seeded: true, provider: "LOCAL_HEURISTIC" }, createdAt: new Date(uploadedAt.getTime() + 30_000) },
      ...(definition.status === "PUBLISHED" ? [{ actorUserId: uploader.id, entityType: "IMPORT_JOB", entityId: job.id, action: "IMPORT_PUBLISHED", metadata: { seeded: true }, createdAt: new Date(uploadedAt.getTime() + 180_000) }] : []),
    ] });

    for (let row = 0; row < definition.records; row += 1) {
      const product = productsWithOffers[(row + importIndex * 3) % productsWithOffers.length];
      const offer = offers.find((item) => item.canonicalProductId === product.id)!;
      const packageChanged = importIndex === 1 && row === 2;
      const needsReview = definition.status !== "PUBLISHED" && row < definition.review;
      const newProduct = importIndex === 2 && row === 5;
      const packageQuantity = Number(product.unitsPerPackage ?? 1) * (packageChanged ? 2 : 1);
      const basePrice = Number(offer.unitPrice);
      const priceFactor = importIndex === 1 ? packageChanged ? 1.84 : row % 5 === 0 ? 1.2 : row % 5 === 1 ? 0.92 : 1 : 1;
      const purchasePrice = basePrice * priceFactor;
      const normalizedPrice = purchasePrice / packageQuantity;
      const oldNormalizedPrice = basePrice / Number(product.unitsPerPackage ?? 1);
      const deltaAmount = normalizedPrice - oldNormalizedPrice;
      const deltaPercent = oldNormalizedPrice ? deltaAmount / oldNormalizedPrice * 100 : null;
      const changeType = newProduct ? "NEW" : packageChanged ? "PACKAGE_CHANGE" : deltaPercent != null && deltaPercent > 0.01 ? "INCREASE" : deltaPercent != null && deltaPercent < -0.01 ? "DECREASE" : "UNCHANGED";
      const description = newProduct ? "Schermo facciale antiappannamento regolabile" : product.name;
      const sku = newProduct ? "NEW-VISOR-01" : offer.supplierSku;
      const brand = newProduct ? "SafeView" : product.brand;
      const imported = await prisma.importedRecord.create({ data: {
        importJobId: job.id, recordIndex: row + 1,
        rawSource: `${sku ?? "SENZA-CODICE"};${description};${product.purchaseUom};${packageQuantity};${purchasePrice.toFixed(2)}`,
        rawFields: { supplierSku: sku, description, purchaseUom: product.purchaseUom, unitsPerPackage: packageQuantity, netPrice: purchasePrice },
        interpretedFields: { supplierSku: sku, description, brand, purchaseUom: product.purchaseUom, unitsPerPackage: packageQuantity, consumptionUom: product.consumptionUom ?? "PIECE", netPrice: purchasePrice, currency: "EUR" },
        normalizedFields: { supplierSku: sku, description, brand, netPrice: purchasePrice, purchaseUom: product.purchaseUom, unitsPerPackage: packageQuantity, packageDescription: `${packageQuantity} ${product.consumptionUomLabel ?? "pezzi"}`, consumptionUom: product.consumptionUom ?? "PIECE", normalizedPrice, comparable: !newProduct, normalizedLabel: `${normalizedPrice.toFixed(4)} € / ${product.consumptionUomLabel ?? "pezzo"}`, validationErrors: newProduct ? ["Nessun prodotto canonico affidabile"] : [], warnings: packageChanged ? ["Confezione differente dal prodotto canonico"] : [] },
        sourceLocator: { kind: definition.filename.endsWith(".csv") ? "CSV" : "XLSX", sheet: definition.filename.endsWith(".csv") ? undefined : "Listino", row: row + 5, columns: { supplierSku: "Codice art.", description: "Descrizione", netPrice: "Prezzo netto" } },
        searchText: `${sku ?? ""} ${description} ${brand ?? ""}`.toLocaleLowerCase("it-IT"), supplierSkuText: sku,
        normalizedPriceValue: normalizedPrice, exceptionType: newProduct ? "NEW_PRODUCT" : packageChanged ? "PACKAGE_CHANGE" : needsReview ? "UNCERTAIN_MATCH" : undefined,
        previousNormalizedPrice: oldNormalizedPrice, previousPackageSize: Number(product.unitsPerPackage ?? 1), priceDeltaAmount: deltaAmount, priceDeltaPercent: deltaPercent,
        changeType, bestCurrentNormalizedPrice: oldNormalizedPrice, extractionConfidence: 0.99, mappingConfidence: 0.96,
        normalizationConfidence: needsReview ? 0.62 : 0.98, matchConfidence: newProduct ? 0.18 : packageChanged ? 0.74 : needsReview ? 0.82 : 0.99,
        status: definition.status === "PUBLISHED" ? "PUBLISHED" : needsReview ? "NEEDS_REVIEW" : "READY", requiresReview: needsReview,
        validationErrors: newProduct ? ["Nessun prodotto canonico affidabile"] : undefined, warnings: packageChanged ? ["Confezione differente dal prodotto canonico"] : [],
        canonicalProductId: newProduct ? undefined : product.id, publishedAt: definition.status === "PUBLISHED" ? new Date(uploadedAt.getTime() + 180_000) : undefined,
      } });
      await prisma.productMatchCandidate.create({ data: {
        importedRecordId: imported.id, canonicalProductId: newProduct ? undefined : product.id,
        matchType: newProduct ? "NEW_PRODUCT" : packageChanged ? "PROBABLE_MATCH" : needsReview ? "PROBABLE_MATCH" : "IDENTICAL",
        score: newProduct ? 0.18 : packageChanged ? 0.74 : needsReview ? 0.82 : 0.99,
        reasons: newProduct ? ["Nessun identificatore affidabile"] : packageChanged ? ["Descrizione e marca coincidono", "Confezione differente"] : needsReview ? ["Descrizione simile", "Identificatore da verificare"] : ["Stesso codice fornitore", "Stessa marca", "Stessa confezione"],
        identifierMatches: newProduct ? {} : { supplierSku: true }, descriptionSimilarity: newProduct ? 0.38 : 0.98, uomCompatibility: true,
        packagingCompatibility: !packageChanged, categoryCompatibility: true, recommended: true,
        humanDecision: definition.status === "PUBLISHED" ? "ACCEPTED" : "PENDING", decidedByUserId: definition.status === "PUBLISHED" ? uploader.id : undefined,
        decidedAt: definition.status === "PUBLISHED" ? new Date(uploadedAt.getTime() + 150_000) : undefined,
      } });
      await prisma.importedFieldValue.createMany({ data: [
        { importedRecordId: imported.id, fieldName: "description", rawValue: description, interpretedValue: description, normalizedValue: description, sourceLocator: { sheet: "Listino", row: row + 5, column: "Descrizione" }, extractionConfidence: .99, mappingConfidence: .96, normalizationConfidence: .98, interpretationProvider: "LOCAL_HEURISTIC", providerModel: "heuristics-2", schemaVersion: "smart-import-v2", interpretedAt: uploadedAt },
        { importedRecordId: imported.id, fieldName: "netPrice", rawValue: purchasePrice, interpretedValue: purchasePrice, normalizedValue: purchasePrice, sourceLocator: { sheet: "Listino", row: row + 5, column: "Prezzo netto" }, extractionConfidence: .99, mappingConfidence: .96, normalizationConfidence: .98, interpretationProvider: "LOCAL_HEURISTIC", providerModel: "heuristics-2", schemaVersion: "smart-import-v2", interpretedAt: uploadedAt },
      ] });
    }
  }
}
