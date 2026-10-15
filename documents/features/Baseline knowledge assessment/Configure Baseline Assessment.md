# Configure Baseline Assessment

## Current scope

**Function:** REQ-002-F02. **Actor:** L&D Manager. **Status:** Occupation-scoped authoring is implemented and executable-tested on the local opt-in boundary as of 2026-10-15.

L&D selects one Occupation, sees every current TargetRole in it, and configures one logical baseline blueprint for that Occupation. Counts and score weights remain detailed per role, skill and difficulty. Setting all counts of a role to `0` keeps the role visible in history but excludes it from coverage, generation and scoring.

```text
select Occupation
  -> load all roles and resolved skills
  -> enter Easy/Medium/Hard counts and weights
  -> validate exact catalog membership and aggregate coverage
  -> save a new immutable blueprint version
  -> generate exact no-repeat manifest
  -> review exact content hash
  -> publish
```

This function does not execute Employee attempts, calculate mastery/gaps, edit the catalog, or configure RIASEC.

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
3. For a non-zero role, a zero-count difficulty has weight `0`, and weights of used difficulties total `1`.
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

The accepted behavior is mapped and executed in [REQ-002-F02 testing](../../testing/REQ-002-F02-baseline-authoring.md). On 2026-10-15 the scoped backend suite passed 24/24, PostgreSQL integration 4/4, Neo4j Occupation adapter 3/3, full backend regression 174/174, scoped frontend 9/9, full frontend 39/39, and Compose/Playwright 1/1.

The detailed implementation boundary and remaining dependencies are tracked in the active [.project implementation plan](../../../../../.project/requirements/active/REQ-002-003-009-assessment/BASELINE-BLUEPRINT-IMPLEMENTATION-PLAN.md).
