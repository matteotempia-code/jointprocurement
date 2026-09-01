# Office setup - Windows and Supabase

This guide recreates Joint Procurement OS on a new Windows workstation. GitHub, Supabase PostgreSQL and private Supabase Storage are canonical; no local PostgreSQL or database dump is required.

## Prerequisites

- Windows 10/11 64-bit.
- Git.
- Node.js `>= 20.9.0` with npm; Node.js 22 LTS is recommended.
- PowerShell 5.1 or PowerShell 7.
- Access to the shared Supabase environment values through an approved secure channel.

## 1. Clone and install

```powershell
Set-Location C:\dev
git clone https://github.com/matteotempia-code/jointprocurement.git joint-procurement-os
Set-Location C:\dev\joint-procurement-os
npm ci
npx playwright install chromium
```

The clone should be clean before configuration.

## 2. Configure the server environment

```powershell
Copy-Item .env.example .env
notepad .env
```

Configure:

- `DATABASE_URL`: Supabase transaction pooler for application queries.
- `DIRECT_URL`: Supabase session pooler for Prisma migrations.
- `DOCUMENT_STORAGE_PROVIDER=supabase`.
- `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only elevated/secret key.
- `SUPABASE_STORAGE_BUCKET=source-documents`.
- `DOCUMENT_INTELLIGENCE_PROVIDER=local` for deterministic interpretation.

Never commit `.env`. Never prefix the elevated Storage key with `NEXT_PUBLIC_`.

## 3. Verify the private bucket

```powershell
npm run storage:setup
npm run storage:check
```

The setup command creates only the configured bucket when absent. It requires the bucket to be private and does not alter unrelated buckets. The check uploads, reads, signs and removes a temporary probe without printing credentials.

## 4. Validate and migrate the database

```powershell
npx prisma validate
npx prisma migrate deploy
npx prisma migrate status
```

Use migration deploy against shared Supabase. Never use `prisma migrate reset` or `prisma migrate dev` there.

## 5. Synthetic baseline

Only run the deterministic seed when intentionally rebuilding the shared demo environment:

```powershell
npm run db:seed
npm run demo:imports
npm run storage:migrate
```

`demo:imports` only regenerates deterministic files. It is not a live Storage ingestion check. `storage:migrate` uploads only database-referenced fixture/runtime documents and updates their locators; it ignores stale unreferenced `var/imports/` files.

The repository owns four static synthetic product documents under `public/documents/` and four Smart Import input fixtures under `demo-imports/`. They contain no real supplier or personal data.

## 6. Start and verify

```powershell
npm run dev
```

Open <http://localhost:3000>. Use Giulia Bianchi for Smart Import. Upload a fixture from `demo-imports/`; its operational original is written to private Supabase Storage and is available from every configured workstation.

For a controlled live activation proof, use `npm run storage:prove-live` followed by `npm run storage:prove-browser`. The browser proof verifies Procurement readback, RSA denial and availability while `var/imports/` is temporarily unavailable.

```powershell
npm run lint
npm test
npm run build
npm run qa:browser
npm run demo:video:check
```

## Canonical storage boundaries

- GitHub: source, migrations, deterministic fixtures and synthetic static assets.
- Supabase PostgreSQL: business data, import metadata, checksums and provenance.
- Private Supabase Storage: runtime uploaded originals.
- `var/imports/`: ignored, optional local-test adapter only; it can be deleted without affecting Supabase-backed documents.
- `.next/`, `.next-video-demo/`, `artifacts/video-demo/`: generated caches/media and ignored.

See `docs/HOME_OFFICE_WORKFLOW.md`, `docs/STORAGE_STRATEGY.md` and `docs/ASSET_STORAGE_INVENTORY.md` for the cross-workstation, security and complete asset model.
