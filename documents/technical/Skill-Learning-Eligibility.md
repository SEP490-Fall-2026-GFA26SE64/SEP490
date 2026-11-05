# Single-Skill Modules and learning eligibility handoff

Approved scope: 2026-11-05, r2. This document covers Module learning, optional same-Skill study and the **learning prerequisite** for a teammate-owned Skill Assessment. It does not define assessment construction, question selection, scoring, retakes, mastery updates or complete exam admission.

## Catalog and authoring

`(LearningModule)-[:TEACHES]->(MicroSkill)` has exactly one target per active Module; a Skill may have any number of alternative Modules. Neither `teachingFocus` nor Module/relationship `difficultyLevel` belongs to the 0.12 contract. Question difficulty, Role/Level requirements, minimum mastery and Skill prerequisites are separate and unchanged.

The active authoring wire shape retains the `teachings` array for the established integration, but requires exactly one item: `[{"skillId":"..."}]`. Create/edit, import preview validation and publication reject missing/multiple/foreign targets. Expert ownership, L&D publication and source-drift guards remain. Old raw authoring snapshots retain their historical fields for decoding; they are not rewritten into new evidence.

Release artifacts: [0.12 JSON](../dataset/import/ontology_seed-v012.json), [content mapping audit](../dataset/import/single-skill-v012-audit.json), [builder](../dataset/import/build_single_skill_catalog.py) and [validator](../dataset/import/validate_single_skill_catalog.py). The release has 994 nodes, 4,703 relationships and 246 single-Skill Modules. Content was used to select each target and narrow 45 broad activity units to an existing task/evidence. Eight Skills lack a dedicated Module: MS-DE09, MS-DE10, MS-FS01, MS-FS10, MS-FS15, MS-QA09, MS-QA12, MS-QA15. Do not fabricate substitute content or infer readiness. Existing approval fields remain null/NEEDS_EXPERT_REVIEW.

The 0.11 release, original content and frozen historical assessment/pathway references are retained. The new release was initially prepared and tested separately. The later user-authorized main-local synchronization is recorded below; accounts-dev remains unchanged. Bootstrap accepts the exact new release or previously known legacy byte pins and selects the corresponding version/suitability policy. The currently retained 0.11 file has an existing byte-pin mismatch with legacy bootstrap; this task does not relax that guard or certify existing-stack startup. New single-Skill planning uses `single-skill-v1`, with no difficulty/focus preference; historical policies and hashes remain readable. Direct provider consumers still check publication, availability and prerequisite mappings.

## Completion and historical evidence

Learning progress remains server-owned. Text requires reached-end plus explicit completion; Video requires at least 90% distinct watched coverage plus explicit completion. A Module requires every lesson in its pinned, nonempty version to be complete. The final lesson transaction records `learning_module_completion`, uniquely keyed by organization, learner, Module and revision, with the original Skill, content version and actual final completion timestamp. Repeated requests cannot overwrite it.

Completing any one Module is sufficient for the Skill's learning prerequisite. Other Modules remain independently studyable, with their own progress. Completing a Module does not complete alternatives, pass an assessment, certify mastery or mutate the approved pathway.

Later edits, archive or reassignment do not move a completion to another Skill. New Skill mapping is not used to interpret old progress. The forward migration backfills only an original single-Skill snapshot whose original lesson list is entirely completed; it uses existing completion times. Ambiguous old multi-Skill revisions are retained without automatic eligibility and require reconciliation. Version switching across a Skill change is refused; original completed-version evidence remains available.

## Server and HTTP contract

All calls require a real entitled Employee workspace session. Organization/learner identity comes from the session, never the request. Wrong role: 403; unavailable/foreign Skill without own historical proof: 404. Storage failure is an error, not an empty or successful result. GET performs no completion/admission writes.

- `GET /api/v1/module-management/skills/{skillId}/assessment-eligibility`
- Backend owner: `SkillLearningService.eligibility(skillId)` in an authenticated request context. The assessment backend must recheck this service when admitting an attempt; a frontend boolean is not authority.

