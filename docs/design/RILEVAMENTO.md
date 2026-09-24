# Rilevamento completo dell’interfaccia Sorgence

**Data:** 24 settembre 2026  
**SHA osservato:** `9b49d4b249e504c0c93f686b817f1dc6bda9ac40`  
**Deployment:** `jointprocurement-idbx8c3qr-matteo-1633.vercel.app` (target `develop`)  
**Screenshot:** `C:\Users\MATTEO~1.TEM\AppData\Local\Temp\sorgence-rilevamento-9b49d4b\screenshots`  
**Totale screenshot:** **135**

## Metodo e limiti

Il deployment è protetto da Vercel SSO. Le pagine sono state richieste tramite il bypass autenticato della CLI Vercel, usando una cookie jar distinta per ciascun profilo e azionando la Server Action reale del selettore persona. HTML e CSS del deployment sono stati renderizzati a pagina intera con Playwright. Non sono stati modificati codice o dati applicativi.

Gli stati client che richiedono hydration e una mutazione Server Action non sono riproducibili in una pagina acquisita offline: in quei casi il verbale registra codice, markup e motivo per cui manca la fotografia. Le convalide HTML native, i disclosure, il focus e il comportamento ESC sono stati invece eseguiti nel browser. Le sonde fuori ruolo sono state verificate nella risposta come `NEXT_HTTP_ERROR_FALLBACK;404`.

## Correzione del verbale del passo 4

Le precedenti affermazioni “testi tagliati: 0” e “nessuna modifica di layout necessaria” erano errate. Nel catalogo:

- il filtro mostra “Tutte le categor” e il selettore persona “Responsabile strut”;
- le righe 3–5 mandano il blocco prezzo su tre righe e diventano alte circa 125 px, mentre le prime righe restano circa 98 px;
- il controllo automatico usato misurava overflow geometrico, ma non ellissi, troncamento semantico o wrapping.

Questi elementi sono prove per il redesign e non sono stati corretti.

## A. Pagine e profili

| Profilo             | Rotte di navigazione fotografate                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RSA_DIRECTOR        | `/`, `/catalog`, `/preferiti`, `/liste`, `/cart`, `/richieste`, `/orders`, `/consegne`, `/budget`, `/non-conformita`                                                |
| AREA_MANAGER        | `/`, `/approvals`, `/facilities`, `/budget`, `/consegne`, `/non-conformita`                                                                                         |
| PROCUREMENT_MANAGER | `/`, `/approvals`, `/products`, `/technical-documents`, `/categorie`, `/suppliers`, `/price-lists`, `/imports`, `/compare`, `/orders`, `/non-conformita`, `/budget` |
| PROCUREMENT_ADMIN   | `/`, `/organization`, `/users`, `/deleghe`, `/products`, `/technical-documents`, `/categorie`, `/suppliers`, `/imports`                                             |
| FINANCE_CONTROLLER  | `/`                                                                                                                                                                 |
| EXECUTIVE_SPONSOR   | `/control-tower`                                                                                                                                                    |

Dettagli reali fotografati: prodotto, fornitore, ordine, richiesta/approvazione, categoria, struttura, job import, listino e documento tecnico. Per Finance Controller ed Executive Sponsor sono state provate direttamente `/catalog`, Product 360, `/orders`, `/approvals` e `/imports`: tutte restituiscono 404 di ruolo/scope. La protezione è quindi effettiva e non solo una riduzione del menu.

Pagine vuote osservate: carrello RSA vuoto; nessuna consegna critica per Area Manager; archivio decisioni Procurement Manager vuoto; alcuni pannelli dettaglio senza problemi/equivalenze. Nessuna pagina di navigazione primaria ha restituito 500.

## B. Stati di interazione

### B1. Menu, popover e disclosure

Sono presenti **49** `<details>`. È stato acquisito uno stato con tutti i disclosure aperti per ogni pagina che ne contiene. Il catalogo usa un `details.product-actions-menu` che contiene un secondo `details.create-list-choice`; i form delle liste sono bottoni a larghezza piena. ESC non chiude i disclosure nativi. I filtri sono `<select>` nativi: il popup del sistema operativo non viene incluso negli screenshot headless; è fotografato il controllo focalizzato.

### B2. Errori visti dall’utente

| Caso                                     | Risultato osservato                                                                                                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quantità carrello 0                      | Validazione nativa del campo number; nessun errore applicativo persistente.                                                                                                               |
| Testo al posto del numero                | Il browser scarta le lettere e lascia il campo vuoto; nessuna spiegazione applicativa.                                                                                                    |
| Invio carrello vuoto                     | Il bottone di invio non è presente nello stato vuoto; il throw “Il carrello è vuoto” non è raggiungibile dalla UI.                                                                        |
| Richiesta senza motivazione obbligatoria | Il server lancia “La motivazione è obbligatoria per questa eccezione alla policy”; non esiste rendering inline dell’errore.                                                               |
| Rifiuto senza nota                       | Nessun errore inline; textarea non required. Il server lancia l’errore solo dopo submit.                                                                                                  |
| Lista con nome vuoto                     | Validazione browser `required`; nessun messaggio applicativo persistente.                                                                                                                 |
| Ricezione oltre l’ordinato               | La rotta di ricezione dell’ordine disponibile ha restituito 404 perché l’ordine non era più ricevibile; caso non fotografabile senza creare/modificare fixture. La guardia server esiste. |
| Chiarimento vuoto                        | Nessuna richiesta in stato adatto nel perimetro del profilo; il server lancia “Inserisci una risposta al chiarimento”; nessun componente errore inline.                                   |

I **12 throw** di `buying-actions.ts` confluiscono nell’error boundary generale, che dice soltanto “Non è stato possibile caricare questa area” e attribuisce il problema alla connessione dati. Per errori di input è un messaggio fuorviante e perde il testo specifico già disponibile sul server.

### B3. Stati vuoti

- Carrello: “Il carrello è vuoto” con ritorno al catalogo.
- Consegne Area Manager: “Nessuna consegna in questa coda”.
- Approvazioni/archivio: assenza di decisioni resa come sezione vuota.
- Import senza record e prodotto senza offerte: non presenti nei dati correnti; non sono state create fixture per il rilevamento.
- Ricerca senza risultati, preferiti e liste completamente vuoti: i dati del profilo non permettono lo stato senza modifica; documentati come non fotografabili sul DEV condiviso.

### B4. Attesa

| Azione                 | Riscontro attuale                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Aggiungi al carrello   | Nessun `useFormStatus`, `pending` o `aria-busy`: entro 300 ms non è definito alcun cambiamento visivo.           |
| Invia richiesta        | Nessuno stato pending dedicato nel form di acquisto.                                                             |
| Import listino         | Il bottone cambia in “Caricamento e lettura…” e viene disabilitato; non mostra passo, conteggio, stima o uscita. |
| Ricezione con allegati | Upload sequenziale lato server; nessun componente di avanzamento/pending nella pagina.                           |
| Documenti tecnici      | Il bottone cambia in “Elaborazione lotto…”, ma la scheda di lavoro lunga dipende dal job persistito.             |

### B5. Tastiera

