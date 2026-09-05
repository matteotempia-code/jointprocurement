# Architecture

## Canonical architecture documents

This file describes the implemented application architecture and its current constraints. The enterprise target and binding product decisions are defined in:

- `docs/PRODUCT_VISION.md` — product thesis, system boundaries, and principles;
- `docs/DOMAIN_ARCHITECTURE_2.md` — target canonical domain, engines, and integration contracts;
- `docs/ADR/ADR-001-universal-procurement-orchestration.md` — accepted decision and consequences.

Where this implementation document is narrower than those sources, the target documents govern future design, while the current code remains the statement of what exists today. Planned target objects must not be described as implemented until their feature-register status changes.

## Current-to-target boundary

The implemented lifecycle is primarily PO-centric: Cart → PurchaseRequisition → ApprovalRequest → PurchaseOrder → Receipt → QualityIssue. Under the accepted enterprise direction, these become specializations and evidence sources within a broader lifecycle built around `ProcurementProcedure`, `CommercialCommitment`, `PayableEvent/Invoice`, `EvidenceRecord`, `ResolutionCase`, `AuthorityGraph`, `AccountingProposal`, and `AccountingPostingResult`.

The current static roles, scoped assignments, approval delegations, annual monetary budgets, M11 facility/product/category period limits, and audit events remain valid implementation components, but they are not the final authority graph, enterprise-wide multidimensional allocation model, or universal immutable evidence engine. Supabase PostgreSQL and private Storage remain canonical application infrastructure; the ERP will remain the accounting system of record through a vendor-neutral Integration Hub.

## Domain and scope

The hierarchy remains Organization → LegalEntity → Area → Facility → CostCenter. Authorization is an active UserAssignment: user, role, organization, scope and authority. resolveScope expands ORGANIZATION, AREA and FACILITY into permitted facility IDs. Pages and mutation actions validate roles server-side; resource pages additionally constrain facility or approver ownership.

## Procurement lifecycle

Cart → PurchaseRequisition → Policy evaluation → ApprovalRequest when required → PurchaseOrder → Receipt → QualityIssue.

Cart state is persisted per user and facility. Submission snapshots product, supplier, SKU, price, normalized price and tax. A requisition expresses internal demand and its policy history; a PO is the external supplier commitment. They are deliberately separate records.

## Budget logic

- Approved: sum of active applicable budgets.
- Reserved: submitted requisitions pending approval.
- Committed: non-cancelled issued purchase orders.
- Actual: seeded historical actual amount; invoice ingestion does not exist yet.
- Available = Approved − Reserved − Committed − Actual.
- Utilization = (Committed + Actual) / Approved.

Values are derived rather than copied into mutable balance fields. A requisition snapshots budgetBefore and budgetAfter so historical policy context remains explainable.

For the director flow, `ProcurementLimit` adds facility × product/category × period controls in currency or consumption quantity, optionally scoped to a cost centre. Product-specific limits take precedence over category fallbacks for each limit kind. Evaluation derives received use, outstanding PO commitment, pending-requisition reservation, the current request and remaining-after-purchase. This is the operational M11 subset, not the complete M11.5 enterprise allocation matrix.

## Policy engine

The central engine is deterministic:

1. Catalog, within budget and requester limit → AUTO_APPROVE.
2. Within budget but above requester limit → AREA_MANAGER_APPROVAL.
3. Out of budget → Area Manager approval and required justification.
4. More than 25% above available budget or above Area Manager authority → PROCUREMENT_APPROVAL.

It returns outcome, reason, required role, explanation, evaluated rules and justification requirement. Submission persists the complete decision.

## Approval and supplier splitting

The approver is resolved from an active assignment. Final approval, requisition update, PO generation and audit share one Prisma transaction. PO generation groups lines by the snapshot offer supplier, producing one PO per supplier with independent totals and delivery dates.

## Receiving, quality, attachments and audit

A receipt records received, accepted and rejected quantities against PO lines. Cumulative quantities determine partial or full receipt; any discrepancy creates a QualityIssue and sets the PO to ISSUE. `OperationalAttachment` stores private Supabase locators and immutable evidence for out-of-catalog requests, receipts and quality issues. The signed-access route authorizes organization, role and facility before issuing a 60-second URL. AuditEvent covers request creation, policy evaluation, approval request/decision, PO creation, receipt, issue opening and resolution.

