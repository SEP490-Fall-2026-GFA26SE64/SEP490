# Adaptive Baseline Data Architecture

**Current source checkpoint — slices 1–5, 2026-10-22:** The user accepted slices 2–3 and authorized slices 4–5. The common-configuration form/calculator, saved-preview and confirmed lifecycle actions, PostgreSQL-backed management directory, and safe full/legacy result/history are now implemented in uncommitted source. V1–V22 and historical data remain unchanged. Main Java compile, production-only TypeScript/lint and FE flag-off/on builds passed; bounded isolated live-client/HTTP/SQL observations are recorded in [slice 4–5 evidence](../../testing/system/REQ-002-F02-REQ-009-occupation-ui-results.md). Interactive browser review is unavailable in this session and remains unverified. No executable tests, acceptance certification, user-stack migration, stage/commit/push or automatic Cluster 3.

**Approval update - 2026-10-22:** The user approved OB-P01-P10 and the proposed schema/API/transition/concurrency/rollback design and authorized Cluster 2 implementation in small slices. Earlier review qualifiers are superseded by this approval; implementation status remains explicit. The user then confirmed a maximum of 100 Unicode characters for the name and a total budget of 30-120 seconds multiplied by maxQuestions; this is an average budget, not a per-item timer. Nearest-whole-second calculation is approved. Existing legacy values/history stay unchanged. No Cluster 3/test execution, new commit or push is authorized. Planned schema/behavior is not implemented merely by this approval.

## Status, ownership and version boundary

**22 October 2026 — Cluster 1 approved; Cluster 2 in progress.** User-confirmed full-Occupation scope supersedes the 20 October role/exploration design. Schema extensions and lock/rollout choices below are **Approved design, not migrations or live-schema evidence**. Commit618d772 contains V18 adaptive configuration/IRT and V19 attempt/result schema plus B1–B9 local/demo code. The earlier V17-only technical snapshot/diagrams do not describe that source inventory or this future delta.

PostgreSQL owns configuration, admission pointers, attempts/pools/responses/deadlines, results/evidence, receipts, audit/outbox and analytics/mastery/pathway state. Neo4j owns authorized Catalog relationships; Java 21/Spring Boot 3.5 selects/estimates through ports. Redis is not a state authority. No learner state moves into Neo4j.

[Lifecycle/API/transition approved designs](Occupation%20Baseline%20Lifecycle%20and%20Transition.md) contain detailed failure/retry/rollout decisions. The [20 October diagram](../../diagrams/postgresql-adaptive-baseline-target.puml) and its [SVG](../../diagrams/postgresql-adaptive-baseline-target.svg) are **superseded historical target drawings**, not the current schema contract. They are retained for migration provenance; the following scoped diagram/table is the revised design.

~~~mermaid
flowchart LR
 C[Authorized active-role Catalog] --> U[Full Occupation skill and item union]
 U --> D[One open Draft: one bounds pair]
 D -->|Activate atomically| V[Immutable full-Occupation version]
 V --> P[One current pointer per organization and Occupation]
 P -->|new start pins| A[Employee and Occupation attempt]
 A --> S[Pinned pool, items, responses and deadline]
 S --> R[Immutable result and mastery evidence]
 P --> L[Derived availability status]
 A -->|IN_PROGRESS count only| L
 H[Legacy versions and attempts] -->|original dual readers| R
~~~

One stable Blueprint, multiple historical versions and one active pointer are compatible with one baseline per Occupation. Individual attempts are never a shared fixed manifest or a Role section.

## Existing on-disk structures and planned delta

### Implementation checkpoint - slices S1/S2, 2026-10-22

V20 now adds nullable historical scope markers, explicit Occupation bounds, conditional membership/attempt validation and list/status indexes without rewriting V18/V19 or data. V21 adds the confirmed new-format name 100-character and average 30-120-second budget constraints. Domain, version JSON/SQL readers and pinned snapshot scope selection understand both formats. Legacy constructor/JSON/bounds remain supported; old immutable names/times are not revalidated as new input.

