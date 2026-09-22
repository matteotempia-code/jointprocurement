# Sorgence — registro canonico delle feature

Questo documento è l'unica fonte di verità per stato, completezza e roadmap del prodotto. Le percentuali seguono l'audit tecnico del 21 settembre 2026. Dove l'audit non assegna una misura, la completezza resta **da verificare**.

**Readiness complessiva MVP: 84%.** Il prodotto non è production-ready finché autenticazione, isolamento tenant e tutti i P0 elencati in questo registro non sono chiusi e certificati.

| Area / Feature | Status | Completezza | Cosa fa / cosa manca |
|---|---|---:|---|
| Organizzazione — anagrafiche, ruoli e scope | Funzionale, hardening necessario | ~90% | Modella organizzazioni, entità, aree, strutture, centri di costo, ruoli e deleghe. Mancano isolamento tenant completo e identità reale. |
| Authentication | Non implementata | 0% | L'identità corrente è una persona demo. Servono Supabase Auth, sessione firmata, middleware e route protette; il selettore persona deve esistere solo con `DEMO_MODE=true`. |
| Multi-tenant isolation | Non implementata | 0% | Lo scope applicativo è parziale. Mancano `organizationId` sulle anagrafiche condivise, scoping sistematico di letture/scritture, test cross-tenant e successivo disegno RLS. |
| Catalogo e Guided Buying | Funzionale, da stabilizzare | da verificare | Catalogo, ricerca, Product 360, preferiti, liste e carrello sono operativi. Restano scoping tenant, ordinamento DB e gestione errori. |
| Requisition, approval e PO | Funzionale, P0 aperti | da verificare | Copre richiesta, policy, approvazione, ordine e ricevimento. Restano IDOR conferma ordine, numbering concorrente e validazione input uniforme. |
| Procurement limits | Funzionale, P0 aperto | da verificare | Valuta limiti monetari e quantitativi. Mancano vincoli DB e validazione applicativa fail-fast delle configurazioni invalide. |
| Supplier e Category 360 | Funzionale | da verificare | Espone viste operative, prezzi, qualità e rischio. Mancano isolamento tenant e alcuni KPI corretti. |
| KPI Acquisti convenzionati | Non corretto | da verificare | Deve misurare la quota reale di spesa presso fornitori preferiti/contrattualizzati, non la percentuale di offerte marcate preferred. |
| Smart Import | Parzialmente funzionale | ~70% | Upload, parser, staging, review e publish esistono. Elaborazione ancora sincrona; mancano workflow durevole, chunk, retry, reaper e scalabilità affidabile a migliaia di righe. |
| Async Smart Import | Non implementata | da verificare | Deve riusare il workflow durevole dei documenti tecnici con job accodati, idempotenza, lease, retry, progress e transazioni per chunk. |
| Exact Product Matching | Funzionale, da certificare | da verificare | **Deterministic weighted matching** basato su identificatori e segnali verificabili. Non è una capability generativa. |
| Functional Equivalence | Funzionale, P0 aperto | da verificare | **Deterministic technical-rule engine** category-specific e spiegabile. Deve fallire chiuso quando le regole di categoria non esistono. |
| Missing Evidence Detection | Funzionale, P0 aperto | da verificare | **Deterministic rule** che identifica documenti e attributi mancanti. Deve impedire COMPLETE/approved senza evidenza valida. |
| M12 Product Intelligence | Sostanzialmente funzionale | ~96% | Ingestione, classificazione, associazione, profilo tecnico, versioni, code, equivalenza e Product 360 esistono. Restano fail-closed senza regole, OCR reale e chiusura della certificazione remota. |
| Procurement Memory | Persistita, non consumata | da verificare | Le correzioni e decisioni vengono scritte; la memoria confermata **non è ancora consumata dal matching di import**. |
| AI-assisted capabilities | Parziale | da verificare | Limitata a estrazione free-text di documenti tecnici, interpretazione SDS, pack/UOM irregolari, condizioni commerciali e spiegazione in linguaggio naturale di decisioni deterministiche. |
| AI evaluation quality | Non misurata | da verificare | Manca golden dataset da `ImportFieldCorrection`, `ProductMatchCandidate.humanDecision` e `ImportedFieldValue.humanValue`, comando `npm run eval` e baseline committed. Target: precision ≥0,98 e recall ≥0,85. |
| VAT deductibility / effective cost | Non implementata | da verificare | Manca la percentuale di detraibilità IVA per organizzazione e il costo effettivo: netto + quota IVA non detraibile. Confronti e saving sono oggi net-only. |
| Savings Management | Parziale, baseline non corretta | da verificare | Il saving non deve usare l'offerta massima. Baseline primaria: prezzo storicamente pagato per facility/organizzazione; stati richiesti IDENTIFIED, NEGOTIATED, CONTRACTED, REALIZED. |
| DDT | Non implementata | da verificare | Da registrare nel receiving e collegare a ordine e ricevimento. |
| Lot / expiry traceability | Non implementata | da verificare | Mancano lotto, scadenza e tracciabilità facility → receipt → lot. |
| Electronic invoicing / SDI | Non implementata | da verificare | Mancano import, conservazione e gestione dei flussi di fatturazione elettronica/SDI. |
| Three-way match | Non implementata | da verificare | Manca la riconciliazione PO ↔ receipt ↔ invoice e la gestione delle discrepanze. |
| Split payment / reverse charge | Non implementata | da verificare | Da modellare come capacità fiscale configurabile dove applicabile. |
| CIG/CUP | Non implementata | da verificare | Da modellare come capacità di dominio configurabile. |
| Document retention | Non implementata | da verificare | Mancano policy e prove di conservazione documentale. |
| Notifications | Non implementata | da verificare | Mancano notifiche operative persistenti e canali configurabili. |
| Onboarding / master data import | Non implementata | da verificare | Mancano import governati di organizzazioni, strutture, utenti, fornitori, categorie e prodotti. |
| User-facing error handling | Incompleta | da verificare | Molti errori restano generici o solo tecnici; servono messaggi azionabili senza perdita di stato. |
| Accessibility | Incompleta | da verificare | Serve audit WCAG, correzione sistematica di focus, label, contrasto, tastiera e annunci di stato. |
| Supplier Performance | Parziale | da verificare | Esistono dati di ordine/ricevimento/NC; scorecard e KPI formalizzati sono roadmap 6–12 mesi. |
| Limited Supplier Portal | Non implementata | da verificare | Perimetro futuro limitato a PO acknowledgement, ETA, disponibilità e documentazione tecnica. |
| CAPA / supplier quality collaboration | Differita | da verificare | Non rientra nella roadmap attiva prima della stabilizzazione core. |
| Assisted Spend Control | Differita | da verificare | Supporto assistito e governato; nessuna decisione autonoma. |
| AI Spend Copilot | Differito, read-only | da verificare | Deve essere read-only, citare obbligatoriamente fonti/evidenze e non prendere decisioni autonome. |
| Quadro design system | Direzione approvata, adozione parziale | da verificare | Direzione light-first, accent `#00696E`, Plus Jakarta Sans/Public Sans via `next/font`, minimo 12px e token Tailwind v4 `@theme`. Nessun rewrite UI nel ciclo di remediation. |

