# Role Catalog and Publication

**Latest direction — 2026-11-05-r3.** [Target schema/API/flow](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) now maps this flow; it is not applied runtime. Baseline records only assessed skills and never creates unassessed prerequisites; skill assessment can discover them as **Cần bổ sung**. Baseline/skill have two independently configured policies with timed auto-finalization. Cross-target old bypass work is parallel/non-gating. Affected old dev records may be rebuilt; normal new-flow history remains. Preserve FE design and classify existing Question Bank content into appropriate knowledge levels with corresponding field changes.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 4.

**Feature direction: 2026-11-05.** Affected contracts below supersede numeric targets for this flow; C1 acceptance is pending. Dated implementation/evidence retains its original scope and does not prove the new direction is implemented. Target technical mapping is now specified in r3; runtime/seed implementation and detailed changed UI review remain pending. Unrelated fields remain unspecified; IDs/anchors are retained.

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview). Existing role operations are not yet the Version 2 publication workflow.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-04.03](#fr-04-03) | Partial | Organization role APIs and Neo4j persistence support listing/filtering, creation, details, updates, versions and assigned Expert IDs. The L&D page calls those APIs and displays configuration status. | The UI still uses browser-company context and a sample eligible-Expert list; role domain/family fields are not a complete job position/department relationship. Some local import/fallback operations are not durable API writes. |
| [FR-04.04](#fr-04-04) | Partial | L&D publication controls update role state; the model carries DRAFT, SENT, REJECTED and ACTIVE values. | ACTIVE is displayed as published, but there is no complete L&D-only submitted-configuration review/unpublish/return lifecycle. The Expert screen can publish directly, conflicting with the required responsibility split. |
| [FR-05.02](#fr-05-02) | Partial | The Expert screen loads assigned roles and micro-skills, adds/removes skill targets and saves proficiency thresholds. Stored targets are projected into graph requirement relationships; role graphs/prerequisites can be viewed. | The saved skill-target model carries a threshold, not a complete relative-importance configuration despite UI wording about weights. Trusted Expert/job position scope and complete competency-level authoring remain gaps. |
| [FR-05.03](#fr-05-03) | Partial | Assigned-role authoring persists configuration edits and status changes. | The observed flow sends work from L&D to Experts; Experts can reject it back or publish ACTIVE directly. This does not implement Expert submission to L&D followed by return/revision and L&D approval. |

**Current inputs/rules:** roles carry code/name, domain/family, track/seniority, description, responsibilities, version, status and assigned Expert ID. Duplicate code/version is checked within an organization; track and seniority are validated. Skill targets carry skill identity and a percentage threshold. These fields do not establish all Version 2 job position, approval or importance semantics.

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

Keep current Target Roles list/details/graph, components, tokens, fonts, sizes, spacing and layout. English uses Role; Vietnamese uses Vị trí / Vị trí làm việc mong muốn. Detailed tick controls and field binding are reviewed in define C2.

Target fields/storage/versioning and state rules are specified in r3. C2 still must implement exact scoped constraints, classify real content, handle dependency failures and present detailed changed UI/data binding for review. No runtime/production readiness is claimed.

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
| 7. Alternative / Exception Flows | Stale/invalid references or assignment loss deny submission. Missing-provision publication handling remains open for define C2. |
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
