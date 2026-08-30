# Joint Procurement OS — Anteo × Coopselios

An enterprise procurement workspace that separates canonical products from supplier offers and combines each user’s role with an explicit organization scope. The current release is the first working vertical slice and uses PostgreSQL data end to end.

## What exists

- Six demo personas with cookie-based switching and role-aware navigation
- Central scope resolution for `ORGANIZATION`, `AREA`, and `FACILITY`
- Database-backed catalog with search, category/preferred filters, and sorting
- Canonical product detail with supplier offer comparison
- Procurement product, price-list, supplier, and comparison views
- Area-scoped facilities and facility detail
- Organization tree and user assignment view
- Executive Control Tower and honest Finance future state
- Responsive shell, tables/cards, loading, empty, error, and out-of-scope states

## Tech stack

- Next.js 16 App Router and React 19
- TypeScript in strict mode
- Tailwind CSS 4 plus project CSS tokens/components
- Prisma 7 with `@prisma/adapter-pg`
- Local PostgreSQL
- Node’s built-in test runner through `tsx`

## Local setup

Requirements: Node.js, npm, and a running PostgreSQL instance. Install dependencies and configure `.env`:

```bash
npm install
```

```text
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/joint_procurement_os"
```

Start the application:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Database setup

Apply checked-in migrations:

```bash
npx prisma migrate deploy
```

Generate the Prisma client after schema changes:

```bash
npx prisma generate
```

## Seed

The idempotent demo seed replaces only the project’s demo dataset and creates two organizations, four facilities, six users, three suppliers, three products, three active price lists, and five supplier offers.

```bash
npm run db:seed
```

All names, identifiers, prices, and files are invented demo data.

## Demo users

| User | Role | Scope |
| --- | --- | --- |
| Lucia Ferri | RSA Director | RSA Aurora (Facility) |
| Andrea Riva | Area Manager | Area Piemonte (Area) |
| Giulia Bianchi | Joint Procurement Manager | Anteo Demo (Organization) |
| Marco Villa | Procurement Administrator | Anteo Demo (Organization) |
| Elena Conti | Finance Controller | Anteo Demo (Organization) |
| Davide Romano | Executive Sponsor | Anteo Demo (Organization) |

## How to switch role

Use **View as** under the **Demo environment** label in the desktop sidebar or mobile navigation drawer. Selection is stored in an HTTP-only, same-site cookie. A server action validates the selected database user and redirects to that role’s home. This adapter is isolated in `src/lib/auth.ts` and can be replaced by enterprise authentication later.

## Architecture overview

Server Components load data directly through the singleton in `src/lib/prisma.ts`; credentials never enter the client bundle. `getCurrentDemoUser()` resolves user, active assignment, role, organization, and scope. Route entry points enforce allowed roles, while `resolveScope()` centralizes operational boundaries. Pricing helpers normalize preferred and lowest-offer comparisons without inventing volume assumptions.

See [Architecture](docs/ARCHITECTURE.md) and [Feature register](docs/FEATURE_REGISTER.md).

## Current milestone

Foundation + first vertical slice: Organization + Identity + Scope + Product + Supplier Offer + Price List + role-based UX. Purchasing workflows are intentionally absent.

Quality commands:

```bash
npm run lint
npm test
npm run build
```

## Next milestone

Recommended next: governed price-list ingestion with staging, validation, canonical-product matching, review/approval, and audit history. Shopping, requisition, budget, PO, receiving, and invoice features remain outside the current milestone.
