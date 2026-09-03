# Feature register

Cloud activation evidence (1 September 2026): live XLSX and native PDF ingestion, private signed readback, role denial and operation with `var/imports/` unavailable all pass. The complete cross-asset classification is recorded in `docs/ASSET_STORAGE_INVENTORY.md`.

## M11.5 — Enterprise Procurement Architecture (planned)

These are architecture commitments, not implemented features. Their canonical definitions are in `PRODUCT_VISION.md`, `DOMAIN_ARCHITECTURE_2.md`, and `ADR/ADR-001-universal-procurement-orchestration.md`.

| Feature | Phase | Status | Completion | Evidence | Depth note |
| --- | --- | --- | ---: | --- | --- |
| Canonical enterprise domain schema | M11.5 | PLANNED | 0% | Domain Architecture 2 | Formalize Procedure, Commitment, Payable, Evidence, Resolution, Authority, AccountingProposal and PostingResult before migrations |
| Purchase archetype framework | M11.5 | PLANNED | 0% | ADR-001 | Catalog, contracts/utilities, kitchen, delegated executive, professional services and recurring/non-PO strategies on one lifecycle |
| Enterprise identity boundary | M11.5 | PLANNED | 0% | Product Vision | AD/Windows domains, Entra ID, OIDC/SAML and LDAP; demo identity remains development-only |
| Organization master ingestion | M11.5 | PLANNED | 0% | Domain Architecture 2 | API and CSV/XLSX ingestion for entities, facilities, services, cost centers, people, functions and hierarchies |
| Authority graph and snapshots | M11.5 | PLANNED | 0% | ADR-001 | Contextual evidence, allocation and approval powers with scope, subject, action, threshold, dates and delegation |
| Enterprise multidimensional budget and limit model | M11.5 | PLANNED | 15% | Domain Architecture 2; M11 `ProcurementLimit` subset | M11 implements facility × product/category × period monetary/quantity controls; legal-entity, service/project and normalized allocations remain planned |
| Immutable evidence engine | M11.5 | PLANNED | 0% | Domain Architecture 2 | Original response, identity/authority snapshot, channel assurance, timestamps, attachments, AI derivative and audit chain |
| Channel-aware resolution engine | M11.5 | PLANNED | 0% | Domain Architecture 2 | Missing-fact routing through portal, email, WhatsApp, Teams, Slack and future controlled channels |
| Archetype-aware matching engine | M11.5 | PLANNED | 0% | Domain Architecture 2 | Reconcile invoices/payables with applicable PO, contract, tariff, receipt/service, period, allocation and authority evidence |
| Accounting orchestration engine | M11.5 | PLANNED | 0% | Domain Architecture 2 | Produce canonical, explainable AccountingProposal only when evidence, match, policy and authority are sufficient |
| ERP Integration Hub contracts | M11.5 | PLANNED | 0% | ADR-001 | Vendor-neutral hub plus Mago, Coopselios and future ERP adapters; persist posting results and errors |
| Graduated automation policy | M11.5 | PLANNED | 0% | Product Vision | L0–L4 by entity, archetype, amount, category, risk, supplier and evidence quality; treasury retains payment control |

Stima complessiva dell’MVP operativo: **84%**. Il denominatore comprende organizzazione/accesso, catalogo, ciclo buying, fornitori/categorie, qualità, intelligence e dashboard; esclude Smart Import, fatture e sourcing. Smart Import è valutato separatamente all’**82%**: il percorso XLSX/CSV è end-to-end, mentre OCR e provider AI reali non sono configurati. La stima considera correttezza, profondità, test e maturità UX, non la sola presenza delle route.