## Roadmap riallineata

### 0–3 mesi — Foundation / Correction

- autenticazione reale;
- isolamento tenant;
- equivalenza tecnica fail-closed;
- motore detraibilità IVA/costo effettivo;
- DDT;
- tracciabilità lotto/scadenza;
- notifiche;
- onboarding/import anagrafiche;
- architettura asincrona Smart Import.

### 3–6 mesi — Economic Cycle

- fattura elettronica / SDI;
- three-way match;
- Savings Management con baseline corretta.

### 6–12 mesi — Domain Differentiation

- aggregazione domanda tra strutture;
- RFQ strutturato;
- Supplier Performance;
- Supplier Portal limitato a PO acknowledgement, ETA, disponibilità e documentazione tecnica.

### Later

- CLM;
- Spend Analytics avanzata;
- Assisted Spend Control.

CAPA e collaborazione qualità fornitore completa sono differite. Reverse Auctions, Cards, Payments e SaaS Management non fanno parte della roadmap attiva.

## Regole di manutenzione

- Questo file è il solo registro canonico; documenti storici possono collegarlo ma non duplicarne percentuali o roadmap.
- `100%` richiede implementazione, persistenza, test e certificazione remota nel perimetro dichiarato.
- Le capability deterministiche non devono essere presentate come AI generativa.
- Non dichiarare production-ready finché tutti i P0 sono chiusi e la certificazione remota completa è PASS.
