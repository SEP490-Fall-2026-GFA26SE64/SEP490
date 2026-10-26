# System testing

**Latest, 2026-10-24 REQ-001/002/009:** [Cluster 4 evidence/gate audit](REQ-001-002-009-cluster4-20261024-evidence.md) reconciles the [original Cluster 3 receipt](REQ-001-002-009-cluster3-20261024-execution.md): 168 pass/4 fail across BE, FE and synthetic browser fixtures. **0 current real-stack system passes; nine journeys Not run (`--list` only)**. Integration/numerical/performance remain blocked; Cluster 3/4 incomplete. [23 October131P/0F](REQ-001-002-cluster4-evidence.md) retains its dated source/fixture, with no pass carry-forward.

Local baseline manual history: [demo contract](../../features/Baseline%20knowledge%20assessment/Local%20Demo%20Flow.md), [dated manual observations/limits](REQ-002-local-demo.md), [user walkthrough](../../../../../s2%20work/Test%20Guides/REQ-002-F02-full-walkthrough-test-guide.md). These observations do not establish current rendered/system acceptance; latest fixture browser results and real-stack gaps are linked above. Production owner integrations/operational C are separate.

[23 October memory/code/doc/schema review](REQ-002-memory-schema-sync.md) records current read-only V23/86-table verification, regenerated diagrams and retained bypasses; no tests were run. Historical [Session1](REQ-002-official-question-bank-session1.md), [cutover](REQ-002-official-local-cutover.md), [Session2](REQ-002-official-question-bank-session2.md) and [Session3](REQ-002-official-question-bank-session3.md) evidence preserve their original environment/date, not current startup instructions.

## Current Scope Alignment

