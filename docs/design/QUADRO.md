# Sorgence — Adozione del sistema visivo «Quadro»

**Destinatario:** agente di sviluppo (Codex)
**Base:** `develop`, commit `e7fd09d`
**Direzione approvata dal committente:** «Quadro», tema chiaro primario

> **Questo documento contiene valori esatti. Non va riassunto né parafrasato.**
> Se ti arriva una versione ridotta di questo file, fermati e chiedi l'originale:
> una palette incompleta produce un tema inventato, non «Quadro».

---

## 0. QUANDO ESEGUIRE

**Non durante il ciclo P0.**

Ordine obbligatorio:

```
P0 completi  ──►  riformattazione Prettier  ──►  QUESTO DOCUMENTO  ──►  motore di workflow
```

La riformattazione viene prima perché questa conversione tocca 261 punti in `design-system.css` e decine di componenti. Rivedere quel diff su righe da oltre 1.000 caratteri non è possibile.

Se i P0 non sono chiusi, **non iniziare**: rispondi indicando quali P0 mancano.

---

## 1. STATO DI PARTENZA, MISURATO

Non stime: conteggi reali su `src/app/design-system.css` (1.187 righe).

| Cosa                                | Quantità | Implicazione                                                              |
| ----------------------------------- | -------- | ------------------------------------------------------------------------- |
| Usi di `var(--jp-*)`                | **582**  | Il livello token dei colori è realmente usato: sostituire `:root` propaga |
| Colori letterali fuori da `:root`   | **46**   | Da sostituire a mano, uno per uno                                         |
| Dimensioni di testo distinte        | **29**   | Da rimappare su 6                                                         |
| Occorrenze di `font-size` letterale | **261**  | È qui il grosso del lavoro                                                |
| Vocabolari di token coesistenti     | **3**    | Da collassare in uno                                                      |
| `border-radius` letterali           | 4        | Trascurabile                                                              |

I tre vocabolari da unificare:

1. `--jp-*` — il sistema previsto (`--jp-bg`, `--jp-surface`, `--jp-text`, `--jp-accent`, …)
2. Alias di compatibilità — `--ink`, `--muted`, `--line`, `--soft`, `--paper`, `--warm`, `--surface`, `--surface-soft`, `--positive`, `--warning`, `--negative`, `--accent`, `--accent-dark`
3. `--state-*` — `--state-ok`, `--state-warn`, `--state-danger`

Alla fine deve restarne **uno solo**: quello definito in §2.

---

## 2. I TOKEN

Sostituiscono integralmente il blocco `:root` di `src/app/design-system.css`.