Il focus è visibile, ma per raggiungere i controlli principali bisogna attraversare selettore persona, ricerca globale e tutta la navigazione. I primi screenshot focali originariamente puntavano ancora alla shell: questo è un dato di ordine di tabulazione, non una prova del controllo target. I `details` non si chiudono con ESC. Non esiste gestione uniforme di focus trap o ritorno del focus perché l’unico dialog progettato è quello di pubblicazione import.

### B6. Telefono

Sono state fotografate le home dei sei profili, catalogo, carrello, approvazioni, Product 360 e confronto a 390 px. Il catalogo diventa una lunga sequenza verticale; il confronto prezzi conserva decine di record in una sola colonna molto densa; i rettangoli immagine vuoti restano presenti. Il menu laterale è collassato dietro il pulsante hamburger.

## C. Percorsi e carico di interazione

I conteggi includono click su navigazione/azioni e caricamenti o revalidation percepibili; la digitazione non è contata come click.

| Percorso                                              | Click minimi | Pagine/caricamenti | Punti di esitazione                                                                                                            |
| ----------------------------------------------------- | -----------: | -----------------: | ------------------------------------------------------------------------------------------------------------------------------ |
| C1 RSA: trova prodotto → carrello → richiesta         |            5 |                  4 | Differenza tra prezzo confezione e normalizzato; azione “Altre azioni” compete con “Aggiungi”.                                 |
| C2 RSA: riordina acquisto del mese scorso             |            5 |                  4 | Nessun ingresso “acquisti del mese scorso”; bisogna indovinare tra Liste, Ordini e scorciatoia “Acquisto ricorrente?”.         |
| C3 Area: approva richiesta                            |            3 |                  3 | KPI e coda portano alla stessa area ma con priorità non immediata.                                                             |
| C4 Area: chiarimento → decisione                      |     almeno 7 |           almeno 6 | Richiede cambio profilo per la risposta e ritorno manuale alla stessa richiesta.                                               |
| C5 Procurement: carica → rivedi → pubblica listino    |     almeno 6 |           almeno 5 | “Listini” e “Importazioni” sono due ingressi concorrenti; pubblicazione usa l’unico dialog reale.                              |
| C6 Procurement: alternativa equivalente più economica |            4 |                  4 | Confronto prezzo, Product 360 ed equivalenza tecnica sono superfici separate; l’utente deve capire quale prova è determinante. |
| C7 RSA: consegna parziale + non conformità + foto     |     almeno 6 |           almeno 5 | La rotta receive dipende dallo stato dell’ordine; nessun ordine corrente fotografabile era ricevibile.                         |

Non sono state eseguite mutazioni sui dati DEV. I passi di ogni percorso sono rappresentati dagli screenshot base delle rotte coinvolte; quando il passo richiedeva una transizione irreversibile o una fixture assente, il punto è dichiarato sopra.

### Screenshot per passo dei percorsi

| Percorso | Passo                          | Screenshot                                                                                                             |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| C1       | Home                           | `RSA_DIRECTOR--home--base--chiaro--1440.png`                                                                           |
| C1       | Ricerca e catalogo             | `RSA_DIRECTOR--catalog--base--chiaro--1440.png`                                                                        |
| C1       | Prodotto                       | `RSA_DIRECTOR--products-cert_m11_lifecycle_product_normal--base--chiaro--1440.png`                                     |
| C1       | Carrello / invio               | `RSA_DIRECTOR--cart--base--chiaro--1440.png`                                                                           |
| C2       | Home                           | `RSA_DIRECTOR--home--base--chiaro--1440.png`                                                                           |
| C2       | Ordini precedenti              | `RSA_DIRECTOR--orders--base--chiaro--1440.png`                                                                         |
| C2       | Dettaglio ordine               | `RSA_DIRECTOR--orders-cmtm1w1hv0cxs14l9w6nms3sl--base--chiaro--1440.png`                                               |
| C2       | Liste ricorrenti               | `RSA_DIRECTOR--liste--base--chiaro--1440.png`                                                                          |
| C2       | Carrello                       | `RSA_DIRECTOR--cart--base--chiaro--1440.png`                                                                           |
| C3       | Home area                      | `AREA_MANAGER--home--base--chiaro--1440.png`                                                                           |
| C3       | Coda                           | `AREA_MANAGER--approvals--base--chiaro--1440.png`                                                                      |
| C3       | Decisione                      | `AREA_MANAGER--approvals-cmtm1w5080d4d14l9bna15pji--base--chiaro--1440.png`                                            |
| C4       | Richiesta e nota               | `AREA_MANAGER--approvals-cmtm1w5080d4d14l9bna15pji--base--chiaro--1440.png`                                            |
| C4       | Rifiuto/chiarimento senza nota | `AREA_MANAGER--approvals-dettaglio--rifiuto-senza-nota--chiaro--1440.png`                                              |
| C4       | Risposta richiedente           | Non fotografabile: nessuna richiesta DEV era nello stato `CLARIFICATION_REQUESTED` per Lucia.                          |
| C5       | Centro di controllo            | `PROCUREMENT_MANAGER--home--base--chiaro--1440.png`                                                                    |
| C5       | Importazioni                   | `PROCUREMENT_MANAGER--imports--base--chiaro--1440.png`                                                                 |
| C5       | Caricamento                    | `PROCUREMENT_MANAGER--imports-new--base--chiaro--1440.png`                                                             |
| C5       | Revisione job reale            | `PROCUREMENT_MANAGER--imports-cmtomrspj000004l68lxbqiya--base--chiaro--1440.png`                                       |
| C5       | Pubblicazione                  | Non fotografabile senza mutare il job DEV; il dialog è inventariato in `src/components/import-publish-confirm.tsx:25`. |
| C6       | Centro di controllo            | `PROCUREMENT_MANAGER--home--base--chiaro--1440.png`                                                                    |
| C6       | Confronto                      | `PROCUREMENT_MANAGER--compare--base--chiaro--1440.png`                                                                 |
| C6       | Product 360                    | `PROCUREMENT_MANAGER--products-cmtm1tz0y012j14l9utjtqp05--base--chiaro--1440.png`                                      |
| C6       | Equivalenze aperte             | `PROCUREMENT_MANAGER--products-cmtm1tz0y012j14l9utjtqp05--disclosure-aperti--chiaro--1440.png`                         |
| C7       | Consegne                       | `RSA_DIRECTOR--consegne--base--chiaro--1440.png`                                                                       |
| C7       | Ordine                         | `RSA_DIRECTOR--orders-cmtm1w1hv0cxs14l9w6nms3sl--base--chiaro--1440.png`                                               |
| C7       | Ricezione                      | `RSA_DIRECTOR--orders-cmtm1w1hv0cxs14l9w6nms3sl-receive--base--chiaro--1440.png` (404: ordine non ricevibile).         |
| C7       | Quantità oltre ordinato        | `RSA_DIRECTOR--orders-ricezione--quantita-superiore--chiaro--1440.png` (stesso 404; nessun form disponibile).          |

## D. Inventario dei componenti di interazione

