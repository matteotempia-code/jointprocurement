# Smart Import

Smart Import trasforma documenti commerciali in staging verificabile e, soltanto dopo conferma umana, in listini e offerte canoniche.

## Pipeline

```text
SourceDocument
  → ImportJob
  → parsing deterministico
  → mapping colonne
  → ImportedRecord / ImportedFieldValue
  → normalizzazione UOM e prezzi
  → ProductMatchCandidate
  → revisione umana
  → publish transazionale
  → PriceList / SupplierOffer / analisi variazioni
```

Il file originale non viene sovrascritto. Retry e futura rielaborazione creano versioni di job sullo stesso documento.

## Formati supportati

| Formato | Strategia attuale | Stato |
| --- | --- | --- |
| XLSX | ExcelJS, header detection, fogli e celle | Completo per il percorso MVP |
| CSV / TSV / TXT | Delimitatore, quoted values, encoding UTF-8, decimal comma | Completo per il percorso MVP |
| PDF nativo | Estrazione testo, righe delimitate | Supportato; layout complessi possono richiedere review |
| DOCX | Mammoth, paragrafi e testo delle tabelle | Supporto strutturale iniziale |
| XLS legacy | File conservato, parser locale non disponibile | Richiede conversione o provider futuro |
| PDF scannerizzato / immagini | File conservato, nessun OCR locale configurato | Non interpretato automaticamente |

Dimensione massima: 8 MB. Estensione, MIME, nome e path vengono validati; macro e contenuto documento non vengono eseguiti.

## Parser strategy

La pipeline è deterministica dove possibile. XLSX rileva il foglio candidato, ignora fogli note senza record, individua header anche dopo righe titolo e conserva sheet/row/column. CSV è Italy-first: riconosce punto e virgola, virgola e tab e non confonde la virgola decimale con il separatore. PDF usa il testo nativo prima di qualunque OCR. DOCX usa l’ordine strutturale del documento.

## Mapping e interpretazione

`LocalHeuristicProvider` associa sinonimi commerciali a campi procurement (`Codice art.` → `supplierSku`, `Pz/conf` → `unitsPerPackage`, `Prezzo netto` → `netPrice`). È un provider locale deterministico, non un modello AI. L’utente può cambiare mapping; il sistema rilegge il file, ricrea lo staging e registra `COLUMN_MAPPING_CHANGED`.

Ogni campo mantiene quattro livelli:

- valore grezzo;
- valore interpretato;
- valore normalizzato;
- valore confermato/corretto da una persona.

## Normalizzazione

La pipeline riusa il servizio prezzi canonico. Purchase UOM, contenuto e consumption UOM restano distinti.

```text
2,50 € / confezione
100 pezzi / confezione
= 0,0250 € / pezzo
```

Sono normalizzati separatori decimali, valuta, IVA, percentuali, date, MOQ, unità e fattore confezione. Se la conversione manca, il record è “Non direttamente confrontabile” e non partecipa alla price intelligence.

## Matching

Segnali in ordine di autorità:

1. GTIN / EAN;
2. manufacturer SKU;
3. supplier SKU per lo stesso supplier;
4. descrizione normalizzata;
5. marca, formato e taglia;
6. package/UOM;
7. categoria.

Le classi sono `IDENTICAL`, `PROBABLE_MATCH`, `COMMERCIAL_SUBSTITUTE`, `FUNCTIONAL_EQUIVALENT` e `NEW_PRODUCT`. Ogni candidato conserva score, segnali e compatibilità. Packaging differente o identificatori discordanti non vengono accettati silenziosamente.

## Confidence

Sono distinti extraction, mapping, normalization e match confidence. Le soglie del matching sono conservative:

- alta: almeno 0,88, candidabile a conferma bulk;
- media: almeno 0,68, revisione individuale;
- da verificare: sotto 0,68 o con conflitto bloccante.

Un punteggio non conferisce autorità di publish. La confidence descrive evidenze, non certezza statistica di un modello.

## Provenance

XLSX conserva foglio, riga e colonna; CSV riga/colonna; PDF pagina/testo disponibile; Word paragrafo/tabella quando ricostruibile. `ImportedFieldValue` lega ogni campo al locator. `SupplierOffer` e `PriceList` pubblicati rimandano a `SourceDocument` e `ImportJob`, quindi dal prezzo è sempre possibile risalire all’originale e alle decisioni.

## Human review

La review è exception-first e permette di:

- accettare un candidato;
- correggere descrizione, prezzo e confezione;
- collegare un altro prodotto;
- confermare un nuovo prodotto con categoria esistente;
- segnare non confrontabile;
- ignorare consapevolmente.

Fornitori e categorie non vengono creati automaticamente. Correzioni, decisioni e attore sono auditati.

## Publish e versioning