## Data and boundaries

One server-only Prisma 7 PostgreSQL adapter serves all queries. Policy and transactions remain server-side. Server Actions validate identity and resource ownership; credentials and Prisma values never enter browser bundles.

Invoice ingestion, payable matching, RFQ/RFP, supplier portal and contract lifecycle management remain outside the implemented core. Smart Import is implemented as the controlled document-ingestion boundary described below.

## Core hardening

### UOM e normalizzazione

CanonicalProduct distingue purchaseUom, descrizione confezione, unitsPerPackage, consumptionUom e relativa etichetta. `src/lib/pricing/normalization.ts` è l’unico servizio autorizzato a derivare prezzo d’acquisto, quantità normalizzata, prezzo per unità di consumo e testo umano. Offerte con conversione assente o UOM differenti sono dichiarate non confrontabili.

### KPI canonici

Le definizioni temporali e di stato vivono in `src/lib/procurement/kpi-definitions.ts`; le query scope-aware sono in `kpis.ts`. Home, consegne e control center devono consumare queste definizioni, così il conteggio e il drill-down riconciliano.

### Presentazione e deleghe

`technical-attributes.ts` traduce attributi tecnici secondo schemi per categoria; `status.ts` impedisce l’esposizione degli enum. `resolveApprover` seleziona prima l’approvatore naturale e poi una delega valida per date, scope, categoria e soglia, persistendo la motivazione e l’identificativo della delega.

### Intelligence fornitore e categoria

Le metriche fornitore riportano numerosità del campione insieme a puntualità, completezza e non conformità. Dipendenza e concentrazione usano regole esplicite basate sulla quota di spesa, mai score opachi. Le aggregazioni restano server-side e rispettano i facility ID risolti dallo scope.

## Product recovery additions

The recovered experience is Italian-first and decision-oriented. The shell exposes role-specific operational workspaces plus a global server-side search. RSA users get buying shortcuts (favorites and recurring lists), a dedicated request area, deliveries and non-conformities; Procurement gets category and issue workspaces. Product images are deliberately subordinate to commercial and technical information: the UI uses a restrained catalog identity rather than pretending that generated assets are product photography.

`Favorite` is scoped by user, facility and canonical product. `ShoppingList` persists recurring facility demand independently from the cart; adding a list resolves the currently active preferred offer at action time. `OutOfCatalogRequest` captures an unmet need without inventing a product or supplier offer and routes it to Procurement review.

`ApprovalDelegation` expresses a bounded transfer of authority: delegator, delegate, validity, scope and optional limit. The current resolver uses valid delegations during approver resolution and preserves the selected delegation on `ApprovalRequest`; this remains narrower than the planned enterprise `AuthorityGraph`.

Quality issues now have a lifecycle (`OPEN → UNDER_REVIEW → RESOLVED → CLOSED`) with resolution type and note. Changes are transactional with an audit event. Deliveries are a derived operational view of scoped purchase orders and receipts, not a duplicate balance table.

The deterministic DEV master currently certified contains 2 organizations, 4 legal entities, 6 areas, 102 facilities, 75 suppliers, 12 categories, 227 canonical products, 525 offers and 80 price lists. The scoped procurement refresh restores 102 annual budgets, 3 procurement limits, 520 requisitions, 400 purchase orders, 300 receipts and 11 quality issues without deleting Smart Import, Storage locators, attachments or AI telemetry. Historical price points and operational history are stored in PostgreSQL; no chart uses random runtime values.

## Last-mile core freeze

`ProductActionsMenu` centralizza la disclosure di liste, confronto e dettaglio senza duplicare controlli nel Catalogo, nei Preferiti o in Prodotto 360. `ShoppingList.lastUsedAt` distingue modifica e utilizzo effettivo; le operazioni “salva carrello” e “crea da ordine” sono idempotenti per utente, struttura e nome, così QA e riordino non generano duplicati. Il seed assegna richieste, budget e ordini all’organizzazione della struttura e usa requester demo distribuiti. I test di cronologia impediscono sequenze richiesta/approvazione/PO/ricezione/non conformità temporalmente impossibili.

