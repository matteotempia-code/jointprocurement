# Sorgence — Registro canonico delle feature

> **Fonte di verità prodotto.** Questo documento è il registro canonico delle feature di Sorgence e deve essere aggiornato ad ogni milestone che introduce, modifica, completa o certifica una feature.

Ultimo aggiornamento iniziale: 2026-09-06
Ultima revisione: **2026-09-22**, a seguito dell'audit tecnico del 21/09/2026.

> **Registro unico.** Questo file è l'unica fonte di verità sullo stato delle feature.
> `docs/FEATURE_REGISTER.md` rimanda qui e non contiene più stime proprie.
>
> **Come leggere le revisioni dell'audit.** Le righe modificate il 22/09/2026 portano la
> dicitura *audit 21/09/2026* e un riferimento `file:riga`. Ogni percentuale abbassata è
> verificabile aprendo quel file: se la verifica non regge, la riga va discussa e corretta,
> non accettata. Le righe **non** marcate mantengono la valutazione precedente e la loro
> evidenza originale: non sono state rimesse in discussione.

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
| M11.6 | External Demo Hardening & Certification | MIXED; demo readiness 92% |
| M11.7 | External Demo Closure | implementato; certificazione remota vincolata alla pipeline sullo SHA di release |
| M12 | Product Intelligence & Technical Evidence | 95% — implementato; certificazione remota ripetibile in corso |
| M13 | Supplier Collaboration Portal | concept approvato, da progettare/sviluppare |
| M14 | Sourcing & Reverse Auctions | concept approvato, da progettare/sviluppare |
| M15 | Supplier Performance & Continuous Improvement | concept approvato, da progettare/sviluppare |
| Post-M15 | Enterprise, Finance, ERP, Production hardening | backlog |

---

