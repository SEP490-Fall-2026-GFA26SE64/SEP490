# Learning Catalog and Approval

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 5.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-04.06](#fr-04-06) | Prototype | The L&D approval queue displays seeded module/assessment submissions and changes their local status to approved or revision-requested, with feedback. | The queue is not populated by Expert submissions and does not persist approval of a module/content/assessment bundle. |
| [FR-05.01](#fr-05-01) | Partial | Micro-skill APIs and Neo4j persistence support search, create, update/status and guarded deletion. The ontology page loads skills and macro competencies and calls skill mutations. | The authoring model covers code/name/description/macro category/status, not complete assigned-occupation proficiency-level management. Legacy actor headers/browser company context remain. |
| [FR-05.04](#fr-05-04) | Partial | Prerequisite APIs list, save and remove graph edges with minimum mastery/status; the service rejects self-edges, cycles and mastery outside 0..1. The ontology UI uses those APIs. | Trusted assignment-scoped authorization and complete update UX remain unestablished. Local import/browser data is not equivalent to a persisted prerequisite operation. |
| [FR-05.05](#fr-05-05) | Prototype | The module page edits versioned local module records, skill mappings, duration and a sample content URI, using company browser storage. | No connected module/content authoring API, private-file upload/access workflow or persisted ordered content lifecycle was found. A content URI is not an implemented content-management service. |
| [FR-05.08](#fr-05-08) | Prototype | Local module/question/blueprint authoring and a separate sample L&D queue exist. | There is no durable submission that transfers a versioned module plus content and assessments into that queue and supports revision/resubmission. |

**Entry points:** `/expert/ontology`, `/expert/modules`, `/expert/assessment-bank`, `/ld-manager/approvals`.

**Code references:** [ontology page](../../../frontend/src/features/manager/ontology/CompetencyOntologyPage.tsx), [micro-skill API](../../../backend/src/main/java/com/adaptlearngraph/competency/api/MicroSkillController.java), [prerequisite service](../../../backend/src/main/java/com/adaptlearngraph/competency/application/PrerequisiteService.java), [module prototype](../../../frontend/src/features/manager/modules/LearningModulesPage.tsx), [approval prototype](../../../frontend/src/features/manager/approvals/ContentApprovalQueuePage.tsx), [company browser store](../../../frontend/src/shared/stores/companyStore.ts). Module assessment authoring is separately described in [Assessment workflows](../Assessment%20workflows/README.md#current-implementation).

## Requirements

<a id="fr-04-06"></a>

### FR-04.06: Approve learning offerings

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.06 |
| 2. Requirement Name | Approve learning offerings |
| 3. Description | The L&D Manager shall review submitted learning modules, learning content, and module assessments; approve them; or return them to Experts for revision. |
| 4. Actor | L&D Manager |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-05-01"></a>

### FR-05.01: Manage micro-skills

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.01 |
| 2. Requirement Name | Manage micro-skills |
| 3. Description | The Expert shall create, view, update, and deactivate micro-skills within assigned occupations, including descriptions and proficiency levels. |
| 4. Actor | Expert |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-05-04"></a>

### FR-05.04: Manage skill prerequisites

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.04 |
| 2. Requirement Name | Manage skill prerequisites |
| 3. Description | The Expert shall define, update, and remove prerequisite relationships between micro-skills. |
| 4. Actor | Expert |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-05-05"></a>

### FR-05.05: Manage learning modules

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.05 |
| 2. Requirement Name | Manage learning modules |
| 3. Description | The Expert shall create, update, and organize learning modules, map modules to micro-skills, and add, update, organize, or remove learning content within each module. |
| 4. Actor | Expert |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-05-08"></a>

### FR-05.08: Submit content for approval

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.08 |
| 2. Requirement Name | Submit content for approval |
| 3. Description | The Expert shall submit new or revised learning modules, including their learning content and module assessments, to the L&D Manager for approval. |
| 4. Actor | Expert |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-012"></a>REQ-012 | [FR-05.01](#fr-05-01) |
| <a id="req-012-f01"></a>REQ-012-F01 | [FR-05.01](#fr-05-01) |
| <a id="req-012-f02"></a>REQ-012-F02 | [FR-05.01](#fr-05-01) |
| <a id="req-012-f03"></a>REQ-012-F03 | [FR-05.01](#fr-05-01) |
| <a id="req-012-f05"></a>REQ-012-F05 | [FR-05.01](#fr-05-01) |
| <a id="req-018"></a>REQ-018 | [FR-05.04](#fr-05-04) |
| <a id="req-018-f01"></a>REQ-018-F01 | Related to [FR-05.04](#fr-05-04); graph presentation is not a separate function in section 3.2(c). |
| <a id="req-018-f02"></a>REQ-018-F02 | [FR-05.04](#fr-05-04) |
| <a id="req-013"></a>REQ-013 | [FR-05.05](#fr-05-05) |
| <a id="req-013-f01"></a>REQ-013-F01 | [FR-05.05](#fr-05-05) |
| <a id="req-013-f02"></a>REQ-013-F02 | [FR-05.05](#fr-05-05) |
| <a id="req-013-f03"></a>REQ-013-F03 | [FR-05.05](#fr-05-05) |
| <a id="req-013-f05"></a>REQ-013-F05 | [FR-05.05](#fr-05-05) |
| <a id="req-016"></a>REQ-016 | [FR-05.05](#fr-05-05) |
| <a id="req-016-f01"></a>REQ-016-F01 | [FR-05.05](#fr-05-05) |
| <a id="req-016-f02"></a>REQ-016-F02 | [FR-05.05](#fr-05-05) |
| <a id="req-054"></a>REQ-054 | [FR-05.05](#fr-05-05) |
| <a id="req-054-f01"></a>REQ-054-F01 | [FR-05.05](#fr-05-05) |
| <a id="req-054-f02"></a>REQ-054-F02 | [FR-05.05](#fr-05-05) |
| <a id="req-054-f03"></a>REQ-054-F03 | [FR-05.05](#fr-05-05) |
| <a id="req-054-f04"></a>REQ-054-F04 | [FR-05.05](#fr-05-05) |
| <a id="req-054-f05"></a>REQ-054-F05 | [FR-05.05](#fr-05-05) |
| <a id="req-053"></a>REQ-053 | [FR-04.06](#fr-04-06); [FR-05.08](#fr-05-08) |
| <a id="req-053-f01"></a>REQ-053-F01 | [FR-05.08](#fr-05-08) |
| <a id="req-053-f02"></a>REQ-053-F02 | [FR-04.06](#fr-04-06) |
| <a id="req-053-f03"></a>REQ-053-F03 | [FR-04.06](#fr-04-06) |
| <a id="req-053-f04"></a>REQ-053-F04 | [FR-04.06](#fr-04-06) |

## Learning Content local delivery — 2026-10-29

The existing Module workspace now supports ordered Text/Video lessons, rich text/table/code/link/private-image editing and preview, MP4 upload, YouTube/Vimeo adapters, and immutable content revisions. Incomplete manual drafts can be saved; submission/import requires complete valid content. L&D reviews the whole Module revision. Creator, responsible Expert, subsequent editor and reviewer history stay in PostgreSQL; another Expert has read-only access.

Excel imports use Modules/Lessons sheets; ZIP packages add referenced Markdown/video/images. Preview makes no Module writes; confirmation revalidates the complete batch atomically. A foreign-owned duplicate rejects the batch. An owned released duplicate requires explicit confirmation to create a new draft revision; unresolved draft/review conflicts are rejected. Legacy Markdown becomes one stable Text lesson; absent content is shown as Needs content.

Only confirmed same-organization manual pathways admit Employees. Versioned content, resume/coverage/completion and notifications are persisted; private bytes are stored in MinIO. Upload limits are audited global Platform Administrator settings. No automatic asset deletion is installed. [Architecture/store fields](../../ARCHITECTURE.md#learning-content-runtime-extension--v35v38), [actual tests and manual checklist](../../testing/system/REQ-013-learning-content.md). Local YouTube and uploaded MP4 playback passed; Vimeo live acceptance remains blocked by the external provider's connection-security restriction. This does not claim full production or module-assessment completion.


## R4 local refinement — 2026-10-29

Module and content creation now require the responsible Expert's real organization/session, valid skill mappings and the existing content rules; no Occupation selection or grant is required. Content reuse is not filtered by Occupation. New records have no occupation membership; old snapshot tags/history remain intact. Excel/ZIP templates omit occupationIds, and the optional old column is ignored. Owner and cross-organization protections remain enforced.

L&D Details & history displays each revision's **Lesson 1, Lesson 2, Lesson 3…** as individual cards with title, Reading/Video, duration and actual content/player. The combined “Preview this content version” expander is removed. Review still approves or returns the complete Module revision, not individual lessons. Shared preview components use the same numbered presentation.

Private media also revalidates the trusted session/workspace on async servlet redispatch, fixing an actual AccessDenied stream failure without public access or fake identities. The pre-existing catalog intake permission controls remain explicitly labeled intake-only.

Verified locally: creation without Occupation, three-lesson desktop/mobile L&D reading/playback/release, Excel new/legacy compatibility, organization/owner isolation, Employee private video 90%/reload, 43 backend unit/API checks, 12 frontend checks and 2 affected store-integration scenarios across focused runs. [Evidence and manual checklist](../../testing/system/REQ-013-learning-content-R4.md). This refinement does not certify the separate Vimeo/live-provider or complete module-assessment boundaries.


## Module responsibility and peer visibility

For the implemented local FR-05.05/FR-05.08 slice, each Module has one responsible Expert. A new Module is owned by its authenticated creator. Only that Expert may edit, submit, delete an eligible draft, request archiving or restore a Module. Other Experts in the same organization may inspect content, creator, edit dates and review history; sharing an Occupation grants no editing permission. Organization isolation and existing deletion/archive safeguards remain in effect.

L&D selects exactly one Expert when assigning a catalog Module for intake; only that Expert can receive it. L&D continues approving or returning submitted revisions under FR-04.06. The local existing-data handover assigns modules to the selected development Expert with an audit event, preserves previous versions/decisions and does not auto-approve imported content. Creator/editor/reviewer names and dates are shown separately.
