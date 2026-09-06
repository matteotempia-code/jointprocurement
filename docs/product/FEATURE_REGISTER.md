# Sorgence — Registro canonico delle feature

> **Fonte di verità prodotto.** Questo documento è il registro canonico delle feature di Sorgence e deve essere aggiornato ad ogni milestone che introduce, modifica, completa o certifica una feature.

Ultimo aggiornamento iniziale: 2026-09-06

## Regole di avanzamento

- **0%** = idea approvata / backlog, nessuna implementazione sostanziale.
- **1–30%** = architettura, modello dati o primi componenti presenti.
- **31–60%** = implementazione parziale e/o non integrata nel flusso reale.
- **61–85%** = funziona nel flusso principale ma è incompleta o non pienamente certificata.
- **86–99%** = sostanzialmente pronta, persistente e funzionante, ma manca almeno una certificazione, edge case, hardening o parte secondaria.
- **100%** = implementata, collegata al flusso reale, persistente, testata e certificata sul cloud DEV nel perimetro definito.

Una feature **non può essere portata al 100% solo perché il codice esiste**.

## Stato milestone

| Milestone | Contenuto | Stato |
|---|---|---|
| Core pre-M11 | Procurement operativo di base | ~90% |
| M11.3 | Cloud / Smart Import recovery | sostanzialmente completata |
| M11.4 | Cloud-first architecture | ~90–95% |
| M11.5 | Remote Procurement Lifecycle & Persona Certification | MIXED; demo readiness 86% |
| M11.6 | External Demo Hardening & Certification | in corso |
| M12 | Product Intelligence & Technical Evidence | approvata, da sviluppare |
| M13 | Supplier Collaboration Portal | concept approvato, da progettare/sviluppare |
| M14 | Sourcing & Reverse Auctions | concept approvato, da progettare/sviluppare |
| M15 | Supplier Performance & Continuous Improvement | concept approvato, da progettare/sviluppare |
| Post-M15 | Enterprise, Finance, ERP, Production hardening | backlog |

---

## A. Piattaforma, organizzazione e sicurezza

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| PLT-01 | Multi-tenant | Separazione di più clienti/organizzazioni sulla stessa piattaforma. | Core pre-M11 | 70% | Modello organizzativo presente, ma isolamento enterprise/RLS non ancora chiuso. |
| PLT-02 | Multi-legal-entity | Gestione di più società giuridiche nello stesso tenant. | Core pre-M11 | 90% | Funzionale; manca hardening enterprise completo. |
| PLT-03 | Gerarchia organizzativa | Aree, strutture/facility e centri di costo. | Core pre-M11 | 95% | Funzionante; resta CRUD/admin completo da certificare. |
| PLT-04 | Utenti e ruoli | Gestione utenti e ruoli procurement. | Core pre-M11 / M11.5 | 90% | Sei personas certificate; amministrazione completa ancora parziale. |
| PLT-05 | Scope autorizzativi | Accesso limitato per struttura, area, ruolo e funzione. | M11.5 | 95% | Direct-route authorization certificata; manca hardening enterprise finale. |
| PLT-06 | Deleghe | Delegare temporaneamente funzioni approvative. | Core pre-M11 | 80% | Funzione presente, CRUD completo non ancora certificato. |
| PLT-07 | Audit trail | Storico di azioni e transizioni. | Core pre-M11 | 85% | Presente nei flussi core; da uniformare in ogni dominio. |
| PLT-08 | Platform Admin | Amministrazione globale della piattaforma. | Post-M15 | 20% | Architettura prevista, prodotto non completato. |
| PLT-09 | Tenant provisioning | Creazione/configurazione automatica di un nuovo cliente. | Post-M15 | 10% | Backlog. |
| PLT-10 | Organization Builder | Configurazione visuale della struttura organizzativa. | Post-M15 | 10% | Backlog. |
| PLT-11 | SSO | Accesso enterprise con identity provider aziendale. | Post-M15 | 0% | Non implementato. |
| PLT-12 | SCIM | Provisioning automatico utenti e gruppi. | Post-M15 | 0% | Non implementato. |
| PLT-13 | MFA enterprise | Autenticazione forte configurabile. | Post-M15 | 0% | Non implementato. |
| PLT-14 | RLS / isolamento tenant DB | Sicurezza dei dati anche a livello PostgreSQL. | Post-M15 | 20% | Supabase segnala RLS disabilitato sulle tabelle public; non va attivato senza disegno coerente con Prisma/server side. |
| PLT-15 | Separazione DEV/Preview/PROD | Isolamento completo di ambienti, dati e segreti. | M11.4 + Post-M15 | 65% | DEV funziona bene; Preview/Production isolation non chiusa. |
| PLT-16 | Cloud-first development | GitHub → Vercel → Supabase/OpenAI senza dipendenza dal PC. | M11.3–M11.5 | 95% | Flusso operativo; manca formalizzazione/hardening finale del bootstrap. |

