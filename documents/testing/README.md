# Test Documentation

**Latest, 2026-10-24 REQ-001/002/009:** [Cluster 4 evidence and gate audit](system/REQ-001-002-009-cluster4-20261024-evidence.md): 74 BE + 61 FE pass; synthetic browser fixtures33 pass/4 fail. Real-adapter integration Blocked; nine real-stack journeys Not run; numerical/performance Blocked/Not run. **Cluster 3/4 incomplete.** Dedicated [unit/API/component](unit/REQ-001-002-009-20261024-execution.md) and [integration blocker](integration/REQ-001-002-009-20261024-execution.md) receipts retain actual method/fixture/command mappings. The [23 October131P/0F evidence](system/REQ-001-002-cluster4-evidence.md) is historical before the latest UI; no old passes are carried forward. No executable tests were run during this documentation synchronization.

**Slices4–5,2026-10-22:** common UI and pinned full/legacy result/history source implemented; no schema/diagram regeneration or executable acceptance. [Evidence and unverified browser checklist](system/REQ-002-F02-REQ-009-occupation-ui-results.md).

Current REQ-002 slice2–3 compile/manual observations: [dedicated evidence and procedures](system/REQ-002-F01-F02-occupation-admission-management.md). Revised executable acceptance remains Planned/Not run; no tests were created or executed.

## Current Scope Alignment

**Scope baseline:** [System Overview](../adapt_learn_graph_system_overview.md); aligned 2026-10-20. Test actors are System Administrator, L&D Manager, Expert and Employee within one organization. Existing test IDs, fixtures, actor codes, dated results and manual procedures remain evidence of their recorded contract, not revised acceptance certification.

The [current feature catalog](../features/README.md) supersedes old SaaS acceptance. Requalify REQ-001/002 for published roles, L&D baseline configuration and reviewed baseline/RIASEC guidance; REQ-011 through 018 for discipline/role authorization; REQ-019/020/042 for Expert confirmation before initial learning; REQ-007/008/013/014 for courses/assessment approval; REQ-043 for evidence-driven learning needs. New REQ-047 through 059 have draft acceptance scenarios, not passing runtime evidence.

### Revised Verification Criteria

- Unit/API: deny wrong-actor operations; test L&D adaptive Blueprint/Test Blueprint versus Expert question authoring; verify attempt/IRT/mastery versioning, reviewed guidance and initial confirmation gates, and independent learning without pathway mutation.
- Integration/Testcontainers: persist/retrieve every agreed runtime field and review/approval/history version; discipline/role assignment boundaries; independent progress/evidence mapping; idempotent updates and cross-store failure recovery. Existing organization isolation tests remain technical defense, not a multi-organization product flow.
- System/Compose/manual: trusted Employee session -> current Role selection -> required full-Occupation baseline -> sufficient-evidence profile initialization -> original result/history/My Mastery reads. L&D configures Draft/version/publication boundaries; downstream guidance, Expert confirmation, pathway and later-learning integrations remain separately owned/unverified. Historical journey ordering does not override the confirmed Role-first contract.
- Exclude subscription/PayOS/cancellation, platform organization statistics, and benchmark workspace acceptance from current product gates. Exports and supporting notification/activation policies require separate confirmation.
- Preserve per-REQ evidence files. Do not mark new tests PASSED until executed against an approved contract; do not derive coverage from tables/endpoints or historical status alone.

Documentation-only checks do not establish backend/frontend behavior. Revised runtime acceptance requires the relevant feature suites and per-REQ evidence after implementation.

The revised2026-10-22 Cluster 1 plan is [REQ-002 Adaptive Baseline](REQ-002-adaptive-baseline-test-plan.md): whole-Occupation configuration/attempts, lifecycle/compatibility and REQ-009 reads. Confirmed acceptance is separated from proposal-dependent expectations; all new executable evidence is Planned/Not run. Prior build/manual observations and historical V17 passes do not certify it.

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
| **REQ-002-F02 (historical V17)** | Fixed Baseline Blueprint/Assessment Authoring | [unit/REQ-002-F02](unit/REQ-002-F02-baseline-authoring.md) | [integration/REQ-002-F02](integration/REQ-002-F02-baseline-authoring.md) | [system/REQ-002-F02](system/REQ-002-F02-baseline-authoring.md) | [Playwright Spec](../../frontend/system-tests/REQ-002-F02-baseline-authoring.spec.ts) |
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
- [REQ-002-F02 historical Baseline Assessment Management](REQ-002-F02-baseline-authoring.md) — FE 83/83 and full BE 204/204 (PostgreSQL V1–V17 and Neo4j included) passed on 2026-10-19 for the superseded fixed lifecycle. Current adaptive assertions and their limits are documented separately in the Cluster 4 evidence linked above.
- [REQ-011 Assigned Target Roles Master Plan](REQ-011-assigned-target-roles.md)
- [REQ-015 Role Requirements Master Plan](REQ-015-role-requirements.md)
- [REQ-018 Target-Role Graph Editing Master Plan](REQ-018-target-role-graph-editing.md)
- [REQ-023 Target Role Management Master Plan](REQ-023-target-role-management.md)
- [REQ-024 Expert Assignment Master Plan](REQ-024-expert-assignment.md)


## Research RQ2 verification

REQ-033-F02 / REQ-034-F01,F02 / REQ-035-F01: dedicated records in [unit](unit/REQ-034-rq2-research.md), [integration](integration/REQ-034-rq2-research.md), [system](system/REQ-034-rq2-research.md), and [manual procedures](system/REQ-034-manual-browser-check.md). Status is recorded per level, not inferred from earlier benchmark drafts.
