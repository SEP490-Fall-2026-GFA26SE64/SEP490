# Role Catalog and Publication

**Source alignment — 2026-11-07.** Confirmed behavior is distinguished from checked-in implementation below. [Current source/schema/API contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) records local profile gates, exact ownership and remaining mismatches. Runtime/database acceptance is not established by this prose update.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 4.

**Contract basis:** confirmed behavior plus the later L&D Role–Level / Expert Skill–knowledge configuration decisions. Historical evidence retains its original scope; it is not a fresh passing result.

## Current Implementation

**Source-inspected:** HEAD `61d334c`, 2026-11-07; source inspection only. See the [implementation legend](../README.md#current-implementation-overview). Existing role operations are not yet the Version 2 publication workflow.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-04.03](#fr-04-03) | Partial | Organization role APIs and Neo4j persistence support listing/filtering, creation, details, updates, versions and assigned Expert IDs. The L&D page strictly mandates active job position selection before role creation, prevents creation when no job positions exist, and enforces department privacy boundaries without cross-department leaks or reload flashes. | Full trusted multi-tenant publication and assignment integration across all non-demo workspaces remains in progress. |
| [FR-04.04](#fr-04-04) | Partial | L&D publication controls update role state; the model carries DRAFT, SENT, REJECTED and ACTIVE values. | ACTIVE is displayed as published, but there is no complete L&D-only submitted-configuration review/unpublish/return lifecycle. The Expert screen can publish directly, conflicting with the required responsibility split. |
| [FR-05.02](#fr-05-02) | Partial | The Expert screen loads assigned roles and micro-skills, adds/removes explicit skill requirements and saves requiredKnowledgeLevels for actual member Levels. Stored targets are projected into graph requirement relationships; role graphs/prerequisites can be viewed. | Numeric target/weight no longer defines this adaptive flow; full trusted catalog publication/assignment integration still needs separate verification. Trusted Expert/job position scope and complete competency-level authoring remain gaps. |
| [FR-05.03](#fr-05-03) | Partial | Assigned-role authoring persists configuration edits and status changes. | The observed flow sends work from L&D to Experts; Experts can reject it back or publish ACTIVE directly. This does not implement Expert submission to L&D followed by return/revision and L&D approval. |

**Current inputs/rules:** roles carry code/name, domain/family, track/seniority, description, responsibilities, version, status and assigned Expert ID. Duplicate code/version is checked within an organization; track and seniority are validated. Active adaptive consumers use skill identity and explicit requiredKnowledgeLevels on the member-Level relationship; no percentage-to-knowledge inference is allowed. These fields do not establish all Version 2 job position, approval or importance semantics.

**Entry points:** `/ld-manager/target-roles`, `/expert/target-roles` (also `/expert/assigned-roles`). Employee catalog selection is documented under [Role guidance](../Role%20guidance/README.md#current-implementation).

**Code references:** [L&D role page](../../../frontend/src/features/manager/target-roles/TargetRolesPage.tsx), [Expert authoring/publication](../../../frontend/src/features/expert/target-roles/ExpertAssignedRolesPage.tsx), [role API](../../../backend/src/main/java/com/adaptlearngraph/apis/OrganizationTargetRoleController.java), [role service](../../../backend/src/main/java/com/adaptlearngraph/services/TargetRoleService.java), [graph persistence](../../../backend/src/main/java/com/adaptlearngraph/repository/Neo4jTargetRoleRepository.java), [skill-target model](../../../frontend/src/features/manager/data/ldManagerMockData.ts). See also the [shared authorization limitation](../README.md#cross-domain-boundaries).

Historical verification remains scoped to its original behavior: [target-role management](../../testing/REQ-023-target-role-management.md), [Expert assignment](../../testing/REQ-024-expert-assignment.md), [requirements](../../testing/REQ-015-role-requirements.md) and [graph editing](../../testing/REQ-018-target-role-graph-editing.md); these are not evidence that the revised L&D publication lifecycle is complete.

## Requirements

### Explicit Role–Level skill requirements

L&D retains Role management, Expert assignment and publication responsibility. The assigned Expert specifies each Role member Level's required skill + knowledge level(s) and defined outcomes. FOUNDATION / INTERMEDIATE / ADVANCED describe organization-defined knowledge, not job seniority. ADVANCED alone never implies lower levels. Current source already has member Levels; no new physical RoleLevel node is approved here.

Business inputs are Role/member-Level identity and version, skill references, explicitly selected knowledge levels and outcomes. Organization, actor, assignment and review metadata are server-derived; clients cannot set approvers or learner achievement. Organization-wide skill–knowledge provision mode comes from [Learning catalog](../Learning%20catalog/README.md#provision-modes-and-certificate-definitions), not a conflicting per-Role copy.

1. L&D assigns the Role; Expert reads its current configuration and member Levels.
2. Expert explicitly selects skill–knowledge requirements/outcomes. Reject duplicate/foreign/unknown references and stale revisions; keep incomplete configuration visibly unresolved.
3. Expert submits the exact revision to L&D; return/revision/publication preserve responsibility split and history. Review exposes missing module/certificate coverage; absence is not an automatic achievement or fabricated provider.
4. Baseline/planning consume coherent published requirements and retain their identity. Later changes cannot rewrite old attempts, approvals or official evidence.

Outputs show required skills/knowledge levels, outcomes, revision/status and missing coverage. Numeric target mastery/requiredScore and gap subtraction are replaced in this flow. Legacy threshold/relative-importance fields do not supply another scoring or optimizer rule. Other consumers require an inventory before physical retirement; no global field deletion is authorized here.

Keep current Target Roles list/details/graph, components, tokens, fonts, sizes, spacing and layout. English uses Role; Vietnamese uses Vị trí / Vị trí làm việc mong muốn. Current Role screens already display Required Knowledge and save explicit selections. Existing sample/fallback and legacy catalog authorization remain separate limitations; the rule flow cannot approve them by inference.

Current source implements the local rule flow and versioned mappings described in the technical contract. Full runtime, authorization, certificate/bypass/backfill and production verification remain unproved; source-policy mismatches are retained explicitly.

<a id="fr-04-03"></a>

### FR-04.03: Manage target roles

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.03 |
| 2. Requirement Name | Manage target roles |
| 3. Description | The L&D Manager shall create and update target role details within job positions, assign target roles to Experts, and monitor configuration status. |
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
| 3. Description | The assigned Expert shall manage each Role member Level's required skills and explicitly selected knowledge levels/outcomes, replacing numeric target mastery in this flow. |
| 4. Actor | Expert |
| 5. Preconditions | Trusted assigned Expert; same-organization Role/skills and current editable revision. |
| 6. Main Flow | Select member Level; explicitly choose skill/knowledge/outcomes; validate; save revision and submit through FR-05.03. |
| 7. Alternative / Exception Flows | No implicit inheritance or duplicate/foreign/stale references; missing coverage remains visible. |
| 8. Postconditions | Versioned explicit requirements are available for L&D review; learner evidence is unchanged. |
| 9. Acceptance Criteria | Knowledge level differs from seniority; numeric target/weight does not calculate gaps or choose module difficulty. |

<a id="fr-05-03"></a>

### FR-05.03: Submit completed target role configurations

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.03 |
| 2. Requirement Name | Submit completed target role configurations |
| 3. Description | The Expert shall submit completed target role competency configurations to the L&D Manager and revise returned configurations. |
| 4. Actor | Expert |
| 5. Preconditions | Assigned Expert and current editable configuration with explicit requirements. |
| 6. Main Flow | Submit exact revision to L&D; inspect return feedback; revise/resubmit preserving history. |
| 7. Alternative / Exception Flows | Stale/invalid references or assignment loss deny submission. Missing provision stays visible; the retained direct Expert publication path remains a conflict with Expert-submit/L&D-publish responsibility. |
| 8. Postconditions | Actual actors/reasons and submitted/returned history retained; submission itself does not publish. |
| 9. Acceptance Criteria | Expert submission and L&D publication stay distinct; existing direct-publish behavior is not reconfirmed. |

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