## B. Catalogo e Guided Buying

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| BUY-01 | Catalogo prodotti | Catalogo acquistabile organizzato per prodotti e offerte. | Core pre-M11 | 95% | Certificato nei percorsi demo; resta rifinitura edge case. |
| BUY-02 | Ricerca prodotti | Ricerca nel catalogo. | Core pre-M11 | 80% | Operativa, ma non ancora semantic search evoluta. |
| BUY-03 | Filtri catalogo | Filtri per categoria, offerta e fornitore. | Core pre-M11 | 85% | Implementati nello scope corrente; manca hardening completo. |
| BUY-04 | Product 360 | Vista completa del prodotto. | Core / M11.5 / M12 | 90% | Core PASS; technical evidence avanzata arriverà in M12. |
| BUY-05 | Confronto offerte | Confronto tra offerte supplier sullo stesso prodotto. | Core / M12 | 85% | Funziona; manca equivalenza tecnica robusta M12. |
| BUY-06 | Preferiti | Salvataggio persistente dei prodotti preferiti. | M11.5 | 95% | Persistenza certificata; edge case completi M11.6. |
| BUY-07 | Liste acquisto | Liste personali/ricorrenti di prodotti. | M11.5 | 90% | Creazione e aggiunta persistenti; list-to-cart ed edge case da completare. |
| BUY-08 | Carrello | Carrello persistente con quantità e submission. | M11.5 | 95% | Core PASS; duplicate/empty-cart/row removal in M11.6. |
| BUY-09 | Richiesta fuori catalogo | Possibilità di richiedere un prodotto non presente. | Core pre-M11 | 65% | Modello presente, workflow non completamente certificato. |
| BUY-10 | Alternative suggerite | Suggerimento di prodotti alternativi/equivalenti. | M12 | 10% | Dipende dall'Equivalence Engine. |
| BUY-11 | Guided buying intelligente | Guida dinamica verso prodotto/fornitore migliore in base a policy, costo e qualità. | M12+ | 20% | Regole base presenti; intelligence semantica/tecnica ancora mancante. |

## C. Requisitions, policy e approvazioni

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| REQ-01 | Purchase Requisition | Creazione e gestione della richiesta d'acquisto. | Core / M11.5 | 100% | — |
| REQ-02 | Requisition multilinea | Più prodotti nella stessa richiesta. | Core | 90% | Implementata; non ogni combinazione è stata certificata. |
| REQ-03 | Draft | Salvataggio della richiesta in bozza. | Core | 90% | Presente; edge case da ampliare. |
| REQ-04 | Submit | Invio della richiesta. | M11.5 | 100% | — |
| REQ-05 | Auto-approval | Approvazione automatica quando le regole lo consentono. | M11.5 | 100% | — |
| REQ-06 | Approval required | Instradamento verso un approvatore. | M11.5 | 100% | — |
| REQ-07 | Clarification | Richiesta di chiarimenti. | M11.5 | 100% | — |
| REQ-08 | Resubmission | Ripresentazione dopo chiarimento. | M11.5 | 100% | — |
| REQ-09 | Rejection | Rifiuto motivato senza generazione PO. | M11.5 | 100% | — |
| REQ-10 | Approval inbox | Coda delle richieste da approvare. | M11.5 | 100% | — |
| REQ-11 | SLA approvazioni | Evidenza delle richieste in ritardo. | Core | 80% | Segnali presenti; escalation/notification complete future. |
| REQ-12 | Approval escalation | Escalation automatica al superamento degli SLA. | Future | 20% | Logica non completa. |
| POL-01 | Policy Engine | Valutazione automatica delle regole applicabili alla richiesta. | Core | 90% | Funzionale; rule builder/configurabilità avanzata mancanti. |
| POL-02 | Limiti procurement | Soglie operative per ruolo/importo. | M11.5 | 95% | Blocking PASS; amministrazione completa non finita. |
| POL-03 | Budget blocking | Blocco quando il budget non consente l'acquisto. | M11.5 | 100% | — |
| POL-04 | Budget warning | Avviso di soglia senza bloccare la richiesta. | M11.6 | 80% | Esiste, ma il caso warning distinto deve essere certificato. |
| POL-05 | Policy explanation | Spiegazione del motivo di blocco/routing. | Core / Future | 70% | Presente parzialmente; explainability evoluta futura. |