| Tipo                             | Occorrenze | File e righe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ---------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form nativi                      |         90 | `src/app/approvals/page.tsx:95`, `src/app/approvals/[id]/page.tsx:275`, `src/app/cart/page.tsx:268`, `src/app/cart/page.tsx:285`, `src/app/cart/page.tsx:293`, `src/app/cart/page.tsx:394`, `src/app/cart/page.tsx:409`, `src/app/catalog/page.tsx:117`, `src/app/catalog/page.tsx:217`, `src/app/catalog/page.tsx:231`, `src/app/categorie/page.tsx:29`, `src/app/categorie/page.tsx:71`, `src/app/compare/page.tsx:46`, `src/app/consegne/page.tsx:105`, `src/app/deleghe/page.tsx:41`, `src/app/deleghe/page.tsx:104`, `src/app/facilities/page.tsx:68`, `src/app/imports/page.tsx:170`, …                                                                                                        |
| Bottoni nativi                   |        112 | `src/app/approvals/page.tsx:100`, `src/app/approvals/[id]/page.tsx:294`, `src/app/approvals/[id]/page.tsx:302`, `src/app/approvals/[id]/page.tsx:310`, `src/app/cart/page.tsx:277`, `src/app/cart/page.tsx:287`, `src/app/cart/page.tsx:295`, `src/app/cart/page.tsx:411`, `src/app/cart/page.tsx:427`, `src/app/catalog/page.tsx:149`, `src/app/catalog/page.tsx:219`, `src/app/catalog/page.tsx:240`, `src/app/categorie/page.tsx:39`, `src/app/categorie/page.tsx:81`, `src/app/categorie/page.tsx:84`, `src/app/compare/page.tsx:48`, `src/app/consegne/page.tsx:107`, `src/app/deleghe/page.tsx:71`, …                                                                                          |
| Input nativi                     |        151 | `src/app/approvals/[id]/page.tsx:276`, `src/app/cart/page.tsx:269`, `src/app/cart/page.tsx:270`, `src/app/cart/page.tsx:286`, `src/app/cart/page.tsx:294`, `src/app/cart/page.tsx:404`, `src/app/cart/page.tsx:410`, `src/app/catalog/page.tsx:141`, `src/app/catalog/page.tsx:218`, `src/app/catalog/page.tsx:232`, `src/app/catalog/page.tsx:233`, `src/app/categorie/page.tsx:30`, `src/app/categorie/page.tsx:33`, `src/app/categorie/page.tsx:37`, `src/app/categorie/page.tsx:72`, `src/app/categorie/page.tsx:75`, `src/app/categorie/page.tsx:79`, `src/app/consegne/page.tsx:106`, …                                                                                                        |
| Select nativi                    |         48 | `src/app/approvals/page.tsx:96`, `src/app/catalog/page.tsx:119`, `src/app/catalog/page.tsx:127`, `src/app/catalog/page.tsx:135`, `src/app/deleghe/page.tsx:45`, `src/app/deleghe/page.tsx:55`, `src/app/imports/page.tsx:172`, `src/app/imports/page.tsx:180`, `src/app/imports/page.tsx:188`, `src/app/imports/[id]/changes/page.tsx:401`, `src/app/imports/[id]/mapping/page.tsx:122`, `src/app/imports/[id]/page.tsx:304`, `src/app/imports/[id]/page.tsx:518`, `src/app/imports/[id]/page.tsx:526`, `src/app/imports/[id]/page.tsx:542`, `src/app/imports/[id]/page.tsx:549`, `src/app/imports/[id]/records/[recordId]/page.tsx:361`, `src/app/imports/[id]/records/[recordId]/page.tsx:371`, …  |
| Textarea native                  |          8 | `src/app/approvals/[id]/page.tsx:279`, `src/app/cart/page.tsx:397`, `src/app/orders/[id]/receive/page.tsx:186`, `src/app/requisitions/[id]/page.tsx:130`, `src/app/requisitions/[id]/page.tsx:134`, `src/app/richieste/page.tsx:58`, `src/app/richieste/page.tsx:89`, `src/components/import-upload-form.tsx:62`                                                                                                                                                                                                                                                                                                                                                                                     |
| Disclosure `<details>/<summary>` |         49 | `src/app/approvals/page.tsx:172`, `src/app/approvals/[id]/page.tsx:255`, `src/app/cart/page.tsx:199`, `src/app/cart/page.tsx:344`, `src/app/cart/page.tsx:407`, `src/app/categorie/page.tsx:69`, `src/app/consegne/page.tsx:127`, `src/app/deleghe/page.tsx:102`, `src/app/facilities/[id]/page.tsx:107`, `src/app/facilities/[id]/page.tsx:146`, `src/app/facilities/[id]/page.tsx:171`, `src/app/imports/[id]/page.tsx:263`, `src/app/imports/[id]/page.tsx:323`, `src/app/imports/[id]/page.tsx:360`, `src/app/imports/[id]/page.tsx:388`, `src/app/imports/[id]/page.tsx:711`, `src/app/imports/[id]/records/[recordId]/page.tsx:293`, `src/app/imports/[id]/records/[recordId]/page.tsx:321`, … |
| Tabelle HTML reali               |          1 | `src/components/ui.tsx:230`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Dialog HTML reali                |          1 | `src/components/import-publish-confirm.tsx:25`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Esiste un solo `<table>` reale, nel componente condiviso `src/components/ui.tsx:230`; le altre tabelle sono griglie/div con markup specifico. Esiste un solo `<dialog>`, per la conferma di pubblicazione import. Menu e accordion sono quasi interamente `<details>`; i filtri sono `<select>` nativi; le azioni sono spesso form server separati. Le principali varianti di bottone osservate sono: nessuna classe, `primary-cta`, `secondary-cta`, `danger-button`, `danger-secondary`, `text-button`, `icon-button` e summary stilizzati come CTA. La stessa azione secondaria appare quindi come bottone neutro, link, summary o form a piena larghezza secondo la pagina.

## E. Dati strutturali

### Form renderizzati

I conteggi includono i due form persistenti della shell (persona e ricerca globale).

