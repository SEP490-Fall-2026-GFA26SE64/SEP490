# Configure Baseline Assessment

## Current scope

**Function:** REQ-002-F02. **Actor:** L&D Manager. **Status:** Occupation-scoped authoring and its total/percentage/EN-VI UX are implemented and executable-tested on the local opt-in boundary as of 2026-10-16.

L&D selects one Occupation, sees every current TargetRole in it, and configures one logical baseline blueprint for that Occupation. Counts and score weights remain detailed per role, skill and difficulty. Setting all counts of a role to `0` keeps the role visible in history but excludes it from coverage, generation and scoring.

```text
select Occupation
  -> load all roles and resolved skills
  -> enter a role total and explicitly distribute it across skill/difficulty cells
  -> optionally adjust detailed counts and percentage weights
  -> validate exact catalog membership and aggregate coverage
  -> save a new immutable blueprint version
  -> generate exact no-repeat manifest
  -> review exact content hash
  -> publish
```

This function does not execute Employee attempts, calculate mastery/gaps, edit the catalog, or configure RIASEC.

## Confirmed UX and language behavior — implemented and tested (2026-10-16)

The user approved this frontend-only change and its executable-test gate on 2026-10-16. Detailed counts remain the saved source of truth and score weights remain decimal `0..1` on the wire; no API, persistence, migration or backend-policy change was made.

- Each role exposes a `Total questions` helper. Applying it deterministically distributes that total as evenly as possible across the role's skills and Easy/Medium/Hard buckets; the user may then override individual counts.
- Applying total `0` clears every detailed count and weight for that role. Manual changes after distribution recompute the displayed total but do not silently redistribute other cells.
- Auto-distribution also initializes score weights from each difficulty's share of the role total. The UI displays and accepts `0..100%` (for example `40`), while the API mapper sends `0..1` (for example `0.4`). Used difficulty weights total exactly `100%`; an unused difficulty remains `0%`.
- Role panels expand/collapse independently so multiple roles may remain open. Opening one role does not close another.
- This screen must participate in the existing global English/Vietnamese language switch. Static labels, validation, empty/error states, coverage messages, buttons, badges and dynamic toast content require both languages; changing language must preserve unsaved form state.

Allocation rule: first balance the requested total across Easy/Medium/Hard with a difference of at most one; then balance each difficulty total across skills with a difference of at most one, rotating the remainder start across difficulties. Catalog order is the deterministic tie-breaker. Distribution occurs only after an explicit Apply action so typing a new total does not unexpectedly overwrite manual edits.

The editor shows all weights as `0%` for a zero-question role. The existing backend domain nevertheless requires every persisted role's three wire weights to total `1`, before its later participation check ignores zero-question roles. To preserve the approved frontend-only scope, the request boundary sends compatibility decimals `0.3334/0.3333/0.3333` only for an excluded role and normalizes those values back to visible zeros when loading it. These compatibility values never create coverage demand, generated items or score contribution; participation remains derived from detailed counts.

## Input and trusted context

| Input/context | Source | Rule |
| --- | --- | --- |
| Actor and organization | Trusted server-side identity context | Active L&D Manager only; never accepted from request payload. |
| Occupation | Catalog selection | Stable ID/name, active and available in actor scope. |
| Blueprint name | L&D input | Required; revisions may rename without changing logical identity. |
| Role rows | Derived from Occupation | Exactly every current `HAS_ROLE` role; no omission or injection. |
| Skill rows | Derived from each role | Union of active `HAS_LEVEL -> REQUIRES_SKILL` MicroSkills by stable ID. |
| Counts | L&D input | Non-negative exact Easy/Medium/Hard counts per role/skill. |
| Weights | L&D input | Per role+difficulty; only used difficulty buckets participate for a non-zero role. |

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
3. For a non-zero role, a zero-count difficulty has weight `0`, and weights of used difficulties total `1`. A zero role displays zero weights; its wire-only compatibility weights are ignored by participation, coverage, generation and scoring.
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
| Occupation missing/inactive/unavailable | Reject without a new version. |
| Role/skill set differs from catalog | Reject with validation details; do not silently repair input. |
| A role has no resolvable skills | Reject as catalog-not-ready. |
| Aggregate published coverage is insufficient | Return every shortage; never reuse items or lower counts. |
| Catalog/database dependency fails | Return dependency failure and preserve the latest saved version. |
| Stale revision or reviewed-hash mismatch | Return conflict; no partial version/publication state. |

## Runtime boundary

- PostgreSQL Flyway V13 adds the logical `baseline_blueprint` identity and one non-null Occupation per blueprint while retaining legacy null identities.
- The local opt-in Neo4j adapter reads active `Occupation -> TargetRole -> Level -> MicroSkill`, unions skills across Levels and exposes L&D list/detail APIs.
- The frontend calls those APIs first. In development only, defined unavailable responses may use the isolated fixture; production receives no fixture fallback.
- Production Identity authorization and Catalog tenant visibility, approval/publication and release-snapshot contracts are not yet integrated. The local adapter must not be treated as production-ready.
- Employee attempt/result, scoring/evidence/mastery and RIASEC remain separate functions.

## Acceptance and evidence

The accepted behavior is mapped and executed in [REQ-002-F02 testing](../../testing/REQ-002-F02-baseline-authoring.md). The 2026-10-15 backend evidence remains 24/24 scoped, PostgreSQL 4/4, Neo4j Occupation adapter 3/3 and full backend 174/174. For the 2026-10-16 UX/i18n delta, scoped frontend passed 16/16, full frontend regression passed 46/46, production build passed, lint exited 0 with unrelated existing warnings, and Compose/Playwright passed 1/1.

The detailed implementation boundary and remaining dependencies are tracked in the active [.project implementation plan](../../../../../.project/requirements/active/REQ-002-003-009-assessment/BASELINE-BLUEPRINT-IMPLEMENTATION-PLAN.md).