## D. Ordini, ricevimento e qualità

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| ORD-01 | Generazione PO | Trasforma una requisition approvata in ordine. | M11.5 | 100% | — |
| ORD-02 | Numerazione PO | Identificativo univoco dell'ordine. | Core | 95% | Funzionante; resta hardening generale. |
| ORD-03 | PO lifecycle | Gestione stati ordine fino al ricevimento. | Core / M11.5 / M13 | 95% | Core certificato; supplier acknowledgment arriverà in M13. |
| ORD-04 | PO amendment | Modifica controllata dell'ordine emesso. | Future | 30% | Workflow non completo. |
| REC-01 | Ricevimento totale | Registrazione della consegna completa. | M11.5 | 100% | — |
| REC-02 | Ricevimento parziale | Registrazione di consegne parziali e completamento successivo. | M11.5 | 100% | — |
| REC-03 | Protezione duplicate receipt | Evita doppie registrazioni/collisioni di receipt. | M11.5 | 100% | — |
| REC-04 | Over-receipt protection | Impedisce ricevimento oltre la quantità ordinata. | M11.6 | 80% | Da certificare nella negative matrix. |
| REC-05 | Allegati ricevimento | Foto, POD e altri documenti collegati alla consegna. | M11.6 | 70% | Infrastruttura presente; certificazione E2E da chiudere. |
| NC-01 | Non conformità | Apertura e gestione NC da ordine/ricevimento. | M11.5 | 95% | Core PASS; workflow collaborativo supplier arriverà dopo. |
| NC-02 | Evidence NC | Allegati e prove della non conformità. | M11.6 | 70% | Da certificare upload/storage/linkage. |
| NC-03 | Corrective action | Piano d'azione correttivo condiviso col fornitore. | M13/M15 | 20% | Da sviluppare col Supplier Portal. |
| NC-04 | Root cause | Analisi strutturata della causa della NC. | M15 | 10% | Prevista. |

## E. Budget e controllo economico

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| BUD-01 | Budget per struttura | Budget disponibile per facility. | Core | 95% | Funzionale; resta hardening/reporting. |
| BUD-02 | Budget per centro di costo | Allocazione per cost center. | Core | 80% | Modello presente; UX/reporting da ampliare. |
| BUD-03 | Commitment | Impegni derivanti da requisition/PO. | Core | 80% | Da uniformare nel lifecycle. |
| BUD-04 | Warning budget | Alert di consumo senza blocco. | M11.6 | 80% | Certificazione distinta mancante. |
| BUD-05 | Blocking budget | Blocco oltre la soglia prevista. | M11.5 | 100% | — |
| BUD-06 | Forecast budget | Proiezione del consumo futuro. | Future | 20% | Non implementata pienamente. |
| BUD-07 | Budget analytics | Drilldown e analisi dei consumi. | Core / Future | 60% | Dashboard base esistente. |

## F. Supplier 360 e Category 360

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| SUP-01 | Supplier 360 | Profilo completo del fornitore. | Core / M11.5 / M13–M15 | 85% | Mancano qualification, performance e collaboration. |
| SUP-02 | Anagrafica fornitore | Ragione sociale, PIVA, contatti e dati base. | Core | 90% | CRUD/admin da hardenizzare. |
| SUP-03 | Offerte fornitore | Prodotti/offerte associate al supplier. | Core | 95% | Core funzionante; resta intelligence evoluta. |
| SUP-04 | Listini | Storico dei listini del fornitore. | Core | 90% | Da integrare ulteriormente con M12/M13. |
| SUP-05 | Condizioni commerciali | Pagamento, MOQ, freight, lead time, sconti e condizioni. | Smart Import / M12 | 65% | AI interpreta, ma non tutti i campi sono pienamente operationalizzati. |
| CAT-01 | Category 360 | Vista di categoria con prodotti/fornitori e drilldown. | M11.5 | 85% | Strategia/analytics avanzate da aggiungere. |
| CAT-02 | Regole evidenze per categoria | Definisce quali documenti tecnici sono obbligatori per categoria. | M12 | 0% | Approvata, non implementata. |

## G. Smart Import e Document Intelligence

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| IMP-01 | Import XLSX | Importazione listini Excel. | Pre-M11 / M11.3 | 100% | — |
| IMP-02 | Import CSV | Importazione listini CSV. | M11.3 | 100% | — |
| IMP-03 | Import DOCX | Lettura documenti Word. | M11.3 | 100% | — |
| IMP-04 | PDF testuale | Lettura PDF con testo nativo. | M11.3 | 100% | — |
| IMP-05 | PDF scansione / OCR | Lettura documenti scansionati e immagini. | M12/Future | 10% | OCR/vision non implementati nel flusso corrente. |
| IMP-06 | Storage documenti | Persistenza originale dei documenti su Supabase Storage. | M11.3 | 100% | — |
| IMP-07 | Provenance | Tracciabilità dell'origine dei dati estratti. | M11.3 / M12 | 95% | Technical/attribute provenance si espande in M12. |
| IMP-08 | Review import | Revisione delle eccezioni di importazione. | M11.3 | 100% | — |
| IMP-09 | Correction | Correzione umana dei dati importati. | M11.3 | 100% | — |
| IMP-10 | Publication | Pubblicazione dei dati approvati. | M11.3 | 100% | — |
| IMP-11 | Price-list versioning | Gestione delle versioni successive dei listini. | Pre-M11 | 85% | Da integrare con intelligence tecnica e Supplier Portal. |

