# Changelog

## M11 · Credibility & Decision UX — work in progress

### Componenti

- Aggiunte primitive condivise `InlineMeta`, `PriceBlock`, `StatusChip`, `Num`, `StickyActionBar` ed `EmptyRow`.
- Consolidati token semantici danger, warn e ok; densità tabellare e numeri tabulari.
- Chrome dimostrativo controllato da `DEMO_MODE`; con `false` lo switch persona non viene renderizzato.

### Dominio e workflow

- Stati Smart Import mutuamente esclusivi con invariant di riconciliazione.
- Validazione check digit EAN-13/GTIN-14 e rifiuto del placeholder composto da zeri.
- Metriche fornitore centralizzate con soglia di cinque consegne e conteggio delle non conformità aperte.
- Risposta al chiarimento con modifica quantità/motivazione, reinvio e audit `CLARIFICATION_ANSWERED`.
- Aging/SLA approvazioni e archivio collassato.
- Sollecito fornitore registrato come bozza, senza simulare invio email.
- Ricezione standard precompilata con “Conferma tutto come ordinato”.
- Condizioni commerciali valutate nel costo totale e salvate nel PO.

### Migration e fixture

- `20260902090000_m11_commercial_conditions`: costi sotto soglia, valuta e snapshot commerciale PO.
- Fixture Smart Import corretta con EAN valido; seed fornitori con costi sintetici.

### QA e route

- Route: `/cart`, `/approvals`, `/requisitions/[id]`, `/consegne`, `/orders/[id]/receive`, `/suppliers`, Smart Import e layout.
- QA browser: 33 viste core, 8 style audit, 10 UX e 19 Smart Import, desktop/mobile.
- Misura before/after dell’altezza pagina non ancora prodotta in modo affidabile.

### Limitazioni note

- Dataset ancora a 18 strutture, non alla scala concettuale di circa 100.
- Primitive visuali non ancora adottate in tutte le route.
- Suggerimenti di completamento ordine, reconciliation Supplier 360, glossario budget, keyboard UX e undo restano aperti.
- “Impatto € annuo” resta intenzionalmente incompleto fino al Consumption & Demand Ledger; nessun saving annualizzato viene inventato.
# M11 final — operational director procurement

- Added private Supabase-backed attachments for out-of-catalog requests, goods receipts and nonconformity evidence, including checksum, MIME/size validation, scoped signed access and compensating cleanup.
- Added facility × product/category × period monetary and quantity limits with used, committed, reserved, requested and remaining-after evaluation.
- Made requisition totals include supplier shipping and below-minimum costs and preserved the complete commercial/limit policy snapshot.
- Added supplier-grouped cart decision blocks and operational receipt/NC evidence capture suitable for mobile browsers.
- Expanded the deterministic synthetic network to 2 organizations, 102 facilities, 780 products, 75 suppliers, 2,964 offers, 520 requisitions and 420 orders.
- Added migration `20260902143000_m11_operational_limits_attachments`.

Known boundary: universal invoice/accounting orchestration, ERP posting, enterprise identity federation and universal evidence/authority are planned for M11.5 and remain out of M11.
