# Domain Architecture 2 — Enterprise procurement orchestration

Status: canonical target architecture; implementation planned under M11.5
Effective date: 2 September 2026

## 1. Architectural boundary

Joint Procurement OS owns procurement intent, evidence, matching, authority evaluation, policy explanation, and the proposal of an accounting treatment. The ERP owns the resulting accounting books, journals, payables, due dates, and posting state.

```text
Need / procedure
  -> Commercial commitment
  -> Fulfilment and evidence
  -> Payable event / invoice
  -> Resolution and matching
  -> Authority evaluation
  -> Accounting proposal
  -> ERP Integration Hub
  -> ERP adapter
  -> Accounting posting result
```

No purchase archetype may bypass evidence, authority, audit, or the canonical integration boundary merely because its source document or workflow differs.

## 2. Canonical domain objects

### ProcurementProcedure

The governed process that establishes how a need may be sourced or fulfilled. It may represent a catalog route, contract call-off, direct award, recurring arrangement, professional-service engagement, or another controlled procedure.

### CommercialCommitment

The economically binding or expected obligation created by a PO, contract, accepted tariff, authorized executive purchase, recurring arrangement, or equivalent act. A `PurchaseOrder` is one current specialization, not the universal commitment model.

### PayableEvent / Invoice

The supplier claim or economic event that may create an accounting payable. It must retain source-document identity, supplier, legal entity, amounts, tax data, dates, and links to the applicable commitment, procedure, and evidence.

### EvidenceRecord

An immutable, attributable record of a fact, response, document, observation, or attestation used to resolve a case, perform matching, or support an accounting/authorization decision.

### ResolutionCase

A controlled case opened because one or more required facts, allocations, matches, or decisions are missing or contradictory. It records the missing facts, candidate responders, channel activity, gathered evidence, decisions, and closure rationale.

### AuthorityGrant / AuthorityGraph

A time-bound graph of what a person or function may attest, allocate, approve, or authorize across organization scope, subject/category, action, and amount. Delegation and substitution are first-class edges, not ad hoc role changes.

### AccountingProposal

The canonical, explainable instruction describing what Joint Procurement OS believes should be registered after evidence, matching, authority, and policy checks are sufficient.

### AccountingPostingResult

The immutable response from the ERP adapter: posting/registration ID, journal or document number, posting date, payable/due-date identifier, state, and any structured error. It links the external system of record back to the proposal that produced it.

## 3. Purchase archetypes

The initial taxonomy is:

| Archetype | Typical commitment/evidence | Example matching basis |
| --- | --- | --- |
| Catalog / facility-directed | requisition, approval, PO, receipt | PO + receipt + invoice + facility/cost center |
| Contract-based / utilities | contract, site/POD, tariff, consumption | contract + site + tariff + consumption + period + invoice |
| Kitchen / food ordering | menu/need, order, delivery | order + delivered quantity + agreed price + period |
| Executive delegated purchase | authority grant, receipt/claim, purpose | delegated authority + evidence + category + amount |
| Professional services | contract/engagement, service acceptance | tariff + validated hours/shifts/prestations + period + facility + invoice |
| Recurring / non-PO spend | recurring mandate, allocation, service evidence | mandate/contract + period + allocation + invoice |

Archetype-specific rules are strategies attached to the canonical lifecycle. They do not replace the common objects.

## 4. Budget and limit model

The primary facility-control requirement is multidimensional, not merely a global annual currency budget. A limit may be resolved across:

```text
organization
× legal entity
× facility
× product or category
× cost center or service
× period
```

Supported conceptual limit types include:

- currency per month or other period;
- units or packages per period;
- category budget;
- per-bed or another normalized allocation;
- unrestricted where policy explicitly permits it.

Example: Facility X may buy no more than EUR N per month or N units per month of nitrile gloves. Limit evaluation must identify the matched scope, period, consumed/reserved/committed amount or quantity, remaining capacity, and rule source.

## 5. Identity and organization master

### Identity providers

Production identity may be supplied by Active Directory/Windows domains, Entra ID, OIDC, SAML, or LDAP/on-premises integration. Local demo identities are not a production identity architecture.

Identity proves **who** a principal is. It does not itself prove **what** that principal may attest or authorize.

### Organization master ingestion

Organization data must accept API and controlled CSV/XLSX imports for:

- companies and legal entities;
- areas, facilities, services, and cost centers;
- people and external collaborators where applicable;
- positions, functions, and hierarchical reporting;
- authority, delegation, and substitution relationships.

Organigram/function-chart imports may propose structure and authority relationships. Ambiguous or incomplete authority data requires review before activation.

## 6. Authority graph

An authority grant is evaluated from at least:

- person and/or role/function;
- organization scope;
- category or subject;
- permitted action;
- amount threshold or other quantitative limit;
- validity dates;
- delegation or substitution lineage.

