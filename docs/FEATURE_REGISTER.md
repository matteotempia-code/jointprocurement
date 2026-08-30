# Feature register

Stima complessiva dell’MVP operativo: **84%**. Il denominatore comprende organizzazione/accesso, catalogo, ciclo buying, fornitori/categorie, qualità, intelligence e dashboard; esclude Smart Import, fatture e sourcing. Smart Import è valutato separatamente all’**82%**: il percorso XLSX/CSV è end-to-end, mentre OCR e provider AI reali non sono configurati. La stima considera correttezza, profondità, test e maturità UX, non la sola presenza delle route.

| Feature | Phase | Status | Completion | Evidence | Depth note |
| --- | --- | --- | ---: | --- | --- |
| Design system e UX coherence | Final polish | DONE | 92% | `design-system.css`, `STYLE_SYSTEM.md`, visual QA | Un solo entry CSS, token e responsive centralizzati; resta evolvibile senza nuova cascata |
| Organization model | Foundation | DONE | 100% | Prisma, Organizzazione | 2 organizzazioni, 4 entità, 6 aree, 18 strutture |
| Role / scope / authority | Foundation | DONE | 100% | Assignment, resolver, guard, test | ORGANIZATION / AREA / FACILITY server-side |
| Catalogo | Recovery | DONE | 95% | `/catalog` | 156 prodotti, filtri estesi, acquisto e convenzionato |
| Product 360 | Recovery | DONE | 95% | `/products/[id]` | Hero decisionale e disclosure progressiva per specifiche, storico, utilizzo, documenti e alternative |
| Confronto prodotti | Hardening | DONE | 90% | `/compare-products` | Side-by-side 2–4 con specifiche, prezzi normalizzati, documenti e utilizzo |
| Supplier 360 | Hardening | DONE | 92% | `/suppliers/[id]` | Dipendenza in apertura, trend, prezzo, termini, contatti, delivery e qualità con campione |
| Cart | V1 | DONE | 100% | `/cart`, Server Actions | Persistente, multi-fornitore, budget e policy preview |
| Budget | Recovery | DONE | 95% | `/budget` | Scope facility/area/org, forecast deterministico e breakdown |
| Requests | Recovery | DONE | 95% | `/richieste`, detail | Area dedicata, stati e timeline |
| Out-of-catalog request | Recovery | DONE | 90% | `/richieste#fuori-catalogo` | Persistenza e coda Procurement; conversione futura |
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
| Smart Import — upload e storage | AI-native | DONE | 100% | `/imports/new`, `SourceDocument` | File originale, checksum, duplicati, limiti, MIME/estensione e storage scoped |
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
| Smart Import — provider document intelligence reale | AI-native future | NOT STARTED | 0% | fallback locale dichiarato | Nessuna credenziale o chiamata esterna configurata |
| Smart Import — OCR / vision reale | AI-native future | NOT STARTED | 0% | stato `REQUIRES_PROVIDER`, test | File conservato senza falsa estrazione o mutazione canonica |
| Smart Import — processing asincrono grandi file | AI-native future | NOT STARTED | 10% | stati job compatibili | Nessuna queue/worker introdotta nell’MVP |
| Invoice matching | Future | NOT STARTED | 0% | Finance future-state | Fuori perimetro |
| Sourcing | Future | NOT STARTED | 0% | — | Fuori perimetro |