```css
:root {
  /* ── Tipografia ───────────────────────────────────────── */
  --font-display: var(--font-display-loaded), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-body: var(--font-body-loaded), system-ui, -apple-system, "Segoe UI", sans-serif;

  --fs-100: 12px; /* pavimento assoluto: niente sotto */
  --fs-200: 14px;
  --fs-300: 16px;
  --fs-400: 18px;
  --fs-500: 23px;
  --fs-600: 30px;

  --lh-tight: 1.25;
  --lh-body: 1.55;

  /* ── Spaziatura (griglia 4px) ─────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* ── Forma ────────────────────────────────────────────── */
  --radius-sm: 8px; /* campi, bottoni, chip */
  --radius-md: 12px; /* card, contenitori */
  --radius-lg: 16px; /* drawer, dialog */
  --border-width: 1px;
  --row-height: 48px;

  /* ── Colore ───────────────────────────────────────────── */
  --bg: #f4f5f7;
  --surface: #ffffff;
  --surface-alt: #edeff3;
  --text: #16181d;
  --text-secondary: #5a606e;
  --border: #dcdfe6;
  --border-strong: #8b909c;
  --accent: #00696e;
  --accent-soft: #ddf0ed;
  --on-accent: #ffffff;
  --focus: #00696e;

  --ok: #2c7a3f;
  --ok-soft: #deefe2;
  --warn: #9a5b00;
  --warn-soft: #f8eedc;
  --danger: #b3261e;
  --danger-soft: #f8e2e0;
  --info: #1f5fa8;
  --info-soft: #dfe9f7;

  /* ── Elevazione ───────────────────────────────────────── */
  --elev-0: none;
  --elev-1: 0 1px 2px rgb(22 24 29 / 6%), 0 1px 3px rgb(22 24 29 / 8%);
  --elev-2: 0 4px 8px rgb(22 24 29 / 6%), 0 8px 16px rgb(22 24 29 / 8%);
  --elev-3: 0 12px 24px rgb(22 24 29 / 10%), 0 24px 48px rgb(22 24 29 / 12%);

  color-scheme: light;
}

:root[data-theme="dark"] {
  --bg: #14161a;
  --surface: #1c1f25;
  --surface-alt: #23272f;
  --text: #eceef2;
  --text-secondary: #a0a6b2;
  --border: #30353e;
  --border-strong: #6b7280;
  --accent: #5fd4d6;
  --accent-soft: #0c2e30;
  --on-accent: #14161a;
  --focus: #5fd4d6;

  --ok: #5ac47a;
  --ok-soft: #122c1b;
  --warn: #e0a445;
  --warn-soft: #2d2312;
  --danger: #f2796d;
  --danger-soft: #331917;
  --info: #74aef0;
  --info-soft: #132538;

  --elev-1: 0 1px 2px rgb(0 0 0 / 40%), 0 1px 3px rgb(0 0 0 / 30%);
  --elev-2: 0 4px 8px rgb(0 0 0 / 40%), 0 8px 16px rgb(0 0 0 / 32%);
  --elev-3: 0 12px 24px rgb(0 0 0 / 48%), 0 24px 48px rgb(0 0 0 / 40%);

  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Ripetere ESATTAMENTE i valori del blocco [data-theme="dark"] qui sopra.
       Non usare @extend né riferimenti: devono essere valori letterali,
       altrimenti il tema di sistema non si applica. */
  }
}
```

**Regola strutturale:** ogni colore ha la sua definizione nel blocco `:root` nudo. Un colore definito **solo** dentro un blocco `[data-theme]` o dentro la media query non si applica nello stato "sistema" e produce testo di un tema sul fondo dell'altro.

---

## 3. CARATTERI

Via `next/font`. **Nessuna chiamata a Google Fonts a runtime.**

```ts
// src/app/layout.tsx
import { Plus_Jakarta_Sans, Public_Sans } from "next/font/google";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-display-loaded",
});

const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-body-loaded",
});

// <html lang="it" className={`${display.variable} ${body.variable}`}>
```

### ⚠️ Trappola verificata sul campo

**Non chiamare le variabili `--font-sans` o `--font-serif`.**

Tailwind definisce già `--font-sans` nel proprio tema, puntando allo stack di sistema — cioè ad **Arial** su Windows. Le due definizioni hanno la stessa specificità e vince l'ultima nell'ordine sorgente, che non è deterministico fra sviluppo e produzione.

Sintomo: il carattere giusto in locale, Arial in produzione. Già successo su questo progetto.

Usa `--font-display-loaded` e `--font-body-loaded` come sopra, con i token `--font-display` / `--font-body` che vi puntano.

### Applicazione

```css
body {
  font-family: var(--font-body);
  font-size: var(--fs-300);
  line-height: var(--lh-body);
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3,
h4,
.kpi-value {
  font-family: var(--font-display);
  line-height: var(--lh-tight);
  letter-spacing: -0.012em;
  text-wrap: balance;
}
```

Public Sans ha ottime cifre tabulari: i numeri restano in `--font-body` con `font-variant-numeric: tabular-nums`. **Non serve un monospaziato.**

---

## 4. MAPPATURA TIPOGRAFICA — 29 VALORI → 6

È il cuore del lavoro: 261 occorrenze da convertire. **Mappatura meccanica, nessuna valutazione caso per caso.**

