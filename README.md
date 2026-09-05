# Joint Procurement OS — Anteo × Coopselios

MVP operativo database-backed per acquisti di struttura governati. Il core italiano per RSA, Area Manager, Procurement, Finance ed Executive include ora Smart Import: documenti commerciali reali diventano staging verificabile, offerte versionate e price intelligence soltanto dopo conferma umana.

## What works

- Six demo personas, role navigation and organization/area/facility scope
- Operational RSA, Area, Procurement, Finance and Executive dashboards
- Catalogo DEV da 227 prodotti e 525 offerte, Product 360, storico prezzi e documenti demo versionati
- Persistent cart, budget impact and purchase request submission
- Rule-based policy, auto approval, Area/Procurement approvals
- Atomic multi-supplier PO generation and downloadable local PDF
- Orders, partial/full receiving, discrepancies and quality issues
- Supplier directory/360 with measured delivery KPIs
- Structured audit trail and responsive workflows
- Ricerca globale, preferiti, liste ricorrenti e riordino
- Richieste fuori catalogo, workspace consegne e non conformità con risoluzione
- Category 360, deleghe temporanee e cockpit operativi attention-first
- Smart Import con upload reale, checksum, Storage Supabase privato e scope organizzativo
- Parser deterministici XLSX/CSV, PDF nativo e supporto strutturale DOCX
- Mapping colonne, staging raw/interpreted/normalized/human e provenienza per campo
- Matching identifier-first spiegabile, review per eccezione e publish transazionale idempotente
- Versioning listini e confronto vecchio/nuovo su prezzi normalizzati e cambi confezione

Procurement AI può usare OpenAI in DEV quando le quattro variabili dedicate sono complete; in caso contrario la UI dichiara `FALLBACK` o `DISABLED`. OpenAI è oggi limitato al contesto documento, alle condizioni commerciali e a un massimo di 12 righe ambigue. Non è configurato un provider OCR: PDF scannerizzati e immagini vengono conservati ma non interpretati automaticamente. Matching semantico, equivalenza funzionale, invoice matching, sourcing e supplier portal non sono implementati.

## Stack

Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, Prisma 7 PostgreSQL adapter, Supabase PostgreSQL + Storage, Playwright, read-excel-file per la lettura XLSX, ExcelJS per la generazione delle fixture, Mammoth e pdf-parse.

## Start locally

    npm install
    npx prisma migrate deploy
    npm run db:seed
    npm run dev

Open http://localhost:3000. The local `.env` must point `DATABASE_URL` and `DIRECT_URL` to the shared Supabase PostgreSQL project and configure the private Supabase document bucket; no local PostgreSQL installation is required. See `docs/HOME_OFFICE_WORKFLOW.md`.

Per rigenerare i documenti Smart Import:

    npm run demo:imports

Le fixture sintetiche restano in `demo-imports/`. Con `DOCUMENT_STORAGE_PROVIDER=supabase`, gli upload operativi della demo usano lo stesso bucket privato degli upload reali; `var/imports/` resta soltanto un adapter locale ignorato per test isolati.

`demo:imports` genera soltanto fixture versionate e non prova l'upload cloud. La verifica live completa usa `npm run storage:prove-live` seguita da `npm run storage:prove-browser`. L'inventario di immagini, documenti e allegati è in `docs/ASSET_STORAGE_INVENTORY.md`.

## Demo users

| Persona | Role | Scope |
| --- | --- | --- |
| Lucia Ferri | RSA Director | RSA Aurora |
| Andrea Riva | Area Manager | Area Piemonte |
| Giulia Bianchi | Joint Procurement Manager | Anteo Demo |
| Marco Villa | Procurement Administrator | Anteo Demo |
| Elena Conti | Finance Controller | Anteo Demo |
| Davide Romano | Executive Sponsor | Anteo Demo |

Use View as in the demo sidebar. Selection is an HTTP-only cookie validated by a Server Action.

## Demo flow

As Lucia: Catalog → search Guanto nitrile senza polvere M → Product 360 → Add → Cart → Create purchase request. Small requests auto-approve and generate supplier POs. Larger requests appear in Andrea’s Approvals inbox. Return as Lucia to Orders, open a PO and Receive delivery; partial quantities and issues are supported.

Come Giulia: Importazioni → Importa un documento → carica `demo-imports/listino-alfa-medical-2027.xlsx` → verifica mapping e corrispondenze → conferma i match ad alta affidabilità → pubblica. Carica poi `listino-alfa-medical-2028.xlsx` per vedere aumenti, riduzioni, articolo rimosso, nuovo prodotto e cambio confezione calcolati sul prezzo normalizzato.

## Dataset

Il seed fittizio e idempotente crea 2 organizzazioni, 4 entità legali, 6 aree, 18 strutture, 27 centri di costo, 25 fornitori, 12 categorie, 156 prodotti, 468 offerte, 30 listini, 42 budget, 110 richieste e 85 ordini. Include inoltre tre job Smart Import dimostrativi; i browser test caricano file reali aggiuntivi.

## Quality

    npx prisma validate
    npx prisma migrate status
    npm run db:seed
    npm run lint
    npm test
    npm run build
    npm run qa:browser

Vedi `docs/ARCHITECTURE.md`, `docs/SMART_IMPORT.md` e `docs/FEATURE_REGISTER.md`.

## Milestone

Smart Import end-to-end. Il core buying resta congelato; invoice ingestion, three-way matching e sourcing restano milestone separate e non sono stati avviati.