Unmet response:

```json
{"skillId":"skill-id","eligible":false,"reason":"NO_COMPLETED_MODULE","qualifyingCompletion":null}
```

Met response has `eligible: true`, `reason: "MODULE_COMPLETED"` and a `qualifyingCompletion` containing `skillId`, `moduleId`, integer `revision`, `contentVersion` and ISO-8601 `completedAt`. These values come from immutable actual completion provenance; the earliest qualifying proof is returned deterministically. `eligible` means only the learning prerequisite is met. The assessment owner must additionally check their own bank/model/retake/access/readiness rules.

## Optional same-Skill study

- `GET /api/v1/module-management/skills/{skillId}/modules` returns available approved same-organization Modules: `moduleId`, `title`, `contentVersion`, `started`, `completed`.
- `POST /api/v1/module-management/skills/{skillId}/modules/{moduleId}/learning` requires workspace CSRF and returns 204 after admission/pinning.
- Continue through existing `/learning/{moduleId}/begin`, `/view` and lesson progress APIs.

A learner must already have a currently authorized Module for that Skill or original completion evidence for it. This prevents arbitrary Skill enumeration/admission from bypassing the existing pathway/prerequisite boundary. Optional targets require released approved complete content in the same organization and matching sole Skill. Explicit `learning_self_study` admission permits the existing reader/private-media path to continue without adding Module membership/order to the pathway. A prior pin is retained; new enrollment never silently changes a learned version or grants a different Skill.

The reader exposes prerequisite status and available alternatives in EN/VI; no exam/score is simulated, and no route to an unfinished assessment is provided.

## Forward migration and verification

PostgreSQL: V50 completion/admission evidence and conservative backfill; V51 nullable legacy teaching fields for the explicit new policy, preserving all prior rows and immutability constraints. The three supported lineages receive matching forward migrations. Never edit old migration checksums or point a populated database at another lineage.

Neo4j: `upgrade_neo4j_v012.py` defaults to dry-run and requires an exact original or identical target graph. It refuses authored/tenant/drifted graphs, backs up before an explicit apply and verifies within the transaction before commit. It does not touch PostgreSQL. Native Neo4j uniqueness constraints do not enforce relationship degree: writer/import/cardinality validation enforce the single target. Review operational deployment separately; do not automatically run this against existing stacks.

Actual tests, commands, environment and manual checks are recorded in [system evidence](../testing/system/REQ-013-016-single-skill-eligibility-20261105.md), with unit and integration receipts linked there.

## Main-local synchronization (2026-11-05)

The user subsequently authorized synchronizing the main local environment. `compose.dev.yml` now mounts the exact 0.12 seed for catalog/import/API consumers; existing named volumes and lifecycle markers keep their names to preserve data. Generic 0.12 migration continues to refuse tenant/authored drift. The separate explicit `upgrade_workspace_v012.py` accepts only the exact known TechNova 0.11 graph with its organization/TargetRole Expert metadata and three exact SE prerequisite links, or its identical 0.12 result. It preserves that administrative metadata, renames the five Occupation labels to JobPosition, narrows 664 TEACHES links to 246 and rebases the SE supplement version. Unknown nodes, tenant ownership or content changes are refused. The transaction locks/rechecks the original graph and verifies exact readback before committing. JobPosition uniqueness is installed separately after cutover.

Private backup location on this workstation: `local/backups/single-skill-20261105/` (git-ignored), containing the PostgreSQL custom dump and full Neo4j before/after/schema/plan snapshots. PostgreSQL uses its existing workspace lineage and forward V48–V51; no historical Flyway checksum or learner snapshot is rewritten. [Main-local synchronization receipt](../testing/system/REQ-013-016-main-sync-20261105.md) records actual startup/smoke results. Historical baseline model provenance and fixture UUID strings are retained across the earlier terminology refactor; current APIs keep Job Position naming.
