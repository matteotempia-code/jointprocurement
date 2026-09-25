# Sorgence — Le pagine, una per una

**Stato: vincolante.** Attuazione di `docs/design/CANONE.md`. Scritto il 25 settembre 2026,
aggiornato lo stesso giorno con le cinque decisioni del committente (canone §7).

**Perimetro: 42 pagine**, dalle 47 di partenza. `/catalog` resta come redirect; `/preferiti`,
`/compare`, `/compare-products`, `/technical-compare` e `/technical-requirements` non esistono
più come pagine. Le voci che le riguardano sono rimaste qui, marcate, perché dicono **cosa va
portato dentro e cosa si perde** — una fusione fatta senza quell'elenco toglie funzioni invece
di spostarle.

Per ogni pagina: il suo archetipo, **l'unica azione primaria**, cosa sparisce, cosa appare, lo
stato vuoto. Una pagina non si dichiara finita se non passa i criteri del canone §8.

## Livello di verifica di questo documento

Ogni riga è stata ricavata da un censimento del codice su tutte e 47 le pagine: titoli di
sezione, azioni server invocate, e conteggio di `<form>`, `<details>`, `<table>`. **Non** ho
letto riga per riga le nove pagine più grosse: dove una decisione dipende da un dettaglio che
il censimento non vede, la riga lo dice con `⟨da verificare in attuazione⟩`.

## Il punto di partenza, misurato oggi

| Misura | Valore |
| --- | --- |
| Pagine | 47 |
| `<form>` nelle pagine | 78 |
| `<details>` nelle pagine | 46, distribuiti su 25 pagine |
| Pagine con **2 o più azioni server distinte** — violano la Legge 1 | **14** |

Le quattordici, in ordine di gravità: `imports/[id]` e `cart` (5 azioni ciascuna) ·
`imports/[id]/records/[recordId]` e `liste/[id]` (4) · `liste` e `preferiti` (3) ·
`catalog`, `imports/[id]/mapping`, `orders/[id]`, `organization`, `products/[id]`,
`technical-compare`, `technical-documents/[id]`, `technical-requirements` (2).

## Una precisazione sulla Legge 1

L'azione primaria può **dipendere dallo stato** dell'entità: un ordine in arrivo ha come
primaria «Conferma il ricevimento», lo stesso ordine chiuso ha «Ricompra». È legittimo, a due
condizioni: gli stati sono elencati qui sotto, e in ogni singolo stato la primaria è **una**.

---

## A · Proposta — 1 pagina

### `/` — tutti i profili tranne lo sponsor · 673 righe, 6 sezioni, 2 form, 1 `<details>`

Oggi è un cruscotto unico per cinque profili in un file solo: «Prossima attivazione:
riconciliazione fatture», «Le scorte che riordini più spesso», «Ultimi aggiornamenti», «Cosa
richiede attenzione», «Strutture dell'area», «Coda operativa».

**Cosa tengo:** la sezione «Le scorte che riordini più spesso» è già il seme giusto — il
prodotto sa cosa ricompri. Non va aggiunta: va **promossa a protagonista**.

**Primaria, per profilo:**

| Profilo | Azione primaria |
| --- | --- |
| RSA_DIRECTOR | Conferma e invia ai fornitori |
| AREA_MANAGER | Approva le N decisioni delle tue strutture |
| PROCUREMENT_MANAGER | Accetta le variazioni dei listini scaduti |
| PROCUREMENT_ADMIN | Sblocca le N deleghe scadute |
| FINANCE_CONTROLLER | nessuna: la sua `/` è **archetipo G** (§7.1), vedi in fondo |

**Sparisce:** «Prossima attivazione» (è marketing dentro il prodotto), «Ultimi aggiornamenti»
(un registro di eventi non è un compito), la griglia di riquadri.
**Appare:** la proposta con le 3–5 righe che cambiano e il loro perché; `ProposalCard`; al
massimo **due** voci «serve una tua decisione».
**Vuoto:** primo mese, nessuno storico → «Non ho ancora abbastanza mesi per proporti un
riordino. Intanto cerca quello che ti serve» + una porta sola verso B1.
**Debito strutturale:** 673 righe con rami per cinque profili vanno divise in un file per
profilo. Un cruscotto condiviso è il motivo per cui nessuno dei cinque è buono.

---

## B1 · Ricerca — 5 pagine, più un redirect

