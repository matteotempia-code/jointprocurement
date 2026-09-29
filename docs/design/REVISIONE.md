# Sorgence — Revisione del prodotto reale contro il canone

**29 settembre 2026.** Fatta sulle schermate del deployment `develop`, non sul codice e non
sulla memoria. Le immagini stanno nell'artefatto `visual-evidence` della pipeline, e sono
autentiche: i checksum sono diversi da quelli delle schermate versionate nel repository.

## Copertura, dichiarata

La passata ha prodotto **46 schermate**, tutte con stato HTTP 200: nessuna pagina rotta.

Ne ho esaminate **16 una per una**, scelte per coprire **tutti e nove gli archetipi e tutti e
sei i profili**:

| Archetipo     | Pagine esaminate                                                     |
| ------------- | -------------------------------------------------------------------- |
| A · Proposta  | home direttore RSA, home procurement, home controllo finanziario     |
| B1 · Ricerca  | catalogo                                                             |
| B2 · Coda     | richieste, consegne, non conformità, approvazioni area, importazioni |
| B3 · Registro | liste, utenti                                                        |
| C · Scheda    | — _(vedi sotto)_                                                     |
| D · Decisione | — _(vedi sotto)_                                                     |
| E · Confronto | confronto prezzi                                                     |
| F · Procedura | carrello                                                             |
| G · Quadro    | control tower, budget                                                |
| —             | pagina di rifiuto per ruolo, home su telefono                        |

**Le altre 30 non le ho aperte una per una.** Sono ulteriori istanze degli stessi archetipi, e i
difetti trovati sono sistemici — vengono da componenti condivisi, non da singole pagine.
Guardarle tutte adesso avrebbe prodotto lo stesso elenco più lungo, ritardando il lavoro vero.
**Ognuna verrà aperta e verificata quando il suo archetipo passa dalla riprogettazione**, come
impone il canone §8. Due archetipi, C e D, non hanno una pagina statica nella passata perché
richiedono un identificativo: vanno catturati aggiungendo alla passata una scheda e una
decisione reali.

---

## I quattro difetti che vanno chiusi prima di qualunque riprogettazione

Non sono questioni di gusto. Sono cose che un cliente vede e che tolgono credibilità al
prodotto, indipendentemente da come lo si ridisegna.

### R-01 · Il mojibake è sulla pagina dell'amministratore delegato — **critico**

La Control Tower, l'unica pagina che vede lo sponsor direzionale, mostra:
`affidabilitÃƒÂ e rischi`, `OpportunitÃƒÂ osservata`, `TOP 3 OPPORTUNITÃƒÂ`,
`Non conformitÃƒÂ operative`, `148 ritardi Ã‚Â· 62 problemi`.

La pagina Confronto prezzi ne ha una per riga: `unitÃ  normalizzata` compare **48 volte** in
una schermata, più `Â·` prima di ogni «convenzionato».

Il registro conta 45 occorrenze nel rilevamento e 51 con il pattern ampio nel solo `src`; su
`docs` e `src` insieme sono 106. **Quello che conta non è il numero: è che sono renderizzate
davanti al decisore più importante.** Lint, tsc e build non le vedono. Serve la guardia in CI
del canone §8.7, e serve una bonifica prima della prossima demo.

### R-02 · Lo stesso budget ha due valori diversi in due pagine — **critico**

Stessa utente, stessa struttura, stesso giorno:

| Dove                            | Approvato      | Utilizzato | Disponibile  |
| ------------------------------- | -------------- | ---------- | ------------ |
| Home direttore                  | 1.240.000,00 € | 88,7%      | 140.139,28 € |
| Pagina Budget, riquadro in alto | 240.000,00 €   | 41,6%      | 140.051,44 € |
| Pagina Budget, tabella in basso | 240.000,00 €   | 39,6%      | 145.000,00 € |

Tre numeri diversi per la stessa cosa, di cui due sulla stessa schermata. Possono essere misure
tecnicamente diverse — speso contro speso+impegnato, perimetro struttura contro perimetro
approvato — ma **nessuna delle tre dice cosa misura**, e quindi il direttore non sa a quale
credere. È la Legge 3 violata nel punto in cui fa più danno: il numero su cui si decide.