Three powers must remain explicit:

1. **Evidence Provider** — may attest a fact.
2. **Allocation Authority** — may specify accounting or organizational allocation.
3. **Approval Authority** — may authorize commitment, registration, or payment.

One person may hold any combination. A valid factual witness is not automatically an approver, and an approver need not repeat factual work already captured from an authorized evidence provider.

Every evaluation must produce an authority snapshot suitable for later audit even if grants change afterward.

## 7. Evidence engine

Every human response used in a procurement or accounting resolution becomes an immutable `EvidenceRecord`. The conceptual record includes:

- Evidence ID, Case ID, and Question ID;
- person/user identity and organization;
- role/function and authority snapshot at response time;
- communication channel and channel identity;
- authentication or identity-assurance level;
- original question and original unmodified response;
- normalized interpretation;
- attachments and their immutable storage locators/checksums;
- sent, delivered, read, and replied timestamps where available;
- provider and message identifiers;
- AI interpretation, model/version, and confidence;
- required human confirmation and its outcome;
- checksum and audit-chain linkage.

The original message is append-only. AI normalization, translation, classification, or summarization is a separate derivative and must never overwrite it.

## 8. Resolution engine

When information is missing, the engine determines:

1. the exact fact or decision that is missing;
2. the person or function best positioned to provide it;
3. whether that target holds evidence, allocation, and/or approval authority;
4. the permitted available channel;
5. the next route after the response is captured.

Conceptual channels include portal, email, WhatsApp, Teams, Slack, and future providers. A factual responder should not need to sign into the portal for every confirmation when channel identity and assurance are sufficient.

If the responder supplies valid evidence but lacks approval power, the answer remains canonical evidence and the completed evidence package is routed to the appropriate authority holder. The authority holder reviews the package rather than recreating the factual investigation.

## 9. Matching engine

The matching engine reconciles a payable event against whichever evidence its archetype requires, including:

- PO or commercial commitment;
- contract and agreed tariff;
- receipt or service acceptance;
- time, shift, or prestation records;
- price list, quantity, and period;
- facility, cost center, procedure, and authority.

Rules are archetype-aware and produce explained matched, unmatched, tolerated, conflicting, and missing elements. Examples:

- independent nurse: contract/tariff + validated hours/shifts + period + facility + invoice;
- utility: contract + POD/site + tariff + consumption + period + invoice.

## 10. Accounting orchestration

When evidence, match, policy, and authority are sufficient, the system creates an `AccountingProposal` containing conceptually:

- legal entity and supplier;
- invoice/payable event;
- general-ledger and analytical account;
- facility, cost center, service, and project where applicable;
- taxable amount and VAT/tax treatment;
- due date and payment terms;
- evidence completeness and authority status;
- match status;
- risk and confidence with explanations.

A proposal is versioned and auditable. ERP-specific field transformation occurs only in an adapter.

## 11. ERP Integration Hub

The hub exposes canonical contracts and dispatches to adapters, for example Mago for Anteo, a Coopselios ERP adapter, or future SAP/other adapters. Supported transport patterns may include API, file exchange, SFTP, scheduled import/export, and other controlled mechanisms.

The adapter returns a persisted `AccountingPostingResult` with posting/registration ID, journal/document number, posting date, payable/due-date ID, state, and structured error. Retries must be idempotent and correlate to the same proposal.

## 12. Automation levels

| Level | Meaning |
| --- | --- |
| L0 Manual | Human performs and verifies each step. |
| L1 Assisted | System proposes matches, evidence requests, and accounting treatment. |
| L2 Human-on-exception | Deterministic routine cases flow; humans resolve exceptions. |
| L3 Straight-through accounting | Eligible proposals are posted automatically to the ERP. |
| L4 Straight-through payable/scadenziario | Eligible postings also create/update payable and due-date records. |

Actual payment execution remains governed by treasury and payment-authorization policies. Automation level may vary by legal entity, category, amount, archetype, risk, supplier, and evidence quality.

## 13. AI control boundary

AI may assist understanding, matching, missing-fact detection, evidence interpretation, routing, anomaly detection, proposal generation, and explanation. It cannot silently invent evidence, authority, accounting identifiers, or human confirmation. Deterministic policies and original evidence remain canonical.

## 14. M11.5 deliverables

Before implementing major new domains, M11.5 must formalize:

- canonical schema and lifecycle invariants;
- purchase-archetype contracts;
- identity-provider boundary;
- organization-master ingestion and reconciliation;
- authority graph and snapshot semantics;
- evidence and resolution models;
- matching strategy contracts;
- accounting proposal and posting-result contracts;
- ERP Integration Hub and adapter interface;
- security, retention, idempotency, and audit requirements.

No object in this target document should be inferred as implemented until its feature-register status changes from `PLANNED` through a reviewed milestone.
