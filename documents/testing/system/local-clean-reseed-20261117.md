# Local clean reseed — 2026-11-17, R1/R2

Historical preflight status (before R2 approval): **Blocked before destructive reset**. User approved R1 backup + isolated rehearsal + reset/import only after readiness validation. Main local business data has **not** been cleared or reseeded. Main API was temporarily stopped for consistent backup and resource isolation, then restarted on its original shared-skill-scope image. No migration/schema change, application code edit, commit, push, real payment or external email operation.

## Approved target

Preserve existing ld/expert/employee @workspace.dev.invalid account IDs, credentials and legitimate credential state. Add Organization Administrator and Platform Administrator login accounts; retain one non-login technical publisher only for explicit seed provenance. One organization,5departments/5JobPositions,48TargetRoles/144memberlevels/472competencies,79Skills/270modules/711synthetic questions and2certificate reference definitions. No Employee Role selection, baseline, pathway, learning progress, papers, mastery or achievements. Active valid Baseline/Skill policies:3questions/group,2correct required,60seconds/question,3attempts,600seconds between attempts,no automatic reset.

Sources: ontology_dataset.xlsx catalog identities; maintained ontology_seed-prerequisite-knowledge.json; development-complete-release.json and source markdown; knowledge-question-bank.json; application-developer-certificates.json. UUID JobPosition mapping is explicit and traceable to sourceId/code. Full import artifacts/private credentials live in ignored `local/clean-reseed-20261117/`; no secrets included here.

## Actual checks

| Check | Result |
| --- | --- |
| Required field/type/nullability inventory | Passed against exact current PostgreSQL schema |
| Graph source references/unique IDs | Passed:1025nodes/4765edges including departments/certificate definitions |
| Module/content coverage | Passed:270documents+270contents; source lessons need no uploaded asset objects |
| Question coverage | Passed:711questions,3per79Skill×3knowledge levels; distinct4options and valid answer mapping |
| Restore current schema69 and clean import into isolated stores | Passed; main remained unchanged |
| Login for5human roles on isolated real API | Passed |
| Baseline configuration directory / active policy readiness | **Failed/Blocked**:503, Neo4j5second transaction deadline; no policy versions activated |
| Skill policy completeness | Not run after Baseline blocker |
| Employee full UI desktop/mobile | Not run after readiness blocker; reproducible readonly spec prepared |
| Main reset/import | **Not run** |

Early isolated import errors (nondeferrable intent/order cycle, organization enum values and exact payment expiry) were corrected using the existing schema/state sequence, not disabling constraints. Failed transactions rolled back. Demo entitlement uses DEV_BYPASSED, no paid amount/provider receipt/claim of real payment. Initial API memory256MB and later512MBheap tests both exposed the catalog read deadline. Graph memory limit was raised only for the isolated instance, not main. Redundant serialized legacy Role aggregates were removed from the prepared graph; authoritative hierarchy edges remain. Isolated owned-scope indexes were added and raw HTTP query measurements after warmup were0.31s/0.53s; standalone same-container Bolt query returned79Skills in1809ms,290ms,131ms. Full API discovery still failed, sometimes masked by rollback `Transaction must be open, but has already been closed`. No application timeout was increased and no API code fix has been authorized.

Logs retained under `/tmp/sep490-clean-reseed-20261117/`: apply-isolated*.log, configure-isolated*.log, api-isolated-full.log, thread-sample-full.log, bolt-probe.log, backup.log. These record actual intermediate failures; no blanket pass/full-platform claim.

## Backup and storage

`local/clean-reseed-20261117/backup-before-reset/`: custom PostgreSQL dump, offline compressed Neo4j data archive and MinIO data archive. Archive catalogs/listings verified readable; private backup-complete.json records lengths and SHA256. Main Flyway workspace prefix remains69, no repair/renumber/reset. Backup directory700/files600, outside tracked documentation.

Private application bucket contains147oldobjects, read-only inventoried. No object was deleted. Automatic approval rejected an optional new host-port MinIO proxy as broadening sensitive storage access. It was not created. A safer internal-only Java helper reuses the existing MinIO container network namespace, exposes no host port, mounts only its compiled class read-only, and signs requests in the operator process; internal read-only listing succeeded. Deletion remains gated by successful rehearsal plus complete backup and has not run.

## Next gate

Proposed R2: investigate/fix the bounded catalog read path, retain coherent snapshot, exact scope/hash output, authorizations and business limits; validate complete policy coverage and real UI before executing R1 reset. This adds application code work excluded by R1 and requires explicit user approval. If deferred, retain current local data and the private preparation artifacts. Do not mark rehearsal passed or reset first to bypass the gate.


## Approved R2 and actual cutover — 17 November, follow-up

R2 was explicitly approved to repair catalog reads and then continue R1. Raw bounded graph records are materialized within one read transaction; scope construction/JSON hashing runs after that transaction closes. Explicit property projections avoid loading unrelated catalog aggregates. Organization, Expert assignment, scope identity, readiness, five-second budget and capacity guards remain. No new dependency, migration or assessment business-rule change.