### `/cerca` — RSA_DIRECTOR · 214 righe, 0 form, 0 `<details>`, 0 tabelle

La più vicina all'archetipo: non ha niente da smontare, ha tutto da costruire.
**Primaria:** «Aggiungi al riordino», su ogni riga.
**Appare:** i tre gruppi (di solito / equivalenti più convenienti / tutto il resto); prezzo
normalizzato all'unità su ogni riga; filtri come pillole su una riga.
**Vuoto:** nessun risultato → «Descrivilo a parole tue, lo cerchiamo nei listini dei vostri
fornitori» + il bottone «Chiedi a Sorgence».

### `/catalog` — **redirect verso `/cerca`**, deciso il 25/09/2026 (§7.3)

Le 278 righe, i 3 form e le 2 azioni sono da cancellare, non da riprogettare. Con loro
sparisce quello che il rilevamento aveva misurato sul renderizzato: **43 form e 23 campi** in
una pagina, e la paginazione a 98 pagine.

**Attenzione in attuazione:** `addToCart` e `toggleFavorite` vivono anche qui. Prima del
redirect va verificato che le due azioni siano raggiungibili da `/cerca` con la stessa
semantica — altrimenti il redirect toglie una funzione invece di spostarla.
⟨da verificare in attuazione⟩

### `/products` — PROCUREMENT_MANAGER, PROCUREMENT_ADMIN · 191 righe, `manageProduct`

**Primaria:** «Nuovo prodotto». È la ricerca di chi amministra il catalogo, non di chi compra.
**Appare:** la completezza tecnica come colonna, perché è il dato che governa gli acquisti.
**Vuoto:** «Nessun prodotto canonico. Importa un listino e li creiamo dai suoi articoli.»

### `/suppliers` — 171 righe, `manageSupplier`
**Primaria:** «Nuovo fornitore». **Appare:** spesa a 12 mesi e non conformità aperte per riga.
**Vuoto:** «Nessun fornitore. Il primo nasce dal primo listino importato.»

### `/price-lists` — 156 righe, sezione «Versioni commerciali»
**Primaria:** «Importa un listino». **Appare:** scadenza in evidenza — un listino scaduto è la
causa più frequente di acquisti fuori accordo. **Vuoto:** porta a `/imports/new`.

### `/technical-documents` — 232 righe, `retryTechnicalBatch`
**Primaria:** «Carica documenti». **Appare:** lo stato del lotto come `WorkCard` (Legge 4): il
batch da cento documenti impiega circa otto minuti e mezzo e oggi non lo dice.

---

## B2 · Coda di lavoro — 7 pagine

Forma comune: coda a sinistra, cosa aperta a destra. **L'elenco non ha primaria: la primaria
sta nel dettaglio.** Si lavora dall'alto in basso senza tornare all'elenco.

### `/approvals` — AREA_MANAGER, PROCUREMENT_MANAGER · 190 righe
**Primaria (nel dettaglio):** «Approva € X». **Sparisce:** il salto a `/approvals/[id]` come
pagina separata — diventa il pannello destro. **Vuoto:** «Niente da approvare. Ti avviso io.»

### `/richieste` — 255 righe, `createOutOfCatalogRequest`
**Primaria:** «Chiedi un prodotto fuori catalogo» — qui l'elenco *ha* una primaria, perché
questa pagina serve anche a creare. **Appare:** l'età della richiesta, che oggi non si vede.

### `/non-conformita` — 190 righe, `resolveQualityIssue`
**Primaria (nel dettaglio):** «Risolvi». **Appare:** la foto del ricevimento accanto alla riga,
non dietro un link.

### `/consegne` — 150 righe, `draftSupplierReminder`, metadata «In ritardo»
**Primaria (nel dettaglio):** «Sollecita il fornitore» con il testo già scritto.
**Appare:** quanti giorni di ritardo e cosa blocca in reparto.

### `/imports` — 255 righe, sezioni «Da gestire» e «Import recenti»
**Primaria:** «Importa un listino». «Da gestire» è già la coda: diventa il pannello sinistro.

### `/orders` — 185 righe
**Primaria:** nessuna sull'elenco; sul dettaglio dipende dallo stato (vedi `/orders/[id]`).
**Appare:** gli ordini in arrivo oggi in testa, non l'ordine cronologico inverso.

