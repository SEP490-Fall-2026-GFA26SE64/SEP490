# REQ-001/002 — Cluster 4 evidence synchronization

Date: 2026-10-23, Asia/Bangkok. Product HEAD: 480b890352e26612d1991aab4e098724ce68ac41 plus uncommitted scoped changes. The user approved Cluster 4 and the C3-UI-01 shared-header repair. The runtime repair was compiled/built before the affected previously approved executable scope was rerun; evidence synchronization followed. Cluster 5, commit and push remain unapproved.

The visible flow remains Role selection → full Occupation baseline when required → PostgreSQL result/profile/history → safe Employee views. This update records executed behavior and limitations; it changes no business contract.

## Current executable result

| Evidence level | Pass | Fail | Final skipped | Provenance |
| --- | ---: | ---: | ---: | --- |
| JUnit unit/function/API | 62 | 0 | 0 | Carried from dated Cluster 3 targeted executions |
| Vitest components/hooks | 26 | 0 | 0 | Carried from dated Cluster 3 targeted executions |
| Real-adapter integration | 34 | 0 | 0 | Carried from dated Cluster 3 disposable Testcontainers |
| Playwright baseline journeys | 6 | 0 | 0 | All six rerun after repair on fresh isolated fixture |
| Playwright shared-header matrix | 3 | 0 | 0 | Employee B, L&D and Admin; each checks 6 widths × 2 languages |
| **Current unique identities** | **131** | **0** | **0** | Latest result per identity across targeted runs |

This is not a single 131-test invocation, a complete execution of all adaptive-plan branches, a performance pass or production acceptance. The 36 actor/width/language combinations are assertions within three tests, not 36 additional test cases. The original dated Cluster 3 result remains **127 Pass/1 Fail/0 final skipped**; its failed screenshot, trace, logs and JSON have not been overwritten.

- [Unit/function receipt](../unit/REQ-001-002-cluster3-execution.md): Function/acceptance IDs, actors, fixtures, files and observed assertions.
- [Integration receipt](../integration/REQ-001-002-cluster3-execution.md): exact SQL/graph methods, tenant/actor boundaries, no-write digests, rollback/race/legacy coverage.
- [Original system receipt and RB/VB/MM mapping](REQ-001-002-cluster3-execution.md): six journey titles and original outcomes.
- [Current per-case results](../../../../../.tools/cluster4/20261023/case-results.json), [current command ledger](../../../../../.tools/cluster4/20261023/commands.json), [current source/fixture hashes](../../../../../.tools/cluster4/20261023/fixture-manifest.json).
- [Original C3 ledger](../../../../../.tools/cluster3/20261023/commands.json), [original per-case results](../../../../../.tools/cluster3/20261023/case-results.json) and [original fixture hashes](../../../../../.tools/cluster3/20261023/fixture-manifest.json).

## C3-UI-01 / MM05 — repaired and verified

Before: Employee B, Target Roles VI at 390×844, document width 538px; right header controls reached 537.828125px. After: the unchanged width assertion passes at 390px. The shared header retains brand/sidebar navigation, Home/My Learning, search, Help, EN/VI, notifications and account controls.

Runtime scope is three existing shared frontend files: WorkspaceLayout.tsx adds employee/search layout hooks; WorkspaceLayout.css gives narrow layouts explicit rows and a shared header-height variable used by the sticky sidebar; NotificationDropdown.tsx adds a panel hook so the mobile panel stays within the viewport. Mobile Employee uses three rows, other actors two; tablet Employee search uses a second row; desktop retains the existing single row. Fonts, tokens, API/authorization and stored learner state are unchanged.

The original spec assertion was not weakened. Both screenshot destinations now use test.info().outputPath. R04 still used the old hardcoded My Mastery desktop destination and overwrote that passing C3 image; the original passing image is unavailable. The failed mobile screenshot/trace and original reports/logs remain preserved. [Provenance correction and executed-source snapshot](../../../../../.tools/cluster4/20261023/artifact-provenance.md) distinguish the R04 image and the post-run path-only edit; no additional pass is claimed for that edit. Added [header spec](../../../frontend/system-tests/REQ-001-002-header-responsive.spec.ts) and [isolated output config](../../../frontend/playwright.role-baseline-header.config.ts) verify:
- Employee B / Org A, L&D / Org A and Admin / Org A; trusted persona session only.
- Widths 320, 390, 640, 768, 1024 and 1280; height 844; EN and VI at each width.
- Every visible header button/link/input stays horizontally inside the viewport and vertically inside the header.
- Account opens using keyboard Enter; account and notification panels fit the viewport.
- Employee document width fits; global search navigates with its query; Home/My Learning retain their destinations.
- No baseline/Draft/selection/profile mutation is performed by the header matrix. The separate six baseline journeys intentionally mutate only the new test fixture.

