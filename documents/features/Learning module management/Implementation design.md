> **Current R4 behavior (2026-10-29):** new Module/content creation, reuse and Excel/ZIP import are based on skills and do not require an Job Position selection/grant. Historical job position tags and the separate catalog intake workflow remain intact. L&D revision details show individually numbered Text/Video lesson cards. See the [current catalog refinement](../Learning%20catalog/README.md#r4-local-refinement--2026-10-29) and [tested UI/manual checklist](../../testing/system/REQ-013-learning-content-R4.md). Older dated rules below are retained for traceability.

> **Historical local implementation:** Current source requirements are in [Learning Catalog](../Learning%20catalog/README.md). Pre-merge V27/V28 references describe the old database; combined-source migrations are V33/V34. See [architecture](../../ARCHITECTURE.md#merge-migration-boundary--2026-10-29).

# REQ-013 implementation design

**Source alignment 2026-11-07:** current Module owner is one responsible Expert, single Skill/knowledge/outcomes, ordered lessons and existing L&D whole-revision review. Historical choices/upgrade observations below retain their date; verification is recorded in the dedicated REQ-013 evidence documents, not inferred from this design.

## Implementation mapping

- Creator is immutable at Module level. Each edit creates a payload revision with its actual editor/time; lifecycle decisions append actor/time events. Review metadata remains separate from edit identity.
- Current new authoring/import does not require Job Position grants. The authenticated creator is responsible Expert; peers are read-only. L&D intake assigns one Expert and only that Expert can receive. Old job-position tags/grant rows remain historical/intake metadata, not shared-edit authority.
- Markdown includes direct HTTPS video via `[video](https://host/file.mp4)`. The renderer supports headings, text, fenced-code lines and video; it does not execute raw HTML, iframe code or arbitrary Markdown links.
- V27 implements `module_authoring`, `module_authoring_content`, `module_job position_grant`, `module_grant_audit`, `module_learning_pin`. The aggregate contains the durable pending projection state and confirmation events; there is no separate outbox worker/table. L&D triggers idempotent retry explicitly.
- Authentication uses the existing main login and its same-origin workspace cookie. There is no Module-specific login, Basic password or account list. The local identity bridge requires an explicit allowlisted cookie and an active PostgreSQL account; organization and roles come from that account, with DOMAIN_EXPERT mapped to EXPERT. Missing cookies return 401 instead of defaulting to L&D. This reuses the existing local demo identity mechanism, not production authentication. Production remains closed.
- Only Modules created through this workflow are managed here. Existing graph/catalog and legacy learning_activity records are not silently migrated or repinned. Pin preservation is implemented for the new workflow; pathway/legacy-activity admission integration remains separate work.
- Archive blocks new starts and preserves existing learner pins. Restore creates a new complete draft requiring approval.

## Historical approved requirements (current contract is Learning Catalog)

Use [the feature contract](../Learning%20catalog/README.md#fr-05-05) for the user's confirmed choices. Implement REQ-013-F01–F04 with REQ-016 mapping validation, rather than extending the legacy mock fields. Current Module payload pins exactly one Skill plus knowledgeLevel/skillVersion/outcomeCodes, content/revision and legitimate nullable metadata. Active TEACHES no longer uses teachingFocus/difficultyLevel; V61 forbids price in new authoring documents. Old 13/8 field counts are not a current schema invariant. Review identity/time remain null before review. Module identity, catalog version, content version and authoring revision are distinct.

## Observed implementation gaps before implementation

- LearningModuleRecord/API omit price and review identity/time, use durationMinutes, and represent mapping as skill IDs without relationship metadata or teachingFocus/difficultyLevel.
- Neo4jLearningModuleRepository.save deletes and recreates TEACHES; delete does not enforce organization scope. LearningModuleService currently delegates without lifecycle rules.
- LearningContentAuthoringPage and approval packages use learningContentStore/localStorage. Selecting a package there cannot yet create a durable, server-verifiable content reference.
- The local organization-management security chain permits all organization endpoints. OrganizationTargetRoleController accepts a client role header. Neither is a trusted Expert/Job Position grant source for the new workflow.
- No existing Module revision/approval/audit persistence was found. The existing learner learning_activity/module-assessment structures are historical UUID-reference structures; a compatible string-ID revision bridge must be designed, not assumed.

## Proposed storage responsibilities

Names below are design concepts, not approved SQL definitions or graph additions.

| Store | Proposed responsibility |
|---|---|
| Neo4j | Current catalog LearningModule and TEACHES, using only properties in ontology v0.11.0. |
| PostgreSQL: job position authoring grants | Organization + Expert account + Job Position assignment, active/revoked state and assignment history. L&D manages assignments. |
| PostgreSQL: Module scope membership | Explicit organization/Module/Job Position membership, independent of skill overlap or legacy TargetRole assignments. No job positionId property or new edge is silently added to Neo4j. |
| PostgreSQL: content versions | Immutable content bodies/manifests selected from Content Studio; Markdown and linked-video representation pending user clarification. Persist a stable reference used by contentUri/contentVersion. |
| PostgreSQL: Module revisions | Validated Module/content/TEACHES package snapshots, revision identity, concurrency token, submission/decision state, actors and timestamps. A draft/submission must not replace the released graph. |
| PostgreSQL: audit | Authenticated editor identity, timestamp, revision and change details, separate from review metadata. |
| PostgreSQL: outbox/publication receipt | Durable approved catalog projection request, idempotent graph application and delivery receipt. Do not claim a distributed transaction across PostgreSQL and Neo4j. |

All records require organization boundaries. Preserve all prior content/mapping snapshots and assessment pins. A content/revision reference must not be released or accepted for new learning until its required catalog projection is available. The read contract must distinguish released revision from pending revision.

## Historical proposed authorization (superseded by responsible-Expert ownership)

Resolve actor identity, organization and active roles server-side. Never trust X-User-Role, a body actor ID, browser active-company state or selected job position as authorization.

L&D grants an Expert access to one or more Job Positions. Experts may read/edit Modules assigned to an authorized scope. **Pending decision:** for a shared Module, whether a grant to any owning Job Position suffices for editing, or grants to all owning Job Positions are required. Enforce the chosen rule on commands, content selection, listing/counts, detail, audit and lifecycle endpoints. Membership changes must not grant access accidentally through adding a skill.

The existing main login establishes the local workspace persona cookie for Employee, Expert, L&D and Admin. The Module chain resolves an active PostgreSQL account, organization and roles, while L&D persists Job Position grants. Main logout clears this shared cookie. LocalStorage and role headers grant no backend access. This bridge is limited to local + local-baseline-demo with its explicit enable flag and excludes prod.

## Historical proposed lifecycle (current source follows Learning Catalog)

1. Create a complete draft package with system-generated Module ID and exactly one PRIMARY. Select durable content from Content Studio; do not submit localStorage payloads as approved evidence.
2. Edit a draft with an expected revision/concurrency token. Reject stale writes rather than overwrite another Expert's changes. Audit every successful edit with the actual actor.
3. Submit Module/content/mapping together. Prevent edits to the submitted snapshot. Return with feedback or approve as L&D; decision always targets the exact submitted revision.
4. Publish an approved package through an idempotent outbox projection; preserve the currently released package until the replacement is available. Populate real review metadata, including relationship review metadata, according to the approved review decision contract.
5. Edit a released Module by creating a new revision, then submit/approve/publish again. Ongoing learners retain their original content and mapping pins; new starts use the newly released revision.
6. Physically delete only a never-released, unreferenced draft after checking both catalog and learner references. No evidence/content cascade deletion.
7. Request archive as Expert; L&D decides for a released Module. Validate skill-provider coverage before removal. **Pending:** whether ongoing learners may continue accessing pinned content after archive.
8. Restore to draft and require approval before release. Do not reuse an old approval as evidence for a restored release.

No new lifecycle enum is silently added to graph status/reviewStatus. Pending submission/archive and authoring revision state belong to the workflow records, with explicit mapping to graph lifecycle/review states.

## Historical frontend implementation scope

- Replace the mock-backed Module editor with real API queries/mutations, shared PageHeader/StatCard/Card/Button/Badge/Dialog/Input/Pagination and project tokens/typography.
- Support name/ID search and status/review/moduleType/skill filters; scoped counts/pagination originate from the server.
- Display complete Module details and per-skill mapping, including relationship metadata; show pending and released revisions distinctly.
- Provide accessible complete-package creation/editing, duplicate-click locking, loading/empty/error/retry states, conflict recovery without losing edits, and English/Vietnamese copy.
- Show editor history, submission status and actions allowed by the server. Integrate L&D approval/archive requests rather than simulating approval in localStorage.
- A minimal durable Content Studio and approval integration is necessary for the confirmed create/review flow; unrelated question-bank authoring remains outside this change.

## Historical verification and migration plan (not executed here)

- Unit/API: complete-field validation; one PRIMARY; duplicate mapping; authentic actor/organization/scope checks; stale edits; submission/review authorization; lifecycle transitions; audit attribution and pin preservation.
- Integration with PostgreSQL and Neo4j Testcontainers: complete-field round-trip, rollback on invalid endpoints, immutable submitted snapshots, tenant isolation, concurrent edits, idempotent outbox/retry and coverage/deletion checks.
- Compose/Playwright: Expert create → view → edit → submit; L&D return/approve; new revision and unchanged previous learner pin; archive/restore; cancel/empty/error/unauthorized flows.
- Create per-REQ evidence at each test level and a manual checklist with URL, prerequisites, steps and expected outcomes. Record blocked/not-run honestly.
- Use forward-only migrations. Do not rewrite previous Flyway files, import a replacement graph over the current runtime, fabricate missing legacy data or repin historical learner records. Inventory legacy omissions and define an explicit migration/review path before enabling legacy Module mutation.

## Historical follow-up decisions with supersession notes

1. Historical Job Position-grant editing was superseded by responsible-Expert ownership; actual creator/editor/reviewer history remains visible.
2. Current content uses ordered Text/Video lessons with actual private assets/approved provider adapters; the old Markdown-only Content Studio choice is superseded. Whole Module revision remains the review unit.
3. Existing learners continue pinned content after archive; new starts are blocked. No automatic replacement or historical repinning.

## Neo4j catalog list — user-requested correction (2026-10-28)

`ModuleAuthoringPort.graphModules` maps the complete stored graph schema into nullable catalog read DTOs, separate from validated authoring payloads. `/module-list` combines these with authorized authoring documents, excludes private managed IDs, filters before paging and sorts title/ID. Existing `/modules` authoring/review commands retain their contract. Frontend shows catalog details plus authorized workflow actions; no history is synthesized. Shared catalog browse access is explicitly distinct from Job Position authoring grants. [Read contract](../../technical/module-management-history/features/Learning%20module%20management/View%20Learning%20Modules.md#neo4j-catalog-list--user-requested-correction-2026-10-28).

## Executed v0.11 data upgrade

The shared catalog has now been upgraded in the existing application database under the user's explicit instruction. A guarded standard-library HTTP import tool validates exact v09/v11 source ownership, backs up Neo4j/PostgreSQL, preserves managed extras and checks full transaction readback and PostgreSQL fingerprints. Read-only frozen-bank verification prevents local bootstrap from trying to reseed an old bank against the newer current catalog. No authoring, item or learner history is repinned. [Execution receipt](../../dataset/NEO4J_V011_LOCAL_UPGRADE.md).

### Per-module catalog intake — 2026-10-28

Option A is now the implementation scope: explicit L&D Job Position assignment → assigned Expert acceptance → draft/edit/submit → L&D decision → existing graph publication. See [intake contract](../Learning%20module%20management/Receive%20Imported%20Module.md). Earlier statements that imported entries remain permanently read-only are superseded by this explicit intake route; listing alone never creates history.