## CSS e design system

La precedente cascata globale (`globals.css`, `operative.css`, `hardening.css`, `recovery-mobile.css`) è stata sostituita da un unico entry point, `src/app/design-system.css`. Il file è organizzato per foundation, shell, primitives, commerce, workflow, intelligence e responsive. Token con prefisso `--jp-` sono la fonte canonica per colore, spazio, bordi, radius, shell e tipografia.

Il responsive usa soltanto quattro breakpoint condivisi (1100, 900, 760 e 440 px). `PageHeader`, `Metric`, `StatusIndicator`, `DataTable`, `EmptyState`, `SearchField` e `ProductImage` restano primitive React; le action row e le disclosure sono primitive semantiche CSS. Gli inline style ammessi rappresentano esclusivamente valori derivati dai dati, come larghezze di progress bar e coordinate dell’atlante immagini.

## Smart Import

### Modello e lifecycle

`SourceDocument` conserva checksum, ownership organizzativa, supplier opzionale, tipo, MIME, dimensione, versione e un locator storage esplicito. In esercizio `storageProvider=supabase` punta al bucket privato e a una object key scoped per organizzazione; `storagePath` resta soltanto compatibilità per record locali/fixture esistenti. Uno stesso documento può generare più `ImportJob`, così retry e futura rielaborazione non sovrascrivono mai la fonte.

`ImportedRecord` è lo staging obbligatorio. Conserva riga grezza, campi interpretati, campi normalizzati, esito, errori, warning e locator. `ImportedFieldValue` registra per singolo campo valore grezzo, interpretato, normalizzato, override umano, confidence e provenienza. `ImportFieldCorrection` conserva chi ha corretto e quando. Nessun parser scrive direttamente su `CanonicalProduct`, `PriceList` o `SupplierOffer`.

### Parser e provider

`src/lib/imports/parser.ts` seleziona parser deterministici: `read-excel-file` per la lettura XLSX serverless-safe, parser delimitato Italy-first per CSV/TSV, estrazione testo per PDF nativi e Mammoth per DOCX. ExcelJS resta limitato alla generazione delle fixture. File immagine, PDF scannerizzati e XLS legacy vengono conservati con stato `REQUIRES_PROVIDER` quando il provider necessario non è disponibile. Macro e contenuto documento non vengono mai eseguiti.

`DocumentInterpretationProvider` separa il dominio da qualunque vendor. L’implementazione attiva è `LocalHeuristicProvider`: non è AI e viene presentata come “Interpretazione locale”. Un provider futuro potrà contribuire a mapping, document understanding e similarità semantica senza modificare staging, review o publish.

### Normalizzazione e matching

L’import riusa `src/lib/pricing/normalization.ts`: prezzo confezione, fattore di conversione e unità di consumo hanno un’unica semantica nel prodotto. Un box da 100 a 2,50 € produce 0,025 €/pezzo. Conversioni mancanti o ambigue sono `NON_COMPARABLE`; non vengono forzate.

Il matching è identifier-first: GTIN/EAN, codice produttore e supplier SKU precedono descrizione, marca, categoria, UOM e packaging. `ProductMatchCandidate` conserva tipo, score, segnali, compatibilità e motivazioni. Le classi sono identico, probabile, alternativa commerciale, alternativa funzionale da verificare e nuovo prodotto. Un conflitto di identificatore o confezione richiede sempre revisione.

### Review, provenance e publish

La review mostra fonte, interpretazione e catalogo canonico affiancati. Anche i match ad alta affidabilità richiedono una conferma umana, eventualmente bulk. Nuovi prodotti richiedono categoria esistente confermata; supplier e categorie non vengono creati silenziosamente. Ogni correzione e decisione genera audit.

Il publish è una singola transazione Prisma. Verifica scope, supplier e assenza di record irrisolti; crea una nuova versione di `PriceList`, disattiva la precedente senza cancellarla, crea offerte con snapshot normalizzati, eredita il convenzionamento per lo stesso supplier/prodotto e collega `SourceDocument`/`ImportedRecord`. La relazione univoca job-listino e il controllo `publishedPriceList` rendono l’operazione idempotente.