### `/technical-products` — 58 righe
Assegnato a B1 per errore leggendo la rotta; il codice filtra `status: { not: "COMPLETE" }` e
ordina per completezza crescente. È una coda.
**Primaria (nel dettaglio):** «Carica l'evidenza che manca».
**Vuoto:** «Tutte le evidenze sono complete» — ed è un vuoto da festeggiare, non da riempire.

---

## B3 · Registro — 6 pagine

Forma comune: `DataTable` vero, colonne fisse, ordinamento sul database, **le righe non in
ordine per prime**, una sola primaria in testa, azioni di riga in un `Menu` vero.

| Pagina | Righe | Primaria | Cosa mostra per prima |
| --- | --- | --- | --- |
| `/categorie` | 100 | Nuova categoria | categorie senza fornitori qualificati |
| `/facilities` | 146 | Aggiungi una struttura | strutture senza direttore, budget scaduti |
| `/users` | 199 | Invita una persona | persone senza ruolo, o con delega scaduta |
| `/deleghe` | 145 | Nuova delega | deleghe scadute o che scadono entro 30 giorni |
| `/organization` | 129 | Aggiungi un ente giuridico | enti senza partita IVA o senza sede |
| `/liste` | 128 | Nuova lista | liste mai usate da oltre 6 mesi |

**`/organization` ha 2 azioni** (`updateOrganization`, `manageLegalEntity`): la pagina è il
registro degli enti giuridici, primaria «Aggiungi un ente giuridico»; i dati dell'organizzazione
si modificano in uno `Sheet` aperto dall'intestazione, non in un secondo form a pari livello.

### `/preferiti` — **fuso in `/liste`**, deciso il 25/09/2026 (§7.5)

Le 170 righe e le 3 azioni spariscono: «Preferiti» diventa **una lista come le altre**, con
un'icona diversa e un posto fisso in testa all'elenco.

**Cosa va portato dentro `/liste`, non perso:** il filtro «prodotti preferiti usciti dai
listini», che è l'unica cosa che questa pagina faceva e che una lista normale non fa. Diventa
la riga di attenzione in testa al registro.
**Debito da chiudere insieme:** la struttura dati. Finché `toggleFavorite` scrive in un posto e
le liste in un altro, la fusione è solo grafica. ⟨da verificare in attuazione⟩

**`/liste` ha 3 azioni, `/liste/[id]` ne ha 4:** le aggiunte al carrello diventano azioni di
riga, non primarie.

**Vuoto, per tutte e sei:** le tre parti obbligatorie. Esempio: «Nessuna delega. Finché non
ce n'è una, le richieste sopra € 500 restano ferme in attesa del direttore. Crea la prima.»

---

## C · Scheda — 8 pagine

Forma comune: identità con la cifra in display, `PriceBlock`, poi **tre colonne** — andamento ·
alternative · chi la usa e i documenti. Pannello di azione a destra.

### `/products/[id]` — 708 righe, **8 `<details>`, 7 tabelle**, 2 azioni
La pagina peggiore del prodotto: otto accordion impilati.
**Primaria:** «Aggiungi al riordino», con la quantità già proposta e il motivo della proposta.
**Sparisce:** tutti e otto i `<details>`. **Appare:** le tre colonne; `Sparkline` a 12 mesi; i
documenti come due link visibili, non dietro un accordion; il costo effettivo con IVA e
detraibilità dichiarate. `toggleFavorite` scende a icona, non è una seconda primaria.
**Riferimento:** tela, *Il passaporto del prodotto*.

### `/suppliers/[id]` — 481 righe, 7 sezioni, **0 form**
Sette sezioni e nessuna azione: una pagina che si legge e non serve a niente.
**Primaria:** «Importa il suo listino» ⟨da verificare in attuazione: se il fornitore ha già un
listino corrente, la primaria diventa «Confronta i suoi prezzi»⟩.
**Sparisce:** sette sezioni a pari livello. **Appare:** tre colonne, e la spesa mensile come
`Sparkline` con provenienza.

### `/price-lists/[id]` — 258 righe, `confirmPriceListCondition`, 5 tabelle
**Primaria:** «Conferma le condizioni». **Appare:** la scadenza in display, perché è il numero
che decide. **Vuoto:** listino senza articoli abbinati → porta alla procedura F.

### `/facilities/[id]` — 181 righe, 3 `<details>`, 3 tabelle
**Primaria dipendente dallo stato:** senza direttore → «Assegna un direttore»; altrimenti →
«Apri il budget del trimestre». **Sparisce:** i tre `<details>`.