Il publish è atomico e idempotente. Blocca se restano record `READY` o `NEEDS_REVIEW`, crea una nuova versione del listino, collega la versione precedente, disattiva le offerte precedenti senza cancellarle e crea le nuove offerte con snapshot normalizzati. Il convenzionamento viene ereditato soltanto per lo stesso supplier/prodotto.

Ripetere publish sullo stesso job restituisce lo stesso listino e non duplica offerte.

## Price intelligence

L’analisi usa sempre il prezzo normalizzato sulla stessa consumption UOM. Mostra vecchio/nuovo, delta assoluto e percentuale, packaging change, nuovi/rimossi, non confrontabili e posizione rispetto alla migliore offerta attiva. Un cambio da 100 pezzi a 200 pezzi non viene classificato dal solo prezzo confezione.

Opportunità economiche vengono quantificate soltanto quando esiste volume osservato; non vengono inventati saving annuali.

## Provider status

Non è configurato alcun provider AI/OCR esterno. `DocumentInterpretationProvider` rende possibile aggiungerne uno in futuro senza legare il dominio a OpenAI, Anthropic, Google o altri vendor. Oggi l’app usa parser deterministici e `LocalHeuristicProvider`, presentato esplicitamente come “Interpretazione locale”.

## Demo e test

`npm run demo:imports` rigenera quattro file reali in `demo-imports/`, inclusi due workbook Alfa Medical consecutivi. Il secondo contiene aumenti, riduzioni, un articolo rimosso, un nuovo prodotto e un cambio confezione.

I test coprono parser reali, mapping, normalizzazione, matching, non-comparabilità, package change, publish, idempotenza, provenance e audit. `npm run qa:browser` carica realmente entrambi i workbook e salva la review visiva in `artifacts/smart-import-review/`.

## Limiti e roadmap

- OCR per scansioni e immagini richiede un provider reale;
- XLS legacy richiede conversione o parser dedicato;
- PDF con tabelle graficamente complesse può richiedere mapping manuale;
- semantic similarity provider-backed non è attiva;
- processing asincrono/queue e storage object esterno sono evoluzioni future;
- correction memory viene registrata, ma non alimenta training automatico.

## Scalabilità e review by exception

La coda `/imports` separa il lavoro da svolgere dallo storico. Un job espone il numero di eccezioni reali (`NEEDS_REVIEW`) separatamente dalle proposte affidabili (`READY`): con 500 righe l’utente vede, per esempio, 462 proposte confermabili insieme e 38 decisioni individuali.

La review usa query server-side con pagine da 25 record, ricerca su SKU/descrizione/GTIN, filtri per tipo di eccezione e ordinamento per affidabilità, delta, prezzo, descrizione o stato. Nessuna pagina renderizza migliaia di righe nel DOM. Le azioni multiple hanno un limite di 100 selezioni e verificano nuovamente sul server compatibilità UOM, packaging, score e stato; i record incompatibili restano invariati. La conferma globale delle proposte affidabili applica gli stessi guardrail.

`ImportedRecord` conserva campi derivati e indicizzati per ricerca, filtro e price intelligence (`searchText`, `exceptionType`, `normalizedPriceValue`, `changeType`, delta e prezzi di confronto). Sono proiezioni di staging, non una seconda fonte canonica.

## Provider capabilities ed elaborazione esterna

Ogni `DocumentInterpretationProvider` dichiara capacità (`nativePdf`, `scannedPdf`, `images`, `tables`, `ocr`, `vision`, `structuredOutput`), versione modello, versione schema ed eventuale elaborazione esterna. La selezione parte da `DOCUMENT_INTELLIGENCE_PROVIDER`; in assenza di un adapter e di credenziali esplicite il runtime usa `LOCAL_HEURISTIC` senza inviare documenti all’esterno.

Il provider attivo è locale: tabelle e PDF nativi sì, OCR/vision no. Un’immagine o scansione viene conservata con stato `REQUIRES_PROVIDER`, zero record di staging e zero mutazioni canoniche. Non viene simulata alcuna estrazione. Una rielaborazione futura crea un nuovo `ImportJob` sullo stesso `SourceDocument`.

Ogni `ImportedFieldValue` registra provider, versione, schema e timestamp insieme a confidence e source locator. Questo consente a un adapter reale di produrre staging auditabile senza cambiare matching, review, provenance o publish.

## Price intelligence scalabile

Le variazioni sono classificate nello staging e interrogate per filtro/paginazione. La pagina apre con aumenti, riduzioni, nuovi articoli, cambi confezione e non confrontabili; mostra top variazioni e soltanto dopo la tabella completa. La soglia “variazioni rilevanti” è `|delta %| >= 5`, oppure un cambio confezione/nuovo/non confrontabile.

L’impatto osservato usa quantità realmente ordinate nei 12 mesi precedenti e differenza di prezzo normalizzata. È presentato come osservazione storica, mai come saving garantito o forecast annuale.