| Profilo             | Rotta                                                | Form | Campi visibili | Obbligatori | Precompilati |
| ------------------- | ---------------------------------------------------- | ---: | -------------: | ----------: | -----------: |
| RSA_DIRECTOR        | `/`                                                  |    6 |              3 |           0 |            1 |
| RSA_DIRECTOR        | `/catalog`                                           |   43 |             23 |           8 |           11 |
| RSA_DIRECTOR        | `/preferiti`                                         |   62 |             26 |          12 |           13 |
| RSA_DIRECTOR        | `/liste`                                             |    7 |              4 |           1 |            1 |
| RSA_DIRECTOR        | `/cart`                                              |    2 |              2 |           0 |            1 |
| RSA_DIRECTOR        | `/richieste`                                         |    3 |              9 |           2 |            2 |
| RSA_DIRECTOR        | `/orders`                                            |    3 |              4 |           0 |            1 |
| RSA_DIRECTOR        | `/consegne`                                          |   27 |              2 |           0 |            1 |
| RSA_DIRECTOR        | `/budget`                                            |    2 |              2 |           0 |            1 |
| RSA_DIRECTOR        | `/non-conformita`                                    |    3 |              4 |           0 |            1 |
| RSA_DIRECTOR        | `/products/cert_m11_lifecycle_product_normal`        |    7 |              4 |           1 |            2 |
| RSA_DIRECTOR        | `/orders/cmtm1w1hv0cxs14l9w6nms3sl`                  |    5 |              2 |           0 |            1 |
| RSA_DIRECTOR        | `/requisitions/e7a36b43-2582-4b9f-91c2-77b499faf4b2` |    2 |              2 |           0 |            1 |
| AREA_MANAGER        | `/`                                                  |    2 |              2 |           0 |            1 |
| AREA_MANAGER        | `/approvals`                                         |    3 |              3 |           0 |            2 |
| AREA_MANAGER        | `/facilities`                                        |    3 |              3 |           0 |            1 |
| AREA_MANAGER        | `/budget`                                            |    2 |              2 |           0 |            1 |
| AREA_MANAGER        | `/consegne`                                          |   42 |              2 |           0 |            1 |
| AREA_MANAGER        | `/non-conformita`                                    |    3 |              4 |           0 |            1 |
| AREA_MANAGER        | `/orders/cmtm1vm730c7t14l9d0n5gela`                  |    2 |              2 |           0 |            1 |
| AREA_MANAGER        | `/approvals/cmtm1w5080d4d14l9bna15pji`               |    3 |              3 |           0 |            1 |
| AREA_MANAGER        | `/facilities/cmtm1tth5000c14l9w693azxi`              |    2 |              2 |           0 |            1 |
| PROCUREMENT_MANAGER | `/`                                                  |    2 |              2 |           0 |            1 |
| PROCUREMENT_MANAGER | `/approvals`                                         |    3 |              3 |           0 |            2 |
| PROCUREMENT_MANAGER | `/products`                                          |    3 |              4 |           0 |            1 |
| PROCUREMENT_MANAGER | `/technical-documents`                               |    4 |              4 |           1 |            2 |
| PROCUREMENT_MANAGER | `/categorie`                                         |    2 |              2 |           0 |            1 |
| PROCUREMENT_MANAGER | `/suppliers`                                         |    3 |              4 |           0 |            2 |
| PROCUREMENT_MANAGER | `/price-lists`                                       |    3 |              4 |           0 |            2 |
| PROCUREMENT_MANAGER | `/imports`                                           |    3 |              5 |           0 |            1 |
| PROCUREMENT_MANAGER | `/compare`                                           |    3 |              3 |           0 |            1 |
| PROCUREMENT_MANAGER | `/orders`                                            |    3 |              4 |           0 |            1 |
| PROCUREMENT_MANAGER | `/non-conformita`                                    |   21 |             76 |           0 |           37 |
| PROCUREMENT_MANAGER | `/budget`                                            |    2 |              2 |           0 |            1 |
| PROCUREMENT_MANAGER | `/products/cmtm1tz0y012j14l9utjtqp05`                |    2 |              2 |           0 |            1 |
| PROCUREMENT_MANAGER | `/suppliers/cmtm1tuf8007914l934w4l2d8`               |    2 |              2 |           0 |            1 |
| PROCUREMENT_MANAGER | `/orders/cmtm1vmqa0c8v14l91hl3tzrl`                  |    3 |              3 |           0 |            2 |
| PROCUREMENT_MANAGER | `/categorie/cmtm1tuu1009314l92o2bd26w`               |    2 |              2 |           0 |            1 |
| PROCUREMENT_MANAGER | `/imports/new`                                       |    3 |              6 |           1 |            2 |
| PROCUREMENT_MANAGER | `/price-lists/cmufnp7yb000n04l2xedfmnxw`             |    8 |              3 |           0 |            1 |
| PROCUREMENT_MANAGER | `/technical-documents/cmufoml1600rv04jwtmmv3uo6`     |    3 |              3 |           1 |            1 |
| PROCUREMENT_ADMIN   | `/`                                                  |    2 |              2 |           0 |            1 |
| PROCUREMENT_ADMIN   | `/organization`                                      |    6 |              6 |           4 |            4 |
| PROCUREMENT_ADMIN   | `/users`                                             |   10 |             39 |          14 |           30 |
| PROCUREMENT_ADMIN   | `/deleghe`                                           |    4 |              8 |           4 |            5 |
| PROCUREMENT_ADMIN   | `/products`                                          |   24 |             67 |          21 |           63 |
| PROCUREMENT_ADMIN   | `/technical-documents`                               |    4 |              4 |           1 |            2 |
| PROCUREMENT_ADMIN   | `/categorie`                                         |   17 |             32 |          30 |           29 |
| PROCUREMENT_ADMIN   | `/suppliers`                                         |   24 |             67 |          21 |           61 |
| PROCUREMENT_ADMIN   | `/imports`                                           |    3 |              5 |           0 |            1 |
| PROCUREMENT_ADMIN   | `/products/cmtm1tz0y012j14l9utjtqp05`                |    2 |              2 |           0 |            1 |
| PROCUREMENT_ADMIN   | `/suppliers/cmtm1tuf8007914l934w4l2d8`               |    2 |              2 |           0 |            1 |
| PROCUREMENT_ADMIN   | `/categorie/cmtm1tuu1009314l92o2bd26w`               |    2 |              2 |           0 |            1 |
| PROCUREMENT_ADMIN   | `/facilities/cmtm1ttk8000y14l9masgjwob`              |    2 |              2 |           0 |            1 |
| PROCUREMENT_ADMIN   | `/imports/new`                                       |    3 |              6 |           1 |            2 |
| PROCUREMENT_ADMIN   | `/technical-documents/cmufoml1600rv04jwtmmv3uo6`     |    3 |              3 |           1 |            1 |
| FINANCE_CONTROLLER  | `/`                                                  |    2 |              2 |           0 |            1 |
| FINANCE_CONTROLLER  | `/catalog`                                           |    2 |              2 |           0 |            1 |
| FINANCE_CONTROLLER  | `/products/cmtm1tz0y012j14l9utjtqp05`                |    2 |              2 |           0 |            1 |
| FINANCE_CONTROLLER  | `/orders`                                            |    2 |              2 |           0 |            1 |
| FINANCE_CONTROLLER  | `/approvals`                                         |    2 |              2 |           0 |            1 |
| FINANCE_CONTROLLER  | `/imports`                                           |    2 |              2 |           0 |            1 |
| EXECUTIVE_SPONSOR   | `/control-tower`                                     |    2 |              2 |           0 |            1 |
| EXECUTIVE_SPONSOR   | `/catalog`                                           |    2 |              2 |           0 |            1 |
| EXECUTIVE_SPONSOR   | `/products/cmtm1tz0y012j14l9utjtqp05`                |    2 |              2 |           0 |            1 |
| EXECUTIVE_SPONSOR   | `/orders`                                            |    2 |              2 |           0 |            1 |
| EXECUTIVE_SPONSOR   | `/approvals`                                         |    2 |              2 |           0 |            1 |
| EXECUTIVE_SPONSOR   | `/imports`                                           |    2 |              2 |           0 |            1 |

### Elenchi e paginazione

