# Configure Baseline Assessment

## Current adaptive contract

**Function:** REQ-002-F02. **Actor:** L&D Manager. **Status:** Cluster 1 contract approved on 2026-10-20; adaptive runtime migration is not implemented yet.

### Goal and position

L&D configures one adaptive baseline Blueprint for an authorized Occupation. The Blueprint bounds the individual question sequence generated while each Employee works; it does not assign points and does not create a shared test for review/publication.

```text
authorized Occupation and catalog scope
  -> open/resume working Blueprint
  -> configure maximum/time pairs for Occupation exploration and each active role
  -> validate catalog, eligible questions and IRT parameter coverage
  -> optionally Test Blueprint (ephemeral dry-run)
  -> finalize an immutable version and atomically make it current
  -> new Employee attempts pin that exact version
```

Finalization has no reviewer, approval or Publish step. Switching the database current pointer is part of the same transaction, not a separate publication workflow. This Function does not start Employee attempts, accept answers, calculate mastery or calibrate `a/b/c`.

### Actor, trigger and trusted context

- Actor and organization come from authenticated server context, never the payload.
- Occupation/TargetRole/MicroSkill membership comes from the authorized Catalog view; PostgreSQL stores stable IDs and history snapshots. Only `ACTIVE` roles and active, complete, validly mapped question versions enter a new Blueprint pool. Draft, inactive, archived or removed roles/questions are excluded.
- The backend resolves eligible question versions and IRT parameter coverage. Client capacity is never authoritative.
- One organization + Occupation owns one stable Blueprint identity, at most one working revision and one technical current-version pointer.

### Configuration contract

| Field | Rule | Status |
| --- | --- | --- |
| Blueprint name | Required display name. | Confirmed |
| Occupation | Authorized Catalog selection; stable identity scope. | Confirmed |
| Exploration maximum/time | Required positive maximum and duration for voluntary Occupation attempts. The maximum cannot exceed the deduplicated eligible capacity of all active roles. | Confirmed |
| Active-role maximum/time | Required positive maximum and duration for each active role. The maximum cannot exceed that role's current deduplicated eligible capacity. Draft/inactive/removed roles have no configurable row and create no demand. | Confirmed |
| Time calculator | In each exploration/role row, UI initially suggests `60 seconds × that row's maximum questions`. Editing total duration recalculates displayed seconds/question; editing seconds/question recalculates total duration. Only that row's final total duration is persisted and becomes the server-authoritative deadline duration for its attempt type. The suggestion is not a backend default, and L&D must explicitly confirm/save it. | Confirmed |
| Role/MicroSkill scope | A role-required attempt uses the selected active role's deduplicated skill/item pool and role bound. A voluntary exploration attempt uses the deduplicated union of all active role pools and the exploration bound. | Confirmed |
| Minimum evidence/skill coverage | A system-owned technical policy prevents a prior or too few answers from becoming mastery. It is not editable by L&D. | Confirmed boundary |
| Adaptive stop target | A system-owned maximum acceptable standard error (`SE`) permits early stop after minimum evidence. It is not editable by L&D. | Confirmed boundary |
| Model, IRT parameter set and mastery mapping | Immutable versions pinned by the Blueprint/attempt. Calibration produces a candidate set; System Administrator promotion makes it eligible for new versions. | Confirmed |

Removed from the target contract: per-question points, Easy/Medium/Hard score weights, exact difficulty quotas, generated assessment Draft, protected-answer review and Publish. Difficulty labels may remain for authoring/cold-start explanation; adaptive selection uses pinned `a/b/c` and item information. MAP prior, minimum-evidence rule, `SE` target, conservative-mastery factor and initial `a/b/c` values are temporarily system-owned/versioned technical configuration (initially code/config constants), not L&D fields. The owner/configuration UI for those controls is deferred and must not be silently assigned to L&D.

### Test Blueprint

**Test Blueprint** is the UI name for an ephemeral dry-run. It re-resolves Catalog membership, checks eligible items and complete `a/b/c` coverage, validates bounds, then returns an answer-safe feasibility result and sample/selection trace.

It creates no assessment version, attempt, response, result, mastery evidence, current-pointer change or dry-run history. It never returns `protected_key`. Failure reports structured shortages and leaves the working revision unchanged.

### Ordered write behavior

