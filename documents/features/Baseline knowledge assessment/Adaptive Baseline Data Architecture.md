# Adaptive Baseline Data Architecture

**Current23 October2026:** full-Occupation slices1-5 and V20-V23 are implemented locally; read-only live V1-V23 checksums match. [Local demo exception](Local%20Demo%20Flow.md) bypasses owner readiness only under explicit profile/property/!prod; production dependencies remain open. [Current schema/review](../../testing/system/REQ-002-memory-schema-sync.md); [actual operations/limits](../../testing/system/REQ-002-local-demo.md). Browser/executable/numerical acceptance remains open; no history reset/repin.

## Status, ownership and version boundary

**23 October2026:** approved full-Occupation schema/runtime changes are implemented. V18-V23 are applied on local PostgreSQL17.6 and match source checksums. [Generated current diagrams and exact metadata](../../diagrams/README.md) cover86 tables/703 columns. Historical slice observations below retain their original dates and are not production/executable acceptance.

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

## Applied structures and retained compatibility

### Implemented scope

V20 conditional full/legacy scope readers, V21 new-format name/time bounds and V22 explicit conversion receipts are implemented and applied locally. Earlier S1/S2 and slice1-only observations remain in dated product evidence; current common Save/Preview/Activate/admission/list/form/result source is present. Browser/executable/numerical acceptance and real owners remain open.

### Configuration

Common Save/whole-union feasibility, saved-revision safe Preview and explicit legacy Draft conversion are implemented. Conversion archives the old row without changing original content/creation audit, creates the sole new Draft and appends a CONVERT receipt atomically. Normal Save cannot convert a legacy row in place; new Activate uses full-Occupation admission and current-version confirmation. V1-V23 remain unchanged; no learner/history reset. See the configuration/lifecycle contracts for exact wire and error behavior.

| Original V18 structure | Historical representation | Implemented V20-V22 compatibility |
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

**Applied V20 compatibility fields/checks:** existing scope_policy null is interpreted as LEGACY_ROLE_OR_EXPLORATION; only newly created versions explicitly carry FULL_OCCUPATION_V2. New-format occupation maximum/duration must be positive and nonnull; old exploration/role bounds remain required only for legacy-format rows and are null/not used for new format. Relax the old NOT NULL constraints only with conditional parent/child trigger validation, not an unconditional loss of integrity. Existing immutable-row triggers must still reject updates/deletes and late child insertion. Do not backfill old bounds or mark old rows as full-Occupation.

Draft JSON format validation, immutable version insertion, version registry, serializers and receipt reconstruction must branch coherently; do not make one decoder infer policy from whether roleId is present. The implemented server-owned format marker is server-owned response/storage metadata, never an editable client field. Explicit Draft conversion preserves the old closed content and creates a new sole Draft with audit; no automatic aggregation of old values.

Name/date/status/search/page indexes belong to PostgreSQL. Approved design status has no stored Retiring/Inactive enum: Draft=OPEN working row; Active=current pointer; otherwise Retiring if pinned IN_PROGRESS exists, else Inactive. Unknown counts fail the projection. Scope queries include organization and authorization before count/filter/page. Actual columns/constraints/indexes/triggers are in the verified V23 catalog. DTO names and public projections follow the linked lifecycle contract; no stored Retiring/Inactive enum is inferred from UI labels.

### Technical versions

Session2 adds [calibration/promotion source and contract](Calibrate%20and%20Promote%20IRT%20Parameters.md). V18 remains unchanged for run/candidate storage. V23 adds irt_effective_parameter_selection and irt_parameter_promotion_command with scope/revision/immutable-receipt guards; Session3 explicitly applied it to main after verified backup/checksums, with both tables empty. New future-Blueprint selection uses findEffective(org,bank,model,mapping) with no global latest fallback; exact historical findPinned is unchanged. The user authorized isolated SYNTHETIC simulation and delegated technical selection of fixed-c MML/EM/minimal forward persistence. Offline135-item fitted results are not a DB candidate or production evidence. Owner Identity/grants/readiness, exact real model and actual-pilot alignment remain open; default-off APIs cannot invent them. [Session2 evidence](../../testing/system/REQ-002-official-question-bank-session2.md) · [Session3 live schema/preservation and limits](../../testing/system/REQ-002-official-question-bank-session3.md).

