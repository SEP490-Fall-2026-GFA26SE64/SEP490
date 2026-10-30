# AI-Assisted Role Guidance

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 2.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview). Catalog selection and AI guidance have different implementation status.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-06.04](#fr-06-04) | Partial | Employees browse authorized reviewed organization roles, inspect level/skill requirements and persist a replay-safe target-role choice under their real workspace session. The role view connects to baseline readiness, own attempts and stored mastery. | AI-generated suggestions/comments remain unimplemented. Catalog/bank/model provisioning is separate; missing resources remain unavailable. |
| [FR-07.07](#fr-07-07) | Foundation only | Recommendation schema/package placeholders and sample role-match presentation exist. | No backend AI inference, assessment/RIASEC-based suggestion generation or persisted explanation workflow was found. Labels such as AI match are not evidence of an implemented AI service. |

**Observed selection rules:** the backend requires an active authenticated Employee membership, entitlement and an available organization role, checks the selected snapshot, supports idempotent command replay and reports unavailable catalog/selection conflicts. Baseline uses pinned persisted evidence; pathway generation and AI advice remain separate. Historical selections are preserved; incompatible legacy selections are explicitly identified for reselection rather than silently rewritten.

**Workspace integration:** [Current role UI](../../../frontend/src/features/employee/target-roles/CurrentRolePanel.tsx), [role flow](../../../backend/src/main/java/com/adaptlearngraph/learning/application/RoleBaselineFlow.java) and [workspace adapter](../../../backend/src/main/java/com/adaptlearngraph/assessment/adaptive/infrastructure/WorkspaceBaselineConfiguration.java) replace demo identity for the active slice. [Local verification and limitations](../../testing/system/REQ-002-workspace-baseline.md) cover actual APIs and two isolated organizations, not AI generation.

**Entry point:** `/employee/upskilling?tab=roles`. `/employee/guidance` redirects there; the standalone guidance page is not the active route. Initial Expert review belongs to [Pathway review](../Pathway%20review/README.md#current-implementation), not a guidance approval gate.

**Historical code references:** [role browsing and sample recommendations](../../../frontend/src/features/employee/target-roles/TargetRoleBrowsePanel.tsx), [selection service](../../../backend/src/main/java/com/adaptlearngraph/learning/application/TargetRoleSelectionService.java), [selection persistence](../../../backend/src/main/java/com/adaptlearngraph/learning/infrastructure/JdbcTargetSelectionPersistence.java), [configured Employee context](../../../backend/src/main/java/com/adaptlearngraph/catalog/infrastructure/ConfiguredEmployeeContextAdapter.java), [recommendation package](../../../backend/src/main/java/com/adaptlearngraph/recommendation/). Historical evidence covers [role browsing](../../testing/REQ-001-F01-view-target-roles.md) and [selection](../../testing/REQ-001-F02-choose-target-role.md), not AI generation.

## Requirements

<a id="fr-06-04"></a>

### FR-06.04: Review target role guidance

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.04 |
| 2. Requirement Name | Review target role guidance |
| 3. Description | The Employee shall view AI-generated role suggestions and comments and select or confirm a published target role within the organization. |
| 4. Actor | Employee |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-07-07"></a>

### FR-07.07: Generate target role guidance

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.07 |
| 2. Requirement Name | Generate target role guidance |
| 3. Description | The System shall generate AI-assisted target role suggestions and explanations for Employees. |
| 4. Actor | System |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-048"></a>REQ-048 | [FR-06.04](#fr-06-04); [FR-07.07](#fr-07-07) |
| <a id="req-048-f01"></a>REQ-048-F01 | [FR-07.07](#fr-07-07) |
| <a id="req-048-f02"></a>REQ-048-F02 | [FR-06.04](#fr-06-04) |