At this historical S1/S2 checkpoint, only the compatibility foundation existed; the subsequent slices1–5 checkpoints supersede the then-pending API/conversion/admission/list/form/result-label cutover. Source requires the new migration columns before deployment. No user database was migrated. Java 21 main compile passed; bounded direct-SQL PostgreSQL 17.6 smoke applied V1-V21 to a new tmpfs database and V20/V21 over a disposable V19 Draft with unchanged row hash. Name 100/101 and rate30/120 boundaries were inspected; no Flyway/application/concurrency/executable-test acceptance is claimed. The temporary container was removed; existing stack/volumes were untouched. Future rollback must respect the approved dual-reader/admission gate policy, not remove new columns.

### Configuration

**2026-10-22, remaining slice 1 of 5:** common Save/whole-union feasibility, saved-revision Preview and explicit legacy Draft conversion are now implemented in gated BE source. V22 extends only `baseline_blueprint_command.operation` to include CONVERT; its immutable response retains the original Draft and new working snapshot. Closure uses the existing ABANDONED state and actor/time audit; old configuration/creation columns are unchanged. Scope locking, one-OPEN registry and transaction rollback cover archive/new Draft/receipt together. V1-V21 were not modified. Existing current versions and all learner tables remain outside these commands' writes. Fresh Activate is temporarily blocked until slice-2 admission; no new version is issued by conversion. See [Configure](Configure%20Baseline%20Assessment.md) and [manual evidence](../../testing/system/REQ-002-F02-baseline-authoring.md) for wire/status/validation limits. The S1/S2 paragraph above records the earlier foundation checkpoint.

| Actual V18 structure | Existing role/exploration representation | Planned new-format change |
| --- | --- | --- |
| baseline_blueprint | Stable organization+Occupation identity | Keep identity/cardinality and existing scope FK/registry |
| baseline_adaptive_blueprint_working_revision | OPEN/FINALIZED/ABANDONED; configuration JSON requires exploration+roles | Dual shape reader/validator; new configuration contains name+one occupationBounds pair; only one OPEN per scope |
| baseline_adaptive_blueprint_version | Immutable name/Occupation/fingerprint, exploration maximum/duration, technical pins | Add server-owned scope_policy and occupation_max_questions/occupation_time_limit_seconds; old values untouched |
| baseline_adaptive_blueprint_role | Immutable active Role snapshot plus per-Role maximum/duration | Keep membership/provenance; new format has no Role assessment bounds |
| baseline_adaptive_blueprint_skill | Role-to-skill snapshots, including shared skill memberships | Keep membership edges; derive one deduplicated skill set for new versions and validate shared ID/name/version consistency |
| baseline_blueprint_activation | Serialized scope/current version/revision/actor/time | Keep sole pointer; expected replacement target validated under lock |
| baseline_blueprint_activation_event | Immutable FINALIZE/DISABLE history | Keep old events; explicit activate/deactivate UI names do not rewrite them; extend operation vocabulary only if approved |
| baseline_blueprint_command | Actor/tenant/key/request hash/outcome | Preserve legacy namespace/decoding; new commands/no-op/conversion receipts explicitly versioned |
| baseline_blueprint_version_registry / baseline_blueprint_working_registry | Existing FIXED/ADAPTIVE version/working identity routing | Keep collision/history guarantees; ADAPTIVE alone does not distinguish old scope from new |

**Approved design compatibility fields/checks:** existing scope_policy null is interpreted as LEGACY_ROLE_OR_EXPLORATION; only newly created versions explicitly carry FULL_OCCUPATION_V2. New-format occupation maximum/duration must be positive and nonnull; old exploration/role bounds remain required only for legacy-format rows and are null/not used for new format. Relax the old NOT NULL constraints only with conditional parent/child trigger validation, not an unconditional loss of integrity. Existing immutable-row triggers must still reject updates/deletes and late child insertion. Do not backfill old bounds or mark old rows as full-Occupation.

Draft JSON format validation, immutable version insertion, version registry, serializers and receipt reconstruction must branch coherently; do not make one decoder infer policy from whether roleId is present. The proposed format marker is server-owned response/storage metadata, never an editable client field. Explicit Draft conversion preserves the old closed content and creates a new sole Draft with audit; no automatic aggregation of old values.