### `/technical-documents/[id]` — 201 righe, 2 azioni
**Primaria:** «Associa al prodotto» — è una decisione, e le due azioni del codice
(`associateTechnicalProduct`, `decideTechnicalAssociation`) sono la stessa decisione in due
pezzi: vanno unite. **Appare:** metadati estratti accanto al documento, non sotto.

### `/categorie/[id]` — 162 righe, 0 form
**Primaria:** «Confronta i prodotti della categoria» → archetipo E.
**Appare:** quanto pesa la categoria sulla spesa, con provenienza.

### `/liste/[id]` — 183 righe, **4 azioni**
**Primaria:** «Aggiungi tutto al riordino». Le altre tre (`moveShoppingListItem`,
`updateShoppingList`, `updateShoppingListItem`) diventano controlli in riga e un `Sheet` per
nome e descrizione. **Sparisce:** la sezione «Nome e descrizione» come blocco a sé.

### `/orders/[id]` — 400 righe, `acknowledgeOrder` + `buyAgain`, 3 sezioni
**Primaria dipendente dallo stato:** in arrivo → «Conferma il ricevimento» (porta a F);
chiuso → «Ricompra». **Appare:** «Audit e cronologia» resta, ma chiuso in uno `Sheet`: è
tracciabilità, non un compito.

---

## D · Decisione — 3 pagine

### `/approvals/[id]` — 317 righe, `decideApproval`, 3 tabelle
**Primaria:** «Approva € X». Secondaria: «Chiedi una modifica». Distruttiva: rifiuta.
**Appare:** le parole di chi chiede, cosa cambia se dici sì (budget dopo, costo effettivo, data
in reparto), l'alternativa equivalente se esiste, scorciatoie da tastiera.
**Riferimento:** tela, *Una decisione, una schermata*.

### `/requisitions/[id]` — 197 righe, `answerClarification`
**Questa pagina viola la Legge 5** ed è il motivo per cui la legge esiste: il chiarimento oggi
costa 7 clic **e un cambio profilo** (`RILEVAMENTO.md` §C4).
**Primaria:** «Rispondi e rimanda in approvazione».
**Cosa cambia:** chi deve rispondere lo fa da qui, con il suo profilo. Se serve un'altra
persona, il prodotto lo dice **all'inizio**, con nome e cognome, e le passa la palla.

### `/imports/[id]/records/[recordId]` — 576 righe, **6 form, 4 `<details>`, 4 azioni**
Il peggior caso di Legge 1: quattro azioni pari («accetta», «accetta correggendo», «crea
prodotto nuovo», «segna») in sei form.
**Diventano tre, una primaria:** «Sì, è questo» · «Ne scelgo un altro» · «È un prodotto nuovo».
`markRecord` non è una decisione, è un rimando: diventa «Decido dopo», silenzioso.
**Appare:** la riga del file fra virgolette, il candidato con la sua somiglianza, e la frase che
conta: ogni scelta insegna, alla prossima importazione righe così si abbinano da sole.
**Riferimento:** tela, *L'attesa che si spiega*, pannello destro.

---

## E · Confronto — 1 pagina, dove c'erano quattro

### `/confronto` — deciso il 25/09/2026 (§7.4)

Una rotta sola con un parametro che dice **cosa** si confronta. Sostituisce `/compare` (99
righe), `/compare-products` (156), `/technical-compare` (229) e `/technical-requirements` (130):
614 righe che diventano una griglia con quattro contenuti.

Forma: `CompareGrid` a colonne di larghezza **fissa**, righe che differiscono in testa, le
identiche compresse in una riga sola, una colonna dichiarata riferimento.

| Modo | Cosa mette a confronto | Primaria | Profili |
| --- | --- | --- | --- |
| `prezzi` | lo stesso prodotto presso più fornitori | Sostituisci nei riordini | PROCUREMENT_MANAGER |
| `prodotti` | prodotti diversi fra loro | Sostituisci nei riordini | direttore, area manager, procurement |
| `tecnico` | attributi tecnici, per decidere un'equivalenza | Conferma l'equivalenza | procurement |
| `capitolato` | prodotti contro un requisito dichiarato | Salva il capitolato | procurement |

