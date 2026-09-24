# Sorgence — Riprogettazione dell'interfaccia

**Base:** rilevamento del 24/09/2026 (`docs/design/RILEVAMENTO.md`), 135 schermate, 70 pagine HTML renderizzate, 26 difetti registrati.
**Sistema visivo:** «Quadro», definito in `docs/design/QUADRO.md`. Questo documento non lo sostituisce: gli dà una struttura su cui posarsi.
**Stato:** proposta. Da approvare prima dell'esecuzione.

> **Contiene decisioni e valori esatti. Non va riassunto.**

---

## 1. LA DIAGNOSI, IN UNA FRASE

> **Sorgence non ha componenti di interazione. Ha elementi HTML.**

Non è una questione di gusto né di colori. È che nessuno ha mai deciso _come si fa un menu in questo prodotto_, e ogni pagina ha risolto da sé con l'elemento nativo più vicino.

I numeri del rilevamento:

|                                                  |                                               |
| ------------------------------------------------ | --------------------------------------------- |
| `<details>` usati come menu, accordion e popover | **49**                                        |
| `<dialog>` progettati                            | **1**                                         |
| `<table>` semantiche                             | **1**, condivisa, usata solo da alcune pagine |
| Form nativi                                      | **90** — molti sono un bottone travestito     |
| Varianti di bottone coesistenti                  | **8**                                         |
| Form nel solo catalogo                           | **43**, con 23 campi visibili                 |
| Classi CSS distinte                              | 260, di cui il 30% usate una volta sola       |

Otto varianti di bottone per tre esigenze reali. Quarantanove `<details>` per almeno quattro comportamenti diversi. La stessa azione secondaria appare come bottone, link, `<summary>` o form a piena larghezza a seconda della pagina.

**Questo è ciò che rende il prodotto datato.** Non il beige di prima né il petrolio di adesso: il fatto che ogni superficie parli una lingua diversa.

---

## 2. IL PRINCIPIO

> **Un comportamento, un componente. Progettato una volta, usato ovunque.**

Ne derivano tre regole operative, in ordine di precedenza:

1. **Nessun elemento HTML grezzo come interfaccia.** `<details>`, `<select>` e `<form>` restano la base tecnica, mai il componente finito. Se un utente lo tocca, è stato progettato.
2. **Un'azione non è un form.** Un'azione è un bottone. Il form è un dettaglio di trasporto, non un elemento visivo.
3. **Se un dato è tabellare, è una tabella.** Non una griglia di div che sembra una tabella nelle righe fortunate.

---

## 3. I COMPONENTI

Dodici componenti sostituiscono tutto. Ognuno va scritto una volta in `src/components/`, con le sue varianti dichiarate e nessuna altrove.

### 3.1 — `Button`

Sostituisce: 112 bottoni nativi, 8 varianti, i `<summary>` travestiti da CTA, i form a piena larghezza del menu liste.

**Tre varianti, non otto:**

| Variante    | Uso                                                          | Aspetto                                      |
| ----------- | ------------------------------------------------------------ | -------------------------------------------- |
| `primary`   | **una sola per schermata**: l'azione che completa il compito | fondo `--accent`, testo `--on-accent`        |
| `secondary` | azioni alternative                                           | fondo `--surface`, bordo `--border-strong`   |
| `ghost`     | azioni terziarie e di riga                                   | nessun fondo, nessun bordo, testo `--accent` |

Più due modificatori ortogonali: `destructive` (colore `--danger`) e `icon-only` (richiede `aria-label`).

**Stato di attesa incorporato.** Il bottone porta il proprio `useFormStatus`: non esiste un bottone che possa essere premuto due volte. Chiude i difetti 12 e 13 del rilevamento senza intervenire su ogni pagina.

Altezza 36px, raggio `--radius-sm`, larghezza che non cambia fra stato normale e attesa.

### 3.2 — `Menu`

Sostituisce: `details.product-actions-menu` e ogni `<details>` usato come menu.

**Requisiti non negoziabili:** `role="menu"` con `menuitem`; frecce su/giù per navigare; `Esc` chiude e **riporta il focus al pulsante che l'ha aperto**; clic fuori chiude; **un solo menu aperto per volta**.

**Niente menu dentro menu.** Il caso «Crea nuova lista» dentro «Altre azioni» diventa: la voce apre un `Dialog`, il menu si chiude. Risolve il difetto 5.

