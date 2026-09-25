# Sorgence — Canone di prodotto e di interfaccia

**Stato: vincolante.** Approvato da Matteo Tempia il 25 settembre 2026 sulla base della tela
«Sorgence ripensato». Vale per ogni pagina esistente e per ogni pagina futura.

Questo documento ha la precedenza su ogni altro documento di design. In particolare:

| Documento | Cosa resta valido | Cosa è superato |
| --- | --- | --- |
| `docs/design/QUADRO.md` | §3 caratteri (la trappola `--font-sans`), §4 mappatura tipografica, §5 regole 5.1–5.8, §5B stati di attesa, §6 Tailwind, §7 guardie, §10 criteri | §2 **i valori** dei token (sostituiti dalla §2 qui sotto). L'architettura degli slot resta identica. |
| `docs/design/RILEVAMENTO.md` | tutto: è il rilevamento dei fatti, non una proposta | niente |
| `docs/design/RIPROGETTAZIONE.md` | i dodici componenti come elenco di lavoro | l'impostazione: era una bonifica del prodotto esistente, non una riprogettazione. Assorbito qui. |

Riferimento visivo: la tela **Sorgence ripensato**, otto schermate.
Dove il canone e la tela divergono, vince il canone, perché la tela usa misure ottiche
intermedie (12,5 px, 13,5 px) che qui sono riportate ai gradini reali — vedi §3.

---

## 1. LE SEI LEGGI

Una legge non è uno slogan: ha un divieto e una prova. Se non si può verificare, non è una legge.

### Legge 1 — Una schermata, una cosa da fare

Ogni pagina esiste per far compiere **una** azione. Quella azione ha un bottone pieno, alto
48 px. Tutto il resto è secondario, silenzioso o distruttivo.

- **Vieta:** due o più bottoni pieni nella stessa vista; un bottone primario dentro un menu,
  una riga di tabella o una cella; un form di una sola voce reso come CTA a piena larghezza.
- **Prova:** in ogni rotta renderizzata esiste esattamente un elemento con `data-primary="true"`.
  Il difetto emblematico di oggi è
  [product-actions-menu.tsx](src/components/product-actions-menu.tsx): ogni voce del menu è un
  `<form>`, quindi eredita il bottone grande, e il menu contiene un `<details>` dentro un
  `<details>`. Nessuno dei due deve più essere possibile.

### Legge 2 — Prima la proposta, poi la ricerca

Il prodotto **propone** e l'utente conferma. Chi lavora in una RSA non sfoglia un catalogo:
ricompra quello che compra ogni mese. La ricerca serve per le eccezioni, non per il lavoro
normale.

- **Vieta:** una home che sia un cruscotto di riquadri; un elenco paginato come punto di
  partenza di un compito ricorrente; chiedere all'utente di costruire da zero qualcosa che il
  sistema sa già ricostruire.
- **Prova:** per ogni profilo, il compito ricorrente principale si chiude in **≤ 2 clic** dalla
  home, senza passare da una ricerca. Oggi: catalogo → carrello → richiesta sono 5 clic e 4
  caricamenti di pagina (misurati, `RILEVAMENTO.md` §C1).

### Legge 3 — Ogni numero dice da dove viene

Un risparmio, una previsione, una percentuale, una quantità proposta: ognuno porta con sé la
sua fonte, in una riga leggibile senza aprire nulla.

- **Vieta:** cifre senza provenienza; «AI suggerisce» senza dire su cosa; un risparmio annuo
  senza il periodo e il volume su cui è calcolato; un'equivalenza senza dire quali attributi
  combaciano **e quale no**.
- **Prova:** ogni numero generato dal sistema ha, entro 40 px, una didascalia di provenienza
  (`da scheda tecnica`, `dai vostri ordini`, `stima su 14 mesi`). Un'equivalenza mostra sempre
  anche la differenza residua.

### Legge 4 — Ogni attesa dice cosa sta facendo e quanto manca

Vincolo di prodotto già in registro (UX-05). Nessuna attesa è muta. Nessuna attesa blocca.

- **Vieta:** spinner senza testo; barre senza stima; pagine che si devono tenere aperte; un
  lavoro lungo che non si possa lasciare e riprendere.
- **Prova:** i tre componenti di `QUADRO.md` §5B (bottone in attesa 1–10 s, scheda di lavoro
  oltre 10 s, barra con stima) coprono il 100% delle attese. Oltre i 10 secondi la schermata
  dice anche **cosa si può già fare nel frattempo** — vedi la tela, *L'attesa che si spiega*:
  le 12 righe dubbie si decidono mentre le altre 3.168 stanno ancora girando.