| Valori attuali                                              | Diventa  | Token      |
| ----------------------------------------------------------- | -------- | ---------- |
| 7 · 7.5 · 8 · 8.5 · 9 · 9.5 · 10 · 10.5 · 11 · 11.5 · 12 px | **12px** | `--fs-100` |
| 12.5 · 13 · 14 px                                           | **14px** | `--fs-200` |
| 15 · 16 · 17 px                                             | **16px** | `--fs-300` |
| 18 · 19 · 20 px                                             | **18px** | `--fs-400` |
| 21 · 22 · 23 · 24 · 25 px                                   | **23px** | `--fs-500` |
| 27 · 29 · 30 · 32 px                                        | **30px** | `--fs-600` |

### Conseguenza da governare, non da subire

L'applicazione **diventerà visibilmente più grande**, soprattutto dove oggi c'è testo fra 7 e 11px — etichette, unità di misura, metadati, il badge struttura da 7,5px.

È l'obiettivo, non un effetto collaterale: il problema d'uso numero uno rilevato nell'audit è il testo troppo piccolo per chi lo legge fra un turno e l'altro. Ma alcuni punti densi richiederanno aggiustamenti di layout.

**Dove intervenire, in ordine:** intestazioni di tabella, chip di stato, celle prezzo, badge struttura nella barra laterale, riquadri KPI.

**Cosa NON fare:** reintrodurre una dimensione fuori scala per far entrare il testo. Se non entra, si cambia il layout — si va a capo, si accorcia l'etichetta, si allarga la colonna. **Mai `font-size: 11px` per risolvere.** È esattamente il meccanismo che ha prodotto le 29 dimensioni attuali.

---

## 5. LE CINQUE REGOLE VINCOLANTI

Da scrivere nel sistema, non lasciate alla disciplina.

### 5.1 — Accento e verde vanno separati per ruolo

`--accent` (`#00696E`) e `--ok` (`#2C7A3F`) sono **vicini in tinta**. Su una tabella di prezzi si confondono.

- `--accent` **solo** su azioni e link
- `--ok` **solo** su stati, e **sempre** accompagnato da un'etichetta testuale
- **Mai** un numero colorato di verde da solo: il giudizio sta in un chip separato, il numero resta leggibile

È la prima regola del sistema. Se ne deve saltare una, non è questa.

### 5.2 — Il bordo sta sotto l'ombra, non al suo posto

L'ombra dà la profondità, il bordo da 1px garantisce il confine anche in alto contrasto. Ogni superficie sollevata ha **entrambi**.

```css
.card {
  background: var(--surface);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--elev-1);
}
```

### 5.3 — Nessuna immagine prodotto nelle righe dati

Le card tendono a chiedere un'immagine. I packshot attuali sono scelti per parola chiave (`src/components/product-image.tsx:7-20`): mostrarli accanto a un prezzo suggerisce una precisione che non esiste.

Immagini ammesse solo nella scheda prodotto, mai nelle righe di tabella né nelle righe del carrello.

### 5.4 — Le variazioni sono chip su fondo tenue, non testo colorato

```html
<span class="chip chip-ok">−6,1% · miglior prezzo</span>
```

Su fondo grigio e sotto un'ombra, il testo colorato perde contrasto. Il chip no. E porta l'etichetta, che soddisfa anche la regola 5.1.

### 5.5 — I due livelli di prezzo hanno un'area propria

Prezzo d'acquisto e prezzo normalizzato vanno mostrati in una cella con area propria — non due `span` accostati. Il prezzo normalizzato compare solo quando differisce dal prezzo della confezione, come specificato nella regola 5.7.

```css
.price-block {
  display: grid;
  gap: var(--space-1);
  text-align: right;
}
.price-block .buy {
  font-size: var(--fs-300);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.price-block .norm {
  font-size: var(--fs-100);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
```

La distinzione fra i due è il primo principio del prodotto e oggi vive in un `<small>` da 7,5px.

### 5.6 — Le colonne di confronto hanno una griglia fissa