Focused backend run: 31 tests, zero failures/errors/skips across PolicyCatalogSnapshotTest, SharedSkillScopeTest, SharedSkillAttemptsTest, SharedSkillScopeHttpTest and IndependentSkillFlowTest. Actual isolated API: all five human roles authenticated; all 144 Baseline and 235 Skill configurations active. Frozen SQL imported successfully into a second isolated PostgreSQL instance. Real API-backed Playwright desktop/mobile: one scenario passed (46.6s); no learner writes. Logs: configure-final.log, replay-import-ready.log, browser-isolated-ready.log under the temporary evidence directory above. These supersede the initial readiness blocker for the rehearsal only.

After passing those gates, a fresh complete three-store backup was taken in ignored `local/clean-reseed-20261117/backup-at-cutover/`. R1 main reset/import **executed successfully**, followed by `verify_store.py --main`: original three credentials preserved; 6 identities (5 human logins, 1 inactive non-login publisher); 1 organization, 5 departments/job references, 48 Roles, 144 Role levels, 472 competencies, 79 Skills, 270 modules/contents, 711 questions, 379 policies/scoped activations, 2 certificate references. Employee selection, papers, progress, pathway and achievements empty. 147 old MinIO application objects deleted after backup; listing returned zero. No volume removal or new migration. Main API updated to compatible image `clean-reseed-r2-final-20261117`, with development bootstrap disabled.

**Post-cutover validation remains incomplete.** Main Baseline directory returned 503 at the five-second graph deadline; browser main run failed loading. Neo4j and API subsequently exhausted memory; retained health-check shell processes further increased pressure. Two services are being restored using existing configuration. A proposed aggregation query did not improve the main runtime and was reverted without deployment; the deployed image retains flat bounded record projections. Do not claim main UI/API readiness from isolated passing evidence. Main data was already reset; do not repeat reset to address service performance.

Current logs: main-import.log, main-store.log, main-assets-clean.log, main-api-update.log, main-api-verification*.log, browser-main.log and flat-final-unit.log. Initial architecture checks retain two known pre-existing failures; this is not a full-platform/production certification.


## Final main verification after recovery

After the user freed host memory and stale Neo4j health-check subprocesses were cleared, both services recovered with their existing configuration. The main API image remains `clean-reseed-r2-final-20261117`; neither the unsuccessful aggregation experiment nor scan hints were deployed. Source likewise retains the verified flat bounded projections. No repeated reset, migration, new index or timeout increase was used to resolve this resource incident.

| Acceptance check | Final actual result |
| --- | --- |
| PostgreSQL/Neo4j store coverage, original credential fingerprints, zero learner outcomes | **Passed**, main-store-restored.log / private main-store-verification.json |
| All five real account logins | **Passed**, main-api-after-free.log |
| Main policy directory + scoped active versions | **Passed**, 144 Baseline + 235 Skill, active version 1 |
| Employee selection null, profile empty, 79 Skills, modules unstarted | **Passed**, main-api-after-free.log / private main-api-report.json |
| Scope/hash equivalence | **Passed**, all 379 exact stored hashes matched independent discovery; private catalog-hash-verification.json |
| Main real frontend, desktop1440/mobile390 | **Passed**, browser-main-after-free.log: one scenario, 2.2 minutes total; screenshot inspection passed both widths, no horizontal overflow |
| Learner mutation / page errors / scoped failed API responses during browser flow | **Passed**, explicit zero assertions; auth is the sole allowed write |
| Focused unit/API regressions | **Passed**, 31 tests, zero failure/error/skip; flat-final-unit.log and scan-unit.log (same 31 tests, not added) |
| Workspace diff whitespace | **Passed**, git diff --check |

Browser flow reads all three Skill levels (0/3 attempts; start disabled before content completion), Role choices without selecting one, and empty My Skills. It neither starts/submits an exam nor creates progress/evidence. Global unrelated console/notification failures are not certified absent; only scoped requests/page errors are asserted. Earlier failed runs remain above and in their original logs.

Manual checklist and private account guide: ignored `local/clean-reseed-20261117/HUONG_DAN_TEST.md` and `TAI_KHOAN_MOI.private.md`. Open http://localhost:8088; retain the original LD/Expert/Employee passwords; use the private file for new Org/Platform Admin passwords. Employee independently selects Role. Verify baseline starts from that choice, or study a Skill module then use its level-specific assessment; 3 total attempts, 10-minute wait, no automatic reset. My Skills initially has no achieved levels. Live examination, learning and certificate submission are left to the user and were not performed on their account.

Delivery boundary: clean local demo data/import and the bounded R2 read repair, **verified locally**. Performance depends on available host memory; the recorded OOM and pre-existing architecture violations are not erased by these checks. No production/full-platform certification, commit, push, external email or real payment.


Final repeat browser run: browser-main-delivery.log, **1 passed in 41.0s** (35.4s scenario); same desktop/mobile assertions and zero learner writes. It is a repeated scenario, not additional coverage. Main API and Neo4j both reported running/healthy at handoff. Reviewed screenshots are retained in ignored `local/clean-reseed-20261117/screenshots/main-skills-{1440,390}.png`. All owned rehearsal containers were stopped; main services remain running. No feature README completion change is needed: R1 is an operational data reset/import and R2 preserves public feature behavior.
