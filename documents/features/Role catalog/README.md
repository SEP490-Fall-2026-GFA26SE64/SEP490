# Role Catalog and Publication

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 4.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview). Existing role operations are not yet the Version 2 publication workflow.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-04.03](#fr-04-03) | Partial | Organization role APIs and Neo4j persistence support listing/filtering, creation, details, updates, versions and assigned Expert IDs. The L&D page calls those APIs and displays configuration status. | The UI still uses browser-company context and a sample eligible-Expert list; role domain/family fields are not a complete occupation/department relationship. Some local import/fallback operations are not durable API writes. |
| [FR-04.04](#fr-04-04) | Partial | L&D publication controls update role state; the model carries DRAFT, SENT, REJECTED and ACTIVE values. | ACTIVE is displayed as published, but there is no complete L&D-only submitted-configuration review/unpublish/return lifecycle. The Expert screen can publish directly, conflicting with the required responsibility split. |
| [FR-05.02](#fr-05-02) | Partial | The Expert screen loads assigned roles and micro-skills, adds/removes skill targets and saves proficiency thresholds. Stored targets are projected into graph requirement relationships; role graphs/prerequisites can be viewed. | The saved skill-target model carries a threshold, not a complete relative-importance configuration despite UI wording about weights. Trusted Expert/occupation scope and complete competency-level authoring remain gaps. |
| [FR-05.03](#fr-05-03) | Partial | Assigned-role authoring persists configuration edits and status changes. | The observed flow sends work from L&D to Experts; Experts can reject it back or publish ACTIVE directly. This does not implement Expert submission to L&D followed by return/revision and L&D approval. |

**Current inputs/rules:** roles carry code/name, domain/family, track/seniority, description, responsibilities, version, status and assigned Expert ID. Duplicate code/version is checked within an organization; track and seniority are validated. Skill targets carry skill identity and a percentage threshold. These fields do not establish all Version 2 occupation, approval or importance semantics.

**Entry points:** `/ld-manager/target-roles`, `/expert/target-roles` (also `/expert/assigned-roles`). Employee catalog selection is documented under [Role guidance](../Role%20guidance/README.md#current-implementation).

**Code references:** [L&D role page](../../../frontend/src/features/manager/target-roles/TargetRolesPage.tsx), [Expert authoring/publication](../../../frontend/src/features/expert/target-roles/ExpertAssignedRolesPage.tsx), [role API](../../../backend/src/main/java/com/adaptlearngraph/catalog/api/OrganizationTargetRoleController.java), [role service](../../../backend/src/main/java/com/adaptlearngraph/catalog/application/TargetRoleService.java), [graph persistence](../../../backend/src/main/java/com/adaptlearngraph/catalog/infrastructure/Neo4jTargetRoleRepository.java), [skill-target model](../../../frontend/src/features/manager/data/ldManagerMockData.ts). See also the [shared authorization limitation](../README.md#cross-domain-boundaries).

Historical verification remains scoped to its original behavior: [target-role management](../../testing/REQ-023-target-role-management.md), [Expert assignment](../../testing/REQ-024-expert-assignment.md), [requirements](../../testing/REQ-015-role-requirements.md) and [graph editing](../../testing/REQ-018-target-role-graph-editing.md); these are not evidence that the revised L&D publication lifecycle is complete.

## Requirements

<a id="fr-04-03"></a>

### FR-04.03: Manage target roles

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.03 |
| 2. Requirement Name | Manage target roles |
| 3. Description | The L&D Manager shall create and update target role details within occupations, assign target roles to Experts, and monitor configuration status. |
| 4. Actor | L&D Manager |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-04-04"></a>

### FR-04.04: Manage target role publication

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.04 |
| 2. Requirement Name | Manage target role publication |
| 3. Description | The L&D Manager shall review submitted target role configurations, publish or unpublish target roles, and return configurations to Experts for revision. |
| 4. Actor | L&D Manager |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-05-02"></a>

### FR-05.02: Manage role competency requirements

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.02 |
| 2. Requirement Name | Manage role competency requirements |
| 3. Description | The Expert shall add or remove required competencies and micro-skills for assigned target roles and set required proficiency levels and relative importance. |
| 4. Actor | Expert |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-05-03"></a>

### FR-05.03: Submit completed target role configurations

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.03 |
| 2. Requirement Name | Submit completed target role configurations |
| 3. Description | The Expert shall submit completed target role competency configurations to the L&D Manager and revise returned configurations. |
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
| <a id="req-023"></a>REQ-023 | [FR-04.03](#fr-04-03) |
| <a id="req-023-f01"></a>REQ-023-F01 | [FR-04.03](#fr-04-03) |
| <a id="req-023-f02"></a>REQ-023-F02 | [FR-04.03](#fr-04-03) |
| <a id="req-023-f03"></a>REQ-023-F03 | [FR-04.03](#fr-04-03) |
| <a id="req-024"></a>REQ-024 | [FR-04.03](#fr-04-03) |
| <a id="req-024-f01"></a>REQ-024-F01 | [FR-04.03](#fr-04-03) |
| <a id="req-024-f02"></a>REQ-024-F02 | [FR-04.03](#fr-04-03) |
| <a id="req-011"></a>REQ-011 | [FR-05.02](#fr-05-02) |
| <a id="req-011-f01"></a>REQ-011-F01 | [FR-05.02](#fr-05-02) |
| <a id="req-015"></a>REQ-015 | [FR-05.02](#fr-05-02); [FR-05.03](#fr-05-03) |
| <a id="req-015-f01"></a>REQ-015-F01 | [FR-05.02](#fr-05-02) |
| <a id="req-015-f02"></a>REQ-015-F02 | [FR-05.02](#fr-05-02) |
| <a id="req-015-f03"></a>REQ-015-F03 | [FR-05.02](#fr-05-02) |
| <a id="req-015-f04"></a>REQ-015-F04 | [FR-05.02](#fr-05-02) |
| <a id="req-015-f05"></a>REQ-015-F05 | [FR-05.02](#fr-05-02) |
| <a id="req-015-f06"></a>REQ-015-F06 | [FR-05.03](#fr-05-03) |
| <a id="req-015-f07"></a>REQ-015-F07 | [FR-05.03](#fr-05-03) |
| <a id="req-052"></a>REQ-052 | [FR-04.04](#fr-04-04) |
| <a id="req-052-f01"></a>REQ-052-F01 | [FR-04.04](#fr-04-04) |
| <a id="req-052-f02"></a>REQ-052-F02 | [FR-04.04](#fr-04-04) |
| <a id="req-052-f03"></a>REQ-052-F03 | [FR-04.04](#fr-04-04) |
| <a id="req-052-f04"></a>REQ-052-F04 | [FR-04.04](#fr-04-04) |
| <a id="req-001"></a>REQ-001 | [FR-06.04](../Role%20guidance/README.md#fr-06-04) |
| <a id="req-001-f01"></a>REQ-001-F01 | [FR-06.04](../Role%20guidance/README.md#fr-06-04) |
| <a id="req-001-f02"></a>REQ-001-F02 | [FR-06.04](../Role%20guidance/README.md#fr-06-04) |