## A. Piattaforma, organizzazione e sicurezza

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| PLT-00 | **Autenticazione** | Verifica dell'identità di chi accede: password, sessione firmata, protezione delle route. | Core | **0%** | **Non esiste.** L'identità è il cookie `jpo-demo-user` con l'id utente in chiaro e non firmato (`src/lib/auth.ts:19-27`); nessuna password, sessione o middleware. `DEMO_MODE="false"` nasconde solo il selettore (`layout.tsx:19`), il cookie resta valido. PLT-11/12/13 presuppongono questa voce. — *audit 21/09/2026* |
| PLT-01 | Multi-tenant | Separazione di più clienti/organizzazioni sulla stessa piattaforma. | Core pre-M11 | **40%** | Gerarchia organizzativa solida, ma l'isolamento **non è realizzabile allo stato attuale**: `Supplier`, `Category`, `CanonicalProduct`, `PriceList`, `SupplierOffer` e `AuditEvent` non hanno `organizationId`. Control Tower legge tutti i tenant senza filtro (`control-tower/page.tsx:9-12`). Con due organizzazioni demo non si vede; alla terza un cliente vede i prezzi negoziati dell'altro. — *audit 21/09/2026* |
| PLT-02 | Multi-legal-entity | Gestione di più società giuridiche nello stesso tenant. | Core pre-M11 | 90% | Funzionale; manca hardening enterprise completo. |
| PLT-03 | Gerarchia organizzativa | Aree, strutture/facility e centri di costo. | Core pre-M11 / M11.7 | 100% | — |
| PLT-04 | Utenti e ruoli | Gestione utenti e ruoli procurement. | Core pre-M11 / M11.7 | 100% | — |
| PLT-05 | Scope autorizzativi | Accesso limitato per struttura, area, ruolo e funzione. | M11.5 | 95% | Direct-route authorization certificata; manca hardening enterprise finale. |
| PLT-06 | Deleghe | Delegare temporaneamente funzioni approvative. | Core pre-M11 / M11.7 | 100% | — |
| PLT-07 | Audit trail | Storico di azioni e transizioni. | Core pre-M11 | 85% | Presente nei flussi core; da uniformare in ogni dominio. Verificata almeno una lacuna: `acknowledgeOrder` non scriveva alcun evento. — *audit 21/09/2026* |
| PLT-08 | Platform Admin | Amministrazione globale della piattaforma. | Post-M15 | 20% | Architettura prevista, prodotto non completato. |
| PLT-09 | Tenant provisioning | Creazione/configurazione automatica di un nuovo cliente. | Post-M15 | 10% | Backlog. |
| PLT-10 | Organization Builder | Configurazione visuale della struttura organizzativa. | Post-M15 | 10% | Backlog. |
| PLT-11 | SSO | Accesso enterprise con identity provider aziendale. | Post-M15 | 0% | Non implementato. |
| PLT-12 | SCIM | Provisioning automatico utenti e gruppi. | Post-M15 | 0% | Non implementato. |
| PLT-13 | MFA enterprise | Autenticazione forte configurabile. | Post-M15 | 0% | Non implementato. |
| PLT-14 | RLS / isolamento tenant DB | Sicurezza dei dati anche a livello PostgreSQL. | Post-M15 | **10%** | RLS non è mai stata abilitata in alcuna migrazione (verificato su tutte). L'istinto di non attivarla alla cieca è corretto, ma il motivo è più radicale: **manca la colonna su cui scrivere la policy** (vedi PLT-01). Ordine obbligatorio: aggiungere `organizationId`, poi filtrare le query, poi RLS. — *audit 21/09/2026* |
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
| REQ-08 | Resubmission | Ripresentazione dopo chiarimento. | M11.5 | **60%** | **La policy non viene rivalutata.** Il richiedente può modificare le quantità e la pratica torna allo *stesso* approvatore (`buying-actions.ts`, `answerClarification`): una richiesta da 4.000 € può diventare da 60.000 € e restare su chi ha un limite di 20.000. Si chiude con il motore di transizioni. — *audit 21/09/2026* |
| REQ-09 | Rejection | Rifiuto motivato senza generazione PO. | M11.5 | 100% | — |
| REQ-10 | Approval inbox | Coda delle richieste da approvare. | M11.5 | 100% | — |
| REQ-11 | SLA approvazioni | Evidenza delle richieste in ritardo. | Core | 80% | Segnali presenti; escalation/notification complete future. |
| REQ-12 | Approval escalation | Escalation automatica al superamento degli SLA. | Future | 20% | Logica non completa. |
| POL-01 | Policy Engine | Valutazione automatica delle regole applicabili alla richiesta. | Core | **60%** | Funzionale e ben testato, ma **le soglie sono codice**: `areaManagerLimit: 20000` è cablato in `buying-actions.ts`, dentro `submitRequisition`. Cambiare una soglia richiede un rilascio, e due clienti con catene di delega diverse richiederebbero di duplicare la logica. Specifica di migrazione a regole-come-dati approvata il 22/09/2026. — *audit 21/09/2026* |
| POL-02 | Limiti procurement | Soglie operative per ruolo/importo. | M11.5 | **40%** | Il blocco funziona **solo su limiti ben configurati**. `ProcurementLimit` non impone che il campo del proprio `limitType` sia valorizzato: `Number(null)` produce `NaN` e ogni confronto con `NaN` è falso (`limits.ts:40`), quindi **un limite mal configurato non scatta mai e non segnala nulla**. Servono vincolo `CHECK` in database e guardia applicativa. — *audit 21/09/2026* |
| POL-03 | Budget blocking | Blocco quando il budget non consente l'acquisto. | M11.5 | 100% | — |
| POL-04 | Budget warning | Avviso di soglia senza bloccare la richiesta. | M11.6 | 80% | Esiste, ma il caso warning distinto deve essere certificato. |
| POL-05 | Policy explanation | Spiegazione del motivo di blocco/routing. | Core / Future | 70% | Presente parzialmente; explainability evoluta futura. |