Nel catalogo e nelle altre superfici di confronto prezzi, ogni colonna deve partire dalla stessa ascissa in tutte le righe. Nome prodotto, prezzo, fornitore, stato e azioni usano una griglia a colonne fisse; un layout `flex` che sposta le colonne in base alla lunghezza del contenuto non è ammesso.

L'occhio deve poter scorrere verticalmente prezzi e fornitori senza ricercarne ogni volta la posizione.

### 5.7 — Il prezzo normalizzato compare solo quando aggiunge informazione

Quando prezzo della confezione e prezzo normalizzato coincidono, il numero si mostra una sola volta. Il prezzo normalizzato compare soltanto quando cambia l'unità economica o il valore rispetto alla confezione.

La precisione decimale segue l'ordine di grandezza e la precisione reale del dato. Non mostrare quattro decimali su importi nell'ordine delle decine di euro: suggeriscono una precisione che il dato commerciale non possiede.

### 5.8 — Le immagini prodotto richiedono una fonte reale

La regola 5.3 si applica anche quando esiste un packshot dimostrativo: le immagini generate per parola chiave non compaiono nelle righe dati. Nelle schede prodotto sono ammesse solo immagini realmente associate al prodotto; finché non esistono, usare una superficie neutra o rimuovere l'immagine.

Le immagini non devono introdurre un fondo chiaro fisso che interrompe il tema scuro.

---

## 5B. GLI STATI DI ATTESA

Regola di prodotto decisa il 23/09/2026, registrata in
`docs/product/FEATURE_REGISTER.md` (voci `UX-03` e `UX-05`):

> Quando il software impiega tempo, deve dire che cosa sta facendo e quanto stima di
> metterci. L'utente non deve mai guardare uno schermo che non spiega sé stesso.

Qui sotto c'è come si rappresenta in «Quadro». La regola dice _cosa_, questa sezione dice
_che aspetto ha_.

### 5B.1 — Tre soglie, tre componenti

| Durata     | Componente           | Aspetto                                                       |
| ---------- | -------------------- | ------------------------------------------------------------- |
| fino a 1 s | bottone disabilitato | nessun indicatore; solo `disabled` + `aria-busy`              |
| 1–10 s     | bottone in attesa    | rotella inline + **nome dell'azione** al posto dell'etichetta |
| oltre 10 s | scheda di lavoro     | passo corrente, barra di avanzamento, conteggi, stima residua |

### 5B.2 — Bottone in attesa (1–10 s)

L'etichetta **nomina l'azione**, non chiede pazienza: «Invio della richiesta…», mai
«Attendere…». La larghezza non deve cambiare fra i due stati, altrimenti il contenuto
attorno salta.

```css
.btn[aria-busy="true"] {
  background: var(--accent);
  color: var(--on-accent);
  cursor: progress;
  /* Nessun cambio di opacità: il bottone sta lavorando, non è spento. */
}
.btn[aria-busy="true"] .spinner {
  width: 14px;
  height: 14px;
  border: 2px solid color-mix(in srgb, var(--on-accent) 30%, transparent);
  border-top-color: var(--on-accent);
  border-radius: 999px;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn[aria-busy="true"] .spinner {
    animation: none;
    border-top-color: transparent;
  }
}
```

**Distinzione importante:** `disabled` e `aria-busy` non sono la stessa cosa. Un bottone
disabilitato è spento e non va desaturato quando invece sta lavorando — altrimenti l'utente
legge «non funziona» al posto di «sta andando».

### 5B.3 — Scheda di lavoro (oltre 10 s)

Superficie a `--elev-1`, raggio `--radius-md`, bordo `--border` **sotto** l'ombra come da
regola 5.2. Contiene, nell'ordine:

1. **Passo corrente** a `--fs-300`, peso 600: «Riconoscimento prodotti», non «Fase 3 di 7»
2. **Barra di avanzamento**
3. **Conteggi** a `--fs-100` in `--text-secondary`: «3.200 di 5.000 righe»
4. **Stima residua** a `--fs-100`: «circa 4 minuti»
5. **Affordance di uscita**: «Puoi chiudere questa pagina, ti avvisiamo quando è pronto»