Va indagato in codice prima di ridisegnare: se è un difetto di calcolo è un difetto di calcolo,
e nessuna grafica lo sistema.

### R-03 · Dati di collaudo visibili in un ambiente mostrato ai clienti — **alto**

- Registro utenti: `Utente aggiornato 593985430-1-dc977f5c`, `m117-…@demo.local`, «Non attivo».
- Importazioni: `offerta-caresupply-sporca.csv`, `certificazione-procurement-ui.xlsx`,
  `remote-cert-65439a70-9305-44f2-9517-30671143b911.csv`.
- Ovunque: `Forniture Regionali Demo 033`, `Struttura territoriale demo 068`,
  `CERT M11 Limited Product`, `CERT M11 Lifecycle Supplier`.
- Importazioni datate **05 ott 2026**, cioè nel futuro rispetto al giorno della passata.

Le certificazioni remote scrivono nel database di sviluppo e non ripuliscono tutto. Esiste già
`qa:certification:cleanup`: va esteso e reso obbligatorio a fine pipeline.

### R-04 · L'inglese affiora nei punti peggiori — **alto**

- **La pagina di rifiuto per ruolo è interamente in inglese**: «UNAVAILABLE», «This view is
  outside your current role or scope», «The demo applies the same role and scope boundaries
  that future authentication will enforce», «Return home». È la prima cosa che un utente legge
  quando sbatte contro un confine di permessi, e per giunta espone un dettaglio di
  implementazione della demo.
- Registro utenti: i ruoli sono `Area Manager`, `Executive Sponsor`, `Finance Controller`,
  `RSA Director`, `Procurement Administrator`.
- Evidenze tecniche: il campo file nativo dice `Choose Files 100 files`.
- Control Tower: `85.5%`, `1028.2%` con il punto decimale inglese, accanto a `34.717,70 €` con
  la virgola italiana. Due convenzioni sulla stessa schermata.
- Registro utenti, occhiello: `IDENTITA E POTERI`, senza accento.

---

## Il difetto di pensiero, che vale più di tutti i precedenti

### R-05 · Il prodotto elenca record dove la persona pensa per gruppi — **critico**

Non è un difetto grafico. È il motivo per cui ogni coda del prodotto è illeggibile.

| Pagina               | Cosa mostra                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Richieste d'acquisto | 20 righe, **tutte** con stato «Approvata», passo «Ordine disponibile», totale «29,28 €», e la stessa identica frase di policy ripetuta venti volte |
| Non conformità       | 20 righe, **tutte** «Prodotto danneggiato · Acqua gelificata limone 24 vasetti · Imballo danneggiato alla consegna · Tavola Comune»                |
| Consegne             | ~16 righe consecutive, **tutte** «Tavola Comune · 12 set 2026 · 90,17 €»                                                                           |
| Importazioni         | 8 righe consecutive, **tutte** «offerta-caresupply-sporca.csv · 18 righe · 18 da verificare»                                                       |
| Catalogo             | lo stesso prodotto cinque volte come «variante 2», «variante 3», «variante 4», «variante 5»                                                        |

Venti colli danneggiati dello stesso prodotto, dello stesso fornitore, nella stessa consegna,
**non sono venti problemi: sono un problema**. Quaranta consegne in ritardo dello stesso
fornitore sono una conversazione da avere con quel fornitore, non quaranta righe da scorrere.

Finché il prodotto non raggruppa, nessuna riprogettazione grafica salverà quelle pagine: si
ottiene solo un elenco brutto reso in bei colori. **Il raggruppamento va progettato come
funzione**, e va nel canone come regola dell'archetipo B2.

---

## Difetti per archetipo

### A · Proposta — le tre home

**La Legge 2 è rovesciata su tutte e tre.** La home del direttore ha come protagonista un campo
di ricerca che chiede «Cosa ti serve oggi, Lucia?». Il prodotto **chiede** invece di
**proporre**. La home del procurement elenca cinque contatori. Quella del controllo finanziario
mostra tre numeri e niente altro.