- Catalogo: 8 righe, pagina 1 di 98, 783 prodotti.
- Ordini RSA: pagina 1 di 3, 59 ordini nel filtro.
- Confronto prezzi: pagina 1 di 66 sul mobile acquisito.
- Liste, preferiti, richieste, approvazioni, fornitori, categorie, import e listini usano strutture e paginazioni diverse; solo alcune passano dal componente DataTable.
- La diversità del markup rende impossibile applicare una sola regola di colonna, focus o stato vuoto senza prima unificare gli archetipi.

### Testi corrotti nel sorgente

- src/app/compare/page.tsx:67 — `{offer.preferred ? " Â· convenzionato" : ""}`
- src/app/compare/page.tsx:78 — `/ unitÃ  normalizzata`
- src/app/control-tower/page.tsx:80 — `description="Valore, affidabilitÃƒÂ  e rischi in una lettura di 30 secondi."`
- src/app/control-tower/page.tsx:86 — `label="OpportunitÃƒÂ  osservata"`
- src/app/control-tower/page.tsx:93 — `detail={\`${overdue} ritardi Ã‚Â· ${issues} problemi\`}`
- src/app/control-tower/page.tsx:100 — `<p className="eyebrow">Top 3 opportunitÃƒÂ </p>`
- src/app/control-tower/page.tsx:134 — `<small>Non conformitÃƒÂ  operative</small>`
- src/app/products/[id]/page.tsx:181 — `Il prodotto non Ã¨ approvato per nuovi acquisti: completa o verifica le evidenze tecniche`
- src/app/products/[id]/page.tsx:201 — `{product.category.name} Â· {product.subcategory}`
- src/app/products/[id]/page.tsx:217 — `<dt>UnitÃ  dâ€™acquisto</dt>`
- src/app/products/[id]/page.tsx:231 — `<strong>{preferredPrice ? formatMoney(preferredPrice.purchasePrice) : "â€”"}</strong>`
- src/app/products/[id]/page.tsx:239 — `<small>Consegna stimata: {selectedOffer?.leadTimeDays ?? "â€”"} giorni</small>`
- src/app/products/[id]/page.tsx:245 — `QuantitÃ`
- src/app/products/[id]/page.tsx:276 — `<span>DisponibilitÃ </span>`
- src/app/products/[id]/page.tsx:278 — `<small>Consegna in {selectedOffer?.leadTimeDays ?? "â€”"} giorni</small>`
- src/app/products/[id]/page.tsx:285 — `: "â€”"}`
- src/app/products/[id]/page.tsx:303 — `: "Verificare la policy prima dellâ€™acquisto"}`
- src/app/products/[id]/page.tsx:335 — `? \`${technicalState.completenessPercent}% Â· ${technicalState.status}\``
- src/app/products/[id]/page.tsx:343 — `{technicalState?.missingCount ?? 0} evidenze mancanti Â·{" "}`
- src/app/products/[id]/page.tsx:344 — `{technicalState?.conflictCount ?? 0} conflitti Â· {technicalState?.expiredCount ?? 0}{" "}`
- src/app/products/[id]/page.tsx:362 — `â€” {item.reason}`
- src/app/products/[id]/page.tsx:376 — `{association.technicalDocument.documentType} Â· v`
- src/app/products/[id]/page.tsx:377 — `{association.technicalDocument.currentVersion?.versionNumber} Â·{" "}`
- src/app/products/[id]/page.tsx:458 — `finchÃ© le evidenze non sono sufficienti.`
- src/app/products/[id]/page.tsx:466 — `{comparison.sorted.length} offerte Â· spread {comparison.spread.toFixed(1)}%`
- src/app/products/[id]/page.tsx:470 — `Il confronto riguarda lo stesso prodotto canonico. Prezzi non normalizzabili o unitÃ`
- src/app/products/[id]/page.tsx:481 — `<th>ValiditÃ </th>`
- src/app/products/[id]/page.tsx:591 — `? \`Min ${formatCurrency(min, 4)} Â· Max ${formatCurrency(max, 4)}\``
- src/app/products/[id]/page.tsx:633 — `<small>{quantity} unitÃ  osservate</small>`
- src/app/products/[id]/page.tsx:636 — `<Metric label="QuantitÃ  acquistata" value={quantity} />`
- src/app/products/[id]/page.tsx:658 — `["Dichiarazione di conformitÃ ", product.declarationPath],`
- src/app/products/[id]/page.tsx:698 — `{offer?.supplier.name} Â· {price?.normalizedLabel}`
- src/lib/imports/service.ts:69 — `throw new Error("Il tipo dichiarato del file non corrisponde allâ€™estensione.");`
- src/lib/imports/service.ts:149 — `if (!normalized.purchaseUom || !normalized.consumptionUom || messages.includes("unitÃ "))`
- src/lib/imports/service.ts:243 — `if (!input.buffer.length) throw new Error("Il file Ã¨ vuoto.");`
- src/lib/imports/service.ts:1074 — `name: \`${job.sourceDocument.originalFilename.replace(/\.[^.]+$/, "")} Â· v${(previous?.version ?? 0) + 1}\`,`
- src/lib/technical-intelligence/service.ts:68 — `if (!input.buffer.length) throw new Error("Il documento ÃƒÂ¨ vuoto.");`
- src/lib/technical-intelligence/service.ts:310 — `} else evidence.push(\`SimilaritÃƒÂ  descrizione ${(confidence * 100).toFixed(0)}%\`);`
- src/lib/technical-intelligence/service.ts:330 — `if (!input.buffer.length) throw new Error("Il documento ÃƒÂ¨ vuoto.");`
- src/lib/technical-intelligence/service.ts:516 — `explanation: decision.evidence.join(" Ã‚Â· "),`
- src/lib/technical-intelligence/service.ts:527 — `explanation: decision.evidence.join(" Ã‚Â· "),`
- src/lib/technical-intelligence/service.ts:672 — `throw new Error("La proposta ÃƒÂ¨ giÃƒÂ  stata aggiornata. Ricarica la pagina.");`
- src/lib/technical-intelligence/service.ts:1032 — `reason: \`${key} ÃƒÂ¨ necessario per stabilire l'equivalenza\`,`
- src/lib/technical-intelligence/service.ts:1057 — `"Solo una proposta di equivalenza funzionale puÃƒÂ² essere approvata o respinta.",`
- src/lib/technical-intelligence/service.ts:1073 — `if (!updated.count) throw new Error("La valutazione ÃƒÂ¨ giÃƒÂ  stata decisa o aggiornata.");`

### Difetti registrati

