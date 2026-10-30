# System Testing Directory & Standards

## Dated adaptive checkpoint evidence

2026-10-29 selected review/read C4: [real system evidence](REQ-002-041-042-workspace-integration.md#real-system-mapping-and-isolation) records **2/2 Passed**,0 failed/skipped/flaky, real session/CSRF/baseline/API/worker/persistence, isolated final4 stack on38088. Expert repair/order/Check/preview/final approval → same Employee revision5/hash/order14; real archived unresolved equal-hash repair locked after separately approved C2 guard. [Counts/failures/limits](REQ-002-041-042-workspace-integration.md#c4-review-evidence-synchronization--2026-10-29). Native browser drag Not run, E04–E06/protected execution deferred, production owners Open; old build/manual evidence below remains historical. C4 did not start services or rerun tests; generic shared8088 commands below are not this run's harness.

2026-10-28 final handoff: [static reconciliation and next-machine gates](REQ-041-042-v011-handoff-review.md). Requested journey ends at Employee's own approved pathway display; planner inputs/fresh Compose/manual flow remain incomplete. Next session reports first, waits for OK; no automatic executable tests/C3.

2026-10-28 REQ-041/042 C2: [native fresh DB cutover/manual receipt](REQ-041-042-v011-native-cutover.md): V1–V28 applied, exact0.11 graph sealed, API/FE read smoke observed. Owner readiness/content/full flow and executable acceptance remain pending; no C3 transition.

2026-10-28 REQ-013/016 review catalog: [v0.11 teaching focus/difficulty evidence](REQ-016-teaching-focus-difficulty.md). Local data/artifact validation is separate from runtime database/API acceptance.

**Latest, 2026-10-24 REQ-001/002/009:** [Cluster 4 evidence/gate audit](REQ-001-002-009-cluster4-20261024-evidence.md) reconciles the [original Cluster 3 receipt](REQ-001-002-009-cluster3-20261024-execution.md): 168 pass/4 fail across BE, FE and synthetic browser fixtures. **0 current real-stack system passes; nine journeys Not run (`--list` only)**. Integration/numerical/performance remain blocked; Cluster 3/4 incomplete. [23 October131P/0F](REQ-001-002-cluster4-evidence.md) retains its dated source/fixture, with no pass carry-forward.

Local baseline manual history: [demo contract](../../technical/baseline/Local%20Demo%20Flow.md), [dated manual observations/limits](REQ-002-local-demo.md), [user walkthrough](../../../../../s2%20work/Test%20Guides/REQ-002-F02-full-walkthrough-test-guide.md). These observations do not establish current rendered/system acceptance; latest fixture browser results and real-stack gaps are linked above. Production owner integrations/operational C are separate.

[23 October memory/code/doc/schema review](REQ-002-memory-schema-sync.md) records current read-only V23/86-table verification, regenerated diagrams and retained bypasses; no tests were run. Historical [Session1](REQ-002-official-question-bank-session1.md), [cutover](REQ-002-official-local-cutover.md), [Session2](REQ-002-official-question-bank-session2.md) and [Session3](REQ-002-official-question-bank-session3.md) evidence preserve their original environment/date, not current startup instructions.

## Current Scope Alignment

Follow [current test scope](../README.md#current-scope-alignment) and [Version 2 contracts](../../features/README.md). End-to-end gates cover Guest registration/verification/payment/setup, platform administration, renewal/seats/access, departments/occupations/assignments/publication/approval, baseline/RIASEC -> direct AI guidance -> Employee selection, initial pathway -> Expert confirmation -> learning/adaptation, independent learning and development/ROI reporting. Verify isolation with at least two organizations, private files, notifications and audit. Product benchmark screens, cancellation and exports are not required.
Older browser checklists and PASSED labels below retain their original scope and require revision before they certify new workflows. No new runtime/browser result is claimed by this documentation-only update.

## Existing Execution Guides and Historical Evidence

**Location:** Docker Compose Environment (`compose.dev.yml`) and Browser Workflows

System testing validates complete end-to-end integration across all system tiers (PostgreSQL database, Neo4j graph database, Flyway/graph migrations, Spring Boot REST API, Vite frontend web client, and Nginx reverse proxy).

> [!NOTE]
> Detailed test scenarios, environment scopes, and execution evidence are maintained in **dedicated markdown files per requirement (REQ)** below. This README serves as the index and execution guide, not the central registry.

---

## Requirement Test Plans & Evidence

| Requirement ID | Feature Name | Workflows Covered | System Test Document | Manual Procedure | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-019-F01 / REQ-020-F01/F02; direct REQ-042-F01 / REQ-004-F01** | Review and own approved read | Repair/order/exact approval→Employee; archived equal-hash repair lock | [Actual system cases/isolation](REQ-002-041-042-workspace-integration.md#real-system-mapping-and-isolation) | [Current procedure / history](REQ-019-REQ-020-manual-browser-check.md) | **2 Passed; native drag/learning execution not passed** |
| **REQ-060-F01-F03** | Registration, email and MFA/resume | Real API/SMTP, desktop/mobile, recovery, restart and expiry | [REQ-060-registration.md](REQ-060-registration.md) | [Manual/Gmail checklist](REQ-060-registration-manual-check.md) | **Local Passed / Live Gmail Blocked** |
| **REQ-001-F01** | View Target Roles | Learner Role Catalog Browse | [REQ-001-F01-view-target-roles.md](REQ-001-F01-view-target-roles.md) | [REQ-001-F01-manual-browser-check.md](REQ-001-F01-manual-browser-check.md) | **PASSED** (API) / Manual Available |
| **REQ-001-F02** | Choose Target Role | Target Role Selection Flow | [../REQ-001-F02-choose-target-role.md](../REQ-001-F02-choose-target-role.md) | [Playwright Spec](../../../frontend/system-tests/REQ-001-F02-target-role-selection.spec.ts) | **PASSED** (Compose API & Playwright) |
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
- For revised workflows, add end-to-end cases after the owning detailed contracts are clarified. Pin each scenario to a `REQ-nnn-Fnn` rule, specify actor/organization/assignment/setup data and record outcome/date. Do not mix browser specs into Vitest or treat earlier role-selection coverage as proof of direct guidance or publication.

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