Keep model_version, mastery_mapping_version, irt_parameter_set, irt_item_parameter and irt_calibration_run semantics. Model configuration pins MAP prior/minimum evidence/SE/response limits; mapping pins positive k and formulas; item parameters are exact item-version+skill tuples. System Administrator promotion applies only to future versions. New full-union feasibility must check every union skill's minimum evidence, model maximum and complete eligible parameter coverage at activate/start. No L&D model controls, invented numeric range, historic calibration rewrite or calibrated-truth claim.

### Attempts/results

| Actual V19 structure with V20 compatibility | Retained invariant / implemented extension |
| --- | --- |
| baseline_adaptive_attempt | Trusted organization/learner/Occupation, one IN_PROGRESS and one mastery-producing completion per Employee+Occupation, server time/revision, purpose/role provenance and replacement link. V20 adds immutable scope policy for new attempts; common bounds are compared against the pinned version |
| baseline_attempt_pool_item | Exact eligible item-version/skill/parameter-set pool stored at start; new full-union pool never reconstructed from current Catalog |
| baseline_attempt_skill_state | Provisional theta/SE/information and minimum evidence for every pinned union skill; no unanswered prior becomes mastery |
| baseline_attempt_item / baseline_attempt_response | Unique nonrepeating presented sequence, fixed option order, accepted server correctness and exact request identity; immutable audit preserved |
| baseline_attempt_result / baseline_attempt_skill_result | Immutable explanatory raw counts and per-skill theta/SE/point/conservative mastery/confidence; new skill names resolve from full pinned union, old result names retain recorded role scope |
| baseline_mastery_evidence / outbox_event | Atomic idempotent initialization evidence/event; no result/evidence for invalidated below-minimum attempt; delivery/REQ-041 projection separate |
| baseline_attempt_command | Scoped old/new exact command receipts; replay must not reinterpret a historical start using the new policy |

V20 extends the original V19 checks by branching on the **pinned policy**: full union for new-format attempts, original Role/exploration bounds and skills for historical attempts. Cross-tenant FKs, one-root/replacement constraints, terminal immutability, deadline identity, command uniqueness and no duplicate evidence stay enforced. Purpose ROLE_REQUIREMENT/OCCUPATION_EXPLORATION remains optional entry provenance; it cannot select scope for new versions.

Existing states remain IN_PROGRESS/SUBMITTED/AUTO_SUBMITTED/INVALIDATED; no INSUFFICIENT_EVIDENCE state, grace period or retake after a mastery-producing completion. Old role-specific completions consume the existing allowance without being relabeled full-Occupation. Invalidated linked replacement is a new start using a valid current new-format version; it never mutates the predecessor.

## Ordered operations and concurrency - approved, locally implemented

1. Authorize/serialize management on stable organization+Occupation; Save checks revision/replay before inserting/updating sole Draft. No-op server outcome references unchanged revision. Preview is read-only/ephemeral.
2. Activate exclusively locks current scope, verifies Draft/activation/confirmed replacement target, revalidates union/pins, inserts immutable parent/children, closes Draft and appends pointer/event/receipt atomically. Deactivate uses same lock without requiring fresh Catalog/items. Neither command locks/modifies learner attempts to derive status.
3. New start preserves existing actor/learner coordination and allowance/replay/active-attempt checks first. For genuine creation hold shared activation lock, re-read current/new-format/readiness, validate before/after Catalog fingerprint and exact technical dependencies; write full snapshot/pool/skill state/first item/receipt in one transaction. Absent activation rows need scope serialization/creation, not a lock on a missing row.
4. Resume/answer/submit/worker use exact pinned readers and attempt locks, independent of current pointer/readiness. Answer checks ownership/state/revision/deadline, writes accepted response, updates skill state, persists at most one next item and receipt atomically.
5. Finalization/worker preserves all accepted responses strictly before deadline, then writes immutable results/evidence/outbox once or invalidates below evidence gate. Worker remains bounded, indexed by IN_PROGRESS+deadline and recoverable via row lock/SKIP LOCKED. No activation lock is required.
6. List/status/result/history reads use trusted tenant/actor predicates and consistent read snapshots; GET never saves, finalizes, changes lifecycle, marks delivery or creates domain receipts. Query/dependency failure is not an empty result or an Inactive version.