## D. Ordini, ricevimento e qualità

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| ORD-01 | Generazione PO | Trasforma una requisition approvata in ordine. | M11.5 | 100% | — |
| ORD-02 | Numerazione PO | Identificativo univoco dell'ordine. | Core | **55%** | Univoco ma **non consecutivo**: per evitare collisioni si aggiunge un suffisso casuale ricavato dall'id della requisition (`orders.ts:8-9`). Per un documento fiscale italiano la consecutività è un requisito, non un dettaglio. Le serie `FC-` e `PR-` usano invece `count()+1`, che sotto concorrenza genera lo stesso numero e fa fallire la richiesta dell'utente; il contatore è globale mentre il prefisso è annuale, quindi al 1° gennaio non riparte. Serve una sequenza Postgres con reset annuale. — *audit 21/09/2026* |
| ORD-03 | PO lifecycle | Gestione stati ordine fino al ricevimento. | Core / M11.5 / M13 | 95% | Core certificato; supplier acknowledgment arriverà in M13. |
| ORD-04 | PO amendment | Modifica controllata dell'ordine emesso. | Future | 30% | Workflow non completo. |
| REC-01 | Ricevimento totale | Registrazione della consegna completa. | M11.5 | 100% | — |
| REC-02 | Ricevimento parziale | Registrazione di consegne parziali e completamento successivo. | M11.5 | 100% | — |
| REC-03 | Protezione duplicate receipt | Evita doppie registrazioni/collisioni di receipt. | M11.5 | 100% | — |
| REC-04 | Over-receipt protection | Impedisce ricevimento oltre la quantità ordinata. | M11.7 | 100% | — |
| REC-05 | Allegati ricevimento | Foto, POD e altri documenti collegati alla consegna. | M11.6 | 100% | — |
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
| BUD-04 | Warning budget | Alert di consumo senza blocco. | M11.6 | 100% | — |
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
| CAT-02 | Regole evidenze per categoria | Definisce quali documenti tecnici sono obbligatori per categoria. | M12 | 90% | Regole persistenti per documento/attributo, validità, criticità equivalenza e attivazione disponibili in UI. |

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
| IMP-12 | **Tenuta ai volumi reali** | Importare listini da migliaia di righe senza fallire. | M11.3 | **25%** | Il supporto dei formati è completo (IMP-01..04), ma l'architettura no: tutto gira in una server action sincrona, con matching O(righe × prodotti) in memoria e circa 3 query per riga dentro una transazione da 60 s; `publishImport` arriva a 5 query per record in una da 30 s. **Cede intorno alle 800 righe**, oltre va in rollback totale. Il test di scala esistente non esercita questo percorso: inserisce i record con `createMany` diretto. — *audit 21/09/2026* |
| IMP-13 | **Import asincrono e ripartibile** | Coda, chunk, lease, tentativi, ripresa e avanzamento visibile. | M11.3 | **0%** | Da costruire. **L'architettura corretta è già nel repository e funziona**: `src/workflows/technical-batch.ts` la usa per i documenti tecnici, con chunking, lease a token, `attempts` e ripresa idempotente. Va applicata agli import. — *audit 21/09/2026* |

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
| AI-09 | Functional equivalence | Determina equivalenza funzionale tra prodotti. | M12 | 90% | Motore deterministico category-specific con governance e fingerprint persistenti; certificazione 3/3 pendente. |
| AI-10 | Technical reasoning | Usa evidenze tecniche per confrontare prodotti. | M12 | 90% | Confronto basato su attributi critici e fonti versionate, senza affidarsi alla sola similarità. |
| AI-11 | Missing evidence | Identifica esattamente i dati/documenti mancanti per decidere. | M12 | 90% | Registra prodotto, confronto, documento/campo richiesto, motivo ed evidenza suggerita. |

