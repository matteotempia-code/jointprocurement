# Principi di design

## Truth before polish

Non mostrare mai una metrica elegante quando il significato sottostante è ambiguo. Prezzo d’acquisto, contenuto della confezione e prezzo normalizzato sono informazioni distinte.

## One number, one definition

Ogni KPI ha una sola definizione canonica, riutilizzata nel riepilogo e nel relativo dettaglio. Date, scope e stati inclusi non cambiano tra le viste.

## Human labels, machine codes

Enum, codici e chiavi JSON restano interni. L’interfaccia usa etichette italiane, unità esplicite e valori leggibili.

## Decision context over raw data

Una pagina esiste per sostenere un’attività o una decisione. Budget, storico, policy, affidabilità e anomalie sono presentati accanto all’azione pertinente.

## Calma, densità e gerarchia

Superfici chiare, bordi sottili, tipografia sobria e densità controllata. Il colore segnala significato; non decora. Su mobile, l’azione primaria e la verità economica precedono i dettagli progressivi.

## One visual grammar

Catalogo, workflow e intelligence condividono la stessa gerarchia di superfici, tipografia, azioni e stati. Il ruolo cambia il contenuto, non il linguaggio del prodotto.

## Design tokens before page-specific styling

Colore, spacing, radius, bordi e breakpoint nascono dai token. Una pagina non introduce una variante locale quando il significato è già coperto dal sistema.

## Mobile is a product surface, not a breakpoint

Il mobile ordina nuovamente informazioni e azioni: ricerca e acquisto per RSA, decisione per approvazioni, quantità e problemi per ricezione. Non è un desktop ristretto.

## Every repeated pattern becomes a primitive

Header, metriche, stati, tabelle, empty state, immagini prodotto e action row sono pattern condivisi. La ripetizione è un segnale di sistema, non un invito al copia-incolla.

## Reference system, not reference imitation

La reference definisce grammatica e qualità attesa. Il codice ne trasferisce principi e misure in componenti mantenibili, senza replicarne markup inline o limiti da concept.

## Una pagina, una prossima azione

Il prodotto non espone contemporaneamente ogni capacità disponibile. L’azione primaria coincide con il prossimo passo più probabile; alternative, confronto e organizzazione personale vengono rivelati progressivamente.

## Zero non è un allarme

Una metrica nulla non compete con un’eccezione reale. Le home operative comprimono gli stati senza attività in un messaggio positivo e dedicano peso visivo soltanto a ciò che richiede attenzione.

## Review by exception

L’importazione porta in primo piano UOM ambigue, conflitti identificativi, packaging differente e nuovi prodotti. Le righe affidabili possono essere confermate insieme; la persona non deve rileggere un documento perfetto cella per cella.

## Il sistema propone, la persona conferma

Parsing, mapping e matching non hanno autorità di pubblicazione. Anche una corrispondenza alta resta nello staging finché un utente autorizzato non la conferma.

## La fonte è sempre visibile

Ogni valore commerciale deve rispondere a “da quale documento, foglio, riga e colonna arriva?”. La provenienza non è un dettaglio tecnico: è parte della fiducia nel dato.

## Confidence is evidence, not decoration

Alta, media e da verificare derivano da segnali espliciti e soglie documentate. Quando non esiste un provider AI reale, l’interfaccia parla di mapping euristico o interpretazione locale e non attribuisce confidence a un modello inesistente.

## Never silently mutate canonical data

Il documento alimenta uno staging versionato. Prodotti, offerte e listini cambiano soltanto attraverso un publish transazionale, idempotente e auditato.