1. Open/save authorizes the Occupation, locks/loads the sole working revision, revalidates Catalog scope and saves with optimistic revision plus idempotency receipt. It does not switch the current version.
2. Finalize locks the organization + Occupation current-pointer row first; validates the expected revision, catalog/item/parameter coverage and version dependencies; inserts the immutable Blueprint and snapshots; advances the pointer; appends history and command outcome; then commits atomically.
3. A later finalization affects only new attempts. Existing attempts retain their pinned versions.
4. The immutable version stores an active-role/catalog fingerprint. If current active-role membership changes, new attempts are blocked as Blueprint-stale until L&D finalizes a refreshed version; the system never silently uses a removed/draft role or mutates the old snapshot.

### Outputs and protected data

- Working configuration with revision/validation state.
- Immutable Blueprint version and current-version summary.
- Structured item/parameter shortages and an answer-safe Test Blueprint preview.
- No answer key, Employee attempt/result/mastery, cross-organization identifiers or personal calibration data.

### Failure and concurrency branches

| Condition | Result and state guarantee |
| --- | --- |
| Unauthorized/cross-organization scope | Reject without revealing configuration/capacity. |
| Missing required question/time in any applicable exploration/active-role row, non-positive value, bound above authoritative eligible capacity, or missing Catalog/item/parameter coverage | Validation/shortage details; no finalization/pointer change. Client capacity feedback is advisory; finalization rechecks the database-backed capacity. |
| Catalog changes or stale revision | Conflict; no partial immutable version. |
| Active-role membership changes after finalization | Existing attempts continue pinned; new starts report Blueprint-stale until a refreshed version is finalized. |
| Same idempotency key and request | Replay stored outcome. |
| Same key with different request | Conflict; no write. |
| Concurrent finalization | Pointer lock/revision permits one winner; other request conflicts or replays. |
| Dependency failure | No partial version/current switch. |

### History, compatibility and current implementation

- Applied V1–V17 migrations are immutable. Cluster 2 uses a forward-only migration.
- Legacy weight/count fields are removed only after all runtime consumers are mapped; the new API carries no compatibility weights.
- Generic fixed-manifest assessment tables may remain for module/legacy assessment, but adaptive baseline does not use them.
- The repository still implements the superseded V17 fixed-assessment flow. Its implementation inventory is kept in `.project/requirements/active/REQ-002-003-009-assessment/REQ-002-IMPLEMENTED-SNAPSHOT.md`; historical evidence remains under `documents/testing/` and does not certify this contract.
- Target storage is defined in [Adaptive Baseline Data Architecture](Adaptive%20Baseline%20Data%20Architecture.md).
- Frontend work must reuse established controls, buttons, dialogs, responsive layout and EN/VI patterns; the old weight UI must not survive as hidden state.

### Acceptance-to-test mapping

| Acceptance | Planned Cluster 3 evidence |
| --- | --- |
| Authorized L&D saves/finalizes a valid Blueprint | API/function and PostgreSQL integration test |
| Target API has no weights or shared assessment lifecycle | Contract/regression and removed-consumer check |
| Test Blueprint detects feasibility/shortage without writes or answer leakage | API/integration database-state comparison |
| Finalize pins all versions and switches current atomically | Integration/concurrency test |
| Idempotency, stale writes and organization isolation hold | Unit/integration/authorization tests |
| New version affects only new attempts | End-to-end version-pinning test |
| Active-role change makes new-start readiness stale without altering in-progress attempts | Catalog/Blueprint integration and system test |
| Active-role/exploration bounds cannot exceed eligible deduplicated capacity | API and PostgreSQL integration boundary tests |
| Time suggestion and bidirectional calculation remain consistent while only final duration persists | Frontend unit/component plus API contract tests |

### Decision status

- **Confirmed:** L&D/Occupation ownership; active-role and Occupation-exploration pools/bounds; capacity validation; required time with a one-minute-per-question UI suggestion and bidirectional calculator; no points/weights; no Generate/Review/Publish; ephemeral Test Blueprint; immutable version pinning; server time/auto-submit; PostgreSQL authority; System Administrator parameter-set promotion; established frontend design system.
- **Provisional technical configuration:** MAP/SE/minimum-evidence/conservative-mastery constants and cold-start `a/b/c` are system-owned and versioned but initially hard-coded/configured below the L&D surface until a separate owner/configuration Function is approved.
- **Open:** none for this Function's Cluster 1 product contract. Exact implementation field names and safe technical constant values are resolved inside the approved versioned technical configuration slice without expanding L&D input.
- **Rejected:** shared generated baseline, persisted preview history, client-authoritative capacity and compatibility weights in the new contract.
