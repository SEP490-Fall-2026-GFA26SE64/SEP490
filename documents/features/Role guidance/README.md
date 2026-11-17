# AI-Assisted Role Guidance

**RIASEC development update — 2026-11-16:** the local assessment, immutable ranking persistence and direct AI explanation FE/API flow are implemented. Dedicated Docker AI is opt-in; see [local AI setup and controls](DOCKER-AI.md). Manual API evidence establishes assessment/save/submit/replay and real Ollama CPU inference; browser and release validation remain separate. Historical source-inspection status below retains its dated scope.

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

<a id="riasec-job-position-exploration"></a>

## RIASEC job-position exploration — target contract, 2026-11-15

**Current status (2026-11-16):** local assessment, immutable job-position snapshots and direct AI explanations are implemented; real EN/VI inference was observed on existing synthetic DEV evidence. Q&A code/API has been retired. Browser interactions and release validation remain unverified. The existing Role–Level selection/lock contract below remains intact. Suggestions here are **job positions**, not automatically chosen target Roles or member Levels. They describe interests, not hiring suitability, skill attainment or a learning prescription.

### Deterministic ranking and retained context

- Input is the Employee's own immutable [submitted six-score result](../Assessment%20workflows/README.md#riasec-local-bilingual-assessment--target-contract-2026-11-15). Backend derives trusted active Employee/tenant/entitlement and applies server catalog visibility. Never accept client-ranked candidates, actor/tenant claims or browser-only catalog records as authority.
- Eligible candidates are real ACTIVE organization job positions, linked by authoritative IDs to the Employee's currently assigned Department, with a complete finite [six-field profile](../Departments%20and%20occupations/README.md#riasec-job-position-profiles--target-contract-2026-11-15) and nonzero norm. Missing/ambiguous Department, membership or link gives an explicit unavailable/no-eligible-candidates state, not organization-wide fallback or name matching. No cross-tenant/shared catalog expansion is introduced. Role publication and existing catalog/Department access rules still apply when opening associated Roles; a job recommendation does not publish a Role or grant access to it.
- Version the application algorithm as `riasec-cosine-v1`: `similarity(u,j) = sum(u[d]*j[d]) / (sqrt(sum(u[d]^2))*sqrt(sum(j[d]^2)))`, over unrounded normalized vectors in R/I/A/S/E/C order. Sort descending similarity, then ascending canonical code and stable job ID (locale-independent ordinal comparison). Return at most three distinct positions; never fill a short list with examples. Code/ID tie-breaks provide stable presentation, not meaningful superiority between equal scores. Do not create a minimum-confidence threshold or label cosine as a probability/percentage of suitability.
- Zero-norm or equal-six-score employee results receive an uninformative-profile explanation and no personalized ranking. Preserve the assessment and allow review/retake. Missing/incomplete profiles are excluded, including plausible values manufactured by defaulting/coalescing. All-zero job profiles remain catalog records but cannot be ranked. Empty eligible catalog, catalog outage and unavailable scoring input are distinct states; none fabricates a successful recommendation.
- This cosine rule is an application design choice. The official [O*NET manual, chapter 7](https://www.onetcenter.org/dl_files/IP_Manual.pdf) describes its own occupational linkage using correlation and additional rules; this product does not claim to reproduce that research, its fit labels or O*NET occupation recommendations. Locally authored position profiles are not official O*NET Occupational Interest Profiles merely because they have six fields.
- Persist a PostgreSQL recommendation snapshot with actor/tenant, source attempt/result, algorithm/version, generation time, eligibility context (including Department), candidate IDs/codes, order, unrounded similarities, six profile values and profile revision/content hash/provenance. Pin enough content to explain the original result; never reconstruct history from today's mutable profiles. A refresh is explicit and creates another snapshot; concurrent/replayed refresh with the same command identity returns one accepted snapshot. Ranking failure is retryable without resubmitting the assessment.
- Revalidate current membership, Department and candidate visibility before returning old details, explanations or explanation context. Retain original snapshot/history but show restricted/stale references without disclosing no-longer-authorized metadata or silently rewriting ranks. A changed assessment/Department/profile revision marks context stale; retain it as historical and offer explicit refresh. New AI explanations require a current authorized snapshot.

### Direct optional AI explanations (2026-11-16)

The assessment/radar and deterministic job-position ranking remain independent of AI. Employee explicitly selects **Explain with AI** on the saved recommendation snapshot. There is no question input, conversation endpoint, message history or chat retry flow. Old immutable chat tables/migrations remain untouched as retained history; their Java persistence/API code is retired.

POST /api/v1/employee/riasec/recommendations/{snapshotId}/explanation accepts only locale and an Idempotency-Key. Auth supplies actor/org. Backend validates current own snapshot, Department/membership/catalog visibility before and after inference. It supplies only saved scores and the permitted ranked position vectors/IDs; never identity, learning state or arbitrary user questions. AI returns a closed locale/candidate-order/focus plan; backend validates it and renders localized overall/per-position evidence. AI does not rerank or generate business commands.

Fallback status is explicit (disabled/not ready/timeout/busy/invalid response), with rule-based explanation. One local inference runs at a time. The direct explanation is not written to conversation tables: a bounded 256-entry process cache replays the same actor/key while retained. Restart/eviction can rerun inference; this does not create snapshots or learning writes. Refresh/history/locale never automatically POST. Unknown transport outcomes preserve the FE journal for explicit recovery. Durable explanation history is not implemented.

Missing Department/eligible profiles remain unavailable; no shared/external/other-Department fallback. A submitted result can exist without a valid recommendation snapshot. Completing catalog data needs separate authorization. No new release clearance or adaptation-validation claim.

### Existing schema and compatibility boundary

The active workspace [V4 recommendation schema](../../../backend/src/main/resources/db/workspace-migration/V4__pathway_analytics_and_evaluation.sql) is tied to target selection, learning profile/progress/model revisions and **module** candidates, not interest-only job positions. Do not force RIASEC through it with fabricated selection/module/profile records. Reuse compatible infrastructure only; introduce additive interest attempt/snapshot persistence in the active lineage during implementation. V66-V68 remain applied and unchanged. Conversation tables are retained immutable history; direct explanation uses no conversation persistence or new schema. Existing module recommendation/pathway data is preserved.

The current [target-role browse UI](../../../frontend/src/features/employee/target-roles/TargetRoleBrowsePanel.tsx) uses browser Department/name metadata, and uniform server Department enforcement is not proved by this inspection. The new ranking must resolve trusted membership and Department links by ID on the server; source presence is not authorization evidence. Browsing from a suggested position may navigate to the existing Roles flow, where publication, explicit Role–Level choice, baseline admission and target locks continue to govern every write. No new Expert approval gate is added for RIASEC explanations.

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
| 3. Description | The Employee shall explore interest-ranked job positions with optional AI comments, and separately select or confirm a published organization target Role and member Level under the existing selection rules. |
| 4. Actor | Employee |
| 5. Preconditions | Trusted entitled Employee, available organization Role/member Level and current selection context; changed target requires no request-bound unfinished mandatory work. |
| 6. Main Flow | Optionally inspect RIASEC result, ranked positions and advice/chat; browse published Roles; inspect explicit requirements and compatible evidence; choose/confirm Role and member Level; request pathway with exact binding and target lock. |
| 7. Alternative / Exception Flows | Active assessment or unfinished mandatory pathway work blocks target change; same-target is a no-op; browsing never replaces binding. AI suggestions remain a separate capability. |
| 8. Postconditions | Selection/request/history is retained coherently; release follows completion/approved-bypass rule, not arbitrary archive. |
| 9. Acceptance Criteria | All server/UI paths lock Role AND Level from request submission, including pending review; preserve attempts/profile and re-evaluate bypass on next target. |

<a id="fr-07-07"></a>

### FR-07.07: Generate target role guidance

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.07 |
| 2. Requirement Name | Generate target role guidance |
| 3. Description | The System shall rank eligible organization job positions deterministically from a saved RIASEC result and optionally explain them through AI advice/chat. |
| 4. Actor | System |
| 5. Preconditions | Trusted entitled Employee, own submitted result and authorized catalog context; AI is optional. |
| 6. Main Flow | Validate profile/eligibility; rank up to three positions; save a versioned snapshot; show deterministic evidence; optionally generate advice and bounded follow-up chat. |
| 7. Alternative / Exception Flows | Expose uninformative input, no eligible positions, outage, stale/restricted context and AI failure separately; retry without duplicate results/snapshots/turns. |
| 8. Postconditions | Own ranking snapshot and accepted advice/chat history are retained without modifying target selection, competency or pathway. |
| 9. Acceptance Criteria | Versioned cosine ranking with stable ties, complete profiles and server tenant/Department checks; AI cannot invent/reorder candidates or execute business writes; EN/VI and AI-off paths remain usable. |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-048"></a>REQ-048 | [FR-06.04](#fr-06-04); [FR-07.07](#fr-07-07) |
| <a id="req-048-f01"></a>REQ-048-F01 | [FR-07.07](#fr-07-07) |
| <a id="req-048-f02"></a>REQ-048-F02 | [FR-06.04](#fr-06-04) |
