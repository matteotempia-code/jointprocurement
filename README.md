# Joint Procurement OS — Anteo × Coopselios

MVP operativo database-backed per acquisti di struttura governati. La milestone corrente ha riprogettato il prodotto in italiano attorno alle decisioni di RSA, Area Manager, Procurement, Finance ed Executive.

## What works

- Six demo personas, role navigation and organization/area/facility scope
- Operational RSA, Area, Procurement, Finance and Executive dashboards
- Catalogo da 156 prodotti e 468 offerte, Product 360, storico prezzi e documenti locali
- Persistent cart, budget impact and purchase request submission
- Rule-based policy, auto approval, Area/Procurement approvals
- Atomic multi-supplier PO generation and downloadable local PDF
- Orders, partial/full receiving, discrepancies and quality issues
- Supplier directory/360 with measured delivery KPIs
- Structured audit trail and responsive workflows
- Ricerca globale, preferiti, liste ricorrenti e riordino
- Richieste fuori catalogo, workspace consegne e non conformità con risoluzione
- Category 360, deleghe temporanee e cockpit operativi attention-first

AI import, invoices, three-way matching, sourcing and supplier portal are not implemented.

## Stack

Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, Prisma 7 PostgreSQL adapter, local PostgreSQL and Playwright.

## Start locally

    npm install
    npx prisma migrate deploy
    npm run db:seed
    npm run dev

Open http://localhost:3000. DATABASE_URL in .env must point to local database joint_procurement_os.

## Demo users

| Persona | Role | Scope |
| --- | --- | --- |
| Lucia Ferri | RSA Director | RSA Aurora |
| Andrea Riva | Area Manager | Area Piemonte |
| Giulia Bianchi | Joint Procurement Manager | Anteo Demo |
| Marco Villa | Procurement Administrator | Anteo Demo |
| Elena Conti | Finance Controller | Anteo Demo |
| Davide Romano | Executive Sponsor | Anteo Demo |

Use View as in the demo sidebar. Selection is an HTTP-only cookie validated by a Server Action.

## Demo flow

As Lucia: Catalog → search Guanto nitrile senza polvere M → Product 360 → Add → Cart → Create purchase request. Small requests auto-approve and generate supplier POs. Larger requests appear in Andrea’s Approvals inbox. Return as Lucia to Orders, open a PO and Receive delivery; partial quantities and issues are supported.

## Dataset

The idempotent fictional seed creates 2 organizations, 3 legal entities, 5 areas, 14 facilities, 18 cost centers, 20 suppliers, 8 categories, 104 products, 208 offers, 20 price lists, 16 budgets, 30 requisitions, 20 POs, 15 receipts and 5 quality issues.

## Quality

    npx prisma validate
    npm run db:seed
    npm run lint
    npm test
    npm run build
    npm run qa:browser

See docs/ARCHITECTURE.md and docs/FEATURE_REGISTER.md.

## Milestone

Operative Buying MVP / V1. Recommended next milestone: invoice ingestion and governed three-way matching. Smart AI Import remains separate.
