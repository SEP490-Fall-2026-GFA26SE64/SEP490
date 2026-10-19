# Configure Baseline Assessment

## Current scope

**Function:** REQ-002-F02. **Actor:** L&D Manager. **Status:** Local/demo Blueprint configuration and assessment creation implementation complete. FE, full BE and V17 PostgreSQL tests passed on 2026-10-19; management Compose/browser lifecycle and command concurrency still need verification. Production Identity and Catalog contracts remain open.

L&D selects one Occupation, sees every current TargetRole in it, and configures one logical baseline blueprint for that Occupation. Counts and score weights remain detailed per role, skill and difficulty. Setting all counts of a role to `0` keeps the role visible in history but excludes it from coverage, generation and scoring.

```text
open Baseline Assessments
  -> select an authorized Occupation workspace
  -> load all roles and resolved skills
  -> load current published question capacity
  -> start or resume the one working Blueprint revision
  -> enter a feasible role total and explicitly distribute it across skill/difficulty cells
  -> optionally adjust detailed counts and linked percentage weights
  -> validate exact catalog membership and aggregate coverage
  -> finalize a new immutable Blueprint version
  -> generate and edit the sole assessment Draft
  -> review the exact content hash
  -> publish and atomically switch the active assessment
```

This function does not execute Employee attempts, calculate mastery/gaps, edit the catalog, or configure RIASEC.

## Confirmed management lifecycle — implemented 2026-10-17

- The L&D sidebar uses the noun `Baseline Assessments` / `Đánh giá đầu vào`. The landing lists authorized Occupations; entering an Occupation opens Blueprint Versions directly. The workspace has only Blueprint Versions and Assessment Versions tabs, both with reloadable resource URLs; the former Overview tab is removed.
- One organization + Occupation owns one baseline release line. It may have one active assessment and one open candidate at the same time, but never two active assessments or two open candidates.
- Only one pending change chain is allowed: an open Blueprint working revision, a finalized pending Blueprint, or an assessment candidate blocks starting another Blueprint revision until publish or explicit abandonment.
- A Blueprint working revision is the only mutable Blueprint representation. Repeated Save uses an expected revision, stays in the editor, and appears as a resumable `Saved` row in the Blueprint list. Finalize creates a new immutable Blueprint version, shows a confirmation with `Create assessment now`, and leaves that action available on the candidate list.
- Generate consumes the pending Blueprint and creates the sole assessment `DRAFT`. Draft title/order edits use an expected draft revision and recompute the manifest hash.
- Review locks the exact content hash. A reviewed candidate is immutable; correction creates a replacement Draft transactionally rather than editing reviewed history.
- Publish requires the reviewed hash and atomically changes the active pointer. The former active definition remains immutable and is projected as `SUPERSEDED`.
- Restore clones a historical assessment into the sole Draft. It does not edit history or remove the current active assessment before the restored Draft is reviewed and published.
- Disable clears the active pointer for new Employee attempts while preserving the assessment and transition history. Behavior for already-started attempts remains owned by the Employee assessment contract.
- Abandon closes the current pending chain without deleting its definitions or audit history.
- The normal management manifest includes prompts and learner-safe response schema only. Protected answers are fetched through a separate audited, `no-store` endpoint and held only in ephemeral UI state. This reveal path is local/demo only until Person 1 supplies production authorization and separation-of-duty policy.

## Confirmed capacity, weight and language behavior

Detailed counts remain the saved source of truth and score weights remain decimals `0..1` on the wire. The capacity endpoint is a read model only: it returns current published counts and never question content or answer material.

The UI accepts score weights as whole percentages only and has no drag slider. Committing the first field distributes the remainder as evenly as possible while preserving `Easy < Medium < Hard`. A subsequent field commit preserves the previously committed field and derives the third field so the total stays exactly `100`; for example, Hard `40` followed by Medium `35` produces Easy `25` without changing Hard.

- Catalog detail and capacity load independently. Apply/Save is available only when capacity belongs to the selected Occupation and catalog version. A failed refresh keeps the unsaved draft and offers Retry.
- A role with `N` MicroSkills accepts total `0` or a feasible value in `[3 × N, feasibleMax]`. `feasibleMax` subtracts demand already assigned by other roles sharing the same MicroSkill pool.
- Explicit Apply first reserves one Easy, one Medium and one Hard question for every MicroSkill, then distributes the remainder deterministically without exceeding any cell capacity. Typing the total alone does not overwrite detailed counts.
- Manual cell edits update the displayed total without redistributing other cells. Each participating cell must be an integer `>= 1`; per-cell and aggregate shared-pool shortages are shown before Save.
- Applying total `0` clears every detailed count and displayed weight for that role. The role stays visible and stored but does not participate in coverage, generation or scoring.
- Applying a participating role initializes `Easy 20% / Medium 30% / Hard 50%`. Counts do not derive score weights.
- Three whole-percentage inputs edit one linked weight state without sliders. The invariant is `Hard > Medium > Easy >= 1%` and total exactly `100%`. The first committed field distributes the remainder; the next committed field preserves the previous value and derives the third field deterministically.
- Non-canonical input such as `040`, empty text, any fractional percentage or a value with no feasible linked solution remains visible and reports an inline error on blur/Enter. Native number spinners are not used.
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