## I. M12 — Product Intelligence & Technical Evidence

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| TECH-01 | Caricamento tecnico massivo | Acquisizione a chunk e analisi durevole di documenti in un lotto persistito. | M12 | 85% | Implementato; manca la prova remota del lotto da 100 documenti. |
| TECH-02 | Ingestione ZIP | Estrazione controllata di documenti supportati da un archivio ZIP. | M12 | 80% | Implementata; carichi ZIP grandi da certificare su Vercel. |
| TECH-03 | Classificazione AI documenti | Riconosce scheda tecnica, SDS, dichiarazioni, certificati e altri documenti. | M12 | 85% | Output strutturato e fallback presenti; prova OpenAI M12 remota pendente. **Attenzione:** i documenti immagine non vengono mai letti (nessun OCR, `parser.ts:8`) ma contano come lotto completato (`service.ts:34`): un fornitore che invia schede come fotografie risulta documentato senza esserlo. Vanno marcati `PENDING_REVIEW`/`NEEDS_OCR`. — *audit 21/09/2026* |
| TECH-04 | Associazione documento-prodotto | Associa automaticamente una scheda usando identificatori, memoria e candidati bounded. | M12 | 85% | Implementata; calibrazione e certificazione remota pendenti. |
| TECH-05 | Relazione molti-a-molti | Una scheda può coprire più SKU e un prodotto più documenti. | M12 | 90% | Modello e UX presenti; prova remota pendente. |
| TECH-06 | Confidenza associazione | Soglie centralizzate e spiegazione dell'evidenza usata. | M12 | 85% | Test locale presente; calibrazione fixture remota pendente. |
| TECH-07 | Revisione per eccezione | Conferma, rifiuto e scelta alternativa con protezione da decisioni stale. | M12 | 85% | Flusso presente; negative matrix remota pendente. |
| TECH-08 | Coda documenti non associati | Separa documenti da verificare, senza match, falliti e bisognosi di OCR. | M12 | 80% | Code presenti; distinzione unmatched da rifinire in UX. |
| TECH-09 | Profilo tecnico canonico | Attributi estensibili derivati da evidenze approvate e correnti. | M12 | 90% | Implementato e integrato in Product 360; prova remota pendente. |
| TECH-10 | Provenienza attributi | Ogni attributo mantiene documento, versione, fonte e confidenza. | M12 | 90% | Persistenza completa; apertura remota delle fonti da certificare. |
| TECH-11 | Completezza documentale | Calcola completezza, lacune, scadenze, conflitti e revisioni pendenti. | M12 | 85% | Motore presente; fixture remote pendenti. |
| TECH-12 | Requisiti per categoria | Regole organizzative data-driven per documenti e attributi critici. | M12 | 85% | Creazione e disattivazione presenti; aggiornamento avanzato escluso. |
| TECH-13 | Gate Procurement Approved | Blocca nuovi acquisti quando esiste uno stato tecnico esplicitamente incompleto. | M12 | 85% | Compatibilità M11 preservata; boundary remoto da certificare. |
| TECH-14 | Versionamento tecnico | Mantiene revisioni immutabili, corrente, superseded e validità. | M12 | 85% | Implementato; prova nuova revisione remota pendente. |
| TECH-15 | Identità esatta prodotto | Usa GTIN, SKU produttore e mapping verificati prima della semantica. | M12 | 80% | Motore deterministico presente; fixture multi-fornitore remota pendente. |
| TECH-16 | Equivalenza funzionale | Confronta attributi critici di categoria senza affidarsi alla sola similarità testuale. | M12 | **55%** | Motore e governance umana presenti, ma **il comportamento predefinito è fail-open**: se per la categoria non esistono `TechnicalEvidenceRequirement` configurati, **un solo attributo in comune** basta a dichiarare due prodotti `FUNCTIONALLY_EQUIVALENT` con confidenza 0,79 e a generare un'opportunità di risparmio (`engine.ts:47-52`). Su dispositivi medici in RSA il default va invertito in `INSUFFICIENT_EVIDENCE`. — *audit 21/09/2026* |
| TECH-17 | Evidenza insufficiente | Rifiuta l'equivalenza quando mancano dati tecnici critici. | M12 | 90% | Implementato e testato localmente; prova remota pendente. |
| TECH-18 | Evidenza mancante | Registra campo/documento mancante, motivazione e fonte suggerita. | M12 | 85% | Persistenza e UX presenti; richiesta esterna al fornitore esclusa. |
| TECH-19 | Rivalutazione automatica | Nuove evidenze aggiornano completezza, equivalenze e decisioni stale. | M12 | 85% | Fan-out implementato; prova durevole remota pendente. |
| TECH-20 | Matrice confronto tecnico | Mostra attributi comuni, differenze, blocchi, lacune e decisione. | M12 | 85% | UX e persistenza presenti; browser remoto pendente. |
| TECH-21 | Evidenze in Product 360 | Espone profilo, documenti, versioni, lacune ed equivalenze. | M12 | 85% | Implementato; verifica responsive remota pendente. |
| TECH-22 | Saving su identici/equivalenti | Persiste opportunità solo con prezzo normalizzato ed evidenza sufficiente. | M12 | 80% | Dominio implementato; fixture economiche remote pendenti. |

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
| MEM-03 | Technical association memory | Ricorda associazioni scheda ↔ prodotto. | M12 | 90% | Conferme e rifiuti persistono e alimentano la selezione dei candidati successivi. |
| MEM-04 | Equivalence memory | Ricorda equivalenze approvate o respinte. | M12 | 90% | Decisione, motivazione e fingerprint persistono e sono invalidati quando l'evidenza cambia. |
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

## M. M14 — Sourcing e gare

> **Revisione del 22/09/2026.** Le aste inverse sono state **rimosse dalla roadmap** e
> spostate nella sezione «Fuori perimetro» in fondo al documento, con la motivazione.
> Restano in roadmap le RFQ strutturate: per questo mercato sono più utili.

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| SRC-01 | RFQ | Richiesta strutturata di offerta. | M14 | 0% | Da sviluppare. |
| SRC-02 | Gara prodotti | Gara su prodotti/SKU specifici. | M14 | 0% | Da sviluppare. |
| SRC-03 | Invito fornitori | Selezione e invito di supplier qualificati. | M14 | 0% | Da sviluppare. |
| SRC-04 | Offerta supplier | Submission economica e tecnica. | M14 | 0% | Da sviluppare. |
| SRC-05 | Multi-round tender | Più round negoziali. | M14 | 0% | Da sviluppare. |
| SRC-09 | Ranking anonimo | Il fornitore conosce la posizione senza vedere competitor/offerte. | M14 | 0% | Da sviluppare. Mantenuto in roadmap perché si applica anche alle gare multi-round (`SRC-05`), non solo alle aste. — *decisione 22/09/2026* |
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
| DEM-01 | Demo personas | Sei utenti rappresentativi con scope differenti. | M11.7 | 100% | — |
| DEM-02 | Canonical demo path | Percorso demo deterministico del lifecycle. | M11.5 | 100% | — |
| DEM-03 | Remote demo suite | Test browser contro Vercel develop + Supabase DEV. | M11.5 | 100% | Tre run consecutive PASS. |
| DEM-04 | External demo certification | Certificazione per demo sicura verso prospect esterni. | M11.7 | 100% | — |
| DEM-05 | Demo data cleanliness | Dati credibili e privi di test junk nel percorso demo. | M11.7 | 100% | — |
| DEM-06 | External demo script | Percorso guidato da 10–15 minuti. | M11.7 | 100% | — |

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

