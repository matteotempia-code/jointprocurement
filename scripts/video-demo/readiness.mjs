import "dotenv/config";
import { access, writeFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PATHS, ROOT } from "./config.mjs";
import { ensureDirectories, isApplicationReady } from "./runtime.mjs";

const expectedPersonas = ["Lucia Ferri", "Andrea Riva", "Giulia Bianchi", "Marco Villa", "Elena Conti", "Davide Romano"];
const requiredFiles = [
  "demo-imports/listino-alfa-medical-2027.xlsx",
  "demo-imports/listino-alfa-medical-2028.xlsx",
  "demo-imports/offerta-caresupply-sporca.csv",
];

function item(label, pass, details, remediation) { return { label, status: pass ? "PASS" : "FAIL", details, remediation: pass ? null : remediation }; }

export async function evaluateReadiness({ checkApplication = true } = {}) {
  await ensureDirectories();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL non configurato.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const [
      users, products, imagedProducts, favorites, lists, budgets, pendingApprovals, openOrders,
      receipts, issues, suppliers, categories, importsToReview, publishedImports, priceVersions,
      changes, recommendedMatches, provenance, organizations,
    ] = await Promise.all([
      prisma.user.findMany({ where: { name: { in: expectedPersonas } }, select: { name: true, assignments: { where: { active: true }, select: { id: true } } } }),
      prisma.canonicalProduct.count({ where: { active: true } }),
      prisma.canonicalProduct.count({ where: { active: true, imagePath: { not: null } } }),
      prisma.favorite.count(), prisma.shoppingList.count({ where: { items: { some: {} } } }),
      prisma.budget.count({ where: { status: "ACTIVE", approvedAmount: { gt: 0 } } }),
      prisma.approvalRequest.count({ where: { status: "PENDING" } }),
      prisma.purchaseOrder.count({ where: { status: { in: ["ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED", "ISSUE"] } } }),
      prisma.receipt.count(), prisma.qualityIssue.count(), prisma.supplier.count({ where: { active: true } }), prisma.category.count(),
      prisma.importJob.count({ where: { status: "NEEDS_REVIEW", reviewRequiredRecords: { gt: 0 } } }),
      prisma.importJob.count({ where: { status: "PUBLISHED", publishedRecords: { gt: 0 } } }),
      prisma.priceList.groupBy({ by: ["supplierId"], where: { version: { gte: 2 } }, _count: true }),
      prisma.importedRecord.groupBy({ by: ["changeType"], where: { changeType: { in: ["INCREASE", "DECREASE", "PACKAGE_CHANGE", "NEW"] } }, _count: true }),
      prisma.productMatchCandidate.count({ where: { recommended: true, canonicalProductId: { not: null } } }),
      prisma.importedFieldValue.count(), prisma.organization.count(),
    ]);
    const fileResults = await Promise.all(requiredFiles.map(async (relative) => { try { await access(`${ROOT}/${relative}`); return true; } catch { return false; } }));
    const changeMap = Object.fromEntries(changes.map((entry) => [entry.changeType, entry._count]));
    const results = [
      item("Application", !checkApplication || await isApplicationReady(), checkApplication ? "Home HTTP raggiungibile" : "Verificata dal processo di registrazione", "Avviare l'applicazione in modalità video demo."),
      item("Database", products > 0 && organizations >= 2, `${organizations} organizzazioni · ${products} prodotti`, "Eseguire npm run demo:video:prepare."),
      item("Demo personas", expectedPersonas.every((name) => users.some((user) => user.name === name && user.assignments.length)), `${users.length}/6 persone con assegnazione attiva`, "Ripristinare il seed delle sei persone demo."),
      item("Catalog", products >= 100 && imagedProducts >= Math.min(products, 100), `${products} prodotti · ${imagedProducts} con immagine`, "Rigenerare catalogo e asset demo."),
      item("Favorites / Lists", favorites > 0 && lists > 0, `${favorites} preferiti · ${lists} liste utilizzabili`, "Aggiungere preferiti e una lista ricorrente nel seed."),
      item("Budget", budgets > 0, `${budgets} budget attivi`, "Aggiungere un budget attivo con disponibilità."),
      item("Approval case", pendingApprovals > 0, `${pendingApprovals} richieste pendenti`, "Creare una richiesta assegnata ad Andrea Riva."),
      item("PO / Receiving", openOrders > 0 && receipts > 0, `${openOrders} ordini aperti · ${receipts} ricezioni`, "Creare un ordine aperto e storico ricezioni."),
      item("Non-conformity", issues > 0, `${issues} problemi tracciati`, "Creare una non conformità demo."),
      item("Procurement analytics", suppliers >= 20 && categories >= 8, `${suppliers} fornitori · ${categories} categorie`, "Ripristinare dataset analytics procurement."),
      item("Smart Import", importsToReview > 0 && publishedImports > 0 && fileResults.every(Boolean), `${importsToReview} da verificare · ${publishedImports} pubblicati · ${fileResults.filter(Boolean).length}/3 file`, "Rigenerare job e documenti Smart Import."),
      item("Price-list versions", priceVersions.length > 0, `${priceVersions.length} fornitori con versioni successive`, "Creare una coppia di versioni listino."),
      item("Price Intelligence", ["INCREASE", "DECREASE", "PACKAGE_CHANGE", "NEW"].every((key) => Number(changeMap[key] ?? 0) > 0), `aumenti ${changeMap.INCREASE ?? 0} · riduzioni ${changeMap.DECREASE ?? 0} · confezioni ${changeMap.PACKAGE_CHANGE ?? 0} · nuovi ${changeMap.NEW ?? 0}`, "Rigenerare variazioni listino deterministiche."),
      item("Provenance / Matching", provenance > 0 && recommendedMatches > 0, `${provenance} valori tracciati · ${recommendedMatches} match consigliati`, "Ripristinare provenienza e candidati di matching."),
      item("Executive data", organizations >= 2 && budgets > 0 && suppliers > 0, "Spesa, budget e confronto organizzazioni disponibili", "Ripristinare dati direzionali demo."),
    ];
    const ready = results.every((result) => result.status === "PASS");
    const report = { title: "JOINT PROCUREMENT OS — VIDEO DEMO READINESS", checkedAt: new Date().toISOString(), overall: ready ? "READY" : "NOT READY", results };
    await writeFile(`${PATHS.reports}/readiness.json`, JSON.stringify(report, null, 2), "utf8");
    return report;
  } finally { await prisma.$disconnect(); }
}

export function printReadiness(report) {
  console.log("\nJOINT PROCUREMENT OS\nVIDEO DEMO READINESS\n");
  for (const result of report.results) console.log(`${result.label.padEnd(27, ".")} ${result.status}  ${result.details}`);
  console.log(`\nOVERALL: ${report.overall}`);
  if (report.overall !== "READY") for (const failed of report.results.filter((result) => result.status === "FAIL")) console.log(`- ${failed.label}: ${failed.remediation}`);
}
