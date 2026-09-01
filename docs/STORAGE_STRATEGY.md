# Document storage strategy

## Canonical boundaries

- GitHub stores source, migrations, deterministic fixtures and synthetic static assets.
- Supabase PostgreSQL stores document metadata, checksums, provenance, import staging and business state.
- The private Supabase Storage bucket `source-documents` stores uploaded source bytes.
- `var/imports/` is an optional local adapter workspace for tests and isolated development. It is ignored, dispensable and never canonical in shared operation.

`SourceDocument` records an explicit `storageProvider`, `storageBucket` and `storageObjectKey`. `storagePath` remains as a compatibility locator while existing records migrate. New Supabase documents store the object key in both locator fields; no workstation path enters cloud metadata.

## Server-only access

The application creates a dedicated `@supabase/supabase-js` client only in server modules. It uses `SUPABASE_SERVICE_ROLE_KEY` (or a newer Supabase secret key supplied under that server-only variable) and never exports the client to browser code. The bucket remains private. Storage RLS policies are not the application authorization boundary because browser clients never call Storage directly; the elevated server client bypasses RLS only after the application verifies role and organization ownership in PostgreSQL.

The original-document route requires Procurement Manager or Procurement Admin and filters `SourceDocument` by the active assignment's `organizationId` before generating a signed URL. Signed URLs expire after 60 seconds. Guessing a document ID or object key from another organization does not grant a URL.

## Object keys

```text
organizations/{organizationId}/imports/{sourceDocumentId}/documents/{sourceDocumentId}/{sha256}-{sanitizedFilename}
```

Identifiers accept only alphanumeric, underscore and hyphen characters. Filenames are reduced to a basename and sanitized. Empty segments, traversal components, backslashes and absolute keys are rejected. SHA-256 plus the document ID provides collision resistance and stable provenance.

## Consistency model

Upload order is Storage then PostgreSQL. The application uploads an immutable object (`upsert: false`), then transactionally creates `SourceDocument`, `ImportJob` and the audit event. If the transaction fails, it deletes the uploaded object. Parser failures retain both the object and a clear database failure/provider-required state for reprocessing.

Parsers consume buffers. XLSX, CSV/TSV/TXT, native PDF and DOCX do not depend on a local path or canonical temporary copy.

## Setup, checks and migration

```powershell
npm run storage:setup
npm run storage:check
npm run storage:migrate
```

`storage:setup` creates only the configured bucket when absent and requests `public: false`. It refuses a public bucket. `storage:check` verifies privacy, upload, metadata, read-back, signed URL generation and probe cleanup without printing credentials.

`storage:migrate` considers only database-referenced `demo-imports/` or `var/imports/` files. It ignores unreferenced leftovers, verifies SHA-256, uploads, updates the database locator, and cleans the object if the database update fails. Missing referenced files make the command non-successful.

Fixture generation and live activation are deliberately separate:

```powershell
npm run demo:imports          # regenerate deterministic Git fixtures only
npm run storage:prove-live    # ingest XLSX + native PDF through the application service
npm run storage:prove-browser # authorized readback, denial and no-var/imports proof
```

The proof manifest is transient and ignored under `var/storage-proof/`; it never stores a credential or signed URL. See `ASSET_STORAGE_INVENTORY.md` for the repository-wide binary/content audit.

## Local adapter

Set `DOCUMENT_STORAGE_PROVIDER=local` only for isolated tests or deliberate single-machine development. Runtime objects stay beneath ignored `var/imports/`. The current seed deliberately retains three immutable fixture-backed `SourceDocument` rows so a clone can demonstrate staged data without mutating Storage. They are Git fixtures, not operational uploads. Every document submitted through Smart Import uses the configured provider; shared environments must select `supabase`.
