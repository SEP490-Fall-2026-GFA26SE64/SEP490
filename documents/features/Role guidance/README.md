# AI-Assisted Role Guidance

**Source alignment — 2026-11-07.** Confirmed behavior is distinguished from checked-in implementation below. [Current source/schema/API contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) records local profile gates, exact ownership and remaining mismatches. Runtime/database acceptance is not established by this prose update.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 2.

**Contract basis:** confirmed behavior plus the later L&D Role–Level / Expert Skill–knowledge configuration decisions. Historical evidence retains its original scope; it is not a fresh passing result.

## Current Implementation

**Source-inspected:** HEAD `61d334c`, 2026-11-07; code inspection only. See the [implementation legend](../README.md#current-implementation-overview). Catalog selection and AI guidance have different implementation status.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-06.04](#fr-06-04) | Partial | Employees browse published organization target roles scoped to their assigned Department (and active Job Positions), inspect per-level skill, explicit knowledge and duration requirements, and persist a replay-safe target-role and level choice under their real workspace session. The role view connects to baseline readiness, own rule attempts, diagnostics and exact official evidence. | AI-generated suggestions/comments remain unimplemented. Catalog/bank/scoped-policy readiness is separate; missing resources remain unavailable. Department filtering is present in the current UI; uniform server-side Department enforcement remains unverified. |
| [FR-07.07](#fr-07-07) | Foundation only | Recommendation schema/package placeholders and sample role-match presentation exist. | No backend AI inference, assessment/RIASEC-based suggestion generation or persisted explanation workflow was found. Labels such as AI match are not evidence of an implemented AI service. |

**Observed selection rules:** the backend requires an active authenticated Employee membership, entitlement and an available organization role, checks the selected snapshot, supports idempotent command replay and reports unavailable catalog/selection conflicts. Baseline uses pinned persisted evidence; pathway generation and AI advice remain separate. Historical selections are preserved; incompatible legacy selections are explicitly identified for reselection rather than silently rewritten.

**Workspace integration:** [Current role UI](../../../frontend/src/features/employee/target-roles/CurrentRolePanel.tsx), [role flow](../../../backend/src/main/java/com/adaptlearngraph/services/RoleBaselineFlow.java) and [workspace adapter](../../../backend/src/main/java/com/adaptlearngraph/config/WorkspaceBaselineConfiguration.java) replace demo identity for the active slice. [Local verification and limitations](../../testing/system/REQ-002-workspace-baseline.md) cover actual APIs and two isolated organizations, not AI generation.

**Entry point:** `/employee/upskilling?tab=roles`. `/employee/guidance` redirects there; the standalone guidance page is not the active route. Initial Expert review belongs to [Pathway review](../Pathway%20review/README.md#current-implementation), not a guidance approval gate.

**Historical code references:** [role browsing and sample recommendations](../../../frontend/src/features/employee/target-roles/TargetRoleBrowsePanel.tsx), [selection service](../../../backend/src/main/java/com/adaptlearngraph/services/TargetRoleSelectionService.java), [selection persistence](../../../backend/src/main/java/com/adaptlearngraph/repository/JpaTargetSelectionPersistence.java), [configured Employee context](../../../backend/src/main/java/com/adaptlearngraph/repository/ConfiguredEmployeeContextAdapter.java), [business services](../../../backend/src/main/java/com/adaptlearngraph/services/). Historical evidence covers [role browsing](../../testing/REQ-001-F01-view-target-roles.md) and [selection](../../testing/REQ-001-F02-choose-target-role.md), not AI generation.

<a id="rolelevel-selection-and-lock"></a>

## Role–Level selection and lock

This section changes selection/admission behavior only; it does not implement or redesign AI role suggestions/RIASEC guidance.

Inputs are published organization Role + its actual member Level, current selection/revision and retry identity. Server derives Employee, organization, membership and entitlement; requests cannot set lock/complete/bypass status. Output distinguishes selected/browsed target, request-bound target, pending/locked reason and when a new target may be selected.

1. Before pathway request, changes are allowed subject to active-assessment admission guards. A same Role AND Level command is a no-op, not a fresh target. Read-only browsing/preview of another target cannot change current binding.
2. At accepted pathway request submission, bind and lock BOTH Role and member Level, including generation/pending initial Expert review. While mandatory non-bypassed work is unfinished, reject changed-target commands without archiving/replacing the current pathway or discarding attempts/progress.
3. Enforce the same rule at every server selection/admission route and relevant UI entry, including direct API calls and concurrent request/selection. A browser-only disabled control is insufficient.
4. Release when required work is satisfied or only approved scoped bypass needs remain and no other mandatory pending work exists. Optional alternative modules/NEED_REVIEW do not hold the lock. No-learning-required context cannot fabricate achievement or lock on nonexistent work.
5. On another target, retain prior attempts/completions/history and reuse exact compatible official evidence for baseline exemptions. Baseline diagnostics and self-declared current titles are not official evidence. Carry original bypass needs with provenance as parallel Cần bổ sung work; later provision is studied separately and never gates the new pathway’s other skills.

Stale selection/catalog, wrong scope and dependency outages give explicit unchanged-state outcomes; retries must not create another request or repeat archive effects. Simultaneous request, selection and completion/bypass decisions require one coherent authorized binding and retained replay outcome. CurrentRoleSelectionStore and RequirementPathwayAdmissionService implement the local learner transaction/binding paths; current-source presence is not full runtime/concurrency proof.

Failed/returned/stale requests remain bound for repair/retry, without a new self-cancel-to-unlock feature. After a different target is chosen, old bypass supplementation is parallel/non-gating even when provision appears. Retrying or repairing pending work must preserve the request-bound target; do not invent an exceptional unlock.

**Current-source correction (2026-11-07):** `writeSelection` now checks `targetBound` and active assessment before any archive/write, under the learner transaction. Accepted requirement requests bind both Role and Level. The prior 5 November archive-before-lock observation is superseded; no runtime regression was attempted here.

Keep current Role list/details/selection UI, shared design and EN/VI; use Role in English and Vị trí / Vị trí làm việc mong muốn in Vietnamese. Current Role UI consumes explicit knowledge requirements and server lock reasons. Full all-entry security/race verification remains open; AI/RIASEC capability is separate.

## Requirements

<a id="fr-06-04"></a>

### FR-06.04: Review target role guidance

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.04 |
| 2. Requirement Name | Review target role guidance |
| 3. Description | The Employee shall view AI-generated role suggestions and comments and select or confirm a published target role within the organization. |
| 4. Actor | Employee |
| 5. Preconditions | Trusted entitled Employee, available organization Role/member Level and current selection context; changed target requires no request-bound unfinished mandatory work. |
| 6. Main Flow | Browse published Roles; inspect explicit requirements and compatible evidence; choose/confirm Role and member Level; request pathway with exact binding and target lock. |
| 7. Alternative / Exception Flows | Active assessment or unfinished mandatory pathway work blocks target change; same-target is a no-op; browsing never replaces binding. AI suggestions remain a separate capability. |
| 8. Postconditions | Selection/request/history is retained coherently; release follows completion/approved-bypass rule, not arbitrary archive. |
| 9. Acceptance Criteria | All server/UI paths lock Role AND Level from request submission, including pending review; preserve attempts/profile and re-evaluate bypass on next target. |

<a id="fr-07-07"></a>

### FR-07.07: Generate target role guidance

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.07 |
| 2. Requirement Name | Generate target role guidance |
| 3. Description | The System shall generate AI-assisted target role suggestions and explanations for Employees. |
| 4. Actor | System |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-048"></a>REQ-048 | [FR-06.04](#fr-06-04); [FR-07.07](#fr-07-07) |
| <a id="req-048-f01"></a>REQ-048-F01 | [FR-07.07](#fr-07-07) |
| <a id="req-048-f02"></a>REQ-048-F02 | [FR-06.04](#fr-06-04) |