The shared/exclusive activation protocol serializes new start versus activation/deactivation. Management must not lock attempts after activation to avoid cycles with existing actor/attempt coordination. Cross-store fingerprints detect drift; there is no atomic PostgreSQL+Neo4j transaction claim. Concurrency strategy must be reviewed against JdbcAdaptiveBlueprintStore and AdaptiveAttemptJdbc before implementation.

## Migration, retention and rollback

**Keep:** V1–V19 applied migrations; stable identity/FKs; old role/exploration JSON, purpose, bounds, skill/item snapshots, results/receipts/audit/events; generic module/fixed assessment structures and existing successful allowance.

**Compatible extension/migrate:** scope discriminator and conditional bounds/JSON/trigger readers, union selection/feasibility, list projection/query, saved-preview/UI/no-op behavior and result naming. Inspect seeds, ports, API serializers, UI and all test consumers before any cutover. V20-V23 have now been applied and verified; current generated V23 diagrams replace the old V17 snapshot. No history backfill or relabeling occurred.

**Deprecate:** Role/exploration configuration and role pool selection for new full-Occupation starts only. No approved physical removal in this Cluster 1. Historic fixed weights/counts/generation can remain with their owning legacy/module tables; do not repeat the old proposal to drop them without consumer approval.

**Cutover/rollback Approved design:** explicit L&D Draft conversion/one-pair confirmation; legacy current blocks new starts after admission cutover; old and new pinned attempts continue via dual readers. Gate new admission during mixed deployment. Rollback stops new starts and uses a version-compatible binary; no down migration, old-only binary, data reset, automatic legacy activation or completion rerun. See the linked transition design for staged actions and open limits.

## Acceptance and decisions

[Canonical test plan](../../testing/REQ-002-adaptive-baseline-test-plan.md): schema/backward compatibility AB-C17–C18, start/race AB-A02/A08–A11, read disclosure/no-state-change AB-R01–R05, retained numerical/evidence AB-S01–S02. One-time Testcontainers/adapters only after approved Cluster 3; docs/schema inspection is not executable evidence.

**Confirmed:** one whole-Occupation baseline/pair; PostgreSQL/Neo4j boundaries; immutable pins/history/deadline/allowance/idempotency/evidence and protected data. **Confirmed design:** schema fields/conditional checks/dual readers, derived lifecycle/list and start-lock/migration/rollback protocol. **Provisional:** current local/demo dependencies and numerical constants. **Open:** proposal approval, name/duration/rounding and production contracts. **Rejected:** rewriting V18/V19 or historical results, storing learner state in Neo4j, duplicate current/status authority or new Role sampling.

## Slices 2–3 implementation boundary — 2026-10-22

The canonical [API and lock contract](Occupation%20Baseline%20Lifecycle%20and%20Transition.md#slices-23-implemented-api-and-transaction-contract--2026-10-22) now specifies list query/row identities, independent readiness, current confirmation, Draft-ID CAS/no-op receipts, historical hash replay and shared/exclusive admission locks. Existing V20–V22 columns/constraints suffice; no schema/backfill change accompanies these slices. Full attempts explicitly store scope_policy and exact common bounds; NULL historical scope/pins/bounds remain original. Positive Save revisions must bind the returned Draft ID to prevent an earlier Draft's revision1 from overwriting a later Draft's revision1. Frontend integration and scope-aware result/history readers are implemented in slices 4–5; browser review remains unverified.

## Slice 5 safe read projection

assessmentScope is a derived public response value, not a new persisted field. Full scope uses all pinned Blueprint skill snapshots; legacy scope retains its original branch. Completion ordering and no-write reads are described in the [client/result contract](Occupation%20Baseline%20Lifecycle%20and%20Transition.md#slices-45-implemented-client-and-result-contract--2026-10-22). PostgreSQL retains all history/pins/evidence; Neo4j is not consulted by result/history. No migration or seeder change.