[Actual 9-test browser report](../../../../../.tools/cluster4/20261023/playwright.json), [browser log](../../../../../.tools/cluster4/20261023/playwright.log), [screenshots and layout attachments](../../../../../.tools/cluster4/20261023/playwright-artifacts/). Employee and L&D mobile screenshots were opened for visual inspection; this is not a separate manual-interaction test pass. Non-Employee page-body responsiveness beyond the shared header is outside this repair.

Build R01 and lint R02 passed. Vite reports existing large chunks; oxlint reports an existing set-state-in-effect warning at WorkspaceLayout.tsx:507. Neither warning is reported as a new test failure. Build/lint do not contribute executable case counts.

## Acceptance status and remaining branches

RB01–17, VB01–04 and MM01–05 retain their confirmed expectations and the concrete file/method mappings in the three execution receipts. All their executed assertions now pass, including MM05 after repair. Mapping an acceptance ID to a passing case does not certify every possible branch or production integration.

The 39 older adaptive-plan IDs require the following bounded interpretation. “Partial” means executed subcases passed but the entire planned row is not certified. U/I/S refer to the unit, integration and system receipts linked above; exact methods/reports/commands are in the linked JSON.

| ID | Current evidence / status | Remaining limitation |
| --- | --- | --- |
| AB-C01 | Partial — U full union; I current graph deduplication/scoping | Entire reviewed role/item/publication eligibility matrix unverified |
| AB-C02 | Partial — U bounds; I infeasible versus missing availability | Exhaustive coverage/capacity/model-bound combinations unrun |
| AB-C03 | Pass for executed name/Unicode/integer/time cases, U/FE | No production content validation claim |
| AB-C04 | Partial — FE exact seconds, clear/re-entry/version switching | Every calculation/rounding interaction not certified |
| AB-C05 | Partial — I preview/list digest; FE preview invalidation | Exhaustive preview dependency/concurrent revision cases unrun |
| AB-C06 | Pass for I activation replay/race/receipt rollback | Local eligibility/manager ports remain provisional |
| AB-C07 | Partial — U deny-before-query; I scoped grants; S wrong actor | Entire management endpoint/production Identity matrix unrun |
| AB-C08 | Not run — complete post-activation Catalog-drift scenario | Requires an independently versioned drift fixture |
| AB-C09 | Pass for I sole-Draft revision/concurrent creation | Provisional owner ports remain |
| AB-C10 | Partial — FE unchanged Save and exact retry | Entire server stale-no-op/receipt matrix unverified |
| AB-C11 | Partial — FE pending/known-commit GET retry/exact ambiguous retry | Exhaustive invalid-form focus and every pending action unrun |
| AB-C12 | Partial — S release replacement; FE stale/confirmed identity | Every cancel/concurrent-current-change branch unrun |
| AB-C13 | Partial — I/S deactivation preserves old attempts and denies starts | Catalog-outage plus every replay branch not separately certified |
| AB-C14 | Partial — FE identified v1/v2/Draft and S old-version pins | Complete Retiring/count/final-terminal projection unrun |
| AB-C15 | Partial — I literal wildcard/bounds/tenant/no-write listing | Exhaustive Unicode/date ties/filter combinations unrun |
| AB-C16 | Partial — FE preview invalidation | Direct Inactive reactivation matrix unrun |
| AB-C17 | Not run — explicit legacy-format conversion race/rollback | Fresh fixtures do not certify conversion |
| AB-C18 | Not run — populated-deployment forward-upgrade fixture | Fresh V1–V26 migrations/legacy readers do not certify upgrade |
| AB-C19 | Partial — I scoped empty/history Catalog-outage/no-write; U safe errors | Every DB failure/concurrent snapshot branch unrun |
| AB-C20 | Partial — S shared-header EN/VI/mobile; FE settings/version UI | Entire management page copy/responsive matrix unrun |
| AB-A01 | Pass for U/I/S Role retained with NO_BASELINE | No downstream gap/pathway integration certification |
| AB-A02 | Partial — U full versus legacy scope; I/S whole scope | Every Role/direct-entry/individualized sequence combination unrun |
| AB-A03 | Partial — I replay/resume/deadline pins | Exhaustive concurrent start/reload ordering unrun |
| AB-A04 | Pass for I concurrent answer winner, stale/replay/body conflict | Reference technical fixture only |
| AB-A05 | Partial — U boundary and I expired-answer/worker invalidation race | Every sufficient-evidence deadline completion branch unrun |
| AB-A06 | Pass for U/I/S early MANUAL invalidation, no mastery, linked replacement | Confirmed behavior supersedes old reject-and-continue wording |
| AB-A07 | Partial — I/S no same-Occupation retake; independent profiles | Every second-Occupation start/catalog change combination unrun |
| AB-A08 | Pass for I deactivate/start race and S existing pins after v2/deactivation | Production publication admission remains an owner dependency |
| AB-A09 | Partial — U legacy scope; I original legacy result subset | Full legacy in-progress resume/answer/finalize upgrade journey unrun |
| AB-A10 | Not run — legacy-current admission cutover/replay matrix | Separate upgrade fixture required |
| AB-A11 | Partial — I/S linked replacement retains original chain version | Rollout/dual-reader matrix unrun; old current-version expectation superseded |
| AB-S01 | Partial / Blocked — exact formula and structural invariants pass | Independent theta/SE golden oracle/version/tolerances absent |
| AB-S02 | Partial — I atomic rollback/replay and durable local outcome | Actual REQ-041 consumer delivery/BKT deduplication unverified |
| AB-R01 | Partial — U/I/S own/foreign/result/review boundaries | Every protected-field and nonterminal variant unrun |
| AB-R02 | Pass for I legacy original subset/names and full profile/result provenance | No new-catalog substitution or production review claim |
| AB-R03 | Partial — I/S original result/version/history/replacement links | Every legacy/later-learning combination unrun |
| AB-R04 | Partial — U/FE safe empty/error/retry; I foreign results | Exhaustive DB failure/nonterminal matrix unrun |
| AB-R05 | Partial — I authorized/denied repeated-read no-state-change digests | Concurrent read/finalization snapshot matrix unrun |
| AB-K01 | Not run — current scoped calibration promotion lifecycle | Historical production-boundary tests do not certify new promotion |