## H. Procurement AI V1

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| AI-01 | OpenAI integration | Utilizzo reale del provider OpenAI in DEV. | M11.3–M11.5 | 100% | — |
| AI-02 | AI telemetry | Traccia provider, modello, operazione, tempi ed esito. | M11.5 | 100% | — |
| AI-03 | Timeout e fallback | Timeout bounded e fallback locale in caso di errore/lentezza. | M11.5 | 100% | — |
| AI-04 | Supplier identification | Inferisce il fornitore dal documento. | Smart Import | 65% | Collegato ma non ancora completamente autonomo/robusto. |
| AI-05 | PIVA extraction | Estrae identificativi fiscali dal documento. | Smart Import | 40% | Schema presente; persistenza/UX non complete. |
| AI-06 | Commercial conditions | Estrae condizioni commerciali. | Smart Import / M12 | 60% | AI wired, ma alcuni risultati non sono ancora operationalizzati. |
| AI-07 | Row interpretation | Interpreta righe ambigue dei listini. | M11.5 | 90% | Certificata nello scope corrente; copertura non universale. |
| AI-08 | Semantic product matching | Matching semantico verso il prodotto canonico. | M12 | 20% | Non ancora collegato al normale workflow. |
| AI-09 | Functional equivalence | Determina equivalenza funzionale tra prodotti. | M12 | 5% | Da implementare. |
| AI-10 | Technical reasoning | Usa evidenze tecniche per confrontare prodotti. | M12 | 0% | Da implementare. |
| AI-11 | Missing evidence | Identifica esattamente i dati/documenti mancanti per decidere. | M12 | 0% | Da implementare. |

## I. M12 — Product Intelligence & Technical Evidence

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| TECH-01 | Upload tecnico massivo | Caricamento di centinaia/migliaia di schede/documenti in un batch. | M12 | 0% | Approvata, non iniziata. |
| TECH-02 | ZIP ingestion | Caricamento ed elaborazione di archivi con molti documenti. | M12 | 0% | Non iniziata. |
| TECH-03 | Classificazione AI documenti | Riconosce scheda tecnica, SDS, CE/DoC, certificazione, manuale, altro. | M12 | 0% | Non iniziata. |
| TECH-04 | Associazione documento-prodotto | Associa automaticamente una scheda al prodotto corretto. | M12 | 0% | Non iniziata. |
| TECH-05 | Relazione many-to-many | Una scheda può coprire più SKU e un prodotto può avere più documenti. | M12 | 0% | Modello dati da creare. |
| TECH-06 | Confidence associazione | Punteggio di affidabilità dell'associazione AI. | M12 | 0% | Da implementare. |
| TECH-07 | Review by exception | Porta all'utente solo associazioni dubbie. | M12 | 0% | Da implementare. |
| TECH-08 | Unmatched documents queue | Coda documenti che la AI non sa associare con sufficiente evidenza. | M12 | 0% | Da implementare. |
| TECH-09 | Profilo tecnico canonico | Specifiche strutturate del prodotto ricavate dalle evidenze. | M12 | 0% | Da implementare. |
| TECH-10 | Provenance degli attributi | Ogni specifica indica il documento/evidenza da cui deriva. | M12 | 0% | Da implementare. |
| TECH-11 | Completezza documentale | Stati complete/incomplete/missing/expired/pending review. | M12 | 0% | Da implementare. |
| TECH-12 | Requisiti per categoria | Documentazione minima diversa per categoria. | M12 | 0% | Da implementare. |
| TECH-13 | Procurement Approved gating | Un prodotto non diventa approvato senza evidenza minima richiesta. | M12 | 0% | Da implementare. |
| TECH-14 | Versioning tecnico | Revisioni correnti/storiche, superseded e validità. | M12 | 0% | Da implementare. |
| TECH-15 | Exact Product Matching | Determina se due offerte fanno riferimento allo stesso identico prodotto. | M12 | 10% | Esistono candidate/mapping, manca intelligence completa. |
| TECH-16 | Functional Equivalence | Determina equivalenza funzionale tra prodotti diversi. | M12 | 0% | Da implementare. |
| TECH-17 | Insufficient Evidence | Riconosce quando non esistono prove sufficienti per decidere. | M12 | 0% | Da implementare. |
| TECH-18 | Missing Evidence Request | Indica precisamente cosa manca per poter decidere. | M12 | 0% | Da implementare. |
| TECH-19 | Reassessment automatico | Nuova evidenza tecnica provoca rivalutazione di matching/equivalenza. | M12 | 0% | Da implementare. |
| TECH-20 | Matrice confronto tecnico | Confronto side-by-side delle specifiche di prodotti/offerte. | M12 | 0% | Da implementare. |
| TECH-21 | Technical Evidence in Product 360 | Tab dedicata alle evidenze tecniche del prodotto. | M12 | 0% | Da implementare. |
| TECH-22 | Saving su equivalenti | Collega equivalenza tecnica a Price Intelligence e saving. | M12 | 0% | Dipende dall'Equivalence Engine. |