- One organization-scoped release line per Occupation with one logical Blueprint identity, immutable Blueprint/assessment history, one optional pending chain and one optional active pointer.
- A mutable working revision until Finalize; successful Finalize creates a new immutable Blueprint version.
- Occupation, role and skill ID/name snapshots for historical display.
- Role totals; a total of `0` is stored but produces no questions or score.
- Structured coverage shortages with role, skill, difficulty, required, available and missing counts.
- An immutable generated manifest containing pinned item versions, role attribution, score contribution, seed and content hash.
- Review/publication metadata for the exact hash. Responses never expose `protected_key` or answer-key material.
- Management summaries and deep-linkable detail resources. Protected answers, when explicitly revealed in local/demo, use a separate audited response that is never merged into the shared manifest DTO.

## Rules

1. A version contains all and only the Occupation's current roles and each role's resolved skills.
2. At least one role must have a total greater than `0`; all-zero configurations are rejected.
3. Every MicroSkill in a participating role has at least one Easy, Medium and Hard question. Its weights total `1` and satisfy `hard > medium > easy >= 0.01`. A zero role displays zero weights; its wire-only compatibility weights are ignored by participation, coverage, generation and scoring.
4. Zero roles still pass catalog membership validation but skip coverage, generation and scoring.
5. Shared skill+difficulty demand is aggregated across participating roles; generation never repeats an item version.
6. Save/revise and generation are idempotent. Reusing a key with different content or revising a stale version returns conflict without partial persistence.
7. Working Blueprint Save updates the same revision; Finalize creates immutable history. Review freezes the exact assessment header and manifest; publish requires the reviewed hash and published content remains immutable.
8. Catalog changes never rewrite history. A new revision resolves current membership and snapshots it again.
9. At most one pending chain, one open assessment candidate and one active assessment exist for an organization + Occupation. Active and open candidate may coexist.
10. Draft content is editable; reviewed, published, superseded, disabled and abandoned definitions are immutable history. Post-review correction and restore always clone.
11. Publish switches the active pointer in the same PostgreSQL transaction as the transition audit. Disable/abandon clear pointers without deleting history.
12. Actor and organization come from trusted server context. Existence checks are organization-scoped. Production exposes neither management nor protected-answer routes until production Identity/Catalog authorization is integrated.

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
| Another pending Blueprint/assessment chain exists | Return a navigable conflict; resume or abandon the existing chain instead of creating another. |
| Reviewed content needs correction | Create a replacement Draft and close the reviewed candidate atomically; never mutate reviewed content. |
| Historical version is restored | Clone it into the sole Draft; keep the active assessment unchanged until a later publish. |
| Active version is disabled | Prevent selection for new attempts and preserve history; do not decide the fate of already-started attempts in this Function. |
| Protected answers are requested | Local/demo authorization is checked, the tenant-scoped reveal is audited, the response is `no-store`, and normal manifests remain answer-safe. |

## Runtime boundary

- PostgreSQL Flyway V13 adds the logical `baseline_blueprint` identity. V14 adds organization-scoped series coordination, working revisions, open/active pointers, transition history, draft revisions and uniqueness guards. V15 adds immutable actor-scoped management command receipts. V16 adds append-only protected-answer reveal audit. V17 corrects the cross-table management-actor trigger without rewriting the applied V14 migration.
- The local opt-in Neo4j adapter reads active `Occupation -> TargetRole -> Level -> MicroSkill`, unions skills across Levels and exposes L&D list/detail APIs.
- `GET /api/v1/ld/baseline-blueprint-catalog/occupations/{occupationId}/capacity` joins that Occupation scope with current PostgreSQL published coverage through application ports. `coverageAsOf` is the application read-completion time, not a production catalog snapshot.
- The frontend calls those APIs first. In development only, defined unavailable responses may use the isolated fixture; production receives no fixture fallback.
- Production Identity authorization and Catalog tenant visibility, approval/publication and release-snapshot contracts are not yet integrated. The local adapter must not be treated as production-ready.
- Employee attempt/result, scoring/evidence/mastery and RIASEC remain separate functions.
- Management write transactions are applied by an infrastructure wrapper so the application core remains framework-independent. The lock order begins with the organization + Occupation series coordination row; child definitions and transition/command history follow inside the same transaction.

## Acceptance and evidence

The accepted behavior is mapped in [REQ-002-F02 testing](../../testing/REQ-002-F02-baseline-authoring.md). Historical 2026-10-16 slider/legacy-route tests describe the former UI. On 2026-10-19 the current FE regression passed 83/83 and built; full BE regression passed 204/204, including disposable PostgreSQL V17 actor isolation. The current Compose/Playwright lifecycle, broader concurrent command handling and production adapters remain unverified.

The corrective local matcher/CSRF slice makes the management path reachable. Manual Step 3 found the cross-table actor-trigger defect; V17 fixed it. The 2026-10-19 Cluster 2 run below verifies the matcher and trigger on the local/demo boundary.

Remaining dependencies and verification gates are tracked in [REQ-002-F02 open gates](../../../../../.project/requirements/active/REQ-002-003-009-assessment/REQ-002-F02-OPEN.md).
