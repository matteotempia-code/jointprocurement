# Architecture

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

## Policy engine

The central engine is deterministic:

1. Catalog, within budget and requester limit → AUTO_APPROVE.
2. Within budget but above requester limit → AREA_MANAGER_APPROVAL.
3. Out of budget → Area Manager approval and required justification.
4. More than 25% above available budget or above Area Manager authority → PROCUREMENT_APPROVAL.

It returns outcome, reason, required role, explanation, evaluated rules and justification requirement. Submission persists the complete decision.

## Approval and supplier splitting

The approver is resolved from an active assignment. Final approval, requisition update, PO generation and audit share one Prisma transaction. PO generation groups lines by the snapshot offer supplier, producing one PO per supplier with independent totals and delivery dates.

## Receiving, quality and audit

A receipt records received, accepted and rejected quantities against PO lines. Cumulative quantities determine partial or full receipt; any discrepancy creates a QualityIssue and sets the PO to ISSUE. AuditEvent covers request creation, policy evaluation, approval request/decision, PO creation, receipt and issue opening.

## Data and boundaries

One server-only Prisma 7 PostgreSQL adapter serves all queries. Policy and transactions remain server-side. Server Actions validate identity and resource ownership; credentials and Prisma values never enter browser bundles.

AI ingestion, invoices, three-way matching, RFQ/RFP, supplier portal and contracts remain outside V1.

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

`ApprovalDelegation` expresses a bounded transfer of authority: delegator, delegate, validity, scope and optional limit. This milestone persists and exposes delegations; the next policy revision should use them during approver resolution and preserve the selected delegation on `ApprovalRequest`.

Quality issues now have a lifecycle (`OPEN → UNDER_REVIEW → RESOLVED → CLOSED`) with resolution type and note. Changes are transactional with an audit event. Deliveries are a derived operational view of scoped purchase orders and receipts, not a duplicate balance table.

The expanded deterministic seed contains 2 organizations, 4 legal entities, 6 areas, 18 facilities, 27 cost centers, 25 suppliers, 12 categories, 156 canonical products, 468 offers, 30 price lists, 42 budgets, 110 requisitions and 85 purchase orders. Historical price points and operational history are stored in PostgreSQL; no chart uses random runtime values.

## Last-mile core freeze

`ProductActionsMenu` centralizza la disclosure di liste, confronto e dettaglio senza duplicare controlli nel Catalogo, nei Preferiti o in Prodotto 360. `ShoppingList.lastUsedAt` distingue modifica e utilizzo effettivo; le operazioni “salva carrello” e “crea da ordine” sono idempotenti per utente, struttura e nome, così QA e riordino non generano duplicati. Il seed assegna richieste, budget e ordini all’organizzazione della struttura e usa requester demo distribuiti. I test di cronologia impediscono sequenze richiesta/approvazione/PO/ricezione/non conformità temporalmente impossibili.

## CSS e design system

La precedente cascata globale (`globals.css`, `operative.css`, `hardening.css`, `recovery-mobile.css`) è stata sostituita da un unico entry point, `src/app/design-system.css`. Il file è organizzato per foundation, shell, primitives, commerce, workflow, intelligence e responsive. Token con prefisso `--jp-` sono la fonte canonica per colore, spazio, bordi, radius, shell e tipografia.

Il responsive usa soltanto quattro breakpoint condivisi (1100, 900, 760 e 440 px). `PageHeader`, `Metric`, `StatusIndicator`, `DataTable`, `EmptyState`, `SearchField` e `ProductImage` restano primitive React; le action row e le disclosure sono primitive semantiche CSS. Gli inline style ammessi rappresentano esclusivamente valori derivati dai dati, come larghezze di progress bar e coordinate dell’atlante immagini.
