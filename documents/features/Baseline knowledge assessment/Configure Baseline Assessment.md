# Configure Baseline Assessment

## Current scope

**Function:** REQ-002-F02. **Actor:** L&D Manager. **Status:** Occupation-scoped, capacity-aware authoring is implemented and verified through unit/API/component, PostgreSQL/Neo4j integration and full-stack Compose/Playwright on the local opt-in boundary as of 2026-10-16.

L&D selects one Occupation, sees every current TargetRole in it, and configures one logical baseline blueprint for that Occupation. Counts and score weights remain detailed per role, skill and difficulty. Setting all counts of a role to `0` keeps the role visible in history but excludes it from coverage, generation and scoring.

```text
select Occupation
  -> load all roles and resolved skills
  -> load current published question capacity
  -> enter a feasible role total and explicitly distribute it across skill/difficulty cells
  -> optionally adjust detailed counts and linked percentage weights
  -> validate exact catalog membership and aggregate coverage
  -> save a new immutable blueprint version
  -> generate exact no-repeat manifest
  -> review exact content hash
  -> publish
```

This function does not execute Employee attempts, calculate mastery/gaps, edit the catalog, or configure RIASEC.

## Confirmed capacity, weight and language behavior — implemented and tested (2026-10-16)

Detailed counts remain the saved source of truth and score weights remain decimals `0..1` on the wire. The capacity endpoint is a read model only: it returns current published counts and never question content or answer material.

- Catalog detail and capacity load independently. Apply/Save is available only when capacity belongs to the selected Occupation and catalog version. A failed refresh keeps the unsaved draft and offers Retry.
- A role with `N` MicroSkills accepts total `0` or a feasible value in `[3 × N, feasibleMax]`. `feasibleMax` subtracts demand already assigned by other roles sharing the same MicroSkill pool.
- Explicit Apply first reserves one Easy, one Medium and one Hard question for every MicroSkill, then distributes the remainder deterministically without exceeding any cell capacity. Typing the total alone does not overwrite detailed counts.
- Manual cell edits update the displayed total without redistributing other cells. Each participating cell must be an integer `>= 1`; per-cell and aggregate shared-pool shortages are shown before Save.
- Applying total `0` clears every detailed count and displayed weight for that role. The role stays visible and stored but does not participate in coverage, generation or scoring.
- Applying a participating role initializes `Easy 20% / Medium 30% / Hard 50%`. Counts do not derive score weights.
- Three decimal text inputs and two accessible slider dividers edit one linked weight state. The invariant is `Hard > Medium > Easy >= 1%`, total exactly `100%`, with at most two percentage decimals. Editing one value keeps it fixed and deterministically rebalances the other two; slider movement clamps at valid hierarchy boundaries.
- Non-canonical input such as `040`, empty text, more than two decimals or a value with no feasible linked solution remains visible and reports an inline error on blur/Enter. Native number spinners are not used.
- Role panels expand/collapse independently. The global English/Vietnamese switch translates static/dynamic states without losing unsaved form, capacity or accordion state.

Client capacity validation is early feedback, not authority. Save resolves catalog membership and published coverage again on the backend. A concurrent publish/unpublish can therefore still return a structured shortage; the editor retains the draft and refreshes capacity.

The editor shows all weights as `0%` for a zero-question role. The existing backend domain nevertheless requires every persisted role's three wire weights to total `1`, before its later participation check ignores zero-question roles. The request boundary therefore sends compatibility decimals `0.3334/0.3333/0.3333` only for an excluded role and normalizes those values back to visible zeros when loading it. These compatibility values never create coverage demand, generated items or score contribution; participation remains derived from detailed counts.

## Input and trusted context

| Input/context | Source | Rule |
| --- | --- | --- |
| Actor and organization | Trusted server-side identity context | Active L&D Manager only; never accepted from request payload. |
| Occupation | Catalog selection | Stable ID/name, active and available in actor scope. |
| Blueprint name | L&D input | Required; revisions may rename without changing logical identity. |
| Role rows | Derived from Occupation | Exactly every current `HAS_ROLE` role; no omission or injection. |
| Skill rows | Derived from each role | Union of active `HAS_LEVEL -> REQUIRES_SKILL` MicroSkills by stable ID. |
| Current capacity | Backend read model | Published available count per role/MicroSkill/difficulty plus catalog version and read time; never supplied by the client. |
| Counts | L&D input | Zero role or integer `>= 1` for every Easy/Medium/Hard cell of a participating role; aggregate demand must fit current capacity. |
| Weights | L&D input | Participating role only: exact decimal total `1`, each `>= 0.01`, with `hard > medium > easy`. |

