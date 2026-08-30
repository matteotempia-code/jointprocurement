# Architecture

## Domain model

The foundation preserves the hierarchy `Organization → LegalEntity → Area → Facility → CostCenter` and keeps identity separate from authorization. A `UserAssignment` combines `User + Role + Organization + Scope + Authority`; a role alone never implies global visibility.

## Organization and scope

`src/lib/scope.ts` resolves `ORGANIZATION`, `AREA`, and `FACILITY` assignments into a stable context with a label and permitted facility IDs. The Area Manager’s facility list and detail both use that resolution; direct navigation to a facility outside the area returns the shared unavailable view. Route-level role checks live in `src/lib/auth.ts`, providing a narrow seam for a future policy engine.

## Canonical product vs supplier offer

`CanonicalProduct` is the normalized procurement identity. `SupplierOffer` carries supplier SKU, packaging, commercial price, normalized price, price-list provenance, and preferred status. Comparisons group offers only through the canonical product and use normalized price when present, falling back to unit price without manufacturing data.

## Prisma data access

`src/lib/prisma.ts` owns one server-only `PrismaClient` using Prisma 7’s PostgreSQL driver adapter. Development reuses the instance through `globalThis` to avoid hot-reload connection churn. All queries run in Server Components or Server Actions; `DATABASE_URL` is never exposed to browser code.

## Demo authentication

The demo switcher submits a Server Action. It validates the database user, writes an HTTP-only same-site cookie, and redirects to the target role’s home. `getCurrentDemoUser()` is the only reader and defaults to Lucia Ferri when no cookie is present. Replacing this adapter with SSO should not change page data APIs.

## Server/client boundaries

Pages, layouts, policy checks, and data queries are Server Components. Client code is limited to the responsive navigation state, pathname highlighting, the select auto-submit interaction, and the error retry boundary. Serializable view data crosses those boundaries; Prisma objects do not.

## Future policy engine

The next authorization layer should map actions and resources to assignment context, return query predicates where possible, and deny direct-resource reads after scope resolution. It should retain route guards but add service-level enforcement and audit decisions.

## Future AI ingestion layer

Price-list ingestion should be an asynchronous staged pipeline: source file → immutable artifact → extraction → schema validation → supplier/product matching → human exception review → approved price-list publication. Model output must remain evidence-linked and cannot write active offers without deterministic validation and an auditable approval step.
