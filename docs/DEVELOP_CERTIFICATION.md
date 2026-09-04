# Develop cloud certification

The GitHub Actions workflow **Develop Cloud Certification** certifies every push to `develop` and can also be started manually with **Run workflow**. The developer workstation is not part of the certification boundary and no local `.env` file is required.

## What runs

The first job checks out the exact commit and runs, on Node.js 22:

1. `npm ci`
2. `npx prisma validate`
3. `npx prisma generate`
4. `npm test`, including the existing database integration tests against Supabase DEV
5. `npm run lint`
6. `npm run build`
7. `git diff --check HEAD^ HEAD`

No migration or seed is executed. Integration tests create uniquely identified fixtures and remove only those fixtures in their cleanup blocks.

After those gates pass, the second job waits for the Vercel custom environment `develop` deployment whose Git SHA exactly matches the workflow commit. It then installs Playwright Chromium and runs `npm run qa:develop:remote` against that deployment's immutable URL. The smoke covers the home page, demo-role switching, new import, products, suppliers, orders, and the Smart Import review workspace and record detail. It does not create, publish, or delete application data.

## GitHub Environment configuration

Create or update the GitHub Actions environment named `develop`. Keep all values DEV-only; never copy Production credentials.

Encrypted secrets:

- `DEV_DATABASE_URL`: Supabase DEV PostgreSQL pooled connection string used by the test suite.
- `DEV_VERCEL_TOKEN`: read-only/scoped Vercel token able to list deployments for the DEV project.
- `DEV_VERCEL_AUTOMATION_BYPASS_SECRET`: Vercel deployment-protection bypass secret for automated smoke tests.

Environment variables:

- `DEV_VERCEL_PROJECT_ID`: Vercel project ID for Sorgence DEV.
- `DEV_VERCEL_TEAM_ID`: Vercel team/account ID owning that project.

The standard suite intentionally disables Procurement AI and does not require `OPENAI_API_KEY`: provider configuration and fallback behavior are tested without making paid or nondeterministic model calls. Supabase Storage credentials also remain in Vercel `develop`; the remote smoke uses the deployed application and does not upload files. Add further DEV credentials only if a future test explicitly exercises the corresponding external service.

## Deployment and reruns

Vercel's Git integration remains responsible for deploying `develop` with the custom environment's DEV DB, Storage, and OpenAI configuration. GitHub does not copy or retrieve Vercel runtime secrets. Instead, it uses the minimum independent DEV database credential needed for integration tests and a scoped deployment-read token for exact-SHA coordination.

To rerun certification, open **Actions → Develop Cloud Certification**, select `develop`, and choose **Run workflow**. A run fails if configuration is absent, any quality or database gate fails, the matching Vercel deployment fails or times out, or the critical remote smoke fails.