**Cosa va portato dentro, non perso:**
- Lo stato vuoto di `/compare-products`, che è già quello giusto: «Seleziona almeno due
  prodotti». Diventa lo stato vuoto di tutti e quattro i modi.
- `decideTechnicalEquivalence` e la scrittura del capitolato: sono le due azioni che scrivono, e
  restano, ognuna nel suo modo.

**Cosa sparisce:** `runTechnicalComparison` come bottone. Non è una scelta dell'utente, è quello
che la pagina fa aprendosi — e nel frattempo mostra una `WorkCard`, perché il confronto tecnico
su molti attributi non è istantaneo (Legge 4).

**Rischio dichiarato:** quattro modi in una rotta si trasformano facilmente in quattro rami
`if` dentro un file da 600 righe, che è il difetto di `/` (673 righe per cinque profili). La
griglia è **una** e i quattro modi le passano soltanto dati: colonne, righe, riferimento. Se in
attuazione servono quattro layout diversi, la decisione va riaperta invece di aggirata.

---

## F · Procedura — 7 pagine

### `/imports/new` — 59 righe
**Primaria:** «Carica il file». **Appare:** cosa succederà e quanto ci vorrà, **prima** di
caricare. La sezione «Un percorso controllato» che c'è già è la cosa giusta.

### `/imports/[id]` — 727 righe, **5 form, 5 `<details>`, 5 azioni**
La pagina più grande del prodotto. Ha già l'idea giusta e il nome giusto: una sezione si chiama
«La prossima decisione» e un'azione si chiama letteralmente `primaryAction`.
**Primaria:** la prossima decisione, qualunque sia — una sola, sempre in quel posto.
**Sparisce:** i cinque `<details>`. **Appare:** la `WorkCard`: passi, percentuale, stima,
«puoi chiudere questa pagina», e **cosa si può già fare nel frattempo**.
`retryImport` non è una primaria: è parte dell'`ErrorState`.
**Riferimento:** tela, *L'attesa che si spiega*.

### `/imports/[id]/mapping` — 182 righe, 2 azioni
**Primaria:** «Confermo l'abbinamento delle colonne». `resetColumnMapping` è silenziosa.
**Tengo:** «Documento → dato procurement» spiega il passo in tre parole.

### `/imports/[id]/changes` — 558 righe, 5 tabelle
**Primaria:** «Accetta le variazioni».
**Tengo, ed è la Legge 3 già applicata bene:** il titolo «Il prezzo confezione non racconta la
variazione reale». Va promosso, non tolto.
**Appare:** variazioni come `Chip` su fondo tenue, mai testo colorato nudo.

### `/imports/[id]/summary` — 157 righe
**Primaria:** «Conferma la nuova versione». La sezione «Completa le decisioni rimaste» diventa
un blocco che **impedisce** la conferma finché ci sono righe aperte, dicendo quante sono.

### `/cart` — RSA_DIRECTOR · 433 righe, **5 form, 3 `<details>`, 5 azioni**
**Destinazione: assorbito dall'archetipo A.** Il carrello non si costruisce, si corregge: è la
proposta di riordino in forma modificabile.
**Finché resta:** primaria «Invia la richiesta», e le altre quattro diventano controlli di riga.
**Qui vive un difetto reale:** l'attesa non spiegata fa cliccare due volte, e sul carrello il
secondo clic **raddoppia davvero la quantità ordinata**. La Legge 4 lo chiude: il controllo si
disabilita all'istante, sotto il secondo.
**Tengo:** il titolo «Decisione d'acquisto» — dice esattamente cos'è.

### `/orders/[id]/receive` — 215 righe, `receiveOrder`
**Primaria:** «Conferma il ricevimento».
**Nasce sul telefono**, non sul desktop: si fa in piedi, accanto al bancale.
**Appare:** tocca solo dove qualcosa non torna; foto e motivo per le differenze; e la frase che
dice cosa comporta — le righe mancanti diventano una non conformità intestata al fornitore, e
la fattura verrà confrontata sul ricevuto.
**Riferimento:** tela, *Ricevimento merce, in piedi*.

---

## G · Quadro — 3 pagine, più la home del controllo di gestione

### `/` nella variante FINANCE_CONTROLLER — deciso il 25/09/2026 (§7.1)

Il profilo oggi ha una sola voce di navigazione, «Home», e nessuna pagina propria
([roles.ts:67](src/lib/roles.ts:67)). Diventa **una pagina sola**, archetipo G, e **404 su tutto
il resto**: un perimetro piccolo e vero invece di sei voci che portano a pagine mezze vuote.