### Change analysis e accesso

La pagina variazioni confronta sempre prezzi normalizzati sulla stessa unità di consumo e usa la versione precedente anche se inattiva. Classifica aumento, riduzione, invariato, nuovo, rimosso, cambio confezione e non confrontabile; confronta inoltre la nuova posizione con la migliore offerta attiva. I volumi non vengono annualizzati in assenza di osservazioni affidabili.

`PROCUREMENT_MANAGER` e `PROCUREMENT_ADMIN` possono accedere alle importazioni nel proprio `organizationId`. RSA, Area, Finance ed Executive sono bloccati server-side. Il download ripete lo scope check prima di generare un URL firmato Supabase a 60 secondi; la chiave elevata non raggiunge mai il browser. Il bucket resta privato.

L'audit binario completo è in `docs/ASSET_STORAGE_INVENTORY.md`. Le immagini catalogo e i PDF sintetici di prodotto/fornitore sono fixture immutabili versionate in Git. Gli upload mutabili di immagini, allegati ordine/ricezione e prove di non conformità non sono workflow esistenti: quando verranno introdotti useranno locator autorizzati e Storage privato, non i campi path legacy.

### Scalabilità della review

`src/lib/imports/review-query.ts` è il boundary canonico per ricerca, filtri, sort, conteggi e paginazione dello staging. La pagina usa 25 record per volta e query count separate; `NEEDS_REVIEW` identifica un’eccezione individuale, mentre `READY` identifica una proposta affidabile confermabile in batch. `src/lib/imports/bulk-review.ts` applica nuovamente i vincoli nel database ed è idempotente.

Le proiezioni indicizzate su `ImportedRecord` rendono interrogabili descrizione/SKU/GTIN, exception type, prezzo normalizzato e price change senza leggere JSON o materializzare l’intero job. Raw, interpreted e normalized JSON restano la traccia completa; le colonne scalari sono read models di staging ricostruibili.

### Provider readiness e data residency

Il parser documentale espone capability, model version, schema version ed `externalProcessing`; senza OCR usa `LOCAL_HEURISTIC`. La Procurement AI è separata e, quando `PROCUREMENT_AI_ENABLED=true`, provider `OPENAI` e chiave/modello sono configurati, interpreta contesto documento, condizioni commerciali e fino a 12 righe ambigue. Matching semantico, equivalenza funzionale e riuso della Procurement Memory non sono ancora collegati al normale workflow. Immagini e scansioni assumono `REQUIRES_PROVIDER`, non `FAILED`.

L’evidenza per campo conserva provider/modello/schema/timestamp. Un futuro adapter OCR/vision deve restituire output compatibile con `ImportedFieldValue`; non può bypassare staging, review e publish transazionale.

## Automated product demo

Il sottosistema in `scripts/video-demo/` è separato dal Browser QA: usa Playwright come motore di registrazione, non come test runner. `prepare.mjs` ripristina il seed canonico e rigenera gli asset di importazione, `readiness.mjs` interroga database e applicazione con definizioni esplicite, mentre `run.mjs` registra ogni scena in un browser context indipendente. Un errore di scena non cancella i clip già prodotti e la singola scena può essere rilanciata in isolamento.

Le scene dichiarano beat narrativi e pause human-facing; il runtime traduce i beat in manifest JSON con tempi osservati e cue sheet Markdown per il voice-over. Ogni video viene rinominato deterministicamente e validato caricando il WebM in Chromium: risoluzione, durata, decodifica, frame non neri, still rappresentativo e assenza di errori console sono verifiche bloccanti.

La modalità è isolata tramite `VIDEO_DEMO_MODE=1`. In questa modalità Next usa `.next-video-demo`, così non collide con un server di sviluppo ordinario. La sola route di chiusura `/demo-roadmap` chiama `notFound()` fuori da tale ambiente, richiede comunque il ruolo Executive e non compare nella navigazione. Cursore e focus sono iniettati dal recorder nel documento browser e non fanno parte del bundle applicativo.
