# Test Documentation

## Current Scope Alignment

**Scope baseline:** [Capstone Register Version 2](../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md); aligned 2026-10-21. Test all six human actors and System automation across at least two isolated organization workspaces. Existing IDs, fixtures, actor codes, dated results and manual procedures remain evidence of their recorded contracts, not Version 2 certification.

The [current feature catalog](../features/README.md) maps all 48 source functions to current contracts. Requalify retained functions for organization/assignment/entitlement boundaries, occupations/departments, L&D publication/approval, direct AI guidance and Expert-confirmed initial pathways. Newly documented registration, renewal, seats, assessment automation, ROI and activity recording require fresh evidence. Repaired feature links point to current contracts; they do not change what a historical run tested.

### Revised Verification Criteria

- Unit/API: test six-actor permissions, L&D baseline/publication/approval versus Expert authoring/initial review, direct guidance visibility, initial confirmation, assessment/tracing rules, seat limits and ROI edge cases.
- Integration/Testcontainers: round-trip every agreed runtime field/version; test department/occupation/role assignments, many-to-many coverage, private-content metadata, purchased plan versions, duplicate payment/submission events, independent evidence and cross-store recovery.
- System/Compose/manual: register/verify -> select/pay -> provision -> workspace access/renewal; accounts/departments -> occupations/assignments -> Expert role configuration -> L&D publication; module/content/assessment authoring -> approval; baseline/RIASEC -> direct AI guidance -> Employee selection -> gap/pathway -> Expert confirmation -> learning/assessment/tracing/adaptation. Include independent learning, development filters/costs/benefits/ROI, notifications and administrative audit.
- Verify cross-organization denial and private file access with at least two demo organizations. Exercise failed/duplicate payments, partial setup, renewal/seat enforcement, returned submissions and assessment replay. No cancellation, report-export or product benchmark workspace gate is introduced; research evaluation remains a separate deliverable.
- Preserve per-REQ evidence files. Do not mark new tests PASSED until executed against an approved contract; do not derive coverage from tables/endpoints or historical status alone.

Documentation-only checks do not establish backend/frontend behavior. Revised runtime acceptance requires the relevant feature suites and per-REQ evidence after implementation.

## Existing Test Guides and Evidence

### Main / Workspace Baseline Integration, 2026-10-28

[Unit/build](unit/REQ-002-workspace-baseline.md), [migration/persistence](integration/REQ-002-workspace-baseline.md) and [browser/manual evidence](system/REQ-002-workspace-baseline.md) cover the combined runtime, real workspace baseline authorization and preserved identity/subscription data. They distinguish synthetic end-to-end verification and dev readiness from actual-content/model/production certification.

### Single-role Identity and Activation, 2026-10-28

[Unit/API/build](unit/REQ-037-single-role-identity.md), [persistence/seed/dev update](integration/REQ-037-single-role-identity.md) and [browser/manual evidence](system/REQ-037-single-role-activation.md) cover FR-03.01/03.03/07.01/07.10 and legacy REQ-022/037/039. Final checks passed: 59 backend/API/database/ArchUnit tests, 40 frontend tests, build/lint and six real-API browser scenarios. Dev was backed up, migrated to V12 and seeded from private configuration; actual password-only Platform Admin login/API/logout passed. This does not certify unrelated prototype role-page content or live email/provider delivery.

### Onboarding / Billing Refinement R1, 2026-10-26

[Unit/API/build evidence](unit/REQ-039-transactional-email.md), [durable notification integration](integration/REQ-039-payment-notifications.md) and [browser evidence/manual checklist](system/REQ-039-onboarding-billing-refinement.md) cover shared Guest layout, separated registration steps, Administrator refinements, branded verification/activation/payment email, payOS package metadata and order-specific results. Final backend suite: 78 passed; focused frontend suite: 29 passed; build/lint exit 0; final isolated browser suites: 8 billing/admin plus 5 registration scenarios passed, zero skipped. Earlier failed runs and corrections are retained. Live payment/email acceptance is not claimed.

The guides and matrices below retain prior executions. PASSED refers only to the original recorded scope/date; revised behavior needs its own approved acceptance and new evidence.

### Subscription Lifecycle Local Delivery