**La domanda a cui risponde, e l'unica:** stiamo spendendo come previsto?
**Primaria:** una porta verso la struttura che sta fuori traiettoria.
**Appare:** il verdetto in una frase; tre `Metric` con provenienza — spesa contro budget
cumulato, scostamento per struttura, quota di spesa fuori accordo; un andamento a otto
trimestri; al massimo due cose che meritano attenzione.
**Vuoto:** primo trimestre senza storico → «Non ho ancora un trimestre chiuso da confrontare.»
**Da fare in attuazione:** la navigazione di questo profilo va scritta davvero in
`navigationByRole`, e le altre rotte devono rispondere 404 per lui, non 500 e non una pagina
vuota. ⟨da verificare in attuazione⟩

### `/control-tower` — EXECUTIVE_SPONSOR · 174 righe, 3 sezioni, 0 form
**Primaria:** una porta sola, «Dettaglio per struttura», e apre **solo** ciò che il profilo può
aprire (Legge 5, e decisione §7.2 presa il 25/09/2026).
**Appare:** un verdetto in una frase, prima di qualsiasi numero; tre `Metric` con provenienza;
un andamento; al massimo **due** cose che meritano attenzione.
**Sparisce:** la sezione «Anteo e Coopselios» — i nomi dei clienti in una pagina di prodotto
sono materiale di vendita. **Riferimento:** tela, *Quadro*.

### `/budget` — RSA_DIRECTOR, AREA_MANAGER, PROCUREMENT_MANAGER · 210 righe, 5 tabelle, 0 form
**Primaria:** una porta verso la struttura in difficoltà.
**Appare:** il verdetto in una frase. **Tengo:** «Limiti di acquisto applicabili» — è la regola
che governa, e va detta prima dei numeri.

### `/demo-roadmap` — EXECUTIVE_SPONSOR · 75 righe
È materiale di vendita dentro il prodotto: «Estensioni pianificate, non ancora operative».
*Raccomando:* fuori dal prodotto. Se resta, archetipo G con un verdetto, e mai raggiungibile da
una navigazione che un cliente vero usa ogni giorno.

---

## H · Accesso — 1 pagina

### `/login` — 41 righe, `login`
**Primaria:** «Accedi». **Appare:** un errore che dice cosa fare, non cosa è andato storto.
Quarantuno righe, e devono restare poche.

---

## Ordine di esecuzione consigliato

Non alfabetico: per quanto rende, diviso per quanto costa.

1. **I token** (canone §2): due blocchi di valori. Tocca tutte e 47 le pagine in un colpo, e
   l'architettura per riceverli c'è già.
2. **`/` per RSA_DIRECTOR** e **`/approvals/[id]`**: sono il lavoro di ogni giorno del profilo
   pilota, e sono i due archetipi già disegnati per intero.
3. **`/cerca`**, che non ha niente da smontare, e poi il redirect di `/catalog`.
4. **`/products/[id]`**: otto `<details>` è il difetto più visibile del prodotto.
5. **`/imports/[id]` e `/imports/[id]/records/[recordId]`**: le due pagine dove Legge 1 e
   Legge 4 valgono di più, e dove il codice ha già i nomi giusti.
6. **`/orders/[id]/receive`** sul telefono: è la pagina che si usa in piedi, ed è l'unica dove
   il telefono non è una cortesia.
7. Il resto per archetipo, mai per pagina singola: chi fa B3 fa tutte e sette insieme, così la
   forma non divergerà.

## Un requisito trasversale, che non è di una pagina sola

Decisione §7.2: **la ricerca globale `⌘K` restituisce solo ciò che il profilo può aprire.** Non
è una pagina, è il componente di ricerca, e vale per tutti e sei i profili. Va scritto una volta
e provato per ruolo, altrimenti la Legge 5 si viola al primo tasto premuto — indipendentemente
da quanto bene sono disegnate le 42 pagine.

## Le decisioni sono prese

Le cinque decisioni che bloccavano l'attuazione sono state prese dal committente il **25
settembre 2026** e sono nel canone §7. Conseguenza: **42 pagine invece di 47**, quattro rotte
che scompaiono e una che diventa un redirect.

Da qui si può partire con il codice, nell'ordine consigliato qui sopra.