1. Selettori catalogo e persona troncati dopo la rimappatura tipografica.
2. Righe catalogo di altezza incoerente per wrapping del blocco prezzo.
3. Colonne catalogo non allineate da riga a riga.
4. Contenitori immagine vuoti ancora presenti nelle righe e nelle schede.
5. Menu “Altre azioni” composto da details annidati e form a piena larghezza.
6. ESC non chiude menu/disclosure nativi.
7. Quasi tutte le tabelle sono div/grid specifiche; un solo table semantico.
8. Errori server specifici non arrivano inline all’utente.
9. Error boundary attribuisce anche errori di input alla connessione dati.
10. Rifiuto/chiarimento senza nota non ha vincolo client condizionale.
11. Quantità testuale viene scartata senza spiegazione applicativa.
12. Stati pending assenti su aggiunta carrello e invio richiesta.
13. Upload ricezione privo di avanzamento e protezione dal doppio invio.
14. Import pending mostra solo testo nel bottone, senza avanzamento durevole.
15. Ordine TAB costringe ad attraversare tutta la shell prima del contenuto.
16. Un solo dialog progettato; menu, popover e accordion usano HTML grezzo eterogeneo.
17. Confronto prezzi mobile estremamente lungo e denso.
18. Sonde fuori ruolo mostrano skeleton finché l’hydration non sostituisce il fallback 404.
19. Mojibake diffuso in Product 360, Control Tower, confronto e servizi tecnici/import.
20. Prezzi duplicati quando normalizzato e confezione coincidono; precisione a quattro decimali.
21. Finance Controller ha una sola home ma ricerca globale visibile verso contenuti poi bloccati.
22. Executive Sponsor ha una sola Control Tower ma la stessa ricerca globale non coerente col perimetro.
23. Flusso chiarimento richiede cambio identità e recupero manuale del contesto.
24. Doppio ingresso Listini/Importazioni non chiarisce dove inizi il flusso canonico.
25. Stati vuoti non uniformi: CTA presente in alcuni casi, assente in altri.
26. Route di ricezione non disponibile senza spiegazione preventiva nello stato ordine scelto.

## Indice completo degli screenshot

### AREA_MANAGER--approvals--base--chiaro--1440.png

Mostra: AREA_MANAGER, rotta approvals, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### AREA_MANAGER--approvals--base-coda--scuro--1440.png

Mostra: AREA_MANAGER, rotta approvals, stato base-coda, tema scuro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### AREA_MANAGER--approvals--base-mobile--chiaro--390.png

Mostra: AREA_MANAGER, rotta approvals, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: La navigazione laterale sparisce dietro il menu mobile; le superfici dense diventano sequenze molto lunghe.

### AREA_MANAGER--approvals--disclosure-aperti--chiaro--1440.png

Mostra: AREA_MANAGER, rotta approvals, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### AREA_MANAGER--approvals--disclosure-aperti-mobile--chiaro--390.png

Mostra: AREA_MANAGER, rotta approvals, stato disclosure-aperti-mobile, tema chiaro, larghezza 390px.

Cosa non va: La navigazione laterale sparisce dietro il menu mobile; le superfici dense diventano sequenze molto lunghe.

### AREA_MANAGER--approvals-cmtm1w5080d4d14l9bna15pji--base--chiaro--1440.png

Mostra: AREA_MANAGER, rotta approvals-cmtm1w5080d4d14l9bna15pji, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### AREA_MANAGER--approvals-cmtm1w5080d4d14l9bna15pji--disclosure-aperti--chiaro--1440.png

Mostra: AREA_MANAGER, rotta approvals-cmtm1w5080d4d14l9bna15pji, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### AREA_MANAGER--approvals-dettaglio--rifiuto-senza-nota--chiaro--1440.png

Mostra: AREA_MANAGER, rotta approvals-dettaglio, stato rifiuto-senza-nota, tema chiaro, larghezza 1440px.

Cosa non va: Il click senza nota non produce alcun errore inline: la textarea non è required; l’errore esiste solo lato server.

### AREA_MANAGER--budget--base--chiaro--1440.png

Mostra: AREA_MANAGER, rotta budget, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### AREA_MANAGER--consegne--base--chiaro--1440.png

Mostra: AREA_MANAGER, rotta consegne, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### AREA_MANAGER--consegne--disclosure-aperti--chiaro--1440.png

Mostra: AREA_MANAGER, rotta consegne, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### AREA_MANAGER--facilities--base--chiaro--1440.png

Mostra: AREA_MANAGER, rotta facilities, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### AREA_MANAGER--facilities-cmtm1tth5000c14l9w693azxi--base--chiaro--1440.png

Mostra: AREA_MANAGER, rotta facilities-cmtm1tth5000c14l9w693azxi, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### AREA_MANAGER--facilities-cmtm1tth5000c14l9w693azxi--disclosure-aperti--chiaro--1440.png

Mostra: AREA_MANAGER, rotta facilities-cmtm1tth5000c14l9w693azxi, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### AREA_MANAGER--home--base--chiaro--1440.png

Mostra: AREA_MANAGER, rotta home, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### AREA_MANAGER--home--base-mobile--chiaro--390.png

Mostra: AREA_MANAGER, rotta home, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: La navigazione laterale sparisce dietro il menu mobile; le superfici dense diventano sequenze molto lunghe.

### AREA_MANAGER--non-conformita--base--chiaro--1440.png

Mostra: AREA_MANAGER, rotta non-conformita, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### AREA_MANAGER--orders-cmtm1vm730c7t14l9d0n5gela--base--chiaro--1440.png

Mostra: AREA_MANAGER, rotta orders-cmtm1vm730c7t14l9d0n5gela, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### EXECUTIVE_SPONSOR--approvals--base--chiaro--1440.png

Mostra: EXECUTIVE_SPONSOR, rotta approvals, stato base, tema chiaro, larghezza 1440px.

Cosa non va: La rotta diretta restituisce 404 di scope; nell’acquisizione senza hydration resta visibile lo skeleton di caricamento.

### EXECUTIVE_SPONSOR--catalog--base--chiaro--1440.png

Mostra: EXECUTIVE_SPONSOR, rotta catalog, stato base, tema chiaro, larghezza 1440px.

Cosa non va: La rotta diretta restituisce 404 di scope; nell’acquisizione senza hydration resta visibile lo skeleton di caricamento.

### EXECUTIVE_SPONSOR--control-tower--base--chiaro--1440.png

Mostra: EXECUTIVE_SPONSOR, rotta control-tower, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Testi KPI e descrizioni contengono mojibake presente nel sorgente.

### EXECUTIVE_SPONSOR--control-tower--base-cruscotto--scuro--1440.png

Mostra: EXECUTIVE_SPONSOR, rotta control-tower, stato base-cruscotto, tema scuro, larghezza 1440px.

Cosa non va: Testi KPI e descrizioni contengono mojibake presente nel sorgente.

### EXECUTIVE_SPONSOR--control-tower--base-mobile--chiaro--390.png

Mostra: EXECUTIVE_SPONSOR, rotta control-tower, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: Testi KPI e descrizioni contengono mojibake presente nel sorgente.

### EXECUTIVE_SPONSOR--imports--base--chiaro--1440.png

Mostra: EXECUTIVE_SPONSOR, rotta imports, stato base, tema chiaro, larghezza 1440px.

Cosa non va: La rotta diretta restituisce 404 di scope; nell’acquisizione senza hydration resta visibile lo skeleton di caricamento.

### EXECUTIVE_SPONSOR--orders--base--chiaro--1440.png

Mostra: EXECUTIVE_SPONSOR, rotta orders, stato base, tema chiaro, larghezza 1440px.

Cosa non va: La rotta diretta restituisce 404 di scope; nell’acquisizione senza hydration resta visibile lo skeleton di caricamento.

### EXECUTIVE_SPONSOR--products-cmtm1tz0y012j14l9utjtqp05--base--chiaro--1440.png