Name/date/status/search/page indexes belong to PostgreSQL. Approved design status has no stored Retiring/Inactive enum: Draft=OPEN working row; Active=current pointer; otherwise Retiring if pinned IN_PROGRESS exists, else Inactive. Unknown counts fail the projection. Scope queries include organization and authorization before count/filter/page. Exact index definitions, DTO names and migration number are implementation design details subject to the approved proposal, not existing schema claims.

### Technical versions

Keep model_version, mastery_mapping_version, irt_parameter_set, irt_item_parameter and irt_calibration_run semantics. Model configuration pins MAP prior/minimum evidence/SE/response limits; mapping pins positive k and formulas; item parameters are exact item-version+skill tuples. System Administrator promotion applies only to future versions. New full-union feasibility must check every union skill's minimum evidence, model maximum and complete eligible parameter coverage at activate/start. No L&D model controls, invented numeric range, historic calibration rewrite or calibrated-truth claim.

### Attempts/results

| Actual V19 structure | Retained invariant / proposed extension |
| --- | --- |
| baseline_adaptive_attempt | Trusted organization/learner/Occupation, one IN_PROGRESS and one mastery-producing completion per Employee+Occupation, server time/revision, purpose/role provenance and replacement link. Add/copy immutable scope policy for new attempts; compare common bounds against pinned version |
| baseline_attempt_pool_item | Exact eligible item-version/skill/parameter-set pool stored at start; new full-union pool never reconstructed from current Catalog |
| baseline_attempt_skill_state | Provisional theta/SE/information and minimum evidence for every pinned union skill; no unanswered prior becomes mastery |
| baseline_attempt_item / baseline_attempt_response | Unique nonrepeating presented sequence, fixed option order, accepted server correctness and exact request identity; immutable audit preserved |
| baseline_attempt_result / baseline_attempt_skill_result | Immutable explanatory raw counts and per-skill theta/SE/point/conservative mastery/confidence; new skill names resolve from full pinned union, old result names retain recorded role scope |
| baseline_mastery_evidence / outbox_event | Atomic idempotent initialization evidence/event; no result/evidence for invalidated below-minimum attempt; delivery/REQ-041 projection separate |
| baseline_attempt_command | Scoped old/new exact command receipts; replay must not reinterpret a historical start using the new policy |

Existing V19 insert checks match bounds and skills to selected role or exploration union. A future migration must branch on the **pinned policy**, validate full union for new format and retain old checks for old attempts. Cross-tenant FKs, one-root/replacement constraints, terminal immutability, deadline identity, command uniqueness and no duplicate evidence stay enforced. Purpose ROLE_REQUIREMENT/OCCUPATION_EXPLORATION remains optional entry provenance; it cannot select scope for new versions.

Existing states remain IN_PROGRESS/SUBMITTED/AUTO_SUBMITTED/INVALIDATED; no INSUFFICIENT_EVIDENCE state, grace period or retake after a mastery-producing completion. Old role-specific completions consume the existing allowance without being relabeled full-Occupation. Invalidated linked replacement is a new start using a valid current new-format version; it never mutates the predecessor.

## Ordered operations and concurrency — proposed extension

1. Authorize/serialize management on stable organization+Occupation; Save checks revision/replay before inserting/updating sole Draft. No-op server outcome references unchanged revision. Preview is read-only/ephemeral.
2. Activate exclusively locks current scope, verifies Draft/activation/confirmed replacement target, revalidates union/pins, inserts immutable parent/children, closes Draft and appends pointer/event/receipt atomically. Deactivate uses same lock without requiring fresh Catalog/items. Neither command locks/modifies learner attempts to derive status.
3. New start preserves existing actor/learner coordination and allowance/replay/active-attempt checks first. For genuine creation hold shared activation lock, re-read current/new-format/readiness, validate before/after Catalog fingerprint and exact technical dependencies; write full snapshot/pool/skill state/first item/receipt in one transaction. Absent activation rows need scope serialization/creation, not a lock on a missing row.
4. Resume/answer/submit/worker use exact pinned readers and attempt locks, independent of current pointer/readiness. Answer checks ownership/state/revision/deadline, writes accepted response, updates skill state, persists at most one next item and receipt atomically.
5. Finalization/worker preserves all accepted responses strictly before deadline, then writes immutable results/evidence/outbox once or invalidates below evidence gate. Worker remains bounded, indexed by IN_PROGRESS+deadline and recoverable via row lock/SKIP LOCKED. No activation lock is required.
6. List/status/result/history reads use trusted tenant/actor predicates and consistent read snapshots; GET never saves, finalizes, changes lifecycle, marks delivery or creates domain receipts. Query/dependency failure is not an empty result or an Inactive version.

