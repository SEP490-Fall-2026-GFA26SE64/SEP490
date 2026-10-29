# REQ-001/002 final synchronization review

Date: 2026-10-23, Asia/Bangkok. User approved the scoped document/workspace/schema-diagram synchronization and build/manual smoke, with executable tests excluded. This report records observations and limitations; it does not certify production integration or a new executable-test pass.

## Outcome and scope

The official contracts now describe Role-first selection, full Occupation baseline, profile-authoritative coverage, retained learner versions, evidence-sufficient initialization without a score threshold, early no-mastery invalidation, exact version/Draft presentation and protected result/history/My Mastery reads. Operational substitutes have been removed from those contracts and consolidated under workspace `.project/temporary/REQ-001.md` and `REQ-002-003-009.md` (stable IDs12/13 and related records). The old Local Demo Flow path is a navigation pointer only.

No backend/frontend runtime source, migration, configuration, seed, estimator, BKT/gap/pathway algorithm or executable test was changed by this review. Pre-existing implementation changes remain unstaged and byte-preserved. Product documents describe required behavior; this report/registry describe actual readiness. Calibration simulation/operational C and other owners' contracts were dependencies, not rewritten into new scope.

## Sources and authority

Current user confirmations take precedence, followed by the scoped feature documents, Product Overview and architecture/schema. Source/migrations/tests describe implementation, not requirements. The older repository AGENTS architecture-first/automatic-test instructions conflict with the workspace/current user's gates; current explicit authority governs. Temporary SRSv2 actor/SaaS/S2–S4 differences remain unresolved and were not adopted. Open/Proposed/Provisional items were not promoted to confirmed behavior.

Read-only source review followed controller → use case/ports → JDBC/Neo4j adapters → migrations, and FE route/API → Role gate/configuration/results/profile consumers. Existing historical UUID/fixed/module readers remain intentional compatibility paths; current demo controllers are profile-exclusive. [Contracts](../../technical/baseline/Role%20Selection%20and%20Occupation%20Baseline.md), [architecture](../../ARCHITECTURE.md), [schema/diagrams](../../diagrams/README.md).

## Verified stores and distinct versions

| Boundary | Fresh observation | Evidence limit |
| --- | --- | --- |
| PostgreSQL engine/schema |17.6;26 successful Flyway migrations, all source checksums match;89 tables/729 columns/628 constraints/189 FKs/213 indexes/99 triggers/39 functions | Metadata, not runtime correctness or executable acceptance |
| Neo4j engine/catalog |5.26.31 Community; ontology0.8.0;827 nodes,4536 relationships;6 ID uniqueness constraints/8 online indexes including2 lookup | Metadata/key/type/ownership checks, not proof of reviewed publication/production visibility |
| Catalog labels/relationships |5 Occupations,48 Roles,144 Levels,472 Competencies,79 MicroSkills,79 Modules; seven relationship types | All48 Roles have exactly one Occupation owner; constraints alone do not enforce all business cardinality |
| Blueprint |One released FULL_OCCUPATION_V2 version1; maximum45,total3000 seconds | Current live state differs from earlier observations; no v2/Draft assumption |
| Model |IRT_3PL, version LOCAL_DEMO_SYNTHETIC_V1, ID8f18ca82-cb9a-3452-95d9-6b52b10904c8 | Reference model, not approved actual-pilot calibration |
| Mapping |LOGISTIC_CONSERVATIVE_V1, ID891b1dc7-13b8-3f8a-ad0d-6d8eb1747274; configuration hash c6d39bbc9338b750fa492eae9fbecd0a135100d07ef9a2dc4f3e36673c5c5b4f | Distinct mapping identity, not a schema/Blueprint version |
| Parameter set |e676b9d9-ecb3-34d5-8a4e-8e695b50c870; source SEEDED,status PROMOTED; hash089ecd096815fe6e41fce47bfed53ec655f774132ddf486c811cc90bf55bf70e | SYNTHETIC provenance; storage tags are not real approval or operational promotion |

Current live learner state is one AUTO_SUBMITTED attempt and one A profile (v1/15 skills), not the earlier four attempts/three profiles/two versions in handoff. B/C currently return SELECT_ROLE and empty profiles. The cause of the pre-review environment difference was not inferred; no restore, reset or data reconciliation was attempted. Historical observations retain their dates/limits.

Additional read-only graph checks found144 Levels with unique Role ownership,79 Modules/79 skills with one-to-one TEACHES,0 invalid requiredScore edges and0 prerequisite cycles. All827 nodes remain NEEDS_EXPERT_REVIEW; no node has explicit organizationId, so production tenant visibility requires the owning catalog boundary. A profile/result read compared all15 mastery/confidence pairs exactly equal at baseline v1; no write was used. These are bounded manual observations, not executable acceptance.