Il punto 5 non è cortesia: sopra i dieci secondi è **l'unica cosa che rende accettabile
l'attesa**. Senza, la scheda di avanzamento è una rotella più informativa.

### 5B.4 — La barra

**Riusa il componente già previsto per il consumo di budget e le soglie di franco porto:**
4px di altezza, raggio pieno, traccia su `--surface-alt`, riempimento in `--accent`. Un
componente, due usi — coerente con il vincolo di §7 contro i valori fuori scala.

```css
.progress {
  height: 4px;
  border-radius: 999px;
  background: var(--surface-alt);
  overflow: hidden;
}
.progress > i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
  transition: width 0.3s ease;
}

/* Indeterminata: finché non c'è un ritmo misurato non si finge di sapere la percentuale. */
.progress[data-state="indeterminate"] > i {
  width: 35%;
  animation: slide 1.4s ease-in-out infinite;
}
@keyframes slide {
  0% {
    margin-left: -35%;
  }
  100% {
    margin-left: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .progress[data-state="indeterminate"] > i {
    animation: none;
    width: 100%;
    opacity: 0.35;
  }
  .progress > i {
    transition: none;
  }
}
```

**Mai colorare la barra di `--ok` a completamento.** Vale la regola 5.1: il verde sta sugli
stati con etichetta, non sui progressi. A fine lavoro la scheda cambia in un messaggio di
esito, non in una barra verde.

### 5B.5 — Stato indeterminato: obbligatorio, non opzionale

Finché non c'è un ritmo misurato, la scheda mostra **«Preparazione…»** con la barra
indeterminata e **nessun numero**.

Una percentuale inventata al secondo zero è sempre falsa, e la prima stima sbagliata
squalifica tutte le successive. Lo stato indeterminato non è un ripiego: è la
rappresentazione onesta di «non lo so ancora».

### 5B.6 — Accessibilità

- La scheda è `role="status"` con `aria-live="polite"`.
- **Si annuncia il cambio di passo, non ogni aggiornamento di percentuale.** Altrimenti un
  lettore di schermo recita cento volte «31 per cento, 32 per cento». La barra porta
  `aria-valuenow`/`aria-valuemax`, il testo annuncia solo le transizioni.
- Il bottone porta `aria-busy="true"` mentre lavora, e resta `disabled` fino all'esito.
- Ogni animazione ha la sua variante sotto `prefers-reduced-motion`, come sopra.

### 5B.7 — L'errore fa parte del componente

Se il lavoro si interrompe, la scheda **non sparisce**: diventa un messaggio che dice a che
passo è successo e che fine fa il lavoro già svolto.

> «Interrotto alla riga 3.200 di 5.000. Le righe già elaborate sono conservate: puoi
> riprendere da lì.»

Bordo sinistro 4px in `--danger`, fondo `--danger-soft`, testo in `--text`. **Il testo non va
colorato di rosso**: il colore sta sul bordo e sul fondo, il messaggio resta leggibile.

Un lavoro lungo che fallisce lasciando solo «Operazione fallita» costringe l'utente a
ricominciare senza sapere se serve.

### 5B.8 — Dove si applica, e in che ordine

| Superficie                   | Soglia     | Nota                                                                                               |
| ---------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| Aggiungi al carrello         | 1–10 s     | oggi 7 round-trip senza riscontro: **al doppio clic la quantità raddoppia**                        |
| Invio richiesta              | 1–10 s     |                                                                                                    |
| Ricezione merce con allegati | oltre 10 s | upload sequenziali, può durare parecchio                                                           |
| Import listini               | oltre 10 s | **richiede prima `IMP-13`**: oggi è sincrono e non esiste uno sfondo in cui mostrare l'avanzamento |
| Lotto documenti tecnici M12  | oltre 10 s | misurato: ~8 min 30 s per 100 documenti                                                            |

