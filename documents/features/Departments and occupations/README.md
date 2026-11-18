# Departments and Job Positions

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 3.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-03.02](#fr-03-02) | Implemented | System Administrators manage organizational departments via `/admin/departments`. Deactivate department functionality was removed and replaced with Department Delete with full cascade: deleting a department unassigns members (`department_id = NULL, job_position_reference_id = NULL`), removes associated Target Roles, Levels, and relationships in Neo4j while keeping Job Positions intact, and cleans up relational references in PostgreSQL. | Scope completed and verified with Playwright end-to-end tests (`REQ-063-F04-department-delete-cascade-unassign.spec.ts`). |
| [FR-04.01](#fr-04-01) | Partial domain; RIASEC fields implemented/re-inspected 2026-11-18 | L&D CRUD persists six optional all-or-none integers 0–40 in Neo4j; omission preserves, six nulls clear, absent reads remain absent. | Unrelated cache/import/Department/Expert limits retain original scope; no fresh end-to-end certification. |
| [FR-04.02](#fr-04-02) | Prototype | L&D Managers can add/remove sample Experts on the local job position records and inspect assigned lists. | There is no persisted job position-Expert assignment workflow or downstream authorization based on those changes. Target-role assignment is a separate partial slice, not a substitute. |

**Entry points:** `/admin/departments`, `/ld-manager/job-positions`; real member assignment is at `/admin/users`.

**Code references:** [department store](../../../frontend/src/shared/stores/departmentStore.ts), [job position page](../../../frontend/src/features/manager/job-positions/JobPositionsManagementPage.tsx), [real member editor](../../../frontend/src/features/administration/user-management/UserManagementPage.tsx), [backend reference validation](../../../backend/src/main/java/com/adaptlearngraph/repository/JdbcMemberReferenceValidator.java). Account-reference storage must not be mistaken for a completed department/job position management API.

<a id="riasec-job-position-profiles--target-contract-2026-11-15"></a>
<a id="riasec-job-position-profiles"></a>

## RIASEC Job Position profiles — current implementation, 2026-11-18

Approved 17 November behavior supersedes 0–1/0–100 and Department-only cosine/provenance designs. Job Position profiles live **only in Neo4j**; PostgreSQL saves recommendation JSON snapshots, not a second editable catalog. Existing Department/Expert/Role contracts retain their scope.

| Field | Interest | Stored/API value |
| --- | --- | --- |
| interestRealistic | R — Realistic | Optional integer 0–40 |
| interestInvestigative | I — Investigative | Optional integer 0–40 |
| interestArtistic | A — Artistic | Optional integer 0–40 |
| interestSocial | S — Social | Optional integer 0–40 |
| interestEnterprising | E — Enterprising | Optional integer 0–40 |
| interestConventional | C — Conventional | Optional integer 0–40 |

Explicit save requires all six values or all absent; six zeros are valid and missing is not zero. [SaveJobPositionRequest](../../../backend/src/main/java/com/adaptlearngraph/dtos/SaveJobPositionRequest.java) models JsonNode presence: omit all fields to preserve; six explicit nulls clear; otherwise all six must be integers 0–40. Partial/null-mixed/decimal/out-of-range writes fail `INVALID_RIASEC_PROFILE`. No division by 100 or normalized mapping remains.

[Application service](../../../backend/src/main/java/com/adaptlearngraph/services/JobPositionApplicationService.java) maps the atomic profile through existing commands; [repository](../../../backend/src/main/java/com/adaptlearngraph/repository/Neo4jJobPositionRepository.java) patches the six properties and reads valid native integers without default zeros. [L&D form/details](../../../frontend/src/features/manager/job-positions/JobPositionsManagementPage.tsx) accepts all six integers or all blank; missing displays `—`. Status-only omission preserves interests. Create/edit body scrolls within a viewport-bounded dialog with a separate footer; latest runtime scroll remains unverified.

[AI candidates](../Role%20guidance/README.md#riasec-job-position-exploration) need ACTIVE same-org nodes with ID/complete valid profile. No Department filter, nonzero gate or mandatory provenance/hash/revision readiness metadata is implemented. Generic catalog management authorization/version remains separate; this is not all-entry security certification. Interest edits are excluded from learning-catalog fingerprints, preserving Role requirement snapshots.

Approved changes updated 30 values in each of `ontology_seed-skill-level.json` and `ontology_seed-prerequisite-knowledge.json`; the local receipt records six new demo values on 8 existing nodes. These are **demo/organization profiles**, not official normalized O*NET 31.0 or validated occupation profiles. Older release seeds/workbooks retain historical units; do not import/convert them as current profiles without separate scope. No DB/profile/seed write occurs in this documentation task. [Current schema](../../neo4j_schema.md#riasec-current-source), [historical provenance](../../dataset/ONTOLOGY.md).

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

### FR-04.01: Manage job positions

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.01 |
| 2. Requirement Name | Manage job positions |
| 3. Description | The L&D Manager shall create, view, update, and deactivate job positions, attach a job position to a department during creation, and update its department association; the RIASEC extension maintains an optional all-or-none integer 0–40 six-interest profile for AI exploration without changing those catalog rules. |
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
| 3. Description | The L&D Manager shall assign or remove Experts from job positions and view their current assignments. |
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
