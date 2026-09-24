# URGENT — FIX PRICE LIST IMPORT HANG

Repository:
`C:\dev\joint-procurement-os`

Branch:
`develop`

Current demo environment:
`https://procurement.partnersviluppo.dev`

Problem:
Price-list / Smart Import hangs and does not complete.

This is a demo blocker.

## MISSION

Find the exact root cause of the hanging price-list import and make the import reliable end-to-end on the current demo environment.

DO NOT:

- redesign the feature
- add unrelated functionality
- touch master
- touch Production
- hide failures with fake success states

## 1. REPRODUCE THE BUG

Use the real deployed develop/demo environment.

Run at least:

- one normal CSV/XLSX price list
- one larger realistic price list if supported
- one malformed/unsupported input

Record the exact stage where it hangs:

- upload
- file persistence
- parsing
- supplier detection
- AI extraction
- canonical matching
- persistence
- final status update
- UI polling/refresh

## 2. INSPECT RUNTIME

Inspect:

- Vercel runtime logs
- API route/server action logs
- Prisma/database errors
- OpenAI calls
- storage errors
- background job state
- import status rows

Determine whether the hang is:

- request timeout
- DB timeout
- OpenAI timeout
- unhandled promise
- polling bug
- stale PROCESSING state
- parsing loop
- missing error transition
- storage/download issue
- race condition

## 3. NO INFINITE PROCESSING

Every import must finish in one of these states:

COMPLETED
PARTIAL_SUCCESS
FAILED
NEEDS_REVIEW

It must NEVER remain indefinitely in:
PROCESSING
UPLOADING
PARSING
AI_ANALYSIS

Add explicit timeout/error transitions where missing.

## 4. OBSERVABILITY

For each import persist enough information to diagnose failures:

- import id
- current stage
- started_at
- updated_at
- completed_at
- error_code
- sanitized error_message
- rows detected
- rows processed
- rows failed

Do not store secrets.

## 5. OPENAI SAFETY

If OpenAI is used:

- add explicit timeout
- bounded retries
- fail gracefully
- never block the entire import forever
- preserve partial parsed results when safe

If AI fails, the import should move to NEEDS_REVIEW or FAILED with a visible reason.

## 6. PARSING

Verify parsing for supported formats.

At minimum confirm:

- CSV
- XLSX/XLS if currently supported

Handle:

- empty rows
- merged cells
- unexpected headers
- decimal commas
- currency symbols
- duplicate rows
- missing supplier field
- unknown columns

Do not invent supplier identity if evidence is insufficient.

## 7. DATABASE / JOB INTEGRITY

Check that:

- import transaction boundaries are reasonable
- large imports do not hold one giant DB transaction
- partial failures do not lock the whole import
- status updates are committed progressively
- retries are idempotent

## 8. UI

The UI must:

- show progress or current stage
- stop spinner on failure
- show a human-readable error
- allow retry when safe
- show completed result clearly

No silent spinner forever.

## 9. REMOTE CERTIFICATION

Against:
`https://procurement.partnersviluppo.dev`

Verify:

A. Normal price list

- upload succeeds
- processing starts
- processing finishes
- supplier/document identification visible
- extracted rows visible
- persisted data visible

B. AI failure simulation / timeout

- import exits PROCESSING
- visible FAILED or NEEDS_REVIEW

C. malformed file

- visible failure
- no stuck state

D. retry

- does not duplicate imported products/rows unexpectedly

## 10. DEMO PATH

Only mark Smart Import demo-ready if the full remote flow passes.

Otherwise:

- keep the core demo working
- disable/hide Smart Import from the external demo path
- document limitation clearly

## 11. QUALITY

Run:

- prisma validate
- prisma generate
- tests
- lint
- build
- git diff --check
- relevant remote import smoke

## 12. COMMIT

Commit and push only to:
`develop`

## FINAL RESPONSE FORMAT

STATUS: PASS / MIXED / FAIL

ROOT CAUSE:
...

HANG STAGE:
...

FIX:
...

REMOTE NORMAL IMPORT:
PASS / FAIL

REMOTE FAILURE HANDLING:
PASS / FAIL

REMOTE RETRY:
PASS / FAIL

UI NO-INFINITE-SPINNER:
PASS / FAIL

COMMIT SHA:
...

DEMO SMART IMPORT READINESS:
PASS / FAIL

KNOWN LIMITATIONS:
...