## Output

- One logical blueprint identity per Occupation and a new immutable version for each successful save.
- Occupation, role and skill ID/name snapshots for historical display.
- Role totals; a total of `0` is stored but produces no questions or score.
- Structured coverage shortages with role, skill, difficulty, required, available and missing counts.
- An immutable generated manifest containing pinned item versions, role attribution, score contribution, seed and content hash.
- Review/publication metadata for the exact hash. Responses never expose `protected_key` or answer-key material.

## Rules

1. A version contains all and only the Occupation's current roles and each role's resolved skills.
2. At least one role must have a total greater than `0`; all-zero configurations are rejected.
3. Every MicroSkill in a participating role has at least one Easy, Medium and Hard question. Its weights total `1` and satisfy `hard > medium > easy >= 0.01`. A zero role displays zero weights; its wire-only compatibility weights are ignored by participation, coverage, generation and scoring.
4. Zero roles still pass catalog membership validation but skip coverage, generation and scoring.
5. Shared skill+difficulty demand is aggregated across participating roles; generation never repeats an item version.
6. Save/revise and generation are idempotent. Reusing a key with different content or revising a stale version returns conflict without partial persistence.
7. Successful saves are immutable. Review freezes the exact header and manifest; publish requires the reviewed hash and published content remains immutable.
8. Catalog changes never rewrite history. A new revision resolves current membership and snapshots it again.

## Main and failure branches

| Branch | Observable result |
| --- | --- |
| Valid Occupation with at least one non-zero role | Save/revise, generate, review and publish are available. |
| A role is intentionally zero | It survives save/reload; no coverage request, generated item or score contribution. |
| Capacity is loading, stale or unavailable | Disable Apply/Save, preserve the draft and offer Retry; do not invent a maximum. |
| Total is `1..(3 × N - 1)` or above feasible maximum | Report the valid range before Apply; do not redistribute. |
| A required skill/difficulty bucket has no question | That role cannot participate until coverage exists; total `0` remains allowed. |
| A count or linked weight is malformed | Keep the raw input, show inline validation and disable Save. |
| Occupation missing/inactive/unavailable | Reject without a new version. |
| Role/skill set differs from catalog | Reject with validation details; do not silently repair input. |
| A role has no resolvable skills | Reject as catalog-not-ready. |
| Aggregate published coverage is insufficient | Return every shortage; never reuse items or lower counts. |
| Catalog/database dependency fails | Return dependency failure and preserve the latest saved version. |
| Stale revision or reviewed-hash mismatch | Return conflict; no partial version/publication state. |

## Runtime boundary

- PostgreSQL Flyway V13 adds the logical `baseline_blueprint` identity and one non-null Occupation per blueprint while retaining legacy null identities.
- The local opt-in Neo4j adapter reads active `Occupation -> TargetRole -> Level -> MicroSkill`, unions skills across Levels and exposes L&D list/detail APIs.
- `GET /api/v1/ld/baseline-blueprint-catalog/occupations/{occupationId}/capacity` joins that Occupation scope with current PostgreSQL published coverage through application ports. `coverageAsOf` is the application read-completion time, not a production catalog snapshot.
- The frontend calls those APIs first. In development only, defined unavailable responses may use the isolated fixture; production receives no fixture fallback.
- Production Identity authorization and Catalog tenant visibility, approval/publication and release-snapshot contracts are not yet integrated. The local adapter must not be treated as production-ready.
- Employee attempt/result, scoring/evidence/mastery and RIASEC remain separate functions.

## Acceptance and evidence

The accepted behavior is mapped in [REQ-002-F02 testing](../../testing/REQ-002-F02-baseline-authoring.md). For the linked-weight/capacity delta on 2026-10-16, backend unit/API passed 18/18, the final full backend regression passed 183/183 with Docker/Testcontainers enabled, frontend scoped coverage passed 36/36 and full frontend regression passed 69/69. Production build passed and lint exited 0 with unrelated existing warnings. The updated Compose/Playwright scenario passed 1/1 against a clean disposable stack.

The detailed implementation boundary and remaining dependencies are tracked in the active [.project implementation plan](../../../../../.project/requirements/active/REQ-002-003-009-assessment/BASELINE-BLUEPRINT-IMPLEMENTATION-PLAN.md).