**Administrator page W2 follow-up, 2026-10-26:** [Unit/build](unit/REQ-022-admin-users.md), [real API/PostgreSQL](integration/REQ-022-admin-users.md) and [browser/manual evidence](system/REQ-022-admin-pages.md) cover the agreed user directory/edit/status operations, existing Administrator layout, retained demo role menu and billing-only subscription page. Frontend 69 tests/build passed; backend 50 regression checks and final 36 focused checks passed (overlapping); login-inclusive 6 and final W2/renewal 4 Playwright scenarios passed. No hard deletion, schema change or payOS remediation is implied.

**Login appearance follow-up, 2026-10-26:** Approved L1 restores the original illustrated enterprise sign-in appearance while preserving real authentication/MFA/session behavior. [Unit/build evidence](unit/REQ-037-login-appearance.md): 12 passed and build passed. [Playwright/manual evidence](system/REQ-037-login-appearance.md): 2 passed against isolated real APIs, desktop/mobile and EN/VI. This does not modify or recertify payOS provider behavior.

The [approved lifecycle contract and delivery matrix](../features/Subscription%20lifecycle/README.md#local-delivery-2026-10-23) cover all 12 functions under the user's local-only DoD. Dated partial runs remain preserved; 2026-10-23 completion evidence is:

- [REQ-028 durable order persistence](integration/REQ-028-payment-order-foundations.md).
- [REQ-032 versioned plan backend/API](integration/REQ-032-plan-configuration.md).
- [REQ-045 SDK signature/response checks](unit/REQ-045-payos-verification.md) and [dependency remediation](unit/REQ-045-provider-dependencies.md).
- [REQ-062 entitlement domain/schema foundations](unit/REQ-062-entitlement-foundations.md).
- [Supporting REQ-037 workspace authentication](unit/REQ-037-workspace-authentication-support.md).
- [REQ-045 durable processing/recovery](integration/REQ-045-payment-processing.md).
- [REQ-062 periods, concurrent seats and access](integration/REQ-062-subscription-entitlements.md).
- [REQ-028 Guest purchase/retry/restart](system/REQ-028-subscription-purchase.md).
- [REQ-032 real plan administration](system/REQ-032-plan-configuration.md).
- [REQ-066 renewal, member activation and suspension](system/REQ-066-subscription-management.md).
- [Manual checklist and operational boundaries](system/REQ-066-subscription-manual-check.md).

Full backend regression passed 233 tests; all frontend tests passed 56; the final seven-scenario Playwright run and strengthened two-organization/field-persistence follow-up passed. This is local lifecycle verification, not production readiness. Live payOS acceptance is excluded/Not Run; historical Gmail AC-09 remains Blocked.

All runnable test code is kept next to its source code (`backend/src/test/java` and `frontend/src/`). Test documentation and verification evidence are organized into three dedicated testing tiers under this folder.

> [!IMPORTANT]
> **Per-Requirement Documentation Standard**:
> Testing evidence is **not** kept in a monolithic central table within README files. Instead, each testing tier (`unit/`, `integration/`, `system/`) maintains **dedicated `.md` files for each requirement (`REQ`)**, while the `README.md` files serve as directory indexes, execution guides, and requirement matrices.

---

## Testing Tiers

| Level | Directory & Index | Focus & Test Fixtures | Dedicated Documents |
| :--- | :--- | :--- | :--- |
| **Unit** | [unit/README.md](unit/README.md) | Pure Java domain invariants, application service orchestration, Spring MVC/Security endpoint contracts, ArchUnit boundaries, and frontend component tests. | [unit/REQ-*.md](unit/) |
| **Integration** | [integration/README.md](integration/README.md) | Real database round-trips using disposable Testcontainers (PostgreSQL 16/17, Neo4j 5.26-community), Cypher queries, graph edge creation, dynamic mapping, and Flyway/graph migrations. | [integration/REQ-*.md](integration/) |
| **System** | [system/README.md](system/README.md) | Complete Docker Compose stack (`compose.dev.yml`), API reverse proxying, health probes, scoped Playwright browser scenarios, and manual browser verification checklists. | [system/REQ-*.md](system/) |

---

## Requirement Test Matrix

| Requirement | Feature Name | Unit Test Evidence | Integration Test Evidence | System Test Evidence | Manual Procedure |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-060-F01-F03** | Registration, email, MFA and secure resume | [unit/REQ-060](unit/REQ-060-registration.md) | [integration/REQ-060](integration/REQ-060-registration.md) | [system/REQ-060](system/REQ-060-registration.md) | [Manual/Gmail checklist](system/REQ-060-registration-manual-check.md) |
| **REQ-001-F01** | View Target Roles | [unit/REQ-001-F01](unit/REQ-001-F01-view-target-roles.md) | [integration/REQ-001-F01](integration/REQ-001-F01-view-target-roles.md) | [system/REQ-001-F01](system/REQ-001-F01-view-target-roles.md) | [Manual Check](system/REQ-001-F01-manual-browser-check.md) |
| **REQ-001-F02** | Choose Target Role | [Master Plan](REQ-001-F02-choose-target-role.md#t1-t3-unit--mvc) | [Master Plan](REQ-001-F02-choose-target-role.md#t4-postgresql-integration) | [Master Plan](REQ-001-F02-choose-target-role.md#t6-full-stack-system) | [Playwright Spec](../../frontend/system-tests/REQ-001-F02-target-role-selection.spec.ts) |
| **REQ-011** | Assigned Target Roles | [unit/REQ-011](unit/REQ-011-assigned-target-roles.md) | [integration/REQ-011](integration/REQ-011-assigned-target-roles.md) | [system/REQ-011](system/REQ-011-assigned-target-roles.md) | [Manual Check](system/REQ-023-manual-browser-check.md#4-domain-expert-perspective--queue-isolation-req-011--req-023-f05) |
| **REQ-012** | Micro-Skill Management | [unit/REQ-012](unit/REQ-012-micro-skill-management.md) | [integration/REQ-012](integration/REQ-012-micro-skill-management.md) | [system/REQ-012](system/REQ-012-micro-skill-management.md) | [Manual Check](system/REQ-012-REQ-018-manual-browser-check.md) |
| **REQ-015** | Role Requirements | [unit/REQ-015](unit/REQ-015-role-requirements.md) | [integration/REQ-015](integration/REQ-015-role-requirements.md) | [system/REQ-015](system/REQ-015-role-requirements.md) | [Manual Check](system/REQ-023-manual-browser-check.md#4-domain-expert-perspective--queue-isolation-req-011--req-023-f05) |
| **REQ-018** | Target-Role Graph Editing | [unit/REQ-018](unit/REQ-018-target-role-graph-editing.md) | [integration/REQ-018](integration/REQ-018-target-role-graph-editing.md) | [system/REQ-018](system/REQ-018-target-role-graph-editing.md) | [Manual Check](system/REQ-012-REQ-018-manual-browser-check.md) |
| **REQ-023** | Target Role Management | [unit/REQ-023](unit/REQ-023-target-role-management.md) | [integration/REQ-023](integration/REQ-023-target-role-management.md) | [system/REQ-023](system/REQ-023-target-role-management.md) | [Manual Check](system/REQ-023-manual-browser-check.md) |
| **REQ-024** | Expert Assignment | [unit/REQ-024](unit/REQ-024-expert-assignment.md) | [integration/REQ-024](integration/REQ-024-expert-assignment.md) | [system/REQ-024](system/REQ-024-expert-assignment.md) | [Manual Check](system/REQ-023-manual-browser-check.md#2-ld-manager-workflow-assigning--reassigning-experts-req-024) |
| **Base / Infra** | Architecture & Schemas | [unit/architecture](unit/architecture-boundaries.md) | [integration/schemas](integration/schema-and-migrations.md) | — | — |

---

## Active Holistic Feature Test Plans

For high-level summaries combining all testing levels into a single document per requirement:
- [REQ-001-F01 View Target Roles](REQ-001-F01-view-target-roles.md) — domain/application, API/security, Neo4j integration and frontend suites passed; the shared REQ-001 Playwright flow passed catalog/detail, while browser-only search/filter/recovery coverage remains partial.
- [REQ-001-F02 Choose Target Role](REQ-001-F02-choose-target-role.md) — Cluster 2 T1–T6 complete/pass plus pre-Cluster-4 cleanup: clean backend 84 tests, frontend 30 tests, T4 eight tests, two-role Compose API concurrency/guard checks, and two Playwright/Chrome browser/API scenarios. Real Identity/Catalog/Assessment/Pathway adapters remain provisional, so F02 is not production Done.
- [REQ-011 Assigned Target Roles Master Plan](REQ-011-assigned-target-roles.md)
- [REQ-015 Role Requirements Master Plan](REQ-015-role-requirements.md)
- [REQ-018 Target-Role Graph Editing Master Plan](REQ-018-target-role-graph-editing.md)
- [REQ-023 Target Role Management Master Plan](REQ-023-target-role-management.md)
- [REQ-024 Expert Assignment Master Plan](REQ-024-expert-assignment.md)
