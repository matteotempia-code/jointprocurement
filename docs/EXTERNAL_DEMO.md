# External demo runbook

The certified external demonstration runs only against the Vercel `develop` deployment and Supabase DEV. Never use this sequence against Production.

## Canonical 10–15 minute route

1. Select **Lucia Ferri** and open Home.
2. Search the Catalog and open Product 360.
3. Select an active offer, set quantity, and add it to the Cart.
4. Review normalized price, commercial conditions, budget/limits, and submit the requisition.
5. Select **Andrea Riva**, open Approval Inbox, inspect the decision cockpit, and approve.
6. Return to **Lucia Ferri**, open the generated PO, then register receipt. Add a delivery document; optionally record a discrepancy and NC evidence.
7. Open Supplier 360 and Category 360 from the governed product/supplier context.
8. Select **Giulia Bianchi** and show the Procurement Control Center.
9. Select **Davide Romano** and show the Executive Control Tower.
10. Optional: as **Giulia Bianchi**, upload a small synthetic price list through Smart Import and show review, provenance, Procurement AI status, and publication.

Use the seeded demo data and create a new requisition during each demonstration. Do not depend on a particular pre-existing request number or approval row.

## Honest scope boundaries

- Organization, users, delegations, suppliers, products, and categories are current read-only administration views. They do not advertise unsupported CRUD.
- Finance is an explicit read-only control view; invoice reconciliation and ERP posting are excluded.
- Smart Import handles XLSX, CSV, DOCX, and native textual PDF. Scanned-image OCR is excluded.
- Functional-equivalence inference and technical-sheet reassessment are excluded.

## Automated certification

`npm run qa:demo:external` validates the immutable Vercel develop deployment, real Supabase DEV persistence, private attachment readback, a persisted non-blocking budget warning, honest admin capability, and negative access/state boundaries. It requires the protected GitHub `develop` environment and must never receive Production credentials.