| Feature | Phase | Status | Completion | Evidence | Depth note |
| --- | --- | --- | ---: | --- | --- |
| Design system e UX coherence | Final polish | DONE | 92% | `design-system.css`, `STYLE_SYSTEM.md`, visual QA | Un solo entry CSS, token e responsive centralizzati; resta evolvibile senza nuova cascata |
| Organization model | Foundation | DONE | 100% | Prisma, Organizzazione | 2 organizzazioni, 4 entità, 6 aree, 102 strutture sintetiche |
| Role / scope / authority | Foundation | DONE | 100% | Assignment, resolver, guard, test | ORGANIZATION / AREA / FACILITY server-side |
| Catalogo | Recovery | DONE | 95% | `/catalog` | 780 prodotti sintetici, filtri estesi, acquisto e convenzionato |
| Product 360 | Recovery | DONE | 95% | `/products/[id]` | Hero decisionale e disclosure progressiva per specifiche, storico, utilizzo, documenti e alternative |
| Confronto prodotti | Hardening | DONE | 90% | `/compare-products` | Side-by-side 2–4 con specifiche, prezzi normalizzati, documenti e utilizzo |
| Supplier 360 | Hardening | DONE | 92% | `/suppliers/[id]` | Dipendenza in apertura, trend, prezzo, termini, contatti, delivery e qualità con campione |
| Cart | V1 | DONE | 100% | `/cart`, Server Actions | Persistente, multi-fornitore, budget e policy preview |
| Budget | Recovery | DONE | 95% | `/budget` | Scope facility/area/org, forecast deterministico e breakdown |
| Requests | Recovery | DONE | 95% | `/richieste`, detail | Area dedicata, stati e timeline |
| Out-of-catalog request | M11 | DONE | 96% | `/richieste#fuori-catalogo`, `OperationalAttachment` | Persistenza, allegati multipli privati Supabase, checksum, download scoped e coda Procurement; conversione futura |
| Facility product/category period limits | M11 | DONE | 92% | `ProcurementLimit`, cart, policy snapshot | Limiti monetari e quantitativi con usato, impegnato, riservato, richiesto e residuo; matrice enterprise completa rinviata a M11.5 |
| Receiving and NC evidence | M11 | DONE | 94% | receive flow, `OperationalAttachment`, `/non-conformita` | Foto/PDF privati, metadata, audit, download autorizzato e immutabilità dopo registrazione |
| Policy engine | V1 | DONE | 100% | `src/lib/policy`, test | Quattro regole spiegabili |
| Approval cockpit | V1 | DONE | 90% | `/approvals/[id]` | Decisione, budget, policy e contesto |
| Approval delegation | Hardening | DONE | 92% | resolver, Prisma, test, `/deleghe` | Routing per data, scope, categoria e soglia con audit |
| Purchase Order | V1 | DONE | 100% | Service transazionale | Split per fornitore e snapshot |
| PO PDF | V1 | DONE | 90% | `/orders/[id]/pdf` | PDF locale scaricabile |
| Orders | Recovery | DONE | 95% | `/orders` | Workspace per stato, scope RSA/procurement |
| Supplier acknowledgment | Recovery | DONE | 80% | Server Action, PO status | Conferma e data attesa; portale escluso |
| Deliveries | Recovery | DONE | 95% | `/consegne` | Oggi, prossime, ritardi e ricevute |
| Receiving | V1 | DONE | 100% | `/orders/[id]/receive` | Ricezioni multiple, parziali e mobile |
| Non-conformity | Recovery | DONE | 95% | `/non-conformita` | Area dedicata, presa in carico, risoluzione, audit |
| Favorites | Recovery | DONE | 100% | `/preferiti`, catalogo | Persistenza per utente e struttura |
| Repeat purchase | Recovery | DONE | 85% | `buyAgain` action | Riempimento carrello; CTA PO da estendere su tutti gli stati |
| Recurring lists | Recovery | DONE | 95% | `/liste` | Liste persistenti e aggiunta massiva |
| Category 360 | Recovery | DONE | 90% | `/categorie/[id]` | “Cosa fare” prima dei KPI, spread, copertura, compliance e rischio budget |
| Price intelligence | V1 | DONE | 90% | `/compare`, Product 360 | Spread, preferred-not-best, storico DB |
| Procurement compliance | Recovery | DONE | 85% | Control Center / Control Tower | Convenzionato e segnali; catalog purchasing da affinare |
| Supplier metrics | V1 | DONE | 100% | Metrics service, test | Puntualità, completezza, issue rate |
| Procurement Control Center | Recovery | DONE | 95% | Home Giulia | Attention-first e percorsi decisionali |
| Area dashboard | Recovery | DONE | 95% | Home Andrea | Eccezioni, budget, strutture e criticità scoped |
| RSA cockpit | Recovery | DONE | 95% | Home Lucia | Search-first, oggi, budget, frequenti, attività |
| Executive Control Tower | V1 | DONE | 90% | `/control-tower` | Quattro KPI, Top 3 rischi/opportunità e confronto organizzazioni |
| Audit / task signals | Recovery | DONE | 90% | AuditEvent, timeline | Eventi transazionali e attività recenti |
| Smart Import — upload e storage | AI-native | DONE | 100% | `/imports/new`, `SourceDocument`, `DocumentStorageProvider` | File originale, checksum, duplicati, limiti, MIME/estensione e storage Supabase privato scoped per organizzazione; adapter locale solo per test |
| Smart Import — parser XLSX | AI-native | DONE | 100% | `parser.ts`, fixture reali, test | Header non in riga 1, multi-sheet e provenienza cella |
| Smart Import — parser CSV/TSV | AI-native | DONE | 100% | `parser.ts`, fixture Italy-first, test | Virgola/punto e virgola/tab, quoted values e virgola decimale |
| Smart Import — PDF nativo | AI-native | DONE | 85% | fixture PDF reale, test | Estrazione testo e righe; tabelle PDF molto complesse richiedono estensione futura |
| Smart Import — Word | AI-native | IN PROGRESS | 75% | parser DOCX strutturale | Paragrafi/tabelle supportati; fixture browser dedicata non inclusa |
| Smart Import — immagini/PDF scanner | AI-native | IN PROGRESS | 25% | upload, stato failure onesto | Conservazione e guardrail presenti; OCR non disponibile senza provider reale |
| Smart Import — staging e mapping | AI-native | DONE | 95% | `ImportedRecord`, `ImportedFieldValue`, mapping UI | Raw/interpreted/normalized/human separati; correzione mapping rielabora lo staging |
| Smart Import — normalizzazione | AI-native | DONE | 100% | servizio canonico UOM/prezzi, test | Confezione ≠ unità di consumo; non confrontabile quando la conversione manca |
| Smart Import — product matching | AI-native | DONE | 90% | matching identifier-first, candidati spiegati | GTIN/SKU prevalgono sul testo; similarità semantica provider futuro |
| Smart Import — review umana | AI-native | DONE | 95% | review per eccezione, record three-way | Accetta, correggi, nuovo prodotto, ignora e non confrontabile con audit |
| Smart Import — publish | AI-native | DONE | 95% | transazione e test idempotenza | Nessuna scrittura canonica prima della conferma; versioning e provenienza offerta |
| Smart Import — variazioni e prezzi | AI-native | DONE | 90% | `/imports/[id]/changes` | Vecchio/nuovo normalizzato, pack change, nuovi/rimossi e migliore offerta |
| Smart Import — provider AI | AI-native | IN PROGRESS | 35% | provider abstraction, `LOCAL_HEURISTIC` | Nessun modello esterno configurato; UI dichiara “Interpretazione locale” |
| Smart Import — UX scalabile | AI-native hardening | DONE | 96% | work queue, paginazione, filtri, batch, 20 screenshot UX | Review by exception fino a migliaia di righe; resta desktop-primary |
| Smart Import — large import review | AI-native hardening | DONE | 95% | fixture/test 1.000 righe, query paginate | 25 righe per pagina; ricerca e sort server-side; queue asincrona futura |
| Smart Import — provider readiness | AI-native hardening | DONE | 85% | capability contract, env detection, evidence per campo | Vendor-neutral e data-residency esplicita; nessun adapter esterno attivo |
| M11 — procurement direttore operativo | Hardening | IN PROGRESS | 85% | lifecycle, allegati, limiti, condizioni commerciali, dataset rete | Workflow core molto esteso; accettazione finale resta subordinata al browser/visual audit completo e all’eliminazione di ogni gap corrente |
| Smart Import — provider document intelligence reale | AI-native future | NOT STARTED | 0% | fallback locale dichiarato | Nessuna credenziale o chiamata esterna configurata |
| Smart Import — OCR / vision reale | AI-native future | NOT STARTED | 0% | stato `REQUIRES_PROVIDER`, test | File conservato senza falsa estrazione o mutazione canonica |
| Smart Import — processing asincrono grandi file | AI-native future | NOT STARTED | 10% | stati job compatibili | Nessuna queue/worker introdotta nell’MVP |
| Automated product demo | Enablement | DONE | 100% | `scripts/video-demo`, `artifacts/video-demo`, `docs/VIDEO_DEMO.md` | Nove clip deterministici, manifest temporali, cue narration, readiness e validazione tecnica; separato dal Browser QA |
| Invoice matching | Future | NOT STARTED | 0% | Finance future-state | Fuori perimetro |
| Sourcing | Future | NOT STARTED | 0% | — | Fuori perimetro |
