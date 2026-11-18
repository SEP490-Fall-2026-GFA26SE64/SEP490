# Single-Skill Modules and learning eligibility handoff

Approved scope: 2026-11-05, r2. The original r2 handoff covered Skill-only learning eligibility. Current source adds exact knowledge/Skill-version completion and current accepted-option access; complete rule-exam admission is owned by CurrentRoleKnowledgeCatalog/RuleAssessmentContextJpaRepository and the rule engine, not this Boolean API.

## Catalog and authoring

`(LearningModule)-[:TEACHES]->(MicroSkill)` has exactly one target per active Module; a Skill may have any number of alternative Modules. Neither `teachingFocus` nor Module/relationship `difficultyLevel` belongs to the 0.12 contract. Current rule flow uses explicit Role-Level requiredKnowledgeLevels, exact prerequisite knowledge pairs and Skill/knowledge/Skill-version-mapped questions; legacy difficulty/minimum-mastery are retired from that flow.

The active authoring wire shape retains the `teachings` array for the established integration, but requires exactly one item: `[{"skillId":"..."}]`. Create/edit, import preview validation and publication reject missing/multiple/foreign targets. Expert ownership, L&D publication and source-drift guards remain. Old raw authoring snapshots retain their historical fields for decoding; they are not rewritten into new evidence.

Release artifacts: [0.12 JSON](../dataset/import/ontology_seed-v012.json), [content mapping audit](../dataset/import/single-skill-v012-audit.json), [builder](../dataset/import/build_single_skill_catalog.py) and [validator](../dataset/import/validate_single_skill_catalog.py). The release has 994 nodes, 4,703 relationships and 246 single-Skill Modules. Content was used to select each target and narrow 45 broad activity units to an existing task/evidence. Eight Skills lack a dedicated Module: MS-DE09, MS-DE10, MS-FS01, MS-FS10, MS-FS15, MS-QA09, MS-QA12, MS-QA15. Do not fabricate substitute content or infer readiness. Existing approval fields remain null/NEEDS_EXPERT_REVIEW.

The 0.11 release, original content and frozen historical assessment/pathway references are retained. The new release was initially prepared and tested separately. The later user-authorized main-local synchronization is recorded below; accounts-dev remains unchanged. Bootstrap accepts the exact new release or previously known legacy byte pins and selects the corresponding version/suitability policy. The currently retained 0.11 file has an existing byte-pin mismatch with legacy bootstrap; this task does not relax that guard or certify existing-stack startup. New single-Skill planning uses `single-skill-v1`, with no difficulty/focus preference; historical policies and hashes remain readable. Direct provider consumers still check publication, availability and prerequisite mappings.

## Completion and historical evidence

Learning progress remains server-owned. Text requires reached-end plus explicit completion; Video requires at least 90% distinct watched coverage plus explicit completion. A Module requires every lesson in its pinned, nonempty version to be complete. The final lesson transaction records `learning_module_completion`, uniquely keyed by organization, learner, Module and revision, with the original Skill, content version and actual final completion timestamp. Repeated requests cannot overwrite it.

Completing a Module records its own Skill/content proof; current rule exam requires the additional exact requirement sidecar and accepted step/option. Skill-only completion does not qualify every knowledge level or module. Other Modules remain independently studyable, with their own progress. Completing a Module does not complete alternatives, pass an assessment, certify mastery or mutate the approved pathway.

Later edits, archive or reassignment do not move a completion to another Skill. New Skill mapping is not used to interpret old progress. The forward migration backfills only an original single-Skill snapshot whose original lesson list is entirely completed; it uses existing completion times. Ambiguous old multi-Skill revisions are retained without automatic eligibility and require reconciliation. Version switching across a Skill change is refused; original completed-version evidence remains available.

## Server and HTTP contract

All calls require a real entitled Employee workspace session. Organization/learner identity comes from the session, never the request. Wrong role: 403; unavailable/foreign Skill without own historical proof: 404. Storage failure is an error, not an empty or successful result. GET performs no completion/admission writes.