### Regola di prodotto M12

Un prodotto selezionato/approvato non può essere considerato **tecnicamente completo** senza la documentazione minima richiesta dalla propria categoria.

Stati di equivalenza minimi:

- `IDENTICAL`
- `FUNCTIONALLY_EQUIVALENT`
- `NOT_EQUIVALENT`
- `INSUFFICIENT_EVIDENCE`

## J. Procurement Memory

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| MEM-01 | Memoria correzioni | Conserva decisioni e correzioni umane. | Pre-M12 | 50% | Persistenza esiste, riuso limitato. |
| MEM-02 | Product mapping memory | Riusa mapping di prodotto già confermati. | M12 | 30% | Prime associazioni persistono; motore di riuso incompleto. |
| MEM-03 | Technical association memory | Ricorda associazioni scheda ↔ prodotto. | M12 | 0% | Da sviluppare. |
| MEM-04 | Equivalence memory | Ricorda equivalenze approvate o respinte. | M12 | 0% | Da sviluppare. |
| MEM-05 | Confidence learning | Migliora la confidence usando le conferme storiche. | M12+ | 0% | Da progettare. |

## K. Price Intelligence

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| PRI-01 | Price history | Storico prezzi per prodotto e offerta. | Pre-M11 | 85% | Funzione presente; resta intelligence evoluta. |
| PRI-02 | Pack normalization | Confronta confezioni differenti. | M12 | 45% | Strutture presenti; normalizzazione intelligente incompleta. |
| PRI-03 | UOM normalization | Confronta prezzi su unità equivalenti. | M12 | 45% | Incompleta. |
| PRI-04 | Comparable price | Prezzo economicamente comparabile. | M12 | 40% | Dipende da pack/UOM e matching. |
| PRI-05 | Freight economics | Include trasporto e soglie franco porto. | M12 | 20% | Dati solo parzialmente estratti/operativi. |
| PRI-06 | Payment-term economics | Valore economico delle condizioni di pagamento. | Future | 10% | Non completo. |
| PRI-07 | TCO | Total Cost of Ownership. | M12+ | 10% | Da sviluppare. |
| PRI-08 | Saving opportunities | Identifica saving tra offerte e prodotti equivalenti. | M12 | 30% | Pricing presente; equivalence manca. |
| PRI-09 | Price increase alert | Evidenzia aumenti anomali. | Future | 20% | Storico disponibile; alert engine non completo. |