Le voci sono voci: altezza 36px, allineate a sinistra, testo `--fs-200`, **mai a piena larghezza con l'aspetto di una CTA**.

### 3.3 — `Disclosure`

Per la disclosure progressiva vera: le sezioni delle schede 360.

Resta basato su `<details>` per accessibilità, ma **il marcatore nativo `▼` va rimosso** (`summary::-webkit-details-marker { display: none }`) e sostituito da un'icona coerente. Intestazione 44px, non 75. `Esc` chiude quello aperto.

**Regola di apertura:** in ogni scheda 360, le prime **tre** sezioni sono aperte per difetto, le altre chiuse. Mai tutte chiuse.

### 3.4 — `Dialog`

Oggi ne esiste **uno solo** in tutto il prodotto. Ne serve uno vero, riusabile: `<dialog>` nativo, trappola del focus, `Esc` chiude, focus restituito all'origine, fondo oscurato.

Tre dimensioni: `sm` (conferme), `md` (creazione), `lg` (confronto).

Usato per: creazione lista, conferma pubblicazione import, conferme distruttive, e ogni azione che oggi espande un `<details>` dentro un altro.

### 3.5 — `DataTable`

**È il componente più importante di tutto il documento.** Diciassette pagine su quarantasette sono elenchi.

Oggi esiste una `<table>` sola e il catalogo non la usa: ogni riga è un contenitore flex indipendente, e le colonne si allineano solo per caso.

**Specifica:**

- Una `<table>` vera, o una griglia CSS con `grid-template-columns` **definite una volta sul contenitore**, mai per riga
- Colonne dichiarate: larghezza, allineamento, tipo (`text` · `num` · `chip` · `action`)
- Le colonne numeriche sono allineate a destra, `tabular-nums`, e **hanno tutte la stessa larghezza**
- Intestazione sticky sotto la barra superiore
- Altezza riga: **56px** su una riga di testo, **72px** su due. Uniforme dentro la stessa tabella — mai 98 e 125 mescolate
- Righe alternate: no. Bordo inferiore `--border`, hover su `--surface-alt`
- Ordinamento: sul **database**, mai in memoria dopo la paginazione (difetto già noto nel catalogo)
- Stato vuoto: usa `EmptyState`, non una riga di testo

**Nessuna immagine nelle righe.** Regola 5.3 di «Quadro», oggi disattesa: i contenitori vuoti vanno rimossi, non lasciati a occupare spazio (difetto 4).

### 3.6 — `Field`

Sostituisce 151 input nativi sparsi.

Etichetta **sopra** il campo, mai accanto. Descrizione opzionale sotto l'etichetta, `--fs-100`, `--text-secondary`. **Errore inline sotto il campo**, in `--danger`, con l'icona. Campo obbligatorio marcato nell'etichetta, non con un asterisco isolato.

Altezza 40px, raggio `--radius-sm`, bordo `--border-strong` — oggi i bordi dei campi stanno a 1,36:1 di contrasto e sono invisibili.

### 3.7 — `Select`

48 select nativi oggi. Il nativo va bene fino a 10 opzioni; oltre serve ricerca.

**E deve smettere di troncare**: «Tutte le categor» è un difetto registrato. Larghezza minima calcolata sull'opzione più lunga, o troncamento con `title` che mostra il testo intero.

### 3.8 — `Chip`

Stato, sempre con **etichetta testuale**. Mai solo colore — regola 5.1 di «Quadro»: accento e verde sono vicini in tinta e su una tabella di prezzi si confondono.

Varianti: `neutral` · `ok` · `warn` · `danger` · `info`. Fondo `--*-soft`, testo `--*`, nessun bordo.

### 3.9 — `PriceCell`

Il componente di dominio più importante, e oggi il più maltrattato.

```
23,02 €                    ← prezzo d'acquisto, --fs-300, peso 700
0,96 € / pezzo             ← normalizzato, --fs-100, --text-secondary
−6,1% · miglior prezzo     ← Chip, solo se c'è un confronto
```

**Tre regole:**

