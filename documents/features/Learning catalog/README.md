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