QBI-01–07, calibration Session2 C1/C2, operational D/DEMO matrices have no new blanket passing status. Particular gate/unknown-persona/actor checks appear in existing receipts; importer, fitting/promotion, pilot readiness and owner integrations remain outside this execution. Performance is **Blocked/Not run**: no approved cardinalities, workload/concurrency/duration, environment or percentile/pass thresholds. No benchmark result is claimed.

## Environment, preservation and reproducibility

Same Java 21/Node 24/Vitest 5.0.2/Playwright 1.63.0/Chrome/Docker toolchain as the C3 receipt. Runtime images are the existing req001002-c3-backend:20261023 and req001002-c3-20261023-web:latest; frontend source is bind-mounted. Image IDs, volume labels, before/after inventories and source hashes are retained in the artifact root.

At intake the old C3 test containers and named volumes were absent. A read-only inventory and attempted start confirmed this; the previous receipt records what existed at its execution time, not the current state. Fresh project req001002-c4-20261023 uses new project-owned postgres_data/neo4j_data and ports 28088/28080/25432/28474/28687. Existing test images were reused; startup runs the configured local-only seed on the fresh database. No existing learner data was reset/imported/re-scored. The six journeys recreate only their new v1/Draft/v2 fixture. After capture the new test project is stopped, volumes/history retained.

Main containers are compared with this turn's before inventory, not stale C3 IDs. Main Compose was not started/stopped/recreated. Workspace user deletions, existing test work, stash and backups are preserved; index remains unstaged. Only the three shared runtime files, affected tests/test-output config, testing documentation and coordination companions belong to this follow-up. No backend/schema/migration/seed/dependency change.

Design conflict remains recorded: older DESIGN_SYSTEM.md typography differs from repository AGENTS/live tokens; the repair reuses existing token/font/component styles and introduces no replacement scale. Older testing README ordering and AB-A06/A11 expectations yield to the confirmed Role-first/early-invalidated/original-chain contract; superseded dated evidence remains readable.

Final [evidence audit](../../../../../.tools/cluster4/20261023/final-validation.json): 0 broken local links, 0 missing reports, 0 unexpected C3 fixture drift, 4 main containers unchanged, git diff --check exit0 and 0 staged files. The only original test-file hash change is the documented screenshot destinations.

## Manual rerun and next gate

For a fresh isolated fixture only: open http://127.0.0.1:28088/employee/target-roles using the configured Employee persona, set 390×844, choose VI, open/close account and notifications, type Security in global search and submit. Expect document width 390, all controls reachable, panels within the viewport and query-preserving navigation. Repeat shared-header checks for L&D/Admin and desktop; this procedure is not another recorded pass.

Use the [Vietnamese guide](../../../../../s2%20work/Test%20Guides/REQ-001-002-cluster3-rerun-guide.md) and R01–R06 ledger. The full baseline suite requires a fresh fixture: do not rerun its stateful bootstrap on the retained completed project. Do not delete volumes/reset histories to make a rerun pass.

Cluster 4 synchronization is complete for this scope after the linked artifact/link/diff audit. Independent numerical/performance streams and production Identity/catalog/publication/model/pilot/later-learning/REQ-041/pathway dependencies remain open. The same-role response-indicator and payloadVersion2 downstream-decoder owner findings remain separate. Next is explicit approval for Cluster 5 synchronization review; no automatic transition or commit.