1. **Il normalizzato si mostra solo se differisce dal prezzo d'acquisto.** Oggi con confezione da 1 pezzo appaiono `23,0200 €` e `23,02 €`: lo stesso numero due volte (difetto 20)
2. **I decimali seguono l'ordine di grandezza**: 2 sopra l'euro, 4 solo sotto. `23,0200 €` è falsa precisione
3. **Il numero non è mai colorato.** Il giudizio sta nel chip accanto

### 3.10 — `JobCard`

Già specificato nella sezione 5B di `QUADRO.md`: passo corrente, avanzamento, stima residua, e l'affordance di uscita. Per import, lotti tecnici e ricezione con allegati.

### 3.11 — `EmptyState`

Oggi non uniforme: alcuni hanno una chiamata all'azione, altri no (difetto 25).

**Regola:** titolo che dice cosa manca, una riga che dice perché, **e sempre un'azione** se un'azione esiste. _«Il carrello è vuoto — Aggiungi prodotti dal catalogo»_ con il bottone. Se non c'è azione possibile, nessun bottone finto.

**Non è mai il titolo della pagina.** Tre pagine oggi hanno lo stato vuoto come `<h1>`: `/imports/[id]`, `/liste/[id]`, `/cerca`.

### 3.12 — `ErrorInline`

**Il componente che manca del tutto, ed è il difetto più grave del rilevamento.**

I dodici `throw new Error` di `buying-actions.ts` finiscono nell'error boundary, che dice _«Non è stato possibile caricare questa area — la connessione ai dati potrebbe essere temporaneamente non disponibile»_. Per un errore di input è falso e fuorviante.

I messaggi esistono e sono scritti bene: _«La nota è obbligatoria per rifiutare o chiedere chiarimenti»_. Vanno solo fatti arrivare.

**Regola: l'error boundary non deve mai vedere un errore di input.** Le server action restituiscono l'errore, non lo lanciano; la pagina lo rende accanto al campo. Il pattern esiste già in `src/app/imports/actions.ts:16-21` e va esteso a tutte.

---

## 4. GLI ARCHETIPI DI PAGINA

Quarantasette pagine, sette forme. Progettare le sette risolve le quarantasette.

### A. Elenco operativo — 17 pagine

_catalogo, prodotti, fornitori, ordini, richieste, listini, consegne, non conformità, liste, preferiti, strutture, categorie, importazioni, documenti tecnici, utenti, deleghe, requisiti_

```
Intestazione: eyebrow · titolo · una riga di contesto · azione primaria (se esiste)
Barra filtri: ricerca + max 3 filtri + "Applica"  — su una riga, mai a capo
Conteggio: "783 prodotti · pagina 1 di 98"  a sinistra; contesto a destra
DataTable
Paginazione
```

Sempre `DataTable`. Nessuna eccezione, nessuna griglia di div «perché qui è diverso».

### B. Scheda 360 — 9 pagine

_prodotto, fornitore, categoria, struttura, ordine, richiesta, listino, documento tecnico, approvazione_

Oggi: Supplier 360 ha **14 sezioni**, Product 360 dieci, tutte chiuse.

```
Intestazione: identità + stato + azione primaria
Riquadro decisione:  il numero che conta, a destra, sempre visibile
Avviso:              se c'è qualcosa che l'utente deve sapere prima di decidere
── prime 3 sezioni APERTE ──
── le altre chiuse, max 7 ──
```

**Se le sezioni sono più di dieci, la scheda va divisa in schede di navigazione**, non allungata.

**Il riquadro decisione è la novità.** Su Product 360 oggi il dato più importante — _«fornitore convenzionato +182,5% rispetto al migliore»_ — è testo grigio in fondo a una metrica. Diventa un avviso in `--warn-soft` sopra la piega: _«Il fornitore convenzionato costa il 182% in più del migliore disponibile.»_

### C. Coda di lavoro — 4 pagine

_approvazioni, revisione import, evidenze tecniche, documenti da associare_

È un elenco, ma **ordinato per ciò che va deciso prima**, non per data. Ogni riga porta: cosa decidere, l'importo o l'impatto, da quanto aspetta, e l'azione. Azioni in blocco dove ha senso.

### D. Cruscotto — 3 pagine + 5 varianti della home

`/` serve cinque profili con dodici sezioni. Va **diviso in cinque pagine distinte**, una per profilo, ciascuna con una domanda sola:

| Profilo             | La domanda                                   |
| ------------------- | -------------------------------------------- |
| Direttore RSA       | _Cosa devo comprare oggi?_                   |
| Area Manager        | _Cosa devo approvare?_                       |
| Procurement Manager | _Cosa si è rotto e dove sto perdendo soldi?_ |
| Procurement Admin   | _Chi può fare cosa?_                         |
| Finance Controller  | **da definire — oggi non esiste**            |

Max **sei** riquadri, e ogni numero deve essere cliccabile verso la sua coda. `47 problemi aperti` nero come gli altri è un allarme travestito da statistica: sopra soglia diventa un chip `warn`.

### E. Flusso guidato — 4 pagine

_carrello → richiesta, ricezione merce, nuovo import, mappatura colonne_

Passi numerati visibili, **un'azione primaria per passo**, possibilità di tornare indietro senza perdere dati. Il carrello ha oggi 5 form e 4 sezioni: diventa un passo solo con un riepilogo e un'azione.

### F. Confronto — 3 pagine

_confronto prezzi, confronto prodotti, confronto tecnico_

Sempre `DataTable` con colonne fisse. La colonna di riferimento è sticky a sinistra. Su telefono: **non una colonna verticale lunghissima** (difetto 17), ma un selettore di due elementi alla volta.

### G. Amministrazione — 5 pagine

_organizzazione, utenti, deleghe, requisiti categoria, mappature_

`DataTable` + `Dialog` per creare e modificare. Mai form inline che allungano la pagina.

---

## 5. LE DUE SCHERMATE CHIAVE, IN DETTAGLIO

### 5.1 — Catalogo

**Oggi:** 43 form, 23 campi, zero tabelle, righe alte 98-125px, colonne non allineate, la stessa immagine in ogni riga, ordinamento in memoria dopo la paginazione.

**Griglia a colonne fisse, dichiarate una volta:**

| Colonna       | Larghezza            | Allineamento | Contenuto                     |
| ------------- | -------------------- | ------------ | ----------------------------- |
| Prodotto      | `minmax(280px, 1fr)` | sinistra     | nome, marca, categoria        |
| Costo         | `140px`              | destra       | `PriceCell`                   |
| Confronto     | `160px`              | sinistra     | `Chip` con delta e motivo     |
| Fornitore     | `200px`              | sinistra     | nome, convenzionato, consegna |
| Disponibilità | `120px`              | sinistra     | `Chip`                        |
| Azione        | `180px`              | destra       | quantità + `Button primary`   |

Riga **72px** (due righe di testo), uniforme. Nessuna immagine. «Preferito» diventa un'icona nella cella Prodotto, non una colonna.

**Da 43 form a 8**: uno per riga, per l'aggiunta al carrello. Il resto passa dal `Menu`.

**Ordinamento sul database.** Oggi «ordina per prezzo normalizzato» ordina gli 8 prodotti della pagina corrente su 783: il più economico può stare a pagina 4 e non emergere mai. Su una piattaforma che vende risparmio è il difetto peggiore della lista.

### 5.2 — Product 360

**Oggi:** 10 sezioni chiuse, foto sbagliata da 270px, `INCOMPLETE` contraddetto da «0 mancanti · 0 conflitti», il +182,5% sussurrato, prezzo ripetuto tre volte.

```
┌ Intestazione ─────────────────────────────┬ Riquadro decisione ─┐
│ nome · marca · categoria · codici         │ miglior prezzo      │
│                                            │ fornitore           │
│ ⚠ Il convenzionato costa il 182% in più   │ quantità            │
│   del migliore disponibile   [Confronta]  │ [Aggiungi]          │
└────────────────────────────────────────────┴─────────────────────┘

APERTE:    Confronto offerte  ·  Evidenze tecniche  ·  Prezzi storici
CHIUSE:    Specifiche · Equivalenti · Utilizzo · Documenti · Alternative
```

**Niente foto** finché non ci sono immagini reali: oggi mostra bottiglie d'acqua per «acqua gelificata in vasetti».

**Lo stato tecnico va reso coerente.** `INCOMPLETE` con zero elementi mancanti è incomprensibile: se la categoria non ha requisiti configurati, lo stato è `NON VALUTATO` e lo si dice.

---

## 6. I PERCORSI

Conteggi rilevati e obiettivi:

| Percorso                        | Oggi                           | Obiettivo     | Come                                                                     |
| ------------------------------- | ------------------------------ | ------------- | ------------------------------------------------------------------------ |
| C1 Trova → carrello → richiesta | 5 clic, 4 caricamenti          | **3 clic, 2** | aggiunta senza lasciare il catalogo; carrello e invio in un passo        |
| C2 Riordina il mese scorso      | 5 clic, ingresso da indovinare | **2 clic**    | «Riordina» in home, con gli ultimi acquisti                              |
| C4 Chiarimento → decisione      | 7+ clic, **cambio identità**   | **4 clic**    | il richiedente risponde dalla propria richiesta, con ritorno al contesto |
| C5 Carica → rivedi → pubblica   | 6+ clic, doppio ingresso       | **4 clic**    | un solo ingresso: «Importazioni» crea, «Listini» consulta                |
| C6 Alternativa più economica    | 4 clic su 3 superfici separate | **2 clic**    | l'equivalenza vive dentro Product 360                                    |

**C4 è il peggiore**: richiede di cambiare profilo e ritrovare a mano la richiesta. È un difetto di flusso, non di grafica.

---

## 7. LE COSE CHE NON SONO GRAFICA

Emerse dal rilevamento, da decidere prima di disegnare:

1. **Finance Controller non ha un prodotto.** Una sola pagina, e le altre rotte danno 404. O si progetta il suo perimetro, o si toglie il profilo.
2. **Executive Sponsor** vede solo la Control Tower, ma ha la ricerca globale che porta a contenuti bloccati (difetti 21-22). Coerenza da ristabilire.
3. **Listini e Importazioni** sono due ingressi per lo stesso flusso (difetto 24).
4. **45 occorrenze di testo corrotto** (mojibake) con file e riga nel rilevamento. Non è grafica, è correttezza, e si vede in faccia all'utente.

---

## 8. SEQUENZA

```
0. Mojibake + controllo in CI                        mezza giornata
1. I 12 componenti, isolati, senza toccare le pagine    1 settimana
2. DataTable applicato ai 17 elenchi                    1 settimana
3. Catalogo e Product 360                               1 settimana
4. Schede 360 restanti + code di lavoro                 1 settimana
5. Cruscotti divisi per profilo                       3-4 giorni
6. Flussi guidati e riduzione clic                      1 settimana
7. Tastiera, focus, telefono                          3-4 giorni
```

**Il passo 1 non tocca nessuna pagina.** I componenti si scrivono e si verificano isolati; solo dal passo 2 si sostituisce. Così un difetto nel componente non si propaga a quarantasette pagine prima di essere visto.

I passi 5-7 di `QUADRO.md` — forma, elevazione, guardie, focus — si fanno **dentro il passo 1**, sui componenti nuovi, invece che sul CSS vecchio.

---

## 9. CRITERI DI ACCETTAZIONE

Misurabili, non opinabili:

```
<details> usati come menu o popover          49  →   0
<dialog> progettati                           1  →   1 componente, N usi
<table> o griglie con colonne dichiarate      1  →   tutti gli elenchi
varianti di bottone                           8  →   3 + 2 modificatori
form nel catalogo                            43  →   8
occorrenze di mojibake                       45  →   0, con controllo in CI
errori di input che arrivano inline           0  →   12 su 12
azioni senza stato di attesa                 ~16 →   0
righe di altezza incoerente nella stessa tabella  →  0
pagine con lo stato vuoto come <h1>           3  →   0
Esc chiude menu e dialoghi                   no  →   sì, ovunque
ordinamento elenchi                      in memoria → sul database
clic percorso C1                              5  →   3
```

---

## 10. LA DECISIONE

Tre domande, in ordine:

1. **Il principio di §2 convince?** Un comportamento, un componente. È la scelta che determina tutto il resto: l'alternativa è continuare a risolvere pagina per pagina, che è come si è arrivati a otto varianti di bottone.
2. **La sequenza di §8 va bene?** Prima i componenti isolati, poi le pagine. Più lenta all'inizio, molto più veloce dal passo 3 in avanti.
3. **Le decisioni di §7 le prendi tu.** Finance Controller e Executive Sponsor non sono problemi di grafica: sono domande su cosa sia il prodotto.

Se le risposte sono sì, questo documento diventa la specifica da consegnare insieme a `QUADRO.md`.