Mostra: EXECUTIVE_SPONSOR, rotta products-cmtm1tz0y012j14l9utjtqp05, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### FINANCE_CONTROLLER--approvals--base--chiaro--1440.png

Mostra: FINANCE_CONTROLLER, rotta approvals, stato base, tema chiaro, larghezza 1440px.

Cosa non va: La rotta diretta restituisce 404 di scope; nell’acquisizione senza hydration resta visibile lo skeleton di caricamento.

### FINANCE_CONTROLLER--catalog--base--chiaro--1440.png

Mostra: FINANCE_CONTROLLER, rotta catalog, stato base, tema chiaro, larghezza 1440px.

Cosa non va: La rotta diretta restituisce 404 di scope; nell’acquisizione senza hydration resta visibile lo skeleton di caricamento.

### FINANCE_CONTROLLER--home--base--chiaro--1440.png

Mostra: FINANCE_CONTROLLER, rotta home, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### FINANCE_CONTROLLER--home--base-mobile--chiaro--390.png

Mostra: FINANCE_CONTROLLER, rotta home, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: La navigazione laterale sparisce dietro il menu mobile; le superfici dense diventano sequenze molto lunghe.

### FINANCE_CONTROLLER--imports--base--chiaro--1440.png

Mostra: FINANCE_CONTROLLER, rotta imports, stato base, tema chiaro, larghezza 1440px.

Cosa non va: La rotta diretta restituisce 404 di scope; nell’acquisizione senza hydration resta visibile lo skeleton di caricamento.

### FINANCE_CONTROLLER--orders--base--chiaro--1440.png

Mostra: FINANCE_CONTROLLER, rotta orders, stato base, tema chiaro, larghezza 1440px.

Cosa non va: La rotta diretta restituisce 404 di scope; nell’acquisizione senza hydration resta visibile lo skeleton di caricamento.

### FINANCE_CONTROLLER--products-cmtm1tz0y012j14l9utjtqp05--base--chiaro--1440.png

Mostra: FINANCE_CONTROLLER, rotta products-cmtm1tz0y012j14l9utjtqp05, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_ADMIN--categorie--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta categorie, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--categorie--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta categorie, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_ADMIN--categorie-cmtm1tuu1009314l92o2bd26w--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta categorie-cmtm1tuu1009314l92o2bd26w, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--deleghe--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta deleghe, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--deleghe--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta deleghe, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_ADMIN--facilities-cmtm1ttk8000y14l9masgjwob--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta facilities-cmtm1ttk8000y14l9masgjwob, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--facilities-cmtm1ttk8000y14l9masgjwob--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta facilities-cmtm1ttk8000y14l9masgjwob, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_ADMIN--home--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta home, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--home--base-mobile--chiaro--390.png

Mostra: PROCUREMENT_ADMIN, rotta home, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: La navigazione laterale sparisce dietro il menu mobile; le superfici dense diventano sequenze molto lunghe.

### PROCUREMENT_ADMIN--imports--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta imports, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--imports-new--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta imports-new, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Il form mostra pending solo dopo hydration; l’acquisizione statica non può fotografare la transizione protetta da SSO.

### PROCUREMENT_ADMIN--organization--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta organization, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--organization--base-amministrazione--scuro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta organization, stato base-amministrazione, tema scuro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--organization--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta organization, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_ADMIN--products--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta products, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_ADMIN--products--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta products, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_ADMIN--products-cmtm1tz0y012j14l9utjtqp05--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta products-cmtm1tz0y012j14l9utjtqp05, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_ADMIN--products-cmtm1tz0y012j14l9utjtqp05--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta products-cmtm1tz0y012j14l9utjtqp05, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_ADMIN--suppliers--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta suppliers, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--suppliers--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta suppliers, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_ADMIN--suppliers-cmtm1tuf8007914l934w4l2d8--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta suppliers-cmtm1tuf8007914l934w4l2d8, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--technical-documents--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta technical-documents, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--technical-documents--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta technical-documents, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_ADMIN--technical-documents-cmufoml1600rv04jwtmmv3uo6--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta technical-documents-cmufoml1600rv04jwtmmv3uo6, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--technical-documents-cmufoml1600rv04jwtmmv3uo6--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta technical-documents-cmufoml1600rv04jwtmmv3uo6, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_ADMIN--users--base--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta users, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_ADMIN--users--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_ADMIN, rotta users, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_MANAGER--approvals--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta approvals, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--budget--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta budget, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--categorie--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta categorie, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--categorie-cmtm1tuu1009314l92o2bd26w--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta categorie-cmtm1tuu1009314l92o2bd26w, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--compare--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta compare, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--compare--base-confronto--scuro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta compare, stato base-confronto, tema scuro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--compare--base-mobile--chiaro--390.png

Mostra: PROCUREMENT_MANAGER, rotta compare, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: Confronto estremamente lungo e denso su telefono; confronto tra offerte difficile da scandire.

### PROCUREMENT_MANAGER--home--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta home, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--home--base-mobile--chiaro--390.png

Mostra: PROCUREMENT_MANAGER, rotta home, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: La navigazione laterale sparisce dietro il menu mobile; le superfici dense diventano sequenze molto lunghe.

### PROCUREMENT_MANAGER--imports--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta imports, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--imports-cmtomrspj000004l68lxbqiya--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta imports-cmtomrspj000004l68lxbqiya, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--imports-cmtomrspj000004l68lxbqiya--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta imports-cmtomrspj000004l68lxbqiya, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_MANAGER--imports-new--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta imports-new, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Il form mostra pending solo dopo hydration; l’acquisizione statica non può fotografare la transizione protetta da SSO.

### PROCUREMENT_MANAGER--imports-new--base-flusso--scuro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta imports-new, stato base-flusso, tema scuro, larghezza 1440px.

Cosa non va: Il form mostra pending solo dopo hydration; l’acquisizione statica non può fotografare la transizione protetta da SSO.

### PROCUREMENT_MANAGER--imports-new--focus-form--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta imports-new, stato focus-form, tema chiaro, larghezza 1440px.

Cosa non va: Focus fotografato; la sequenza attraversa prima shell e navigazione, rendendo costoso raggiungere i controlli della pagina.

### PROCUREMENT_MANAGER--non-conformita--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta non-conformita, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--non-conformita--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta non-conformita, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_MANAGER--orders--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta orders, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--orders-cmtm1vmqa0c8v14l91hl3tzrl--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta orders-cmtm1vmqa0c8v14l91hl3tzrl, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--orders-cmtm1vmqa0c8v14l91hl3tzrl--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta orders-cmtm1vmqa0c8v14l91hl3tzrl, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_MANAGER--price-lists--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta price-lists, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--price-lists-cmufnp7yb000n04l2xedfmnxw--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta price-lists-cmufnp7yb000n04l2xedfmnxw, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--price-lists-cmufnp7yb000n04l2xedfmnxw--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta price-lists-cmufnp7yb000n04l2xedfmnxw, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_MANAGER--products--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta products, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_MANAGER--products-cmtm1tz0y012j14l9utjtqp05--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta products-cmtm1tz0y012j14l9utjtqp05, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_MANAGER--products-cmtm1tz0y012j14l9utjtqp05--base-mobile--chiaro--390.png