Follow [current test scope](../README.md#current-scope-alignment) and the [System Overview](../../adapt_learn_graph_system_overview.md). New end-to-end gates cover L&D disciplines/assignments/publication/approval, baseline/RIASEC -> Expert-reviewed role guidance -> Employee selection, generated pathway -> Expert confirmation -> learning, new-evidence adaptation, independent skill learning and L&D monitoring. Billing/PayOS/platform benchmark workflows are not current product gates.
Older browser checklists and PASSED labels below retain their original scope and require revision before they certify new workflows. No new runtime/browser result is claimed by this documentation-only update.

## Existing Execution Guides and Historical Evidence

**Location:** Docker Compose Environment (`compose.dev.yml`) and Browser Workflows

System testing validates complete end-to-end integration across all system tiers (PostgreSQL database, Neo4j graph database, PostgreSQL Flyway migrations and explicitly managed catalog import, Spring Boot REST API, Vite development frontend web client or Caddy production web proxy).

> [!NOTE]
> Detailed test scenarios, environment scopes, and execution evidence are maintained in **dedicated markdown files per requirement (REQ)** below. This README serves as the index and execution guide, not the central registry.

---

## Requirement Test Plans & Evidence

| Requirement ID | Feature Name | Workflows Covered | System Test Document | Manual Procedure | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-002 local cutover follow-up** | Official graph/V22/local DRAFT seed | Exact graph replacement/rerun, real Flyway upgrade,135-item import/readback and retained-data digests | [REQ-002-official-local-cutover.md](REQ-002-official-local-cutover.md) | [Local operation mode](../../dataset/question-bank/15-1212.00/OPERATOR_IMPORT.md) | **Manual observations only; executable acceptance Not run** |
| **REQ-002-F01/F02 dependency Session1** | Official DRAFT question bank/import | Full scope, source/hash inventory and main builds; future QBI acceptance mapping | [REQ-002-official-question-bank-session1.md](REQ-002-official-question-bank-session1.md) | [Operator prerequisites, not executed](../../dataset/question-bank/15-1212.00/OPERATOR_IMPORT.md) | **Acceptance Not run; live/import blocked** |
| **REQ-001-F01** | View Target Roles | Learner Role Catalog Browse | [REQ-001-F01-view-target-roles.md](REQ-001-F01-view-target-roles.md) | [REQ-001-F01-manual-browser-check.md](REQ-001-F01-manual-browser-check.md) | **PASSED** (API) / Manual Available |
| **REQ-001-F02** | Choose Target Role | Target Role Selection Flow | [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md) | [Playwright Spec](../../../frontend/system-tests/REQ-001-F02-target-role-selection.spec.ts) | **PASSED** (Compose API & Playwright) |
| **REQ-002-F02 historical V17** | Fixed Baseline Blueprint Authoring | Save, Generate, Replay, Review & Publish | [REQ-002-F02-baseline-authoring.md](REQ-002-F02-baseline-authoring.md) | [Playwright Spec](../../../frontend/system-tests/REQ-002-F02-baseline-authoring.spec.ts) | **PASSED for superseded contract** |
| **REQ-011** | Assigned Target Roles | Expert Queue Isolation | [REQ-011-assigned-target-roles.md](REQ-011-assigned-target-roles.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md#4-domain-expert-perspective--queue-isolation-req-011--req-023-f05) | **PASSED** |
| **REQ-012** | Micro-Skill Management | Micro-Skill Catalog & Linking | [REQ-012-micro-skill-management.md](REQ-012-micro-skill-management.md) | [REQ-012-REQ-018-manual-browser-check.md](REQ-012-REQ-018-manual-browser-check.md) | **PASSED** |
| **REQ-015** | Role Requirements | Micro-Skill Benchmark Authoring | [REQ-015-role-requirements.md](REQ-015-role-requirements.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md#4-domain-expert-perspective--queue-isolation-req-011--req-023-f05) | **PASSED** |
| **REQ-018** | Target-Role Graph Editing | Graph Visualization & Prerequisite Edges | [REQ-018-target-role-graph-editing.md](REQ-018-target-role-graph-editing.md) | [REQ-012-REQ-018-manual-browser-check.md](REQ-012-REQ-018-manual-browser-check.md) | **PASSED** |
| **REQ-023** | Target Role Management | Full Target Role Lifecycle | [REQ-023-target-role-management.md](REQ-023-target-role-management.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md) | **PASSED** |
| **REQ-024** | Expert Assignment | Role Assignment & Reassignment | [REQ-024-expert-assignment.md](REQ-024-expert-assignment.md) | [REQ-023-manual-browser-check.md](REQ-023-manual-browser-check.md#2-ld-manager-workflow-assigning--reassigning-experts-req-024) | **PASSED** |

---

## Evidence Summaries

- **REQ-001-F01**: The first approved workflow test cluster; its full-stack scenario is tracked in [../REQ-001-F01-view-target-roles.md](../REQ-001-F01-view-target-roles.md).
- **REQ-001-F02**: System evidence ran on 2026-10-02 and is tracked in [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md). Compose API checks cover initial/replay/no-op/conflict/validation/unavailable/outage recovery plus stale, competing change, and assessment-active state preservation with a deterministic two-role local fixture. `npm.cmd run test:system:f02` passes two Playwright/headless-Chrome scenarios: a state-independent catalog/detail/Cancel/Confirm/UI flow and an API stale/competing-change flow.
- For revised user workflows, add end-to-end cases from the current scope section after the owning contracts are clarified. Pin each scenario to a `REQ-nnn-Fnn` acceptance rule, specify actor/assignment/setup data, and record outcome/date. Reuse the existing Playwright runner deliberately; do not mix browser specs into Vitest or treat earlier role-selection coverage as proof of reviewed guidance/publication.

---

## How to Run System Stack & Smoke Checks

Start the full Compose stack:
```powershell
docker compose -f compose.dev.yml up --build -d
```

Verify service health and readiness:
```powershell
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
docker compose -f compose.dev.yml ps
```

Expected baseline:
- Databases healthy (`postgres`, `neo4j`).
- `migrate` service exited with code 0.
- `api` healthy and responding to status queries.
- `web` reverse-proxy serving on `http://127.0.0.1:8088`.

---

## Standards for New Requirements

When writing system tests for a new requirement (`REQ-nnn`):
1. **Create a dedicated file**: `documents/testing/system/<REQ-ID>-<feature-slug>.md`.
2. **Define User Journeys**: Specify multi-tier workflows connecting user actions (in UI/API) to persistent state changes across PostgreSQL and Neo4j.
3. **Manual Browser Checklist**: If the requirement includes UI components, provide or link to a structured step-by-step manual browser testing checklist (`documents/testing/system/<REQ-ID>-manual-browser-check.md`).
4. **Link to this index**: Add the requirement to the table above.


## Admin Research RQ2

- [REQ-033 Research RQ2](REQ-033-rq2-research.md)
- [REQ-034 Research RQ2](REQ-034-rq2-research.md)
- [REQ-035 Research RQ2](REQ-035-rq2-research.md)