## U. Conformità, economia e lacune rilevate dall'audit

Voci che **nessuna delle 63 precedenti nominava**. Ricerca esaustiva su `src/`: zero occorrenze di
fattura, SDI, DDT, lotto, scadenza, CIG, MDR, HACCP.

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| ECO-01 | **IVA indetraibile e costo effettivo** | Percentuale di detraibilità IVA per organizzazione; confronti e risparmi calcolati sul costo realmente sostenuto. | P0 | **0%** | Esiste un solo `taxRate` con default 22, e **tutti i confronti sono al netto**. Le cooperative sociali hanno IVA largamente indetraibile: per loro è costo pieno. Il sistema può quindi indicare come più conveniente un fornitore che costa di più. **Non è un modulo mancante: è un errore nel motore su cui si vende il prodotto.** — *audit 21/09/2026* |
| ECO-02 | **Baseline del risparmio** | Riferimento corretto per il calcolo del saving. | P0 | **20%** | Il risparmio usa come riferimento l'**offerta più cara** disponibile (`service.ts:163`): non il prezzo storicamente pagato, non la media. È un risparmio che si gonfia da solo e non regge una verifica del cliente. Servono baseline storica e stati `IDENTIFIED` / `NEGOTIATED` / `CONTRACTED` / `REALIZED`. — *audit 21/09/2026* |
| ECO-03 | KPI acquisti convenzionati | Quota di **spesa** su fornitori convenzionati. | Core | **30%** | Misura la percentuale di offerte marcate `preferred`, non la quota di spesa: sono grandezze diverse. **La funzione corretta esiste già in `kpis.ts:21-26` e non viene chiamata.** — *audit 21/09/2026* |
| CMP-01 | **Tracciabilità lotto e scadenza** | Lotto e scadenza registrati in ricezione, con risalita struttura → ricevimento → lotto. | P0 | **0%** | `ReceiptLine` contiene solo le quantità. In caso di richiamo di un lotto **è impossibile sapere in quale struttura è finito**. Obbligo di legge: MDR per i dispositivi medici, Reg. CE 178/2002 per gli alimentari. — *audit 21/09/2026* |
| CMP-02 | **DDT** | Documento di trasporto nel flusso di ricezione. | P0 | **0%** | Assente. È il documento su cui si basa la verifica fisica della consegna. — *audit 21/09/2026* |
| CMP-03 | Fatturazione elettronica / SDI | Ciclo passivo e integrazione con il Sistema di Interscambio. | 3-6 mesi | **0%** | Assente. Chiude il cerchio ordine-ricezione-fattura; senza, Spend Analytics e Cash Forecast lavorano su dati incompleti. — *audit 21/09/2026* |
| CMP-04 | Three-way match | Confronto PO / ricezione / fattura. | 3-6 mesi | **0%** | Da costruire dopo CMP-03. — *audit 21/09/2026* |
| CMP-05 | Regimi IVA speciali | Split payment e reverse charge. | Da valutare | **0%** | Frequenti per enti accreditati. — *audit 21/09/2026* |
| CMP-06 | CIG / CUP | Codici di tracciabilità per acquisti in convenzione o con ente pubblico. | Da valutare | **0%** | Obbligatori se anche un solo cliente opera come ente pubblico o accreditato. — *audit 21/09/2026* |
| CMP-07 | Conservazione sostitutiva | Conservazione a norma dei documenti fiscali. | Da valutare | **0%** | Assente. — *audit 21/09/2026* |
| UX-01 | **Messaggi d'errore all'utente** | L'utente legge il motivo reale del rifiuto. | P1 | **15%** | `error.tsx` riceve l'errore e **lo scarta**: i dodici messaggi delle azioni d'acquisto non arrivano mai. Il direttore legge un generico problema di connessione, e il pulsante riprova rilancia l'azione perdendo il modulo compilato. **Il pattern corretto esiste già in `imports/actions.ts:16-21`.** — *audit 21/09/2026* |
| UX-02 | **Accessibilità** | Navigazione da tastiera, contrasti, dimensioni leggibili. | P1 | **20%** | In 1.187 righe di CSS l'unica regola `:focus-visible` fa `outline:none`. Bordo dei campi a 1,36:1, grigio secondario a 3,43:1, testo fino a 7,5px. Rilevante anche per conformità AgID. — *audit 21/09/2026* |
| UX-03 | Riscontro sulle azioni brevi | Stato di attesa, conferma, contatore carrello. | P1 | **25%** | Sedici azioni su cinquantacinque non comunicano nulla. Aggiungi al carrello impiega fino a 600 ms senza disabilitare il pulsante: **al doppio clic la quantità si somma due volte**. Il carrello non ha contatore in nessun punto dell'applicazione. Vedi la regola di prodotto «Ogni attesa è spiegata e stimata» in fondo alla sezione. — *audit 21/09/2026* |
| UX-05 | **Avanzamento e stima sui lavori lunghi** | Ogni operazione oltre i 10 secondi dichiara il passo in corso, quanto ha fatto sul totale e una stima del tempo residuo. | P1 | **10%** | Esiste `ImportProgress` (`imports/[id]/page.tsx:71`) ma mostra solo uno stato testuale, non avanzamento né stima: l'import gira in una server action sincrona e l'utente attende col browser aperto senza sapere a che punto sia. Il lotto tecnico M12 espone i conteggi ma non una stima. Prerequisito: `IMP-13` import asincrono. — *decisione 23/09/2026* |
| UX-04 | Design system «Quadro» | Direzione visiva scelta il 22/09/2026: tema chiaro, accento `#00696E`, Plus Jakarta Sans + Public Sans, pavimento tipografico 12px. | Dopo P0 | **0%** | Da applicare. Stato attuale misurato: 29 dimensioni di testo distinte su 261 occorrenze, 46 colori letterali, 3 vocabolari di token coesistenti. Va imposta con token e lint, non adottata informalmente. — *audit 21/09/2026* |
| OPS-01 | **Notifiche** | Avvisi per approvazioni, consegne, anomalie e scadenze. | P0 | **0%** | Non esiste alcun sistema di notifica: **chi deve approvare non viene avvisato**. Il workflow autorizzativo dipende dal fatto che qualcuno apra la pagina. — *audit 21/09/2026* |
| OPS-02 | Onboarding / import anagrafiche | Caricamento iniziale di strutture, utenti e centri di costo. | P0 | **0%** | Assente: per un nuovo cliente è tutto manuale. — *audit 21/09/2026* |
| AI-Q1 | **Valutazione qualità IA** | Golden set, precision/recall, gate di regressione in CI. | Dopo P0 | **0%** | Nessun test sulla qualità delle risposte: solo verifiche che la chiamata non esploda. Cambiare modello oggi è non misurabile. **Le etichette esistono già nel database e vengono buttate via**: `ImportFieldCorrection` e `ProductMatchCandidate.humanDecision` sono coppie (predizione, verità corretta dall'umano). Serve uno script di export, non annotazione. — *audit 21/09/2026* |
| AI-Q2 | Procurement Memory ricollegata | La memoria confermata migliora il matching successivo. | Dopo P0 | **40%** | Scritta dagli import (`actions.ts:69`) ma **mai riletta** dagli import: `suggestMatches` non vi ha accesso. Il vantaggio competitivo dichiarato oggi non si materializza nel matching dei listini. — *audit 21/09/2026* |
| SEC-01 | Cifratura connessione database | TLS verificato verso PostgreSQL. | P0 | **0%** | Verificato sperimentalmente: `pg_stat_ssl` riporta `ssl = false`. La stringa di connessione non specifica `sslmode` e l'adapter non riceve configurazione TLS. Serve il certificato CA di Supabase, **non** `sslmode=no-verify`. — *audit 21/09/2026* |

---

### Regola di prodotto: ogni attesa è spiegata e stimata

Decisa il 23/09/2026. Vincolante per ogni operazione, presente e futura.

> **Quando il software impiega tempo, deve dire che cosa sta facendo e quanto stima
> di metterci. L'utente non deve mai guardare uno schermo che non spiega sé stesso.**

Tre soglie, tre comportamenti distinti:

| Durata | Obbligo |
|---|---|
| **fino a 1 s** | Il controllo si disabilita all'istante. Nessun indicatore necessario, ma il doppio invio dev'essere impossibile. |
| **1–10 s** | Stato di attesa che **nomina l'azione** in corso: «Invio della richiesta…», non «Attendere…». Il controllo resta disabilitato fino all'esito. |
| **oltre 10 s** | L'operazione diventa un lavoro di sfondo: l'utente può chiudere la pagina. Deve vedere il **passo corrente**, **quanto fatto sul totale** e una **stima del tempo residuo**. |

**Come si calcola la stima**, perché una stima fatta male costa più di nessuna stima:

1. **Non stimare prima di avere dati.** Finché non c'è un ritmo misurato si scrive «Preparazione…», non un numero inventato.
2. **La stima nasce dal ritmo osservato di questo lavoro**, non da una costante nel codice: righe al secondo degli ultimi blocchi completati. Un listino da un fornitore lento e uno da un fornitore veloce non impiegano lo stesso tempo.
3. **Mai arrivare a zero e continuare.** È il modo più rapido per far perdere fiducia in ogni stima successiva. Meglio arrotondare per eccesso e finire prima.
4. **Esprimere ordini di grandezza, non precisione falsa**: «circa 4 minuti», non «3 minuti e 47 secondi».
5. **In caso di errore, dire a che passo è successo e che fine fa il lavoro già svolto.** «Interrotto alla riga 3.200 di 5.000; le righe già elaborate sono conservate, puoi riprendere» è utilizzabile. «Operazione fallita» no.

**Dove si applica per prima**, in ordine di frequenza d'uso: aggiunta al carrello e invio richiesta (soglia 1–10 s); ricezione merce con allegati e import listini (oltre 10 s); lotto documenti tecnici M12, che oggi impiega circa 8 minuti e mezzo per cento documenti.

**Perché è una regola e non una preferenza:** gli utenti sono direttori di struttura che lavorano fra un turno e l'altro, su connessioni mediocri. Un'attesa non spiegata viene interpretata come un blocco, e la reazione è cliccare di nuovo — che oggi, sul carrello, raddoppia davvero la quantità ordinata.

---

## V. M11.5 — Impegni di architettura enterprise

Trasferita da `docs/FEATURE_REGISTER.md` il 22/09/2026 per eliminare la duplicazione.
Sono **impegni di architettura, non feature implementate**; le definizioni canoniche stanno in
`PRODUCT_VISION.md`, `DOMAIN_ARCHITECTURE_2.md` e `ADR/ADR-001-universal-procurement-orchestration.md`.

These are architecture commitments, not implemented features. Their canonical definitions are in `PRODUCT_VISION.md`, `DOMAIN_ARCHITECTURE_2.md`, and `ADR/ADR-001-universal-procurement-orchestration.md`.

| Feature | Fase | Stato | Completezza | Evidenza | Nota |
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

---

## W. Contratti, spesa governata e copilot

Voci decise il 22/09/2026 e non ancora presenti nel registro.

| ID | Feature | Descrizione | Milestone | % | Perché non è al 100% |
|---|---|---|---|---:|---|
| CLM-01 | Contract Lifecycle Management | Repository contratti, clausole, rinnovi, scadenze, obblighi e prezzi negoziati; collegamento fra contratto, ordine e fattura. | Oltre 12 mesi | **0%** | Non implementato e **non prioritario**: dipende da CMP-03 (fatture SDI) e CMP-04 (three-way match), senza i quali un contratto non è confrontabile con la spesa reale. Da riprendere dopo il ciclo economico. — *decisione 22/09/2026* |
| CLM-02 | Contract leakage | Acquisti effettuati fuori dalle condizioni negoziate, con quantificazione della perdita. | Oltre 12 mesi | **0%** | Dipende da CLM-01. Complementare a `ANA-05` maverick spend, che misura gli acquisti fuori processo anziché fuori prezzo. — *decisione 22/09/2026* |
| SPD-01 | **Assisted Spend Control** | Le regole deterministiche rilevano l'anomalia di spesa, l'IA la spiega, **l'umano decide**. | Oltre 12 mesi | **0%** | Sostituisce la voce "Autonomous Spend Control" della roadmap esterna. **La rinomina è una decisione di prodotto, non di stile:** il valore per il cliente è quasi identico — l'anomalia viene trovata comunque — mentre il rischio è di un ordine di grandezza inferiore. In questo dominio il caso peggiore non è l'agente che sbaglia clamorosamente, è quello che sbaglia in modo plausibile per settimane senza che nessuno se ne accorga; e una sostituzione prodotto sbagliata in una RSA non è un errore di spesa, è un evento avverso. — *decisione 22/09/2026* |
| SPD-02 | Spend intake unificato | Punto d'ingresso unico per qualsiasi richiesta di spesa, anche fuori catalogo, con instradamento automatico al processo corretto. | Oltre 12 mesi | **0%** | Concept della roadmap "Spending OS". Da riprendere solo dopo il consolidamento dei fondamentali: richiede autenticazione, isolamento tenant e ciclo economico chiusi. — *decisione 22/09/2026* |

### Vincoli di prodotto sul Copilot (sezione R)

Decisi il 22/09/2026 e vincolanti per tutte le voci `COP-*`:

- **Sola lettura.** Il copilot interroga e prepara; non crea, non modifica, non approva. Gli strumenti che agiscono **non vanno disabilitati con un flag: non vanno implementati.** In un sistema che muove denaro la differenza fra una porta chiusa a chiave e un muro conta.
- **Citazione obbligatoria delle fonti.** Ogni affermazione numerica riporta l'entità di origine (offerta, listino, documento). Una risposta senza fonti viene rifiutata dal validatore, non mostrata.
- **Scope imposto dal server.** `organizationId` arriva dal contesto server, mai dall'input del modello.
- **Documenti fornitore come dati non fidati.** I listini e le schede arrivano da terzi: vanno racchiusi in delimitatori espliciti e trattati come contenuto, mai come istruzioni.

---

## Fuori perimetro — decisioni di non fare

Funzionalità **valutate ed escluse**, con la data e il motivo. Non sono backlog: non vanno
riproposte senza che cambi una delle condizioni indicate.

Questa sezione esiste perché cancellare e basta fa perdere la decisione: senza memoria del
perché, una funzionalità scartata torna a proporsi da sola dopo qualche mese.

| Funzionalità | Decisione | Perché | Cosa la rimetterebbe in discussione |
|---|---|---|---|
| **Aste inverse** (già `SRC-06`, `SRC-07`, `SRC-08`) | Esclusa · 22/09/2026 | Presuppongono un parco fornitori ampio e intercambiabile. In ambito socio-sanitario i vincoli di equivalenza tecnica e di continuità di fornitura lo impediscono, e il meccanismo è culturalmente ostile al committente: un direttore non mette all'asta i guanti di una RSA. | Un cliente con categorie merceologiche realmente commodity e più di cinque fornitori qualificati per categoria. |
| **Meccaniche d'asta** (già `SRC-10` decremento minimo, `SRC-11` anti-sniping) | Esclusa · 22/09/2026 | Hanno significato solo dentro un'asta a tempo: rimosse le aste inverse, restavano orfane nella roadmap. `SRC-09` ranking anonimo resta invece, perché si applica anche alle gare multi-round. | Le stesse condizioni delle aste inverse. |
| **Cards** (carte fisiche/virtuali) | Esclusa · 22/09/2026 | È un prodotto finanziario: richiede licenze, compliance e un partner emittente. È un'altra azienda, non un'altra funzionalità. | Nessuna condizione prevedibile nell'orizzonte attuale. |
| **Payments** (disposizione pagamenti) | Esclusa · 22/09/2026 | Stessa natura di Cards. Disporre pagamenti espone a rischio e regolamentazione sproporzionati rispetto al valore aggiunto per il cliente. Il three-way match (`CMP-04`) porta comunque la spesa fino all'approvazione della fattura, che è il punto dove il valore si crea. | Nessuna condizione prevedibile nell'orizzonte attuale. |
| **SaaS Management** | Esclusa · 22/09/2026 | Inventario delle sottoscrizioni software: mercato, acquirente e problema diversi da quelli di una RSA. Era nella roadmap «Spending OS» per completezza di catalogo, non per domanda osservata. | Una richiesta esplicita da parte di un cliente esistente. |
| **CAPA / supplier quality collaboration completa** | **Rinviata**, non esclusa · 22/09/2026 | La gestione collaborativa delle azioni correttive con i fornitori è un modulo maturo, adatto a organizzazioni con una funzione qualità strutturata. Prematuro finché la gestione base delle non conformità non è consolidata. | Chiusura dei P0 e maturità della gestione NC interna. |
| **Autonomous Spend Control** | Sostituita · 22/09/2026 | Vedi `SPD-01` **Assisted Spend Control**: le regole rilevano, l'IA spiega, l'umano decide. Il valore per il cliente è quasi identico, il rischio è di un ordine di grandezza inferiore. | La rinomina è definitiva: non è una questione di nome ma di responsabilità sulle decisioni di spesa. |

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

## Aggiornamento M11.7

Il perimetro corrente include CRUD amministrativo autorizzato per organizzazione ed entità legali, utenti applicativi, deleghe, fornitori, prodotti e categorie; approvazione idempotente; blocco di offerte scadute e fornitori inattivi; ricezioni zero, negative o superiori al residuo; allegati di ricevimento e NC; budget warning. La pipeline Develop Cloud Certification è il gate autoritativo e deve restare verde su tre esecuzioni consecutive dello stesso SHA. Organization Builder, identity enterprise e provisioning tenant restano esclusi.
