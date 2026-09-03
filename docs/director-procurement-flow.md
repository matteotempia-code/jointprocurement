# Director procurement flow

## Canonical M11 lifecycle

The current facility-director lifecycle is:

`need → catalog/favorites/lists → supplier-grouped cart → policy and facility limits → requisition → approval/clarification → purchase order → delivery → receipt → nonconformity → audit history`.

The application persists every business transition in Supabase PostgreSQL. Operational uploads use the private Supabase Storage bucket configured by `SUPABASE_STORAGE_BUCKET`; no uploaded file is canonically stored on the workstation.

## Buying controls

The cart evaluates supplier minimum order, free-shipping threshold, shipping fee and below-minimum surcharge. Its effective total, rather than goods subtotal alone, feeds the requisition. The policy snapshot stored on the requisition records the commercial evaluation and the applicable facility limits.

M11 procurement limits support:

- facility × product × period, monetary or quantitative;
- facility × category × period, monetary or quantitative;
- an optional cost-centre scope;
- product-specific precedence over a category fallback, independently for monetary and quantity limits.

Each evaluation exposes limit, received/used, open-order commitment, pending-requisition reservation, current request and remaining capacity. A breached limit routes the request to Procurement rather than silently allowing it.

## Operational attachments

Supported current-scope attachment owners are:

- out-of-catalog requests: PDF, PNG/JPEG, DOCX and XLSX;
- receipts: delivery-note or condition evidence in PDF or PNG/JPEG;
- nonconformities: photos and PDF evidence.

Files are limited to 8 MB, extension and MIME are checked, SHA-256 is recorded, and object keys are organization- and record-scoped. Upload occurs before the database transaction; a failed transaction triggers object cleanup. Submitted evidence is immutable. Download first checks organization, role and facility scope, then returns a 60-second signed URL (or server-streams through the local test adapter).

Static synthetic product packshots and product compliance documents remain deterministic Git fixtures. They are not user uploads.

## Audit and honest behavior

Requisition submission, clarification, decision, PO creation, supplier-reminder draft, receipt, issue creation/resolution and Smart Import publication produce database audit events. Reminder creation is explicitly a draft when no mail provider exists. PO PDF output is generated from current database state and does not require persistent local files.

## M11.5 exclusions

M11 does not implement universal invoice/accounting orchestration, ERP posting, enterprise federation/LDAP, the universal authority/evidence engine, utilities or professional-services payable matching, RFQ/RFP, supplier portal, CLM, or full demand aggregation. See [DOMAIN_ARCHITECTURE_2.md](DOMAIN_ARCHITECTURE_2.md) for their planned canonical model.