**Ordine corretto:** prima il lavoro diventa di sfondo, poi lo si racconta. Costruire una
barra di avanzamento sopra un'attesa che comunque blocca l'utente non risolve niente.

Le prime due righe si possono fare **in questo ciclo**, insieme al resto del design system:
sono il componente `SubmitButton` di §2.4 del documento correzioni. Le altre dipendono da P2.

---

## 6. TAILWIND: ADOTTARLO DAVVERO

Stato attuale: `design-system.css:1` contiene `@import "tailwindcss";` e il plugin PostCSS è attivo. Tailwind **viene processato** e il suo output entra nel bundle, ma non esiste una sola classe utility nel progetto. Emette solo preflight e variabili di tema — e **il preflight resetta margini, titoli, liste e bottoni prima** delle 1.187 righe del design system, che a sua volta fa il proprio reset. C'è un conflitto di cascata attivo.

**Decisione: adottarlo**, perché è il meccanismo che impone i vincoli di §7. Rimuoverlo lascerebbe il sistema senza guardie.

```css
/* src/app/design-system.css, in cima */
@import "tailwindcss";

@theme {
  --font-display: var(--font-display-loaded), system-ui, sans-serif;
  --font-body: var(--font-body-loaded), system-ui, sans-serif;

  --text-fs-100: 12px;
  --text-fs-200: 14px;
  --text-fs-300: 16px;
  --text-fs-400: 18px;
  --text-fs-500: 23px;
  --text-fs-600: 30px;

  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 24px;
  --spacing-6: 32px;
  --spacing-7: 48px;
  --spacing-8: 64px;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --color-bg: #f4f5f7;
  --color-surface: #ffffff;
  --color-surface-alt: #edeff3;
  --color-text: #16181d;
  --color-text-secondary: #5a606e;
  --color-border: #dcdfe6;
  --color-border-strong: #8b909c;
  --color-accent: #00696e;
  --color-accent-soft: #ddf0ed;
  --color-ok: #2c7a3f;
  --color-warn: #9a5b00;
  --color-danger: #b3261e;
  --color-info: #1f5fa8;

  --shadow-elev-1: 0 1px 2px rgb(22 24 29 / 6%), 0 1px 3px rgb(22 24 29 / 8%);
  --shadow-elev-2: 0 4px 8px rgb(22 24 29 / 6%), 0 8px 16px rgb(22 24 29 / 8%);
  --shadow-elev-3: 0 12px 24px rgb(22 24 29 / 10%), 0 24px 48px rgb(22 24 29 / 12%);
}
```

**Il preflight va disattivato oppure il reset del design system va rimosso.** Due reset in cascata sono la causa di conflitti difficili da diagnosticare. Preferire: tenere il preflight di Tailwind, rimuovere il reset alle righe ~72-79 del design system.

Non è richiesto riscrivere le pagine in classi utility. Il CSS custom resta; `@theme` serve a rendere i token la fonte unica e a permettere le guardie.

---

## 7. GUARDIE AUTOMATICHE — OBBLIGATORIE

**Senza queste, in sei mesi il problema si ripresenta con una tavolozza diversa.** Le 29 dimensioni di testo e i 46 colori letterali attuali non sono nati da incompetenza: sono nati dall'assenza di un meccanismo che li impedisse.

Configurare `stylelint` con:

| Regola                                                                    | Effetto                                     |
| ------------------------------------------------------------------------- | ------------------------------------------- |
| `declaration-property-value-allowed-list` su `font-size`                  | solo `var(--fs-*)`                          |
| `declaration-property-value-allowed-list` su `border-radius`              | solo `var(--radius-*)` e `999px`            |
| `declaration-property-value-allowed-list` su `box-shadow`                 | solo `var(--elev-*)`                        |
| `color-no-hex`                                                            | nessun esadecimale fuori dal blocco `:root` |
| `declaration-property-value-allowed-list` su `padding` / `margin` / `gap` | solo `var(--space-*)`, `0`, `auto`          |