### Legge 5 — Niente cambi di profilo per finire una cosa cominciata

Un compito iniziato da un profilo si chiude con quel profilo.

- **Vieta:** un flusso che richieda di uscire e rientrare come qualcun altro; un rimando a una
  pagina che il profilo corrente non può aprire; un permesso mancante scoperto a metà strada.
- **Prova:** nessun percorso nella matrice profilo × archetipo (§5) attraversa un confine di
  ruolo. Oggi il chiarimento di una richiesta lo attraversa: 7 clic **e** un cambio profilo
  (`RILEVAMENTO.md` §C4). Se un compito richiede due persone, il prodotto lo dice all'inizio e
  passa la palla in modo esplicito, con nome e cognome.

### Legge 6 — Si può sempre tornare indietro, e il prodotto lo dice prima

- **Vieta:** azioni irreversibili senza dirlo prima; conferme modali che non spiegano cosa si
  perde; «sei sicuro?» al posto di un annullamento.
- **Prova:** ogni azione che scrive dichiara nella sua area, **prima** del clic, fino a quando
  è reversibile («Niente parte prima di giovedì alle 18:00»). Dove non è reversibile, lo dice
  con la stessa chiarezza, e allora — solo allora — chiede conferma.

---

## 2. I TOKEN — VALORI VINCOLANTI

Gli slot sono quelli già in `src/app/design-system.css`. Cambiano i valori. Nessun colore
letterale fuori da questi due blocchi.

### 2.1 Tema chiaro — `:root`

```css
--bg:              #FBFAF7;   /* avorio caldo: il fondo di tutto */
--surface:         #FFFFFF;   /* schede, righe, campi */
--surface-alt:     #F4F1EA;   /* pannelli quieti, intestazioni di gruppo */
--surface-ink:     #141618;   /* pannello invertito: un solo uso per schermata */

--text:            #141618;
--text-secondary:  #545B63;   /* 6,8:1 su --bg */
--text-muted:      #6E767E;   /* 4,6:1 su --bg — ammesso solo ≥ 13 px e mai per dati */
--text-on-ink:     #FBFAF7;
--text-on-ink-2:   #C9C5BC;

--border:          #E6E2DA;
--border-strong:   #D5CFC4;

--accent:          #0B5D51;   /* l'azione. bianco sopra: 7,7:1 */
--accent-hover:    #094C43;
--accent-soft:     #E7F0ED;
--accent-on-soft:  #0B5D51;

--ok:              #1F6B45;   --ok-soft:      #E4F0E8;
--warn:            #8A4B0F;   --warn-soft:    #F7EDE0;
--danger:          #8C2F23;   --danger-soft:  #F8E9E6;
--info:            #1B4D7A;   --info-soft:    #E5EDF5;
```

### 2.2 Tema scuro — `:root[data-theme="dark"]` e `@media (prefers-color-scheme: dark)`

```css
--bg:              #141310;
--surface:         #1C1A17;
--surface-alt:     #24221E;
--surface-ink:     #F2F0EA;

--text:            #F2F0EA;
--text-secondary:  #A8A49B;
--text-muted:      #8B877E;
--text-on-ink:     #141310;
--text-on-ink-2:   #4A463F;

--border:          #302D28;
--border-strong:   #4A463F;

--accent:          #5FC8B4;   /* 9,5:1 su --bg */
--accent-hover:    #7BD8C6;
--accent-soft:     #0E2B26;
--accent-on-soft:  #5FC8B4;
--accent-on:       #062B25;   /* testo sopra un riempimento --accent */

--ok:              #6FCB8E;   --ok-soft:      #10281A;
--warn:            #E3A867;   --warn-soft:    #2C2013;
--danger:          #F08A7D;   --danger-soft:  #301A17;
--info:            #7FB4EE;   --info-soft:    #12253A;
```

> **Trappola nota, già verificata sul campo:** i token dichiarati dentro `@theme` di Tailwind v4
> sono **statici** e non seguono `[data-theme]`. `@theme` può soltanto **puntare** a queste
> variabili (`--color-accent: var(--accent)`), come già fa oggi. Non duplicare i valori là.

### 2.3 Spazio, raggi, ombre, movimento

