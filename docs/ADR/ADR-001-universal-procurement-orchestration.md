# ADR-001: Universal procurement orchestration and evidence architecture

- Status: Accepted
- Date: 2 September 2026
- Decision owners: Product and domain architecture
- Implementation milestone: M11.5 — Enterprise Procurement Architecture

## Context

The current product is strongest around catalog-guided purchasing: requisition, deterministic policy, approval, purchase order, receipt, quality issue, and Smart Import. Enterprise expenditure also includes utilities, professional services, executive delegated purchases, recurring/non-PO spend, and other commitments whose evidence and matching basis is not a conventional PO.

Extending the existing PO-centric chain separately for every use case would duplicate authority, evidence, resolution, matching, and accounting logic. Hardwiring the result to one ERP would also make procurement policy dependent on an accounting vendor.

## Decision

Joint Procurement OS will adopt a universal procurement-orchestration model.

1. The canonical objects are `ProcurementProcedure`, `CommercialCommitment`, `PayableEvent/Invoice`, `EvidenceRecord`, `ResolutionCase`, `AuthorityGrant/AuthorityGraph`, `AccountingProposal`, and `AccountingPostingResult`.
2. Purchase types are archetypes that supply specialized evidence and matching strategies to a shared lifecycle.
3. ERP remains the accounting system of record. Joint Procurement OS owns the explainable proposal and evidence package.
4. ERP connectivity passes through a vendor-neutral Integration Hub and specific adapters.
5. Enterprise identity and contextual authority are separate concerns.
6. Authority distinguishes evidence provision, allocation, and approval.
7. Original human evidence is immutable; AI interpretations are attributable derivatives.
8. Missing information is handled through a channel-aware Resolution Engine instead of requiring every factual responder to use the portal.
9. Budget and limit evaluation is multidimensional across organization, legal entity, facility, product/category, cost center/service, and period, and supports both monetary and quantitative controls.
10. Automation is graduated from L0 to L4 and selected by entity, archetype, amount, risk, supplier, category, and evidence quality. Payment execution remains under treasury controls.

## Consequences

### Positive

- PO and non-PO expenditure share one auditable control plane.
- Evidence gathered once can support later allocation and approval without repeated factual work.
- Accounting integrations remain replaceable and organization-specific.
- Authority changes do not destroy historical explainability because decisions retain snapshots.
- AI can accelerate work without becoming the source of truth.

### Costs and constraints

- The domain schema must be designed before invoice, contract, and ERP modules are built.
- Current static roles and approval delegation are insufficient as the final authority model.
- Existing budget records are less dimensional than the target limit model.
- Communication-channel identity, consent, retention, assurance, and provider correlation require explicit security design.
- Straight-through processing requires idempotency, segregation of duties, complete audit, and controlled failure handling.

## Alternatives rejected

### Extend PurchaseOrder to represent every expenditure

Rejected because utilities, services, recurring charges, and delegated executive spend do not all have truthful PO semantics.

### Build separate vertical workflows for each spend type

Rejected because it fragments evidence, authority, matching, accounting intent, and audit.

### Let the ERP own procurement decisions

Rejected because the ERP is the accounting system of record, not the canonical system for procurement evidence, resolution, or policy explanation.

### Integrate directly with Mago in domain services

Rejected because it couples business semantics to one adapter and prevents clean Coopselios and future ERP integrations.

### Treat AI-normalized responses as canonical evidence

Rejected because normalization can be probabilistic and must never replace the original human message.

## Current implementation relationship

Current requisitions, approvals, POs, receipts, quality issues, budgets, assignments, delegations, audit events, SourceDocuments, and Smart Import are useful inputs and specializations. They are not yet the complete canonical model described here. This ADR authorizes architecture formalization only; it does not authorize implementation, migration, or integration work in this documentation task.