- `GET /api/v1/module-management/skills/{skillId}/assessment-eligibility`
- Backend owner: `SkillLearningService.eligibility(skillId)` in an authenticated request context. This is a retained informational API. Rule assessment admission rechecks exact current accepted option/completion/version through its own context repository; neither this Skill-only result nor a frontend Boolean is authority.

Unmet response:

```json
{"skillId":"skill-id","eligible":false,"reason":"NO_COMPLETED_MODULE","qualifyingCompletion":null}
```

Met response has `eligible: true`, `reason: "MODULE_COMPLETED"` and a `qualifyingCompletion` containing `skillId`, `moduleId`, integer `revision`, `contentVersion` and ISO-8601 `completedAt`. These values come from immutable actual completion provenance; the earliest qualifying proof is returned deterministically. `eligible` means only the learning prerequisite is met. The assessment owner must additionally check their own bank/model/retake/access/readiness rules.

## Optional same-Skill study

- `GET /api/v1/module-management/skills/{skillId}/modules` returns available approved same-organization Modules: `moduleId`, `title`, `contentVersion`, `started`, `completed`.
- `POST /api/v1/module-management/skills/{skillId}/modules/{moduleId}/learning` requires workspace CSRF and returns 204 after admission/pinning.
- Continue through existing `/learning/{moduleId}/begin`, `/view` and lesson progress APIs.

Current source requires currently authorized module access for the Skill and separately checks each listed/started option through assigned/accepted-access guards; historical completion alone does not authorize every same-Skill Module. This prevents arbitrary Skill enumeration/admission from bypassing the existing pathway/prerequisite boundary. Optional targets require released approved complete content in the same organization and matching sole Skill. Explicit `learning_self_study` admission permits the existing reader/private-media path to continue without adding Module membership/order to the pathway. A prior pin is retained; new enrollment never silently changes a learned version or grants a different Skill.

The reader now exposes a real Skill assessment action for the exact accepted completed option; module badges/results and inline retake errors use current rule APIs. Score is not simulated. Full runtime branches were not verified here.

## Forward migration and verification

PostgreSQL: V50 completion/admission evidence and conservative backfill; V51 nullable legacy teaching fields for the explicit new policy, preserving all prior rows and immutability constraints. The three supported lineages receive matching forward migrations. Never edit old migration checksums or point a populated database at another lineage.

Neo4j: `upgrade_neo4j_v012.py` defaults to dry-run and requires an exact original or identical target graph. It refuses authored/tenant/drifted graphs, backs up before an explicit apply and verifies within the transaction before commit. It does not touch PostgreSQL. Native Neo4j uniqueness constraints do not enforce relationship degree: writer/import/cardinality validation enforce the single target. Review operational deployment separately; do not automatically run this against existing stacks.

Actual tests, commands, environment and manual checks are recorded in [system evidence](../testing/system/REQ-013-016-single-skill-eligibility-20261105.md), with unit and integration receipts linked there.

## Main-local synchronization (2026-11-05)

The user subsequently authorized synchronizing the main local environment. The 5 November synchronization mounted the exact 0.12 seed; current Compose source mounts ontology_seed-skill-level.json and a separate module-knowledge release; existing named volumes and lifecycle markers keep their names to preserve data. Generic 0.12 migration continues to refuse tenant/authored drift. The separate explicit `upgrade_workspace_v012.py` accepts only the exact known TechNova 0.11 graph with its organization/TargetRole Expert metadata and three exact SE prerequisite links, or its identical 0.12 result. It preserves that administrative metadata, renames the five Occupation labels to JobPosition, narrows 664 TEACHES links to 246 and rebases the SE supplement version. Unknown nodes, tenant ownership or content changes are refused. The transaction locks/rechecks the original graph and verifies exact readback before committing. JobPosition uniqueness is installed separately after cutover.