## L. M13 — Supplier Collaboration Portal

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| SCP-01 | Supplier Portal | Portale riservato ai fornitori. | M13 | 0% | Previsto, non iniziato. |
| SCP-02 | Supplier users | Più utenti per la stessa organizzazione fornitore. | M13 | 0% | Da sviluppare. |
| SCP-03 | Supplier Admin | Amministratore degli utenti e dati lato fornitore. | M13 | 0% | Da sviluppare. |
| SCP-04 | Qualificazione fornitore | Onboarding e mantenimento della qualifica. | M13 | 0% | Da sviluppare. |
| SCP-05 | Visura | Upload, lettura e aggiornamento della visura. | M13 | 0% | Da sviluppare. |
| SCP-06 | DURC | Upload, validità e scadenza DURC. | M13 | 0% | Da sviluppare. |
| SCP-07 | Bilanci | Deposito e futura analisi dei bilanci. | M13 | 0% | Da sviluppare. |
| SCP-08 | Certificazioni fornitore | ISO, assicurazioni, requisiti e altri documenti. | M13 | 0% | Da sviluppare. |
| SCP-09 | Qualification Health | Punteggio di completezza/conformità del fornitore. | M13 | 0% | Da sviluppare. |
| SCP-10 | Expiry reminders | Solleciti automatici per documenti in scadenza. | M13 | 0% | Da sviluppare. |
| SCP-11 | Listini self-service | Il fornitore carica/aggiorna i propri listini. | M13 | 0% | Da sviluppare. |
| SCP-12 | Schede tecniche self-service | Il fornitore mantiene schede e documentazione tecnica. | M13 | 0% | Usa l'infrastruttura M12. |
| SCP-13 | Specifiche prodotto supplier | Il fornitore compila/aggiorna le specifiche di prodotto. | M13 | 0% | Da sviluppare. |
| SCP-14 | Proposal staging | Le modifiche supplier diventano proposte sottoposte a verifica/approvazione. | M13 | 0% | Da sviluppare. |
| SCP-15 | PO acknowledgment | Conferma/rifiuto dell'ordine da parte del fornitore. | M13 | 0% | Da sviluppare. |
| SCP-16 | Availability update | Aggiornamento della disponibilità. | M13 | 0% | Da sviluppare. |
| SCP-17 | Delivery ETA | Data prevista di consegna comunicata dal supplier. | M13 | 0% | Da sviluppare. |
| SCP-18 | Delay notification | Segnalazione preventiva dei ritardi. | M13 | 0% | Da sviluppare. |
| SCP-19 | NC response | Risposta del fornitore alle non conformità. | M13 | 0% | Da sviluppare. |
| SCP-20 | Exception workspace | Workspace condiviso buyer-fornitore per ritardi, stock-out, NC, documenti e altri problemi. | M13 | 0% | Da sviluppare. |

### Governance Supplier Portal

Il principio è: **il fornitore propone e aggiorna; Sorgence interpreta e verifica; Procurement governa e approva.** Il supplier non modifica direttamente e senza controllo il catalogo canonico.

## M. M14 — Sourcing, gare e Reverse Auctions

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| SRC-01 | RFQ | Richiesta strutturata di offerta. | M14 | 0% | Da sviluppare. |
| SRC-02 | Gara prodotti | Gara su prodotti/SKU specifici. | M14 | 0% | Da sviluppare. |
| SRC-03 | Invito fornitori | Selezione e invito di supplier qualificati. | M14 | 0% | Da sviluppare. |
| SRC-04 | Offerta supplier | Submission economica e tecnica. | M14 | 0% | Da sviluppare. |
| SRC-05 | Multi-round tender | Più round negoziali. | M14 | 0% | Da sviluppare. |
| SRC-06 | Reverse auction | Asta competitiva al ribasso. | M14 | 0% | Da sviluppare. |
| SRC-07 | Auction per SKU | Competizione prodotto per prodotto. | M14 | 0% | Da sviluppare. |
| SRC-08 | Basket auction | Asta su paniere/categoria. | M14 | 0% | Da sviluppare. |
| SRC-09 | Ranking anonimo | Il fornitore conosce la posizione senza vedere competitor/offerte. | M14 | 0% | Da sviluppare. |
| SRC-10 | Minimum decrement | Riduzione minima tra offerte. | M14 | 0% | Da sviluppare. |
| SRC-11 | Anti-sniping | Estensione automatica a fronte di offerte last-minute. | M14 | 0% | Da sviluppare. |
| SRC-12 | Weighted scoring | Punteggio prezzo + qualità + SLA + logistica + altri fattori. | M14 | 0% | Da sviluppare. |
| SRC-13 | Adjusted Economic Score | Valore economico aggiustato per qualità, SLA, lead time, MOQ, freight, pagamento, rischio. | M14 | 0% | Da sviluppare. |
| SRC-14 | Improvement hint | Indica al supplier cosa deve migliorare per salire nel ranking senza svelare i concorrenti. | M14 | 0% | Da sviluppare. |
| SRC-15 | Award recommendation | Suggerimento AI di aggiudicazione spiegabile. | M14 | 0% | Da sviluppare. |
| SRC-16 | Split award | Aggiudicazione ripartita tra più supplier. | M14 | 0% | Da sviluppare. |

