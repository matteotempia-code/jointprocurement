# Office workstation sync

The canonical repository is `https://github.com/matteotempia-code/jointprocurement.git` on branch `master`.

## Fresh workstation

Requirements: Git and the Node.js version supported by the project. A local PostgreSQL installation is not required.

```powershell
git clone https://github.com/matteotempia-code/jointprocurement.git
cd jointprocurement
npm ci
Copy-Item .env.example .env
```

Fill `.env` locally. Never commit it. Required runtime names are documented in `.env.example`; the shared setup uses `DATABASE_URL`, `DIRECT_URL`, `DOCUMENT_STORAGE_PROVIDER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`. OpenAI procurement intelligence additionally uses `PROCUREMENT_AI_ENABLED`, `PROCUREMENT_AI_PRIMARY_PROVIDER`, `OPENAI_PROCUREMENT_MODEL`, and `OPENAI_API_KEY`. `DEMO_MODE` controls demo-only chrome.

## Canonical architecture

- Supabase PostgreSQL is the operational database.
- Supabase Storage, in a private bucket, is canonical for runtime uploads.
- Git contains application source, Prisma migrations, deterministic fixtures, and immutable demo assets.
- Local runtime and temporary folders are disposable; no folder must be copied between PCs.

## Initialize and run

```powershell
npx prisma validate
npx prisma migrate deploy
npx prisma migrate status
npm run storage:check
npm run dev
```

Do not run `prisma migrate reset` or `prisma migrate dev` against the shared Supabase database.

## Smoke tests

```powershell
npm test
npm run lint
npm run build
npm run storage:check
```

## Verify synchronization

```powershell
git fetch origin
git rev-parse HEAD
git rev-parse origin/master
git status --short
```

The two SHAs must match and `git status --short` must print nothing.
