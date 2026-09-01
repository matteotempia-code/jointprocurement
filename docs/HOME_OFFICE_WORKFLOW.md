# Home and office workflow

Both workstations use the same canonical services:

```text
Home PC   -> GitHub source -> Supabase PostgreSQL -> private Supabase Storage
Office PC -> GitHub source -> Supabase PostgreSQL -> private Supabase Storage
```

No local PostgreSQL installation and no transfer of `var/imports/` are required.

## New workstation

1. Install Git and Node.js 22 LTS or newer.
2. Clone the repository.
3. Run `npm ci`.
4. Copy `.env.example` to `.env` and insert shared Supabase values through a secure channel.
5. Run `npx prisma validate`, `npx prisma migrate status` and `npm run storage:check`.
6. Run `npm run dev`.

Never commit or message `.env`. The service-role/secret key is a backend credential and must not use a `NEXT_PUBLIC_` prefix.

## Multi-PC document semantics

When machine A uploads a document, the server validates type and size, computes SHA-256, uploads to the private bucket, and writes the locator and import metadata to Supabase PostgreSQL. Machine B needs only the repository and the same environment configuration. Its server reads the database locator and downloads or signs the same Storage object; no path points back to machine A.

Repository fixtures remain useful inputs. Once uploaded through Smart Import or migrated for seeded `SourceDocument` rows, the operational original remains available if every local runtime copy is removed.

`npm run demo:imports` only regenerates the four deterministic input fixtures. It does not insert records and is not evidence of cloud ingestion. For an explicit activation proof, run `npm run storage:prove-live` and then `npm run storage:prove-browser`; the latter makes `var/imports/` unavailable while a browser session reads the cloud originals and verifies role denial.
