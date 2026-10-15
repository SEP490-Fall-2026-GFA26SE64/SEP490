# Test Documentation

## Current Scope Alignment

**Scope baseline:** [System Overview](../adapt_learn_graph_system_overview.md); aligned 2026-10-14. Test actors are System Administrator, L&D Manager, Expert and Employee within one organization. Existing test IDs, fixtures, actor codes, dated results and manual procedures remain evidence of their recorded contract, not revised acceptance certification.

The [current feature catalog](../features/README.md) supersedes old SaaS acceptance. Requalify REQ-001/002 for published roles, L&D baseline configuration and reviewed baseline/RIASEC guidance; REQ-011 through 018 for discipline/role authorization; REQ-019/020/042 for Expert confirmation before initial learning; REQ-007/008/013/014 for courses/assessment approval; REQ-043 for evidence-driven learning needs. New REQ-047 through 059 have draft acceptance scenarios, not passing runtime evidence.

### Revised Verification Criteria

- Unit/API: deny wrong-actor operations; test L&D baseline/publication/approval versus Expert authoring/review; reviewed guidance and initial confirmation gates; configured evidence/tracing decisions and independent learning without pathway mutation.
- Integration/Testcontainers: persist/retrieve every agreed runtime field and review/approval/history version; discipline/role assignment boundaries; independent progress/evidence mapping; idempotent updates and cross-store failure recovery. Existing organization isolation tests remain technical defense, not a multi-organization product flow.
- System/Compose/manual: accounts -> discipline/assignments -> Expert requirements -> L&D publication and learning approval -> baseline/RIASEC -> AI guidance/Expert confirm/revise/reject -> Employee role selection -> gap/pathway -> Expert confirm -> learning/assessment/tracing/adaptation. Also exercise independent skill learning and L&D monitoring without changing a target-role pathway through manual Employee module selection.
- Exclude subscription/PayOS/cancellation, platform organization statistics, and benchmark workspace acceptance from current product gates. Exports and supporting notification/activation policies require separate confirmation.
- Preserve per-REQ evidence files. Do not mark new tests PASSED until executed against an approved contract; do not derive coverage from tables/endpoints or historical status alone.

Documentation-only checks do not establish backend/frontend behavior. Revised runtime acceptance requires the relevant feature suites and per-REQ evidence after implementation.

## Existing Test Guides and Evidence

The guides and matrices below retain prior executions. PASSED refers only to the original recorded scope/date; revised behavior needs its own approved acceptance and new evidence.

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
| **REQ-001-F01** | View Target Roles | [unit/REQ-001-F01](unit/REQ-001-F01-view-target-roles.md) | [integration/REQ-001-F01](integration/REQ-001-F01-view-target-roles.md) | [system/REQ-001-F01](system/REQ-001-F01-view-target-roles.md) | [Manual Check](system/REQ-001-F01-manual-browser-check.md) |
| **REQ-001-F02** | Choose Target Role | [Master Plan](REQ-001-F02-choose-target-role.md#t1-t3-unit--mvc) | [Master Plan](REQ-001-F02-choose-target-role.md#t4-postgresql-integration) | [Master Plan](REQ-001-F02-choose-target-role.md#t6-full-stack-system) | [Playwright Spec](../../frontend/system-tests/REQ-001-F02-target-role-selection.spec.ts) |
| **REQ-002-F02** | Baseline Blueprint Authoring | [unit/REQ-002-F02](unit/REQ-002-F02-baseline-authoring.md) | [integration/REQ-002-F02](integration/REQ-002-F02-baseline-authoring.md) | [system/REQ-002-F02](system/REQ-002-F02-baseline-authoring.md) | [Playwright Spec](../../frontend/system-tests/REQ-002-F02-baseline-authoring.spec.ts) |
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
- [REQ-002-F02 Baseline Blueprint Authoring](REQ-002-F02-baseline-authoring.md) — Occupation-scoped evidence executed on 2026-10-15: backend scoped 24/24, PostgreSQL 4/4, Neo4j adapter 3/3, backend regression 174/174, frontend scoped 9/9 and regression 39/39, Playwright/Compose 1/1. Production Identity/Catalog/importer dependencies remain provisional.
- [REQ-011 Assigned Target Roles Master Plan](REQ-011-assigned-target-roles.md)
- [REQ-015 Role Requirements Master Plan](REQ-015-role-requirements.md)
- [REQ-018 Target-Role Graph Editing Master Plan](REQ-018-target-role-graph-editing.md)
- [REQ-023 Target Role Management Master Plan](REQ-023-target-role-management.md)
- [REQ-024 Expert Assignment Master Plan](REQ-024-expert-assignment.md)
