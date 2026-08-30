# Sistema di stile

Il sistema visivo di Joint Procurement OS trasferisce la grammatica della reference canonica in un’architettura CSS governabile. Non replica il markup inline del concept: ne conserva calma, densità, ritmo e gerarchia.

## Design tokens

I token vivono in `src/app/design-system.css` con prefisso `--jp-`. Le compatibilità legacy sono alias, non nuove fonti di verità.

- `--jp-bg`: `#F4F2EF`
- `--jp-surface`: `#FFFFFF`
- `--jp-surface-muted`: `#F1ECE3`
- `--jp-text`: `#1C1915`
- `--jp-text-secondary`: `#6E665C`
- `--jp-text-muted`: `#8A8175`
- `--jp-action`: `#3D3529`
- `--jp-action-hover`: `#221D16`
- `--jp-border`: `#E2DCD3`
- `--jp-border-subtle`: `#EDE8E1`

## Typography

Stack: `Helvetica Neue`, Helvetica, Arial, system sans. Il corpo usa 14/1.5; H1 27–36 px e peso 500; H2 19 px; eyebrow 9 px uppercase con tracking 0,15 em; intestazioni tabella 8 px uppercase; metriche 21–28 px. Il contrasto deriva da scala e peso, non da decorazione.

## Color system

Il marrone scuro è riservato ad azioni e superfici hero. Verde, ambra e rosso hanno significato rispettivamente positivo, attenzione e criticità. Gli stati ordinari sono testo più punto, non badge colorati.

## Spacing

Scala: 4, 8, 12, 16, 20, 24, 32, 40, 48 e 64 px. Il ritmo pagina usa 32 px tra header e contenuto e 40 px tra sezioni decisionali.

## Borders, radius e shadows

Bordi da 1 px, con livelli default e subtle. Radius: 3, 5 e 6 px. L’ombra è ammessa soltanto per elementi sovrapposti come il menu di creazione lista; le normali superfici restano piatte.

## Sidebar

Larghezza 252 px, superficie bianca, navigazione a righe da 36 px, active state su `--jp-surface-muted`, identità e scope nel footer. Su mobile diventa un drawer con scrim.

## Topbar

Altezza 66 px, bordo inferiore e superficie bianca translucida. La ricerca globale è l’unico controllo dominante. Su mobile segue l’header da 58 px e occupa tutta la larghezza.

## Page header e sezioni

`PageHeader` governa eyebrow, H1, descrizione e azioni. `section-heading` usa titolo più divider scuro. Le pagine decisionali iniziano da task o segnali, poi metriche e approfondimenti.

## Buttons

- Primary: fondo scuro, testo bianco.
- Secondary: superficie bianca e bordo.
- Tertiary: testo senza contenitore.
- Destructive: testo e bordo rosso sobri.
- Mobile: target minimo 42 px.

## Forms

Input, select e textarea condividono bordo, radius, tipografia e focus ring. Altezza desktop 36 px, mobile 42 px. Label e aiuti usano la scala small/micro.

## Tables

Header da 38 px, righe compatte, separatori subtle, numeri leggibili e hover neutro. Su mobile le inbox operative adottano card o, dove il confronto richiede colonne, scrolling contenuto senza overflow pagina.

## Metrics

Le metriche condividono bordi lineari e gerarchia label → valore → dettaglio. Executive espone al massimo quattro KPI; i dettagli seguono in Top 3 rischi e opportunità.

## Status

Punto da 6 px più label umana italiana. Chip soltanto per concetti commerciali compatti, come “Convenzionato”. Enum e codici restano interni.

## Product imagery

`ProductImage` usa un atlante locale uniforme. Thumbnail, lista e hero condividono fondo caldo, bordo subtle, ratio coerente e radius massimo 6 px. L’immagine sostiene l’identificazione e non sostituisce la verità commerciale.

## Responsive e mobile

Breakpoint canonici: 1100 px wide, 900 px tablet/shell, 760 px mobile e 440 px compact. Home, catalogo, prodotto, preferiti, liste, carrello, consegne, ricezione e approvazioni sono superfici mobile dedicate: azioni da 42 px, disclosure progressiva e nessuna tabella desktop compressa nei flussi decisionali.

## Do / Don’t

- Do: decisione prima del report, bordi sottili, densità controllata, copy italiano.
- Do: trasformare un pattern ripetuto in primitive o classe di sistema.
- Don’t: gradienti, glass, shadow decorative, radius grandi, badge arcobaleno.
- Don’t: colori, breakpoint o spacing introdotti a livello pagina senza token.

## Mapping dalla reference

La reference usa sidebar 252 px, topbar 66 px, Helvetica Neue, H1 intorno a 27 px, radius prevalenti 3–6 px, fondo `#F4F2EF`, surface bianca e bordi `#E2DCD3/#EDE8E1`. Il prodotto adotta queste stesse regole e le converte in token, componenti semantici e responsive centralizzato.

## Gerarchia delle azioni

Ogni superficie espone una sola azione primaria. Preferiti, liste, confronto e dettagli vivono in azioni secondarie o nel menu semantico `Altre azioni`. Il menu usa `details/summary`, resta utilizzabile da tastiera e diventa un pannello ancorato alla safe area su mobile. Il carrello mobile espone una barra fissa compatta con totale, anteprima della policy e unico avanzamento.