## N. M15 — Supplier Performance & Continuous Improvement

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| PERF-01 | Supplier Scorecard | Score complessivo di performance del fornitore. | M15 | 10% | Alcuni dati esistono, motore score non sviluppato. |
| PERF-02 | OTIF | KPI On Time In Full. | M15 | 20% | Dati ordine/ricevimento esistono; KPI non formalizzato. |
| PERF-03 | Fill rate | Percentuale quantità correttamente evase. | M15 | 20% | Dati disponibili; KPI non realizzato. |
| PERF-04 | NC rate | Incidenza delle non conformità. | M15 | 20% | Dati disponibili; KPI non formalizzato. |
| PERF-05 | Responsiveness | Tempi di risposta del supplier. | M15 | 0% | Richiede Supplier Portal. |
| PERF-06 | Price competitiveness | Competitività prezzi supplier. | M15 | 20% | Price Intelligence ancora parziale. |
| PERF-07 | Supplier tiers | Strategic / Preferred / Approved / Conditional / Suspended. | M15 | 0% | Da sviluppare. |
| PERF-08 | Corrective Action Plan | Piano strutturato di miglioramento. | M15 | 0% | Da sviluppare. |
| PERF-09 | KPI targets | Target di performance del supplier. | M15 | 0% | Da sviluppare. |
| PERF-10 | Forecast sharing | Condivisione controllata del forecast con il fornitore. | M15 | 0% | Da sviluppare. |
| PERF-11 | Capacity confirmation | Il fornitore conferma capacità produttiva/logistica futura. | M15 | 0% | Da sviluppare. |
| PERF-12 | Shortage risk | Evidenza preventiva del rischio di carenza. | M15 | 0% | Da sviluppare. |
| PERF-13 | Saving idea | Il fornitore propone opportunità di saving. | M15 | 0% | Da sviluppare. |
| PERF-14 | Alternative proposal | Il supplier propone un prodotto alternativo/equivalente, verificato con M12. | M15 | 0% | Dipende da M12. |

## O. Control Center, Executive e analytics

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| CTL-01 | Procurement Control Center | Centro operativo del Procurement con code, alert e drilldown. | M11.5 + future | 85% | Core PASS; future queue supplier/technical/sourcing da aggiungere. |
| CTL-02 | Executive Control Tower | Dashboard executive con KPI procurement. | M11.5 + future | 85% | Funziona; KPI M12–M15 non ancora presenti. |
| ANA-01 | Spend Analytics | Analisi multidimensionale della spesa. | Future | 40% | Alcuni dati/KPI esistono; spend cube completo assente. |
| ANA-02 | Savings Management | Gestione saving identificato, validato e realizzato. | Future | 15% | Da strutturare. |
| ANA-03 | Supplier concentration | Analisi dipendenza da pochi fornitori. | Future | 20% | Dati disponibili; intelligence non completa. |
| ANA-04 | Tail spend | Identificazione della spesa frammentata/non strategica. | Future | 10% | Non implementata. |
| ANA-05 | Maverick spend | Acquisti fuori policy/contratto. | Future | 10% | Non implementata. |
| ANA-06 | Cross-facility variance | Differenze di prezzo/condizioni tra strutture. | Future | 20% | Dati esistono; analisi non completa. |

## P. Risk Intelligence

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| RSK-01 | Supplier risk score | Punteggio complessivo di rischio supplier. | M15+ | 0% | Da sviluppare. |
| RSK-02 | Single-source risk | Evidenzia dipendenza da un unico fornitore. | M15+ | 10% | Dati disponibili; motore rischio assente. |
| RSK-03 | Qualification risk | Rischio dovuto a requisiti/documenti di qualifica mancanti. | M13/M15 | 0% | Dipende dal Supplier Portal. |
| RSK-04 | Document expiry risk | Rischio derivante da documenti in scadenza/scaduti. | M13 | 0% | Da sviluppare. |
| RSK-05 | Performance decline | Rileva peggioramenti di SLA/performance. | M15 | 0% | Da sviluppare. |
| RSK-06 | Price volatility | Rileva aumenti e volatilità prezzi. | Future | 20% | Storico prezzo presente; intelligence incompleta. |
| RSK-07 | Supply shortage risk | Previsione/indicazione di carenze future. | M15 | 0% | Da sviluppare. |

## Q. Finance e integrazioni

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| FIN-01 | Finance Controller | Vista Finance per controllo procurement. | M11.5 | 45% | Read-only; invoice/accounting reconciliation non operative. |
| FIN-02 | Invoice matching | Collegamento fattura ↔ PO. | Post-M15 | 0% | Non implementato. |
| FIN-03 | Three-way match | PO ↔ receipt ↔ invoice. | Post-M15 | 0% | Non implementato. |
| FIN-04 | Invoice discrepancy | Gestione differenze di fatturazione. | Post-M15 | 0% | Non implementato. |
| FIN-05 | Accounting export | Export verso contabilità. | Post-M15 | 0% | Non implementato. |
| ERP-01 | ERP Integration Hub | Layer per integrare sistemi gestionali. | Post-M15 | 10% | Architettura prevista. |
| ERP-02 | Supplier sync | Sincronizzazione anagrafiche fornitori. | Post-M15 | 0% | Da sviluppare. |
| ERP-03 | Product sync | Sincronizzazione prodotti. | Post-M15 | 0% | Da sviluppare. |
| ERP-04 | PO export | Invio ordini all'ERP. | Post-M15 | 0% | Da sviluppare. |
| ERP-05 | Receipt export | Invio ricezioni all'ERP. | Post-M15 | 0% | Da sviluppare. |
| ERP-06 | Invoice import | Ricezione fatture dall'ERP/contabilità. | Post-M15 | 0% | Da sviluppare. |