V24 expands DISCARD receipts; V25 adds three current selection/receipt/profile tables; V26 adds terminal manual-insufficiency compatibility. V1–V26 source bytes were preserved. One constraint remains NOT VALID: occupation_baseline_name_time_limits, inherited from V21; it was not validated or altered. JSON shape/nonempty checks do not prove numeric mastery or tenant authorization; application validation and actor/org query predicates remain necessary.

## Contract-to-runtime findings

Categories: A=document drift; B=implementation gap against required behavior; C=temporary integration/dependency; D=open decision. Source-based conclusions below are not new executable acceptance.

| Finding | Category/status | Resolution or remaining owner |
| --- | --- | --- |
| Implemented/pending paragraphs, old P3/UUID fields, independent exploration and score/completion-only coverage descriptions mixed in current contracts | A, resolved | Unified confirmed Role/profile/version rules; historical evidence kept separately |
| Retired menu/panel, hidden portal and unused-persona assumptions remained in registry/guides | A, resolved | Current WorkspaceLayout/useLocalDemoSession consumers recorded; original portals/profile metadata retained |
| PostgreSQL drawings/catalog and topology were V23/stale | A, resolved | Fresh V26 snapshot, new3-table group and recreated exports, visual review; old target kept historical |
| Identity uses gated server personas/static manager grants; graph/content visibility accepts the exact unreviewed snapshot/DRAFT bank | C, open | Person1 Identity/session/grants/revocation; Person2/content publication/release/visibility; TMP12 |
| CurrentOccupationProfile is immutable baseline initialization, not later-learning profile processing/REQ-041 delivery | C, open | Profile/evidence owner replaces behind ports; retain genuine outcome/provenance; TMP13 |
| CurrentRoleSelectionStore activity query checks only adaptive baseline attempts, while confirmed selection guard also covers other assessment families | B/C, open | Assessment owners compose lifecycle guard; no behavior change in this review |
| Existing published pathway causes PATHWAY_REQUIRES_OWNER rather than an implemented owning archive operation | B/C, open | Pathway owner supplies archive/history/locking contract; fail-closed behavior retained |
| Same-role select uses the stored Selection returned with changed=true; no-op does not change target revision/events but change indicator appears inconsistent | B, source-derived minor follow-up | Person3 to confirm/fix in separately scoped implementation; not runtime-exercised here |
| Current selection outbox payloadVersion2 adds Occupation/string-ID context to retained legacy envelope | C/D, compatibility unverified | Consumer owners verify versioned decoder/REQ-041 compatibility; no delivered receipt fabricated |
| Model constants/estimator precision/calibration/stopping/performance and synthetic-data exclusion remain unvalidated | C/D, open | Model/content/downstream owners; no IRT/mastery/confidence/BKT change |
| Valid old outcome without authoritative profile | D, retained preservation rule | Pending/review-needed; no generalized import/reset/retake remediation approved |
| Numeric gap plus low-confidence reinforcement | D, discussion only | No new accepted policy or implementation inferred |

## Actual validation

| Kind / scope | Command or trigger | Result |
| --- | --- | --- |
| Backup/intake | Scoped snapshot script and hash manifest before edits |113 files retained, including result/history contracts and repaired historical navigation links; original product HEAD e67544d8982f7278eb75c0d2c4458ba23d8b4f66;46 tracked/22 untracked paths,index empty,stash preserved |
| Metadata | docker compose exec postgres psql, repeatable-read READ ONLY; cypher-shell read queries | Counts/checksums/keys/types/Role ownership above; no schema/data mutation requested by capture |
| Diagram generation | python documents/diagrams/Generate-PostgresqlDiagrams.py; existing PlantUML1.2025.10/Smetana -failfast2 -tsvg/-tpng |All13 pairs render; PNGs opened.729 field labels/types/nullability/PK/FK markers checked; dense32-table view needs zoom |
| Backend build | docker compose -f compose.dev.yml build api |Exit0; package layer reused from cache, configured mvn -Dmaven.test.skip=true package. No new compile/test pass is inferred from cache |
| Production TypeScript | Compiler API with production roots, noEmit; excludes tests/fixtures and checks transitive imports |146 roots,0 diagnostics,0 test imports; no runner/test compilation |
| Frontend bundle | docker compose exec -T web node node_modules/vite/bin/vite.js build |Exit0,2049 modules; existing bundle-size warning |
| Operational startup | docker compose start api web |Compose also started existing migrate/seed dependencies; Flyway validated26/up-to-date,no migration necessary. Additive seed/provisioning produced no table-digest or graph-metadata changes |
| REQ-001-F01 | Employee A/B/C GET target-roles |200,no-store,48 Roles each |
| REQ-002 coverage/profile read | A GET selection/mastery |COMPLETE15/15,v1; one own profile |
| Empty profile | B/C GET selection/mastery |SELECT_ROLE; empty list200; no fabricated zero mastery/profile |
| Actor boundary | Admin GET catalog/selection/mastery |403,no-store |
| REQ-009-F01/F02 | A own result/history; B reads A result |200/result and one terminal history row; foreign404; no-store |
| Manager list | L&D GET adaptive-baseline-blueprints |200 with rows/total/page/size; no mutation |
| FE routing | GET target-roles/baseline-assessment/my-mastery paths on8088 |200 HTML; this is not rendered UI acceptance |
| Browser | computer-use inventory |No apps/browsers exposed; rendered UI/keyboard/responsive remain unverified |