Spazio: invariato — `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.

Raggi: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, più **una aggiunta**
`--radius-full: 999px` per pillole e avatar. Nessun altro valore.

Ombre — **una regola, non un gusto**: il bordo sta sotto l'ombra, non al suo posto
(`QUADRO.md` §5.2).

```css
--shadow-1: 0 1px 2px rgba(20, 22, 24, 0.04);   /* schede: bordo + questa, o solo bordo */
--shadow-2: 0 8px 24px rgba(20, 22, 24, 0.10);  /* solo menu, popover, dialoghi */
```

Movimento:

```css
--motion-fast: 120ms;   --motion-base: 200ms;
--motion-ease: cubic-bezier(0.2, 0, 0, 1);
```

Nessuna transizione oltre 300 ms. `@media (prefers-reduced-motion: reduce)` azzera tutto.

---

## 3. CARATTERI E MISURE

Due caratteri, sette gradini.

- **Display — `Instrument Serif`.** Solo per i numeri che decidono e per **una** frase per
  schermata. Se compare due volte, non conta più nessuna delle due.
- **Testo — `IBM Plex Sans`**, pesi 400/500/600. Nessun altro peso.
- Ogni cifra confrontabile: `font-variant-numeric: tabular-nums`. Senza eccezioni.

Caricamento: entrambi con `next/font`, esposti come `--font-display` e `--font-body`.
**Non riusare `--font-sans`**: Tailwind lo definisce già e collide (`QUADRO.md` §3).

### Gradini

| Token | Valore | Uso |
| --- | --- | --- |
| `--text-fs-100` | 12 px | etichetta, nota a margine, provenienza |
| `--text-fs-200` | 14 px | dettaglio, fornitore, confezione, meta di riga |
| `--text-fs-300` | 16 px | corpo, nome del prodotto, voce di elenco |
| `--text-fs-400` | 18 px | titolo di scheda |
| `--text-fs-500` | 23 px | titolo di sezione |
| `--text-fs-600` | 30 px | titolo di pagina, display |
| `--text-fs-700` | 42 px | **nuovo** — display, un solo uso per schermata |

### Come leggere la tela

La tela usa misure intermedie per ragioni ottiche. In codice si riportano così, e non si
inseguono i decimali:

| Sulla tela | In codice |
| --- | --- |
| 11,5 – 12,5 px | `--text-fs-100` (12) |
| 13 – 14,5 px | `--text-fs-200` (14) |
| 15 – 16 px | `--text-fs-300` (16) |
| 18 – 22 px | `--text-fs-400` (18) |
| 23 – 30 px | `--text-fs-500` (23) |
| 30 – 38 px | `--text-fs-600` (30) |
| 40 – 44 px | `--text-fs-700` (42) |

**Conseguenza da governare, non da subire:** le righe dati diventano 1–2 px più alte della
tela, perché il meta passa da 12,5 a 14. È previsto. Non si compensa riducendo il padding
sotto 10 px.

Raggi, allo stesso modo: `6–9 → sm`, `10–14 → md`, `15–19 → lg`, pillole e avatar → `full`.

---

## 4. L'INSIEME CHIUSO DEI COMPONENTI

Questi, e nessun altro. Un bisogno nuovo si risolve **prima** discutendo se è davvero nuovo.

**Azione**
1. `Button` — quattro varianti e tre sole altezze: `primary` 48, `secondary` 44, `quiet` 36,
   `danger` 44. Un solo `primary` per schermata (Legge 1).
2. `IconButton` — 44 × 44 minimo, `aria-label` obbligatorio.
3. `Menu` — pannello con intestazione, voci alte 36, separatori, tastiera (`Esc`, `↑↓`,
   `Invio`). **Mai** un `Menu` dentro un `Menu`: una voce che apre altro apre un `Sheet`.
4. `Sheet` / `Dialog` — `--shadow-2`, un solo livello, `Esc` chiude, focus intrappolato.

**Dati**
5. `DataRow` — la riga di elenco: mediana 40 px, identità, meta, chip, numeri allineati a
   destra su colonne di larghezza fissa. È **una griglia**, non otto flex indipendenti. Il
   difetto strutturale di oggi: nel catalogo renderizzato non esiste nessun `<table>` e ogni
   riga è un contenitore a sé, per questo le colonne non si allineano.
6. `DataTable` — un solo componente condiviso, quello di
   [ui.tsx:227](src/components/ui.tsx:227), il cui `<table>` è l'unico vero del prodotto.
   Ordinamento sul database, non nel browser.
7. `Chip` — variazione e stato su fondo tenue, mai testo colorato nudo (`QUADRO.md` §5.4).
8. `Metric` — cifra display + etichetta + **provenienza** (Legge 3). Senza provenienza non si
   monta.
9. `Sparkline` — andamento a 12 punti, `role="img"` con `aria-label` che dice il fatto in
   parole.
10. `PriceBlock` — i due livelli di prezzo in un'area propria (`QUADRO.md` §5.5): prezzo unitario
    normalizzato in evidenza, prezzo di confezione sotto, IVA e detraibilità dichiarate.
11. `CompareGrid` — griglia a colonne fisse, mai colonne che si autodimensionano
    (`QUADRO.md` §5.6).

**Attesa e vuoto**
12. `PendingButton` — 1–10 s (`QUADRO.md` §5B.2).
13. `WorkCard` — oltre 10 s: passi, percentuale, stima, «puoi chiudere questa pagina», e
    l'elenco di cosa si può già fare (`QUADRO.md` §5B.3–5B.5).
14. `EmptyState` — tre parti obbligatorie: cosa manca, perché è normale, l'unica azione per
    uscirne. Nessun vuoto senza azione.
15. `ErrorState` — cosa è andato storto, se i dati sono salvi, cosa fare adesso. L'errore è
    parte del componente di attesa, non una pagina a parte (`QUADRO.md` §5B.7).

**Struttura**
16. `Rail` — navigazione a icone 76 px, `aria-label` su ogni voce, pallino di notifica.
17. `PageHeader` — contesto a sinistra, ricerca `⌘K` a destra, **niente** titolo ripetuto se la
    pagina ha già un display.
18. `ProposalCard` — il pannello di conferma: totale, confronto, budget, primario, reversibilità.

---

## 5. I NOVE ARCHETIPI, E LE 47 PAGINE

Ogni pagina appartiene a **un** archetipo. Una pagina che non ci sta dentro non è un nuovo
archetipo: è una pagina da ripensare.

### A — Proposta *(la home di ogni profilo)*

La cosa che oggi ti tocca fare, già preparata, con un bottone per confermarla. Struttura:
display di una riga che dice il fatto → le 3–5 righe che cambiano, ognuna con il suo perché →
`ProposalCard` a destra → **massimo due** voci «serve una tua decisione».

Vieta: riquadri di cortesia, contatori che non portano da nessuna parte, più di due inviti.

| Pagina | Profilo | Cosa diventa |
| --- | --- | --- |
| `/` | RSA_DIRECTOR | il riordino del mese da confermare — *tela: Oggi* |
| `/` | AREA_MANAGER | le decisioni delle sue strutture, in una coda sola |
| `/` | PROCUREMENT_MANAGER | i listini scaduti e le variazioni da accettare |
| `/` | PROCUREMENT_ADMIN | ciò che blocca gli altri: deleghe scadute, utenti senza potere |
| `/` | FINANCE_CONTROLLER | **decisione aperta** — §7 |
| `/control-tower` | EXECUTIVE_SPONSOR | archetipo G, non A: non conferma, legge |

### B1 — Ricerca *(cerchi una cosa fra tante, e sai più o meno cosa)*

Campo grande in alto, filtri come pillole su una riga (non una colonna), risultati **in tre
gruppi**: «quello che comprate di solito» → «equivalenti più convenienti» → «tutto il resto».
Prezzi normalizzati all'unità. Nessuna paginazione: si carica scorrendo.

Vieta: 98 pagine di catalogo; una colonna di filtri a sinistra; un risultato senza prezzo
unitario confrontabile.

`/cerca` · `/catalog` · `/products` · `/suppliers` · `/price-lists` · `/technical-documents`
— *tela: Cercare, non sfogliare*

> Correzione del 25/09/2026: `/technical-products` era assegnato qui leggendo solo la rotta.
> Il codice dice altro — filtra `status: { not: "COMPLETE" }` e ordina per completezza
> crescente: è una coda di lavoro, non una ricerca. Spostato in B2.

### B2 — Coda di lavoro *(un elenco di cose che aspettano una tua decisione)*

Due pannelli: la coda a sinistra (pallino di non letto, titolo, la cifra che conta, età), la
cosa aperta a destra con le sue prove e le sue azioni. Si lavora dall'alto verso il basso
senza tornare all'elenco.

Vieta: una tabella da cui bisogna uscire per agire; un contatore senza la coda dietro.

`/approvals` · `/richieste` · `/non-conformita` · `/consegne` · `/imports` · `/orders` ·
`/technical-products` — *tela: Risparmi (la stessa forma, contenuto diverso)*

### B3 — Registro *(amministri un insieme finito e lo tieni in ordine)*

`DataTable` vero, colonne fisse, ordinamento sul database, una riga di azioni per riga, una
sola azione primaria in testa. Non è una ricerca e non è una coda: è manutenzione.

Vieta: trasformarlo in ricerca; nascondere le azioni dentro un menu a tendina annidato.

`/categorie` · `/facilities` · `/users` · `/deleghe` · `/organization` · `/liste` ·
`/preferiti` — *artboard da disegnare: **Registro***

### C — Scheda *(il passaporto di una entità)*

Identità in alto con la cifra che conta in display, `PriceBlock`, poi tre colonne: andamento
nel tempo · alternative · chi la usa e i documenti. Pannello di azione a destra, con la
quantità già proposta e il motivo della proposta.

Vieta: accordion impilati; documenti nascosti in fondo; il costo senza IVA e detraibilità.

`/products/[id]` · `/suppliers/[id]` · `/price-lists/[id]` · `/facilities/[id]` ·
`/technical-documents/[id]` · `/categorie/[id]` · `/liste/[id]` · `/orders/[id]`
— *tela: Il passaporto del prodotto*

### D — Decisione *(una cosa, due risposte)*

Una schermata sola: chi chiede, cosa, **con le sue parole**, cosa cambia se dici sì (budget,
costo effettivo, data in reparto), l'alternativa se esiste, e in fondo due bottoni e una
scorciatoia da tastiera.

Vieta: 7 clic; un cambio profilo; una decisione che richieda di aprire altre tre pagine.

`/approvals/[id]` · `/requisitions/[id]` · `/imports/[id]/records/[recordId]`
— *tela: Una decisione, una schermata*

### E — Confronto *(due o più cose, attributo per attributo)*

`CompareGrid` a colonne di larghezza fissa. Le righe che **differiscono** vengono prima; quelle
identiche si comprimono in una riga sola «21 attributi identici». Una colonna è il riferimento
e lo dice.

Vieta: colonne che si autodimensionano; differenze segnalate solo dal colore; testo che va a
capo in tre righe in una cella (difetto misurato allo step 4).

`/compare` · `/compare-products` · `/technical-compare` · `/technical-requirements`
— *artboard da disegnare: **Confronto***

### F — Procedura *(più passi, e alla fine si scrive qualcosa)*

Passi visibili sempre, con quello corrente aperto e i successivi stimati. Si può uscire e
riprendere. L'ultimo passo dice cosa succede quando si conferma e fino a quando si disdice.

Vieta: un passo che non dice quanto dura; un carrello che si costruisce a mano quando il
sistema sa già cosa serve; un wizard che perde il lavoro se chiudi.

`/imports/new` · `/imports/[id]` · `/imports/[id]/mapping` · `/imports/[id]/changes` ·
`/imports/[id]/summary` — *tela: L'attesa che si spiega*
`/cart` — assorbito dall'archetipo A: il carrello non si costruisce, si corregge
`/orders/[id]/receive` — *artboard da disegnare: **Ricevimento**, e nasce sul telefono*

### G — Quadro *(si legge, non si clicca)*

Per chi guarda dieci secondi e vuole sapere se c'è un problema. Una frase che dà il verdetto,
tre `Metric` con provenienza, un andamento, e **una** porta verso il dettaglio.

Vieta: griglie di KPI senza verdetto; un grafico senza la frase che lo spiega; link verso
pagine che il profilo non può aprire (Legge 5).

`/control-tower` · `/budget` · `/demo-roadmap` — *artboard da disegnare: **Quadro***

### H — Accesso

`/login`. Un campo, un bottone, un messaggio d'errore che dice cosa fare. 41 righe, e devono
restare poche.

### Copertura

47 pagine: A 1 · B1 6 · B2 7 · B3 7 · C 8 · D 3 · E 4 · F 7 · G 3 · H 1 = **47**.
Nessuna pagina fuori. Ogni pagina futura dichiara il suo archetipo prima di essere scritta.

---

## 6. IL PAVIMENTO DI ACCESSIBILITÀ

Non è una rifinitura: è una condizione di consegna.

- Contrasto testo 4,5:1, oppure 3:1 da 24 px in su. Il grigio delle didascalie e i riempimenti
  sotto testo bianco sono i due punti che falliscono più spesso.
- Due cose che vanno distinte differiscono anche di **luminosità**, non solo di tinta. Mai
  rosso/verde come unica differenza: in reparto si legge di corsa, su schermi tarati male.
- Bersagli tattili ≥ 44 px.
- Elementi veri: `<button>`, `<a href>`, `<input>` con `<label>`. Mai `role` o `onClick` su un
  `div` o uno `span`: il tasto Tab non li vede.
- `aria-label` su ogni bottone di sola icona; `role="img"` + `aria-label` su ogni grafico.
- Nessuna barra di stato finta, nessun contenuto decorativo che finga di essere dato.

---

## 7. QUATTRO DECISIONI CHE SONO TUE

Il canone non le decide perché sono scelte di prodotto, non di grafica. Ognuna ha una
raccomandazione.

1. **Il perimetro di FINANCE_CONTROLLER.** Oggi la sua navigazione è una sola voce, «Home»
   ([roles.ts:67](src/lib/roles.ts:67)): un profilo che esiste e non ha dove andare.
   *Raccomando:* una pagina sola, dell'archetipo G, che risponda «stiamo spendendo come
   previsto?», e 404 su tutto il resto — meglio un perimetro piccolo e vero che sei voci vuote.
2. **La ricerca globale di EXECUTIVE_SPONSOR.** `⌘K` può restituire cose che il profilo non
   può aprire. *Raccomando:* la ricerca mostra solo ciò che il profilo può aprire, altrimenti
   viola la Legge 5 al primo tasto.
3. **`/catalog` e `/cerca` sono due porte per la stessa stanza.** *Raccomando:* una sola,
   `/cerca`, con B1; `/catalog` reindirizza. Due porte vogliono dire due manutenzioni e due
   grafiche che divergono, che è esattamente come siamo arrivati a otto varianti di bottone.
4. **`/liste` e `/preferiti`, idem.** *Raccomando:* «Preferiti» diventa una lista come le
   altre, con un'icona diversa. Una struttura, non due.

Finché non decidi, disegno entrambe le porte con la stessa forma, così la scelta resta
economica in qualunque momento.

---

## 8. CRITERI DI ACCETTAZIONE

Automatici — se non si possono misurare, non si dichiarano fatti:

1. Zero colori letterali fuori dai due blocchi di token della §2.
2. Zero `font-size` fuori dai sette gradini della §3.
3. Zero `border-radius` fuori dai quattro valori della §2.3.
4. Esattamente un `data-primary="true"` per rotta renderizzata.
5. Zero `<details>` dentro `<details>`; zero `<form>` che produce un bottone a piena larghezza
   dentro un menu.
6. Zero `role`/`onClick` su `div` o `span`; ogni bottone di sola icona ha `aria-label`.
7. Zero occorrenze di doppia codifica UTF-8. Il rilevamento ne registra 45 con riga e file; una
   ricerca del 25 settembre con un pattern più ampio (`Ã.`, `â€.`, `Â·`) ne trova 51 — le due
   misure non sono in contraddizione, cercano cose diverse, e la guardia in CI deve usare il
   pattern ampio. Un commit «solo formattazione» ne ha **aggiunte** 6: lint, tsc e build non le
   vedono.
8. Ogni `Metric` ha una provenienza non vuota.

A mano, per ogni pagina, prima di dirla finita:

9. Qual è l'unica cosa che questa pagina serve a fare? Il bottone alto 48 px è quella?
10. Il compito ricorrente si chiude in ≤ 2 clic dalla home?
11. Ogni attesa dice cosa fa, quanto manca, e cosa si può fare nel frattempo?
12. Esiste un percorso che attraversa un confine di ruolo? Se sì, è dichiarato all'inizio?
13. Cosa vede un utente nuovo, con zero dati? L'`EmptyState` ha tutte tre le parti?

---

## 9. LIMITI DICHIARATI

- Questo canone governa l'interfaccia e le regole di prodotto che la riguardano. **Non**
  risolve i problemi di prestazione (sprite da 1,7 MB, nessuna cache, identità ricalcolata 2–3
  volte per richiesta): sono P1, aperti, e vanno fatti comunque — un'interfaccia bella e lenta
  resta un'interfaccia lenta.
- Non risolve il limite architetturale dello Smart Import (cede intorno alle 800 righe): la
  Legge 4 lo rende **onesto**, non lo rende veloce.
- Il tema scuro è definito ma non ancora verificato riga per riga: va controllato come il
  chiaro, non dedotto.
- I dati sulle schermate della tela sono di esempio. Anteo e Villa Serena sono reali, i
  fornitori sono nomi inventati.
