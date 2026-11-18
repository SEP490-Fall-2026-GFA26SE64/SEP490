# AI-Assisted Role Guidance

**RIASEC current source — 2026-11-18:** implemented local opt-in flow at `2c2468b5`. AI selects/ranks Job Positions directly from raw interest scores. Former cosine/Department-only, chat and explicit Explain-with-AI designs are superseded. [Runtime setup](../../../docker/riasec/README.md).

**Source alignment — 2026-11-07.** Confirmed behavior is distinguished from checked-in implementation below. [Current source/schema/API contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) records local profile gates, exact ownership and remaining mismatches. Runtime/database acceptance is not established by this prose update.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 2.

**Contract basis:** confirmed behavior plus the later L&D Role–Level / Expert Skill–knowledge configuration decisions. Historical evidence retains its original scope; it is not a fresh passing result.

## Current Implementation

**Source-inspected:** HEAD `61d334c`, 2026-11-07; code inspection only. See the [implementation legend](../README.md#current-implementation-overview). Catalog selection and AI guidance have different implementation status.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-06.04](#fr-06-04) | Partial | Employees browse available published Roles in their authorized organization independently of their Admin-assigned Department/Job Position, inspect per-level skill, explicit knowledge and duration requirements, and persist a replay-safe target-role and level choice under their real workspace session. The role view connects to baseline readiness, own rule attempts, diagnostics and exact official evidence. | Current local RIASEC AI suggests Job Positions with saved explanations; it does not choose a Role/Level. Catalog/bank/scoped-policy readiness is separate; missing resources remain unavailable. New-target placement/rank and existing bound-target locks are server-owned; unrelated catalog authorization retains its separate limits. |
| [FR-07.07](#fr-07-07) | Implemented local opt-in | Durable internal Ollama selects up to 3 same-org Job Positions from raw RIASEC profiles; IDs/explanations/snapshots are validated and persisted. | Interest-only guidance; no automatic Role selection or general AI/production proof. |

**Observed selection rules:** the backend requires an active authenticated Employee membership, entitlement and an available organization role, checks the selected snapshot, supports idempotent command replay and reports unavailable catalog/selection conflicts. Baseline uses pinned persisted evidence; pathway generation and AI advice remain separate. Historical selections are preserved; incompatible legacy selections are explicitly identified for reselection rather than silently rewritten.

**Workspace integration:** [Current role UI](../../../frontend/src/features/employee/target-roles/CurrentRolePanel.tsx), [role flow](../../../backend/src/main/java/com/adaptlearngraph/services/RoleBaselineFlow.java) and [workspace adapter](../../../backend/src/main/java/com/adaptlearngraph/config/WorkspaceBaselineConfiguration.java) replace demo identity for the active slice. [Local verification and limitations](../../testing/system/REQ-002-workspace-baseline.md) cover actual APIs and two isolated organizations, not AI generation.

**Entry point:** `/employee/upskilling?tab=roles`. `/employee/guidance` redirects there; the standalone guidance page is not the active route. Initial Expert review belongs to [Pathway review](../Pathway%20review/README.md#current-implementation), not a guidance approval gate.

**Historical code references:** [role browsing and sample recommendations](../../../frontend/src/features/employee/target-roles/TargetRoleBrowsePanel.tsx), [selection service](../../../backend/src/main/java/com/adaptlearngraph/services/TargetRoleSelectionService.java), [selection persistence](../../../backend/src/main/java/com/adaptlearngraph/repository/JpaTargetSelectionPersistence.java), [configured Employee context](../../../backend/src/main/java/com/adaptlearngraph/repository/ConfiguredEmployeeContextAdapter.java), [business services](../../../backend/src/main/java/com/adaptlearngraph/services/). Historical evidence covers [role browsing](../../testing/REQ-001-F01-view-target-roles.md) and [selection](../../testing/REQ-001-F02-choose-target-role.md), not AI generation.

<a id="riasec-job-position-exploration"></a>

## RIASEC job-position exploration — current implementation, 2026-11-18

Confirmed 17 November behavior uses **AI selection/ranking**, not cosine, confidence percentages or a fixed threshold. Employee sees suggestions directly, with no Expert guidance-review gate. Existing explicit published Role/member Level selection, access and target locks still govern learning writes.

### Candidates and minimized input

[RiasecCatalog](../../../backend/src/main/java/com/adaptlearngraph/repository/RiasecCatalog.java) queries ACTIVE Job Positions in the trusted Employee `organizationId`; absent status is treated as ACTIVE for compatibility. Each candidate needs an ID and six native integer interest properties 0–40. Partial/floating-point/invalid/inactive/foreign-org profiles are excluded. No Department filter, nonzero-norm gate or provenance/hash readiness metadata is implemented. Complete zero profiles are valid. Existing Department/Role access remains separate when browsing Roles.

Worker reads catalog at claim time. Input contains only six Employee scores and candidate ID/code/name/description/six scores. No account identity, baseline, Role/Level, Skill, learner history, previous result or saved explanation enters AI. Catalog text is untrusted data. Input JSON above 12,000 characters fails `CATALOG_TOO_LARGE`, without truncation. No candidates returns a successful empty list without an inference HTTP call.

### Durable local inference

Submit saves scores and QUEUED status in `platform.riasec_result`. Scores display while AI runs. There is no separate Explain button, deterministic fallback rank, conversation endpoint, chat history or direct-explanation cache. Worker claims one global PROCESSING job under a PostgreSQL advisory transaction lock, polls every 2 sec and uses run UUID/status/deadline fencing. Queue 20 min; claim sets processing 8 min; maintenance every 15 sec fails expired jobs and deletes expired inactive results.

[RiasecAiClient](../../../backend/src/main/java/com/adaptlearngraph/services/RiasecAiClient.java) calls internal Ollama `/api/chat`, default `qwen3:4b-instruct-2507-q4_K_M`, HTTP timeout 7 min, temperature 0, context 8192, threads 2, output 1200 tokens maximum. Allowed HTTP hosts are riasec-ollama/localhost/127.0.0.1; no external AI. [Configuration](../../../backend/src/main/java/com/adaptlearngraph/config/RiasecConfiguration.java) is local opt-in, excluding demo/prod. Dev Compose supplies private inference networking and named model storage, default 2 CPU/5 GiB; member performance is unmeasured.

AI returns 0–3 distinct supplied IDs, dense ranks1–3 with ties, exactly two distinct dimension letters and an English interest-only explanation80–350 characters. Server rejects foreign/invented IDs, duplicate selections, invalid ranks and specified ungrounded output. It copies **original** Employee/position scores for chosen dimensions; AI supplies no numeric evidence. Saved recommendation JSON contains position metadata/profile, rank, explanation and comparisons. Columns record model and prompt `riasec-match-v6-interests-only`. Validation does not prove every sentence/general quality. UI is EN/VI; generated explanations remain English.

### Failure, history and navigation

QUEUED→PROCESSING→SUCCEEDED/FAILED; expiry may also fail queued/processing work. Failures retain answers/scores. Only current active FAILED AI may explicitly retry with a new run UUID and current catalog. Success, including zero suggestions, is final. Late completion cannot replace another run or expired/inactive result. Tab/language/history changes never trigger inference.

History preserves saved snapshots; recovery does not rerun AI. Current active same-org position IDs govern Explore more: removed/inactive positions retain snapshots but cannot explore. On catalog-read failure the server returns catalogAvailable=false and an empty active-ID list. Current frontend does not consume that flag: Explore more is disabled with the generic unavailable message, without distinguishing a catalog outage from a removed/inactive position. Explore navigates `/employee/upskilling?tab=roles&jobPositionId=...`; Employee chooses Role/Level separately. It never selects/publishes a Role, grants access, updates mastery or generates a pathway. No post-inference Department/profile revision revalidation is claimed.

[Assessment API/history](../Assessment%20workflows/README.md#riasec-personal-assessment--current-implementation-2026-11-18), [storage schema](../../diagrams/riasec-storage.svg), [runtime flow](../../diagrams/riasec-flow.svg). V74 adds only two personal tables. Existing V4 module recommendations/pathways and retained conversation history are not this execution path.

**Evidence limits:** earlier 17 November isolated/API/browser/model checks retain their recorded version. Latest history/confirmation/permanent-delete UI has build/static evidence without fresh browser/executable checks. This document task runs no application/inference/tests and establishes no psychometric, general AI-quality, member-performance or production acceptance.

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
| 3. Description | The Employee shall explore AI-suggested Job Positions with saved interest explanations, and separately select or confirm a published organization target Role and member Level under the existing selection rules. |
| 4. Actor | Employee |
| 5. Preconditions | Trusted entitled Employee, available organization Role/member Level and current selection context; changed target requires no request-bound unfinished mandatory work. |
| 6. Main Flow | Optionally inspect RIASEC result, AI-suggested positions and saved explanations; browse published Roles; inspect explicit requirements and compatible evidence; choose/confirm Role and member Level; request pathway with exact binding and target lock. |
| 7. Alternative / Exception Flows | Active assessment or unfinished mandatory pathway work blocks target change; same-target is a no-op; browsing never replaces binding. AI suggestions remain a separate capability. |
| 8. Postconditions | Selection/request/history is retained coherently; release follows completion/approved-bypass rule, not arbitrary archive. |
| 9. Acceptance Criteria | All server/UI paths lock Role AND Level from request submission, including pending review; preserve attempts/profile and re-evaluate bypass on next target. |

<a id="fr-07-07"></a>

### FR-07.07: Generate target role guidance

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.07 |
| 2. Requirement Name | Generate target role guidance |
| 3. Description | The System shall asynchronously ask internal AI to select/rank up to 3 active same-org Job Positions from saved raw RIASEC scores, retaining validated interest explanations. |
| 4. Actor | System |
| 5. Preconditions | Trusted entitled Employee, own submitted result, valid same-org integer 0–40 profiles and enabled local inference composition. |
| 6. Main Flow | Save scores/queue AI; read eligible profiles; validate supplied IDs/ranks/explanations; save snapshots/original-score comparisons; show scores independently of job completion. |
| 7. Alternative / Exception Flows | Save equal/zero scores; accept zero suggestions; expose catalog/AI failure/timeout; retry only current FAILED AI without duplicating submission; reject successful regeneration. |
| 8. Postconditions | Own scores/AI state/model/prompt/snapshots are retained under seven-day inactive/recovery/permanent-delete rules, independently of selection/competency/pathway. |
| 9. Acceptance Criteria | Server-derived owner/org, complete integer 0–40 profiles, supplied IDs only, dense ranks/ties and bounded interest explanations; server copies numeric evidence. Raw scores remain visible on AI failure; no chat or learning writes. |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-048"></a>REQ-048 | [FR-06.04](#fr-06-04); [FR-07.07](#fr-07-07) |
| <a id="req-048-f01"></a>REQ-048-F01 | [FR-07.07](#fr-07-07) |
| <a id="req-048-f02"></a>REQ-048-F02 | [FR-06.04](#fr-06-04) |
