# Feature register

Stima complessiva dell’MVP operativo: **84%**. Il denominatore comprende organizzazione/accesso, catalogo, ciclo buying, fornitori/categorie, qualità, intelligence e dashboard; esclude AI import, fatture e sourcing. La stima considera correttezza, profondità, test e maturità UX, non la sola presenza delle route.

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
| Smart AI Import | Future | NOT STARTED | 0% | — | Fuori perimetro |
| Invoice matching | Future | NOT STARTED | 0% | Finance future-state | Fuori perimetro |
| Sourcing | Future | NOT STARTED | 0% | — | Fuori perimetro |