**Nessuna azione primaria, su nessuna delle tre.** Il direttore ha quattro riquadri identici con
la freccia — Nuovo acquisto, Controlla ordini, Registra consegna, Analizza budget. Il
procurement ne ha tre. Quattro azioni di pari peso significano nessuna azione.

**Contatori senza verdetto e senza porta:** «6 ordini in ritardo», «55 problemi aperti»,
«768 Anomalie di prezzo». Numeri che non dicono se è grave e non portano da nessuna parte.

**Il budget all'88,7% è verde.** La semantica del colore è invertita: a quel livello serve
l'attenzione.

**Cosa tenere e promuovere:** «Le scorte che riordini più spesso» esiste già sulla home del
direttore. È il seme della proposta. Non va aggiunta, va messa al centro.

### B1 · Ricerca — il catalogo

- **784 prodotti, pagina 1 di 98.**
- **Le righe non si allineano**, ed è visibile: nelle prime due il prezzo sta su una riga, dalla
  terza va a capo in tre righe e l'altezza passa da ~98 a ~125 px. È la conseguenza diretta del
  fatto che non esiste una tabella: ogni riga è un contenitore a sé.
- **Prezzi a quattro decimali**: `23,0200 € / pezzo`, `0,4944 € / litro`. Precisione inutile che
  sembra un errore.
- **La normalizzazione gira a vuoto**: «Confezione da 1 pezzo» con prezzo unitario identico al
  prezzo confezione, su una riga dedicata. `QUADRO.md` §5.7 lo vieta già: il prezzo normalizzato
  compare solo quando aggiunge informazione.
- **Tutte le fotografie sono la stessa**: la stessa immagine di bottiglie d'acqua compare anche
  sull'acqua gelificata. Immagini segnaposto presentate come foto di prodotto.
- **«Prezzi IVA esclusa»**, in grigio piccolo in alto a destra. Il costo che conta per una RSA è
  quello con l'IVA indetraibile dentro.
- Otto campi quantità e otto bottoni «Aggiungi» nella stessa schermata.

### B2 · Coda — richieste, consegne, non conformità, importazioni, approvazioni

Oltre a R-05:

- **Dimensioni fuori scala:** consegne **4.811 px** di altezza, non conformità **4.209 px**,
  importazioni **5.005 px**. Tre metri di scorrimento per una coda.
- **La colonna delle azioni è tagliata** sulla destra in Consegne: «Ricevi» esce dal contenitore.
- **Contatori a zero tenuti in pagina**: «0 Oggi», «0 Prossime», «0 In valutazione», «0 Alta
  priorità», «0 sopra la soglia Procurement».
- **Sezioni vuote tenute in pagina**: «Oggi» e «Prossime» dicono entrambe «Nessuna consegna in
  questa sezione» e occupano spazio.
- **Filtri che richiedono «Applica»** invece di reagire.
- **Paginazione ovunque**, anche dove non serve: le approvazioni di area sono 12 e stanno su
  due pagine da 8.
- **La scheda arriva altrove:** ogni riga finisce con una freccia che porta via. L'archetipo B2
  vuole il dettaglio a destra e la decisione lì.

**L'eccezione da imitare — Approvazioni di area.** Questa pagina fa quasi tutto giusto: un
verdetto in testa («12 decisioni oltre SLA — La più anziana attende da 60 giorni»), un'azione
per restringere, l'ordinamento per anzianità, i giorni di attesa in ambra, e il motivo per ogni
riga. Dimostra che il livello è raggiungibile con i componenti che già esistono. Le manca solo
la decisione dentro la pagina.

### B3 · Registro — liste, utenti

- **Utenti è la pagina meglio fatta del prodotto**: tabella vera, colonne allineate, una sola
  primaria, ambito e stato come chip, una azione per riga.
- **Liste ha un difetto di impaginazione grave**: un terzo dello schermo è vuoto sopra il
  titolo, e ogni riga occupa 210 px per una riga di contenuto.
- **Nessuno dei due mette in testa quello che non è in ordine**: in Utenti la persona «Non
  attiva» è l'ultima riga, non la prima.
- **Due etichette per la stessa azione**: «Aggiungi» nel catalogo, nella home e nei preferiti;
  «Aggiungi al carrello» nelle liste e nella scheda prodotto.