An initial result URL used the wrong route and returned401; it was corrected from the controller to `/api/v1/employee/baseline-attempts/{id}/result` before recording own200/foreign404. No failure was reclassified as a successful route. No create/select/answer/submit/discard/activate command was sent during this review; write/race/dependency-outage scenarios were not rerun against retained user data. No JUnit/Vitest/Playwright/Testcontainers or other executable suite was created/run. Existing historical passes remain limited to their dated contract.

## Preservation, cleanup and Git scope

Recovery: workspace `.tools/final-sync/20261023/` contains before-manifest.json, original files/patch/status/stash, metadata/digest captures and rendered previews. Existing backup folders/recovery branch/stash were not removed or rewritten. Scripts in prior .tools folders were retained because unique provenance/consumers were not all established; no blanket deletion or archive of unknown ownership occurred.

| Source | Destination/disposition |
| --- | --- |
| Contradictory current amendments in scoped feature/design files | Replaced with coherent official contracts; originals retained byte-for-byte in before-manifest backup |
| Operational Local Demo Flow details | Consolidated into TMP12/13 with gate/consumer/owner/replacement/retained code/checks; original path is a historical navigation pointer |
| CORE_FLOW.md and obsolete walkthrough body | One rewritten current walkthrough; router updated; original copies in backup; duplicate CORE_FLOW removed |
| AGENT_MODEL_CLUSTER_2_ADAPTIVE_BASELINE.md | Archived under s2 work/Archive/REQ-001-002; retained user-requested reference, not an active execution plan |
| CODEX_PROMPTS_QUESTION_BANK_C_D.md |Kept short historical pointer because Session2 evidence still links it |
| CURRENT/task records/ongoing plan | Compact current state/dependencies and evidence links; older text recoverable from backup |
| Dated evidence and source inventories |Preserved results; only navigation anchors repaired where needed, no changed pass/fail labels |
| Superseded20 October diagram |Source/export retained unchanged; explicitly historical |

Byte/hash comparison preserves all pre-existing runtime/configuration/migration/seed/test paths including the prior deleted panel; only documents/diagram generator/artifacts were changed in product. Before/after canonical row digests cover all89 platform tables; graph before/after comparison covers metadata/counts/field types, not a full per-property historical hash. Startup used the existing nonempty-graph branch; no graph write command was issued by this review. No claim of a full before/after graph payload audit is made.

Only final documentation/schema-diagram changes are staged/committed; existing runtime work remains dirty and is not silently committed. No push/history rewrite. Detailed final file/hash/structural/link verification is in [observation](REQ-001-002-final-sync-observation.json). A documentation-only commit may describe uncommitted implementation; deployment requires the separate reviewed implementation commit.

## Handoff and proposed executable scope

Synchronization scope is complete with explicit unresolved findings above. This does not waive any executable acceptance. Before Cluster3, bind isolated org/actor fixtures and approved numerical/source versions. Proposed order: RB/VB/profile unit/function cases; one-time real PostgreSQL+Neo4j adapter isolation/transaction/rollback/race cases; FE/API/system journey and EN/VI/keyboard/responsive; independent numerical/adversarial/stopping/performance; retained legacy/security/seed/gate/recovery regression. Add MM01–MM05 from the updated plan. No main Compose volumes or development seeds as production oracle. Obtain separate approval before creating/running suites.

Production Identity/review/publication/model/pilot/profile/lifecycle/downstream gaps remain owners' work. Rollback disables temporary wiring using TMP12/13 and compatible readers, preserving schema/volumes/history/evidence; no down migration, reset, restore-over-live or re-score. Compatibility, authorization/isolation, dependency ownership, forward rollback and scoped Git review are recorded; their executable validation remains open.
