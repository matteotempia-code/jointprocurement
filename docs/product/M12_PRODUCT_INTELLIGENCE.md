# M12 — Product Intelligence & Technical Evidence

## Principio

L'AI interpreta; il codice deterministico calcola; l'operatore governa l'incertezza. Un risultato tecnico senza evidenza sufficiente deve essere `INSUFFICIENT_EVIDENCE`, mai una equivalenza inventata.

## Architettura

`SourceDocument` resta il record immutabile del file e del locator Supabase Storage. Il dominio M12 separa lotto, famiglia documentale, versione, associazione prodotto, attributi normalizzati, requisiti per categoria, stato di completezza, valutazioni di equivalenza e lacune. Tutte le entità decisionali sono organization-scoped; prodotti e categorie continuano a usare il master condiviso M11.

Il caricamento accetta PDF testuali, DOCX, TXT, immagini e ZIP. Immagini e PDF senza testo vengono conservati e classificati `NEEDS_OCR`; M12 non simula OCR. Il browser acquisisce i file in chunk da cinque e avvia un Vercel Workflow senza attendere l'analisi. Ogni file è una `TechnicalDocumentBatchItem` persistita con lease, tentativi, errore e stato terminale. Il workflow elabora passi retryable con concorrenza massima tre: refresh, chiusura del browser o nuovo deployment non cancellano il lotto.

## Classificazione e associazione

La classificazione OpenAI usa output JSON validato e conserva provider, modello, confidenza ed evidenza. Il fallback locale riconosce tipi e attributi espliciti. L'associazione recupera prima memoria e identificatori deterministici; GTIN e SKU produttore esatti possono essere auto-confermati. Le proposte probabili richiedono review. Le soglie sono centralizzate in `TECHNICAL_MATCH_THRESHOLDS`.

Le decisioni umane sono ottimistiche/versionate: una conferma stale non sovrascrive una decisione concorrente. Un documento può essere collegato a più prodotti e un prodotto a più documenti.

## Profilo, completezza e conflitti

Gli attributi sono estensibili per chiave e preservano valore, normalizzazione, unità, versione documento, fonte, confidenza e review. Valori incompatibili non vengono sovrascritti: la completezza rileva il conflitto. I requisiti di categoria definiscono documenti, attributi, validità e criticità per equivalenza.

Gli stati sono `COMPLETE`, `INCOMPLETE`, `MISSING_EVIDENCE`, `EXPIRED_EVIDENCE`, `CONFLICTED` e `PENDING_REVIEW`. Le lacune diventano record strutturati con ragione e documento suggerito. Un prodotto con stato tecnico esplicito diverso da `COMPLETE` non è acquistabile per una nuova transazione; lo storico resta intatto. I prodotti M11 senza stato tecnico esplicito mantengono il comportamento certificato.

## Versioning e reassessment

Una nuova revisione crea una nuova versione e marca la precedente `SUPERSEDED`; non cancella mai l'evidenza storica. Solo versioni `READY` alimentano il profilo corrente. Associazione e conferma ricalcolano automaticamente completezza ed equivalenze collegate. Le valutazioni salvano un fingerprint: una decisione umana resta prioritaria finché il fingerprint coincide, poi diventa `STALE` e richiede nuova governance.

## Equivalenza

L'identità usa prima GTIN, SKU produttore e mapping verificati. L'equivalenza funzionale confronta esclusivamente gli attributi configurati come critici per la categoria. Gli esiti sono `IDENTICAL`, `FUNCTIONALLY_EQUIVALENT`, `NOT_EQUIVALENT`, `INSUFFICIENT_EVIDENCE`. Differenze critiche bloccano; attributi critici mancanti generano `MissingEvidenceItem`. Una proposta funzionale attraversa `AI_PROPOSED`/`REVIEW_REQUIRED`, quindi `HUMAN_APPROVED` o `HUMAN_REJECTED`; la motivazione, l'attore, il timestamp e il fingerprint deciso sono persistiti.

## Memoria ed economia comparabile

`ProcurementMemory` riusa associazioni documento-prodotto confermate e rifiutate ed equivalenze decise, sempre nel perimetro organizzativo. La memoria conserva l'entità sorgente e il fingerprint dell'evidenza; una revisione documentale materiale impedisce il riuso cieco.

`TechnicalSavingOpportunity` separa saving sullo stesso prodotto canonico, saving su equivalenza approvata e rifiuto economico per evidenza insufficiente. Prezzi e percentuali derivano esclusivamente da offerte attive con prezzo normalizzato. MOQ e condizioni commerciali restano visibili nel confronto esistente; nessun saving annuale viene calcolato senza un volume osservabile difendibile.

## UX

- `/technical-documents`: upload e control center.
- `/technical-documents/[id]`: originale, estrazione, versioni e review associazioni.
- `/technical-products`: prodotti con evidenza incompleta.
- `/technical-requirements`: regole per categoria.
- `/technical-compare`: matrice tecnica ed esito.
- Product 360: evidenze, profilo, lacune ed equivalenze.

## Limiti correnti

OCR, Supplier Portal, qualificazione fornitori, RFQ/RFP, CLM, invoice/AP, ERP e procurement autonomo sono esclusi. Gli archivi ZIP vengono espansi durante la fase di acquisizione; per archivi molto grandi il percorso preferito è selezionare i file originali, che vengono inviati in chunk. La certificazione remota M12 e le fixture complete restano il requisito per promuovere le righe del registro al 100%.