### E · Confronto — confronto prezzi

- **66 pagine** di confronti.
- **Differenze del 205%, 224,5%, 226,5%** fra fornitori dello stesso prodotto, presentate senza
  alcun avviso. O il dato è sporco o la normalizzazione è sbagliata: in entrambi i casi non si
  può mostrare così.
- **Nessuna azione.** È un muro di numeri con niente da fare. L'archetipo E vuole «Sostituisci
  nei riordini».
- Confronta le «varianti» dello stesso prodotto fra loro, quindi confronta il prodotto con sé
  stesso invece che con le alternative vere.
- Il chip «Migliore» è la cosa giusta: va tenuto.

### F · Procedura — carrello

- Lo stato vuoto è quasi corretto: dice cosa manca, come uscirne e ha una sola azione. Ma offre
  tre strade nel testo e un bottone.
- Il resto della schermata è vuoto: la scheda occupa il terzo superiore.

### G · Quadro — control tower, budget, home controllo finanziario

- Oltre a R-01 e R-02: **nessuna delle tre ha un verdetto in una frase**. «Valore, affidabilità
  e rischi in una lettura di 30 secondi» è una promessa, non un verdetto.
- **Percentuali prive di senso**: «Carta forno 50 metri — 1028,2%» come prima opportunità.
- **Nessuna provenienza** sotto nessun numero.
- **Nessuna porta**: la Control Tower non porta da nessuna parte.
- «Rete congiunta — Anteo e Coopselios» mostra una sola delle due organizzazioni e lascia
  l'altra metà vuota.
- La home del controllo finanziario è **già di fatto un quadro** — tre numeri, niente da
  cliccare — e conferma che la decisione §7.1 è quella giusta. Le manca il verdetto, la
  provenienza e la porta. E le avanza il riquadro «Prossima attivazione: riconciliazione
  fatture», che è materiale di vendita dentro il prodotto.

### Telefono

- Il telefono rende bene: intestazione compatta, ricerca, numeri leggibili.
- **Ma non c'è niente da fare**: la schermata catturata mostra tre numeri e il 90% vuoto.
- _Difetto della mia passata, non del prodotto:_ le pagine del telefono usano l'ultimo profilo
  selezionato — l'amministratore — invece del direttore di struttura, che è chi il telefono lo
  usa davvero. Da correggere in `tests/visual-walk.mjs`.

---

## Cosa conferma il canone, e cosa gli aggiungo

**Confermato dalle prove:** i token sono vivi e corretti su tutte le pagine — avorio, verde
acqua, bordi caldi, i due caratteri. La correzione del serif funziona: una sola frase per
schermata. Nessuna pagina risponde male.

**Due cose che sembravano difetti e non lo sono, verificate invece che segnalate:**
`4860,72 €` senza separatore è l'italiano corretto, perché in italiano il raggruppamento parte
da cinque cifre; e i titoli di sezione che sembravano serif sono IBM Plex Sans a 600.

**Da aggiungere al canone, archetipo B2:** la regola del raggruppamento (R-05). Una coda non
elenca record: raggruppa per la cosa che l'utente deve decidere, e mostra il conteggio dentro
il gruppo.

**Da aggiungere ai criteri di accettazione §8:** nessun contatore a zero tenuto in pagina;
nessuna sezione vuota tenuta in pagina; nessuna pagina oltre i 3.000 px senza raggruppamento;
nessun dato di collaudo visibile.

---

## Ordine di lavoro che ne esce

1. **R-01, R-03, R-04** — mojibake, dati di collaudo, inglese. Non richiedono riprogettazione,
   richiedono una bonifica e tre guardie in CI. Vanno fatti prima della prossima demo.
2. **R-02** — indagare in codice la discordanza del budget. Se è un difetto di calcolo nessuna
   grafica lo sistema.
3. **R-05** — progettare il raggruppamento delle code. È funzione, non grafica, e cambia cosa
   si disegna.
4. Poi le pagine, nell'ordine di `PAGINE.md`: home del direttore, decisione, ricerca, scheda
   prodotto, e il resto per archetipo.