Eccezione unica ammessa: il blocco `:root` e il blocco `@theme`.

Aggiungere `stylelint` alla CI insieme a `eslint`. Una violazione fa fallire il build.

---

## 8. SEQUENZA DI ESECUZIONE

**Passo 1 — Token e caratteri.** Sostituire `:root`, aggiungere `next/font`, configurare `@theme`. Non toccare ancora le regole. _A questo punto i colori sono già in gran parte giusti: i 582 usi di `var(--jp-*)` vanno rimappati sui nuovi nomi con una sostituzione meccanica._

**Passo 2 — Collassare i tre vocabolari.** Eliminare gli alias di compatibilità e i `--state-*`, portando tutto sui token di §2. Sostituzione meccanica, un commit.

**Passo 3 — I 46 colori letterali.** Uno per uno sul token più vicino. Dove nessun token è adatto, **non aggiungere un colore**: rivedere la scelta.

**Passo 4 — La tipografia.** I 261 `font-size` secondo la tabella di §4. È il passo più lungo e quello che richiede aggiustamenti di layout.

**Passo 5 — Forma ed elevazione.** Applicare raggi ed elevazione secondo le regole 5.2–5.5. Introdurre `--row-height: 48px` sulle tabelle.

**Passo 6 — Le guardie.** Attivare stylelint. _Deve passare su tutto il codice: se fallisce, i passi 1-5 non sono completi._

**Passo 7 — Focus e accessibilità.** Anello di focus visibile su ogni elemento interattivo, usando `--focus`. Oggi l'unica regola `:focus-visible` in 1.187 righe fa `outline:none`.

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

Un commit per passo.

---

## 9. LIMITI DI QUESTO INTERVENTO

**Non è una riprogettazione dell'interfaccia.** Non cambiare struttura delle pagine, gerarchia informativa, flussi o posizione dei controlli. Solo il sistema visivo.

**Non toccare la logica applicativa.** Nessuna modifica a server action, query, schema.

**Non ottimizzare le immagini qui:** è un intervento P1 separato (`catalog-packshots-v2.png`, 1,7 MB).

**Non introdurre nuovi componenti.** Se un componente manca, segnalalo e fermati.

---

## 10. CRITERI DI ACCETTAZIONE

Il lavoro è chiuso quando **tutti** sono veri:

1. `grep -c 'font-size: *[0-9]' src/app/design-system.css` → **0** fuori dal blocco `:root`
2. `grep -oE '#[0-9a-fA-F]{3,8}' src/app/design-system.css | wc -l` → solo le occorrenze dentro `:root`, `[data-theme]` e `@theme`
3. Nessun riferimento residuo a `--jp-*`, `--state-*` o agli alias di compatibilità
4. `stylelint` verde su tutto il progetto, in CI
5. Nessuna chiamata di rete a `fonts.googleapis.com` a runtime — verificabile nel pannello rete
6. Il carattere reso è Plus Jakarta Sans / Public Sans **anche in build di produzione su Windows** — è il punto dove la trappola di §3 si manifesta
7. Anello di focus visibile navigando l'intera applicazione col solo tabulatore
8. Contrasto testo/fondo ≥ 4,5:1 su tutte le combinazioni; bordo dei campi ≥ 3:1
9. Nessun testo sotto i 12px in tutta l'applicazione
10. Tema scuro coerente: nessun elemento che prenda il colore da un tema e il fondo dall'altro
11. `npm run build` verde, `npm test` invariato

---

## 11. RIFERIMENTO VISIVO

La direzione è stata scelta confrontando quattro sistemi completi applicati alla stessa schermata di richieste d'acquisto. In caso di dubbio su come un componente debba apparire — tabella prezzi, riquadri KPI, chip di stato, navigazione, bottoni — chiedi al committente il riferimento «Quadro, tema chiaro».

Se un caso non è coperto da questo documento: **non inventare un valore**. Segnalalo, proponi l'opzione più vicina ai token esistenti, e attendi conferma.