Mostra: PROCUREMENT_MANAGER, rotta products-cmtm1tz0y012j14l9utjtqp05, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_MANAGER--products-cmtm1tz0y012j14l9utjtqp05--base-scheda--scuro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta products-cmtm1tz0y012j14l9utjtqp05, stato base-scheda, tema scuro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_MANAGER--products-cmtm1tz0y012j14l9utjtqp05--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta products-cmtm1tz0y012j14l9utjtqp05, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_MANAGER--products-cmtm1tz0y012j14l9utjtqp05--disclosure-aperti-mobile--chiaro--390.png

Mostra: PROCUREMENT_MANAGER, rotta products-cmtm1tz0y012j14l9utjtqp05, stato disclosure-aperti-mobile, tema chiaro, larghezza 390px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_MANAGER--products-cmtm1tz0y012j14l9utjtqp05--focus-tabella-prezzi--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta products-cmtm1tz0y012j14l9utjtqp05, stato focus-tabella-prezzi, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### PROCUREMENT_MANAGER--suppliers--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta suppliers, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--suppliers-cmtm1tuf8007914l934w4l2d8--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta suppliers-cmtm1tuf8007914l934w4l2d8, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--technical-documents--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta technical-documents, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--technical-documents--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta technical-documents, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### PROCUREMENT_MANAGER--technical-documents-cmufoml1600rv04jwtmmv3uo6--base--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta technical-documents-cmufoml1600rv04jwtmmv3uo6, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### PROCUREMENT_MANAGER--technical-documents-cmufoml1600rv04jwtmmv3uo6--disclosure-aperti--chiaro--1440.png

Mostra: PROCUREMENT_MANAGER, rotta technical-documents-cmufoml1600rv04jwtmmv3uo6, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### RSA_DIRECTOR--budget--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta budget, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--cart--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta cart, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Carrello vuoto: non esiste il comando di invio, quindi il relativo errore server non è raggiungibile dall’interfaccia.

### RSA_DIRECTOR--cart--base-mobile--chiaro--390.png

Mostra: RSA_DIRECTOR, rotta cart, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: La navigazione laterale sparisce dietro il menu mobile; le superfici dense diventano sequenze molto lunghe.

### RSA_DIRECTOR--cart--focus-azione--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta cart, stato focus-azione, tema chiaro, larghezza 1440px.

Cosa non va: Focus fotografato; la sequenza attraversa prima shell e navigazione, rendendo costoso raggiungere i controlli della pagina.

### RSA_DIRECTOR--cart--focus-carrello--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta cart, stato focus-carrello, tema chiaro, larghezza 1440px.

Cosa non va: Focus fotografato; la sequenza attraversa prima shell e navigazione, rendendo costoso raggiungere i controlli della pagina.

### RSA_DIRECTOR--catalog--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--base-elenco--scuro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato base-elenco, tema scuro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--base-mobile--chiaro--390.png

Mostra: RSA_DIRECTOR, rotta catalog, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--creazione-lista-nome-vuoto--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato creazione-lista-nome-vuoto, tema chiaro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--disclosure-aperti--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--disclosure-aperti-mobile--chiaro--390.png

Mostra: RSA_DIRECTOR, rotta catalog, stato disclosure-aperti-mobile, tema chiaro, larghezza 390px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--filtro-categoria-aperto--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato filtro-categoria-aperto, tema chiaro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--focus-catalogo--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato focus-catalogo, tema chiaro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--focus-filtro--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato focus-filtro, tema chiaro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--focus-menu-altre-azioni--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato focus-menu-altre-azioni, tema chiaro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--menu-altre-azioni-esc--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato menu-altre-azioni-esc, tema chiaro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--quantita-testo--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato quantita-testo, tema chiaro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--catalog--quantita-zero--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta catalog, stato quantita-zero, tema chiaro, larghezza 1440px.

Cosa non va: Selettori persona/categoria troncati; prezzi a capo con righe di altezza diversa; contenitori immagine vuoti; menu azioni basato su details annidati.

### RSA_DIRECTOR--consegne--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta consegne, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--consegne--disclosure-aperti--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta consegne, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### RSA_DIRECTOR--home--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta home, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--home--base-mobile--chiaro--390.png

Mostra: RSA_DIRECTOR, rotta home, stato base-mobile, tema chiaro, larghezza 390px.

Cosa non va: La navigazione laterale sparisce dietro il menu mobile; le superfici dense diventano sequenze molto lunghe.

### RSA_DIRECTOR--home--disclosure-aperti--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta home, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### RSA_DIRECTOR--home--disclosure-aperti-mobile--chiaro--390.png

Mostra: RSA_DIRECTOR, rotta home, stato disclosure-aperti-mobile, tema chiaro, larghezza 390px.

Cosa non va: La navigazione laterale sparisce dietro il menu mobile; le superfici dense diventano sequenze molto lunghe.

### RSA_DIRECTOR--liste--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta liste, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--liste--disclosure-aperti--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta liste, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### RSA_DIRECTOR--non-conformita--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta non-conformita, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--orders--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta orders, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--orders-cmtm1w1hv0cxs14l9w6nms3sl--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta orders-cmtm1w1hv0cxs14l9w6nms3sl, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--orders-cmtm1w1hv0cxs14l9w6nms3sl-receive--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta orders-cmtm1w1hv0cxs14l9w6nms3sl-receive, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--orders-ricezione--quantita-superiore--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta orders-ricezione, stato quantita-superiore, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--preferiti--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta preferiti, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--preferiti--disclosure-aperti--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta preferiti, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### RSA_DIRECTOR--products-cert_m11_lifecycle_product_normal--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta products-cert_m11_lifecycle_product_normal, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### RSA_DIRECTOR--products-cert_m11_lifecycle_product_normal--disclosure-aperti--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta products-cert_m11_lifecycle_product_normal, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Product 360 contiene mojibake visibile e numerosi disclosure nativi; l’area immagine è vuota ma occupa spazio.

### RSA_DIRECTOR--requisitions-e7a36b43-2582-4b9f-91c2-77b499faf4b2--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta requisitions-e7a36b43-2582-4b9f-91c2-77b499faf4b2, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--requisitions-e7a36b43-2582-4b9f-91c2-77b499faf4b2--disclosure-aperti--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta requisitions-e7a36b43-2582-4b9f-91c2-77b499faf4b2, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.

### RSA_DIRECTOR--richieste--base--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta richieste, stato base, tema chiaro, larghezza 1440px.

Cosa non va: Nessun ulteriore difetto specifico registrato oltre ai problemi trasversali del verbale.

### RSA_DIRECTOR--richieste--disclosure-aperti--chiaro--1440.png

Mostra: RSA_DIRECTOR, rotta richieste, stato disclosure-aperti, tema chiaro, larghezza 1440px.

Cosa non va: Lo stato aperto espone HTML nativo e gerarchie non uniformi; verificare sovrapposizioni e lunghezza.
