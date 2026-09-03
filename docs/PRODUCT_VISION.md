# Product vision

Status: canonical product direction
Effective date: 2 September 2026

## Product thesis

Joint Procurement OS is not merely an ordering application. It is the orchestration and evidence system that governs every corporate expenditure from the originating need or procurement procedure through commitment, fulfilment and evidence, invoice, accounting registration, and authorization for payment.

The product must always be able to answer:

- what expenditure is being proposed or recognized;
- why it is commercially and organizationally valid;
- which evidence supports it;
- who supplied each fact and who had authority to decide;
- what should be posted to accounting;
- what the ERP actually posted and with which resulting identifiers and status.

## System boundaries

The ERP remains the accounting system of record. Joint Procurement OS decides, explains, and proves what should be posted. It creates a canonical accounting proposal only when policy, matching, evidence, and authority are sufficient.

An ERP Integration Hub translates that proposal for a specific accounting platform. Adapters execute or transmit the posting and return the accounting identifiers, dates, status, and errors. Business rules must never be embedded in a Mago-, Coopselios-, SAP-, or vendor-specific adapter.

## Universal procurement model

The platform must govern multiple purchase archetypes through one orchestration model:

- catalog and facility-directed purchases;
- contract-based expenditure such as utilities;
- kitchen and food ordering;
- purchases made by executives under delegated authority;
- professional-service purchases;
- recurring and non-PO expenditure;
- future archetypes that use the same evidence, authority, matching, and accounting boundaries.

Different archetypes may require different matching rules and evidence, but they must not become disconnected products or incompatible ledgers.

## Product principles

1. **Evidence before assertion.** Material facts and decisions must be traceable to immutable original evidence.
2. **Authority is contextual.** Identity says who a person is; authority says what that person may attest, allocate, approve, or authorize in a defined scope and time window.
3. **Canonical core, adapter edge.** Procurement and accounting intent use vendor-neutral objects. External systems are reached through adapters.
4. **Human work is not repeated.** Evidence supplied by a valid witness remains useful even when a separate authority must approve the completed package.
5. **Automation is graduated.** Straight-through processing is allowed only where entity, archetype, category, amount, risk, supplier, and evidence quality permit it.
6. **AI assists; it does not rewrite truth.** Original human messages and deterministic audit facts remain canonical. AI interpretations are attributable, confidence-bearing derivatives.
7. **No invented certainty.** Missing evidence, authority, matching, or accounting information must remain explicit rather than being silently inferred.

## Enterprise identity and organization

Enterprise deployments must support Microsoft Active Directory and Windows Server domains, Entra ID, OIDC/SAML federation, and LDAP/on-premises integration where required. Demo/local identities exist only for development and demonstrations.

Organization master data must be ingestible through APIs and controlled CSV/XLSX imports. The canonical structure includes companies/legal entities, areas, facilities, services, cost centers, people, positions/functions, reporting hierarchies, and authority/delegation relationships. Reliable organigram and function-chart imports should populate organizational and authority structures without treating ambiguous source data as confirmed authority.

## AI position

AI is not primarily a chatbot. It assists document understanding, entity matching, identification of missing information, evidence interpretation, routing, anomaly detection, accounting-proposal generation, and explanation. Deterministic rules, authority validation, immutable evidence, and auditable human confirmation remain the control plane.

## Roadmap consequence

After M11 and before major new business domains, the planned milestone **M11.5 — Enterprise Procurement Architecture** must formalize the canonical schema and contracts for purchase archetypes, enterprise identity, organization master data, authority, evidence, resolution, matching, accounting orchestration, and ERP integration.

This document records product direction. It does not claim that these capabilities are implemented today.
