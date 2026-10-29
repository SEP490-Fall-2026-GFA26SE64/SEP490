# Departments and Occupations

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 3.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-03.02](#fr-03-02) | Partial | Department CRUD/employee-assignment demonstrations use a browser store. Separately, the real administrator member editor persists department/occupation assignment against existing organization references. | Browser-created departments are not backend reference records. End-to-end department create/update/delete and synchronization with the real member editor are missing. |
| [FR-04.01](#fr-04-01) | Prototype | The occupations page lists sample O*NET-style records and supports local create/edit/deactivate/import interactions, including name, code, job zone, description and interest values. | The page uses component state; its occupation model lacks the required department association. It does not manage the backend occupation-department references. |
| [FR-04.02](#fr-04-02) | Prototype | L&D Managers can add/remove sample Experts on the local occupation records and inspect assigned lists. | There is no persisted occupation-Expert assignment workflow or downstream authorization based on those changes. Target-role assignment is a separate partial slice, not a substitute. |

**Entry points:** `/admin/departments`, `/ld-manager/occupations`; real member assignment is at `/admin/users`.

**Code references:** [department store](../../../frontend/src/shared/stores/departmentStore.ts), [occupation page](../../../frontend/src/features/manager/occupations/OccupationsManagementPage.tsx), [real member editor](../../../frontend/src/features/administration/user-management/UserManagementPage.tsx), [backend reference validation](../../../backend/src/main/java/com/adaptlearngraph/identity/infrastructure/JdbcMemberReferenceValidator.java). Account-reference storage must not be mistaken for a completed department/occupation management API.

## Requirements

<a id="fr-03-02"></a>

### FR-03.02: Manage departments

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-03.02 |
| 2. Requirement Name | Manage departments |
| 3. Description | The System Administrator shall create, view, update, and delete departments and assign or reassign employees to departments within the organization. |
| 4. Actor | System Administrator |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-04-01"></a>

### FR-04.01: Manage occupations

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.01 |
| 2. Requirement Name | Manage occupations |
| 3. Description | The L&D Manager shall create, view, update, and deactivate occupations, attach an occupation to a department during creation, and update its department association. |
| 4. Actor | L&D Manager |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-04-02"></a>

### FR-04.02: Assign Experts

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.02 |
| 2. Requirement Name | Assign Experts |
| 3. Description | The L&D Manager shall assign or remove Experts from occupations and view their current assignments. |
| 4. Actor | L&D Manager |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-063"></a>REQ-063 | [FR-03.02](#fr-03-02) |
| <a id="req-063-f01"></a>REQ-063-F01 | [FR-03.02](#fr-03-02) |
| <a id="req-063-f02"></a>REQ-063-F02 | [FR-03.02](#fr-03-02) |
| <a id="req-063-f03"></a>REQ-063-F03 | [FR-03.02](#fr-03-02) |
| <a id="req-063-f04"></a>REQ-063-F04 | [FR-03.02](#fr-03-02) |
| <a id="req-063-f05"></a>REQ-063-F05 | [FR-03.02](#fr-03-02) |
| <a id="req-050"></a>REQ-050 | [FR-04.01](#fr-04-01) |
| <a id="req-050-f01"></a>REQ-050-F01 | [FR-04.01](#fr-04-01) |
| <a id="req-050-f02"></a>REQ-050-F02 | [FR-04.01](#fr-04-01) |
| <a id="req-050-f03"></a>REQ-050-F03 | [FR-04.01](#fr-04-01) |
| <a id="req-050-f04"></a>REQ-050-F04 | [FR-04.01](#fr-04-01) |
| <a id="req-051"></a>REQ-051 | [FR-04.02](#fr-04-02) |
| <a id="req-051-f01"></a>REQ-051-F01 | [FR-04.02](#fr-04-02) |
| <a id="req-051-f02"></a>REQ-051-F02 | [FR-04.02](#fr-04-02) |
| <a id="req-051-f03"></a>REQ-051-F03 | [FR-04.02](#fr-04-02) |