## R. AI Assistant / Procurement Copilot

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| COP-01 | Ricerca naturale | Interrogazione del procurement in linguaggio naturale. | Future | 15% | AI stack presente; experience non costruita. |
| COP-02 | Dove posso risparmiare? | AI identifica opportunità di saving. | M12+ | 10% | Dipende da matching, equivalence e pricing. |
| COP-03 | Perché è bloccato? | Spiegazione AI di policy/budget/limiti. | Future | 15% | Dati disponibili; UX non sviluppata. |
| COP-04 | Miglior supplier | Recommendation del fornitore migliore. | M14/M15 | 0% | Richiede score, performance e sourcing. |
| COP-05 | Prodotti equivalenti | Query conversazionale delle equivalenze. | M12 | 0% | Dipende dall'Equivalence Engine. |
| COP-06 | Suggested actions | AI propone azioni operative procurement. | Future | 5% | Da sviluppare. |

## S. Demo, QA e operabilità

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| DEM-01 | Demo personas | Sei utenti rappresentativi con scope differenti. | M11.5 | 95% | Marco Admin ancora parziale sul CRUD completo. |
| DEM-02 | Canonical demo path | Percorso demo deterministico del lifecycle. | M11.5 | 100% | — |
| DEM-03 | Remote demo suite | Test browser contro Vercel develop + Supabase DEV. | M11.5 | 100% | Tre run consecutive PASS. |
| DEM-04 | External demo certification | Certificazione per demo sicura verso prospect esterni. | M11.6 | 86% | Attachment, admin, warning ed edge matrix da chiudere. |
| DEM-05 | Demo data cleanliness | Dati credibili e privi di test junk nel percorso demo. | M11.6 | 80% | Hardening in corso. |
| DEM-06 | External demo script | Percorso guidato da 10–15 minuti. | M11.6 | 75% | Percorso definito; hardening finale da completare. |

## T. Future / advanced backlog

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| FUT-01 | Contract Management | Contratti supplier, condizioni, scadenze e documenti. | Future | 0% | Non ancora progettato in dettaglio. |
| FUT-02 | Contract compliance | Verifica acquisti rispetto alle condizioni contrattuali. | Future | 0% | Da sviluppare. |
| FUT-03 | Demand aggregation | Aggregazione della domanda tra strutture/legal entity. | Future | 5% | Concetto definito. |
| FUT-04 | Procurement planning | Piano acquisti futuro. | Future | 0% | Da sviluppare. |
| FUT-05 | Auto-sourcing | Generazione automatica di una gara da un bisogno aggregato. | Post-M14 | 0% | Da sviluppare. |
| FUT-06 | Negotiation Copilot | AI che supporta negoziazione e strategia supplier. | Post-M14 | 0% | Da sviluppare. |
| FUT-07 | Predictive price increase | Previsione di aumenti prezzo. | Future | 0% | Da sviluppare. |
| FUT-08 | Dynamic supplier allocation | Ottimizza quote/volumi tra supplier. | Future | 0% | Richiede performance, capacity e sourcing. |
| FUT-09 | Autonomous procurement | Azioni procurement autonome entro policy e controlli. | Future | 0% | Richiede governance, sicurezza e affidabilità molto superiori. |

---

## Direzione prodotto

La progressione funzionale di Sorgence è:

**BUY → CONTROL → UNDERSTAND PRODUCTS → QUALIFY SUPPLIERS → COLLABORATE → COMPETE → MEASURE → IMPROVE → SAVE**

Roadmap prodotto attualmente approvata:

1. **M11.6 — External Demo Hardening & Certification**
2. **M12 — Product Intelligence & Technical Evidence**
3. **M13 — Supplier Collaboration Portal**
4. **M14 — Sourcing & Reverse Auctions**
5. **M15 — Supplier Performance & Continuous Improvement**
6. **Post-M15 — Enterprise / Finance / ERP / Production hardening**

## Regola di manutenzione

Ogni milestone deve:

1. aggiornare le righe interessate in questo registro;
2. aggiungere eventuali nuove feature emerse durante il lavoro;
3. aggiornare percentuale e motivazione quando `<100%`;
4. non promuovere una feature al 100% senza prova di implementazione, persistenza, test e certificazione remota nel perimetro definito;
5. includere l'aggiornamento del registro nello stesso commit/PR della milestone o in un commit immediatamente collegato.