Private backup location on this workstation: `local/backups/single-skill-20261105/` (git-ignored), containing the PostgreSQL custom dump and full Neo4j before/after/schema/plan snapshots. PostgreSQL uses its existing workspace lineage and forward V48–V51; no historical Flyway checksum or learner snapshot is rewritten. [Main-local synchronization receipt](../testing/system/REQ-013-016-main-sync-20261105.md) records actual startup/smoke results. Historical baseline model provenance and fixture UUID strings are retained across the earlier terminology refactor; current APIs keep Job Position naming.


## Independent Skill source extension — 2026-11-15

The Upskilling Skills tab now reads the real organization catalog and approved module options, including live unavailability reasons. `SkillLearningService` may admit Employee self-study without a prior Role selection or baseline when exact Skill knowledge prerequisites are officially met. It preserves current pathway access guards and pinned content. Content/media reads revalidate the exact self-study revision and current policy; a generic same-Skill Boolean is not assessment authority.

The shared Skill Assessment lifecycle now accepts an independent module+revision context. The server derives trusted organization/learner, exact Skill/knowledge/version and immutable module completion; no synthetic Role selection is created. PostgreSQL V65 permits null selection only for the explicit independent frozen context; V66 retains direct account/organization ownership. Existing Role contexts and their selection FK remain required. Papers, policies, deadline/retry rules and original attempts are reused. Independent outcome processing can append exact official evidence through the existing evidence store without mutating Role pathway membership; later exact baseline exemption/Role projections reuse that store. Failed reassessment of an achieved independent MAIN requirement can produce review work without revocation.

This is a source implementation statement, **not full runtime acceptance**. Unit/component/UI-fixture checks, workspace-lineage migration and real API assessment/evidence plus failed/passing-retake checks passed. Full browser acceptance remains blocked by local resource availability and existing backend regression failures. See [current evidence and limits](../testing/system/FR-06.07-individual-skill-20261115.md). Separate persisted Skill bookmarking and broader R2 completion are not delivered by this bounded slice.


R4 extends the existing module response with actual nullable knowledgeLevel/skillVersion and the own knowledge profile with an optional server-side Skill filter before pagination. Upskilling groups compatible modules by the three knowledge levels and derives current-version achievement/review status from official evidence, never from completed lessons or diagnostic scores. Missing profile/version remains unavailable. Module transactions acquire the trusted Employee account validation before the organization lock to keep the order consistent across module-filter and assessment routes. No additional R4 schema change or separate mastery store was introduced.


## Employee module search and local synchronization — 16 November 2026

`GET /api/v1/module-management/skills/modules` extends the existing SkillLearning controller/application/domain owner. It requires trusted entitled Employee context, not client organization/account IDs or Staff authoring access. Optional `search` (up to100 characters), `skillId` (nonblank up to200 when supplied), exact `knowledgeLevel` enum and zero-based page0–10000 are combined. Pages contain20 items, totalItems and canonical owner skillId/name plus the existing public OptionalModule projection. Sorting is case-insensitive package title then moduleId. Unknown Skill returns an empty result; malformed level/page returns400. Only approved/released same-organization packages for active approved Skills are searched; pinned actual level/version and live page-item admission reasons remain authoritative. Legitimately missing level is explicit and cannot start; no fabricated Foundation value. GET does not pin, admit or advance progress.

Upskilling keeps its organization/account-scoped queries and reuses the existing reader/start endpoint. Module search is debounced300ms and paginated rather than issuing one request per Skill; owner/level/query changes reset the relevant page. All shows separate result groups; owner/level filters apply to Modules. No search-specific schema/dependency was introduced.

The main local environment was backed up and updated to the new image with approved V64–V66. Real read-only browser/API/search/security and concurrent reads passed in the existing baseline-lab workspace; this supersedes the earlier statement that the new source had not yet been applied locally. It does not establish full Role-change/assessment browser or production acceptance. [Current search evidence and manual test](../testing/system/FR-06.07-individual-skill-search-20261116.md).


### Catalog presentation follow-up — 16 November 2026