The shared/exclusive activation protocol serializes new start versus activation/deactivation. Management must not lock attempts after activation to avoid cycles with existing actor/attempt coordination. Cross-store fingerprints detect drift; there is no atomic PostgreSQL+Neo4j transaction claim. Concurrency strategy must be reviewed against JdbcAdaptiveBlueprintStore and AdaptiveAttemptJdbc before implementation.

## Migration, retention and rollback

**Keep:** V1–V19 applied migrations; stable identity/FKs; old role/exploration JSON, purpose, bounds, skill/item snapshots, results/receipts/audit/events; generic module/fixed assessment structures and existing successful allowance.

**Compatible extension/migrate:** scope discriminator and conditional bounds/JSON/trigger readers, union selection/feasibility, list projection/query, saved-preview/UI/no-op behavior and result naming. Inspect seeds, ports, API serializers, UI and all test consumers before any cutover. New schema is planned until a forward migration is implemented and verified; do not regenerate old live V17 diagrams as if this were applied.

**Deprecate:** Role/exploration configuration and role pool selection for new full-Occupation starts only. No approved physical removal in this Cluster 1. Historic fixed weights/counts/generation can remain with their owning legacy/module tables; do not repeat the old proposal to drop them without consumer approval.

**Cutover/rollback Approved design:** explicit L&D Draft conversion/one-pair confirmation; legacy current blocks new starts after admission cutover; old and new pinned attempts continue via dual readers. Gate new admission during mixed deployment. Rollback stops new starts and uses a version-compatible binary; no down migration, old-only binary, data reset, automatic legacy activation or completion rerun. See the linked transition design for staged actions and open limits.

## Acceptance and decisions

[Canonical test plan](../../testing/REQ-002-adaptive-baseline-test-plan.md): schema/backward compatibility AB-C17–C18, start/race AB-A02/A08–A11, read disclosure/no-state-change AB-R01–R05, retained numerical/evidence AB-S01–S02. One-time Testcontainers/adapters only after approved Cluster 3; docs/schema inspection is not executable evidence.

**Confirmed:** one whole-Occupation baseline/pair; PostgreSQL/Neo4j boundaries; immutable pins/history/deadline/allowance/idempotency/evidence and protected data. **Confirmed design:** schema fields/conditional checks/dual readers, derived lifecycle/list and start-lock/migration/rollback protocol. **Provisional:** current local/demo dependencies and numerical constants. **Open:** proposal approval, name/duration/rounding and production contracts. **Rejected:** rewriting V18/V19 or historical results, storing learner state in Neo4j, duplicate current/status authority or new Role sampling.

## Slices 2–3 implementation boundary — 2026-10-22

The canonical [API and lock contract](Occupation%20Baseline%20Lifecycle%20and%20Transition.md#slices-23-implemented-api-and-transaction-contract--2026-10-22) now specifies list query/row identities, independent readiness, current confirmation, Draft-ID CAS/no-op receipts, historical hash replay and shared/exclusive admission locks. Existing V20–V22 columns/constraints suffice; no schema/backfill change accompanies these slices. Full attempts explicitly store scope_policy and exact common bounds; NULL historical scope/pins/bounds remain original. Positive Save revisions must bind the returned Draft ID to prevent an earlier Draft's revision1 from overwriting a later Draft's revision1. Frontend integration and scope-aware result/history readers are implemented in slices 4–5; browser review remains unverified.

## Slice 5 safe read projection

assessmentScope is a derived public response value, not a new persisted field. Full scope uses all pinned Blueprint skill snapshots; legacy scope retains its original branch. Completion ordering and no-write reads are described in the [client/result contract](Occupation%20Baseline%20Lifecycle%20and%20Transition.md#slices-45-implemented-client-and-result-contract--2026-10-22). PostgreSQL retains all history/pins/evidence; Neo4j is not consulted by result/history. No migration or seeder change.
