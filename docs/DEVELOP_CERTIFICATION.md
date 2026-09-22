# Develop cloud certification

The GitHub Actions workflow **Develop Cloud Certification** certifies every push to `develop` and can also be started manually with **Run workflow**. The developer workstation is not part of the certification boundary and no local `.env` file is required. GitHub Environment secrets are the single source of truth for the DEV database connection.

## What runs

The first job checks out the exact commit and runs, on Node.js 22:

1. `npm ci`
2. `npx prisma validate`
3. `npx prisma generate`
4. `npx prisma migrate deploy` and `npx prisma migrate status`
5. `npm test`, including the existing database integration tests against Supabase DEV
6. `npm run lint`
7. `npm run build`
8. `git diff --check HEAD^ HEAD`

No seed is executed. Integration tests create uniquely identified fixtures and remove only those fixtures in their cleanup blocks.

After those gates pass, the second job validates both database URLs, synchronizes them to the Vercel custom environment `develop`, and deploys the exact workflow checkout with `vercel deploy --target=develop`. Synchronization is a hard gate: any failed write stops the job before deployment. The first request to the deployment is `/api/health/database`; certification stops unless the application reports project `kvrvprzojwqhqtqsxkgu` and migration `20260922170000_global_document_sequences`. Only then are Playwright and the remote suites run.

## GitHub Environment configuration

Create or update the GitHub Actions environment named `develop`. Keep all values DEV-only; never copy Production credentials.

Encrypted secrets:

- `DEV_DATABASE_URL`: Supabase DEV PostgreSQL pooled connection string used by the test suite.
- `DEV_VERCEL_TOKEN`: scoped Vercel token able to update `develop` environment variables and deploy to the DEV project.
- `DEV_VERCEL_AUTOMATION_BYPASS_SECRET`: Vercel deployment-protection bypass secret for automated smoke tests.

Environment variables:

- `DEV_VERCEL_PROJECT_ID`: Vercel project ID for Sorgence DEV.
- `DEV_VERCEL_TEAM_ID`: Vercel team/account ID owning that project.

`DEV_DATABASE_URL` must use the transaction pooler on port 6543 and identify `kvrvprzojwqhqtqsxkgu`. The workflow derives `DIRECT_URL` from the same URL by changing only the port to 5432, masks the derived value, and synchronizes both runtime forms to Vercel. There is no second database-password secret to rotate. The public Supabase root CA is versioned at `certificates/supabase-root-2021-ca.crt`, so it is not stored as a secret or synchronized.

The standard suite intentionally disables Procurement AI and does not require `OPENAI_API_KEY`: provider configuration and fallback behavior are tested without making paid or nondeterministic model calls. Supabase Storage credentials remain in Vercel `develop`.

## Deployment and reruns

Automatic Git deployment is disabled for the `develop` branch in `vercel.json`. This prevents Vercel from deploying before the database-secret synchronization gate. The workflow token therefore needs permission to update project environment variables and create deployments in the custom `develop` environment.

Running `vercel deploy --target=develop` manually bypasses the synchronization gate and is not a certified deployment path. Vercel does not provide a repository setting that selectively disables manual CLI deployments for one custom target. Restrict deploy-capable project tokens and team roles to CI operators if manual deployment must be prevented administratively.

To rerun certification, open **Actions → Develop Cloud Certification**, select `develop`, and choose **Run workflow**. A run fails if configuration is absent, any quality or database gate fails, the matching Vercel deployment fails or times out, or the critical remote smoke fails.