The approved professional library presentation reuses the same search API and learning authority. Shared PageHeader/controls, staged filter dialog and removable chips replace the always-expanded filter form. Module list/cards share one record projection and live admission reasons; the responsive table keeps semantic headers/Skill ownership. No illustrative duration is invented from the HTML prototype. Empty tracking-summary presentation is compacted locally, without changing stored tracked skills or Role state. [Current visual verification/manual checklist](../testing/system/FR-06.07-catalog-design-20261116.md) distinguishes the passing UI/local slice from pre-existing Role/fullCI failures.


### Skills-list / module-card navigation follow-up

The approved presentation now uses responsive Skills rows and defaults module search to cards. Selecting a Skill renders the existing per-Skill module projection and knowledge/achievement tabs inline, reusing the same trusted APIs instead of a selection modal. Explicit Back retains the surrounding catalog state; entry/back manage keyboard focus. Existing per-Skill Foundation default, exact level/version evidence and admission are preserved. Grid sizing remains stable for a single module. No new API/schema/authority or fabricated metadata was added. [R5 evidence](../testing/system/FR-06.07-catalog-design-20261116.md#r5--approved-skills-list--in-page-module-cards) supersedes earlier modal/card presentation descriptions, without rewriting historical runs.


### Catalog assessment action — 17 November 2026

Module list/search now expose actual pinned/released `moduleRevision`; legacy constructors may retain null, and the UI never guesses a revision. Completed eligible cards reuse `CompletedModuleAssessmentLink` from the Reader, resolving the exact current pathway context or independent context. Compact presentation retains explicit start/resume/retake and server errors; Reader retains result/history controls. Rendering only reads context; POST start remains explicit and retains existing idempotency/policy rules. Incomplete, locked or revisionless modules cannot initiate an assessment from the catalog. No new schema or achievement calculation is introduced.

Local uses a compatibility backport because merged migration numbering differs from the preserved database. The notification polling endpoint from merged frontend is absent locally (404); this is outside the assessment slice. [Current evidence and manual checklist](../testing/system/FR-06.07-08-module-assessment-cta-20261117.md).


### Skill-level assessment placement follow-up — 17 November 2026

Supersedes the preceding catalog card placement only. `SkillLevelAssessmentPanel` belongs to each selected Skill knowledge-level tab above its learning modules. Only completed, currently available modules at the selected current Skill version and level with an actual positive revision can supply completion context. One eligible completion is used directly; multiple require an explicit labeled choice. The existing Reader resolver and assessment history/start/resume/retake services are reused. History and attempt limits remain scoped to the chosen module/revision, not consolidated by Skill/level. Module catalog cards no longer render assessment entries; global search offers View skill at the module knowledge level. Reader assessment entry is unchanged. No new schema, bank filtering, scoring, authority or persistence operation. [Follow-up verification](../testing/system/FR-06.07-08-skill-level-assessment-20261117.md).


### My Skills achievement summary — 17 November 2026

`/employee/my-skills` is an Employee summary independent of the selected Role, linked from the Employee menu and Profile. It reuses the existing organization/learner-scoped knowledge-profile API and `groupKnowledgeEntries`. Only official EVIDENCE creates a displayed level; DIAGNOSTIC records are excluded. Pathway and independent module outcomes already use the same evidence store, so no new persistence or source-origin guess is needed. Skill/version/level keys deduplicate chips while keeping distinct evidence, recorded dates and existing assessment-result links. Certificate evidence legitimately has no attempt link. Unresolved REVIEW annotates retained achievement within its exact Skill/version/level.

The client exhausts paginated profile history before declaring the summary/search complete, with explicit partial/error/limit messages through the existing page250 boundary. Achievements at a higher level never infer lower levels; historical Skill versions remain separate. Queries and component state are scoped to trusted organization/account; non-Employees do not issue summary reads and401/403 hides cached rows. Existing Overview and My mastery redirect are preserved. No new endpoint, schema, scoring rule or source-kind field is introduced. [Verification and manual checklist](../testing/system/FR-06.05-09-my-skills-20261117.md).
