# Departments and Job Positions

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 3.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-03.02](#fr-03-02) | Implemented | System Administrators manage organizational departments via `/admin/departments`. Deactivate department functionality was removed and replaced with Department Delete with full cascade: deleting a department unassigns members (`department_id = NULL, job_position_reference_id = NULL`), removes associated Target Roles, Levels, and relationships in Neo4j while keeping Job Positions intact, and cleans up relational references in PostgreSQL. | Scope completed and verified with Playwright end-to-end tests (`REQ-063-F04-department-delete-cascade-unassign.spec.ts`). |
| [FR-04.01](#fr-04-01) | Partial; RIASEC fields re-inspected 2026-11-15 at `fb9d589ab12a` | The current job-position page calls catalog list/create/update APIs with six interest fields and Department-link APIs, while retaining browser cache/fallback/import behavior. Neo4j persistence is wired when a Driver is present. | Complete-profile validation/provenance and interest-matching eligibility are not established; missing fields become zeros in backend mapping, and FE can supply cached/default interests. End-to-end catalog/Department behavior was not reverified. |
| [FR-04.02](#fr-04-02) | Prototype | L&D Managers can add/remove sample Experts on the local job position records and inspect assigned lists. | There is no persisted job position-Expert assignment workflow or downstream authorization based on those changes. Target-role assignment is a separate partial slice, not a substitute. |

**Entry points:** `/admin/departments`, `/ld-manager/job-positions`; real member assignment is at `/admin/users`.

**Code references:** [department store](../../../frontend/src/shared/stores/departmentStore.ts), [job position page](../../../frontend/src/features/manager/job-positions/JobPositionsManagementPage.tsx), [real member editor](../../../frontend/src/features/administration/user-management/UserManagementPage.tsx), [backend reference validation](../../../backend/src/main/java/com/adaptlearngraph/repository/JdbcMemberReferenceValidator.java). Account-reference storage must not be mistaken for a completed department/job position management API.

## RIASEC job-position profiles — target contract, 2026-11-15

**Status:** extension design for matching, not an implemented completeness guarantee. Other Department/Expert/Role publication/deactivation/deletion contracts and historical evidence retain their scope. A job position groups target Roles; its interest vector does not select a Role/member Level or change competency, baseline or pathway policy.

### Fields, units and provenance

Keep existing job-position catalog IDs, CRUD and authoritative Neo4j storage. Do not create a second catalog for AI. Persisted learner results, recommendation snapshots and chat belong to PostgreSQL, with references/snapshots rather than a competing editable job catalog.

| Existing API field | Dimension | Matching value |
| --- | --- | --- |
| `interestRealistic` | R — Realistic | Finite number 0–1 inclusive |
| `interestInvestigative` | I — Investigative | Finite number 0–1 inclusive |
| `interestArtistic` | A — Artistic | Finite number 0–1 inclusive |
| `interestSocial` | S — Social | Finite number 0–1 inclusive |
| `interestEnterprising` | E — Enterprising | Finite number 0–1 inclusive |
| `interestConventional` | C — Conventional | Finite number 0–1 inclusive |

These are independent interest intensities; they need not sum to one. Preserve a supplied zero. Reject nonnumeric, nonfinite and out-of-range values when explicitly writing a profile. The existing manager form displays 0–100 and divides by 100 before sending 0–1; retain those API units. An empty field remains missing until deliberately answered, rather than being coerced to zero or a plausible preset. Neither profile units nor similarity are hiring-confidence percentages.

Matching-ready requires all six **explicit** values plus authoritative completeness/provenance: source kind (manager-authored or identified import), source/reference and original units/conversion where applicable, author/import identity and timestamp, immutable profile revision or canonical content hash. Complete all-zero values are valid catalog data but unrankable (zero norm). Default/coalesced/cache/seed appearance does not prove completeness or official source validity. Legacy records with uncertain origin remain incomplete until an authorized explicit profile save confirms all six; do not auto-backfill, rewrite seeds or bless old defaults.

Label manager-authored profiles as organization judgments, not official O*NET data or validated psychometric profiles. A future authorized O*NET profile import must identify release, occupation code, source scale and conversion, and follow the separately referenced [O*NET Database license](https://www.onetcenter.org/license_tools.html) rather than treating the questionnaire license as covering database content. No O*NET import, scale conversion of existing data or provenance backfill is performed here.

### Writes, compatibility and visibility

- Extend the existing L&D form/API only. Server derives manager membership/entitlement and tenant from trusted context and checks existing management/Department scope; request path `organizationId` is not authorization. Retain existing Department links, Expert references, publication, status and delete/deactivation constraints. Profile readiness does not grant new catalog access or change those rules.
- An explicit profile create/update accepts all six values atomically, validates provenance and checks expected revision. Partial six-field replacement is an error. For legacy/general edits that omit the entire interest profile (including status-only updates), preserve stored values **and** readiness/provenance; do not manufacture six zeros or require unrelated metadata edits to complete an old profile. New records may stay incomplete for old catalog flows, but enter matching only after explicit complete-profile save. Model request presence separately from numeric zero.
- Add completeness/revision/provenance response metadata compatibly; existing six field names/units and catalog consumers remain usable. The matching projection must read authoritative presence/metadata before any defaulting, not infer completeness from a DTO containing six numeric values. Profile writes and the associated revision update are atomic; stale writes fail without losing accepted data. Retried writes with the same scoped command identity/payload do not create another revision; conflicting replay cannot replace it.
- [Ranking eligibility](../Role%20guidance/README.md#riasec-job-position-exploration) requires active same-organization positions, authoritative Employee Department links, complete finite values and nonzero norm. Use graph IDs plus trusted relational membership/reference mapping; never guess identity from names or unscoped codes. Department changes and status/profile changes affect future ranking; historical snapshots retain their original versions with current access checks. Missing links or a catalog outage never use browser cache/import records as ranking fallback.
- Old incomplete records remain listable/editable wherever existing catalog policy allows. Matching excludes them with a truthful incomplete-profile state/count, not a zero score masquerading as a poor match. Do not bulk repair existing records or change unrelated DTOs/projections solely for this feature.

### Inspected wiring and remaining implementation gaps

[SaveJobPositionRequest](../../../backend/src/main/java/com/adaptlearngraph/dtos/SaveJobPositionRequest.java) already has six nullable Double fields. [JobPositionController](../../../backend/src/main/java/com/adaptlearngraph/apis/JobPositionController.java) delegates to [JobPositionApplicationService](../../../backend/src/main/java/com/adaptlearngraph/services/JobPositionApplicationService.java), then JobPositionService/JobPositionRepository. [CatalogConfiguration](../../../backend/src/main/java/com/adaptlearngraph/config/CatalogConfiguration.java) selects [Neo4jJobPositionRepository](../../../backend/src/main/java/com/adaptlearngraph/repository/Neo4jJobPositionRepository.java) when a Driver exists; its no-Driver alternative returns empty reads and echoes saves without persistence. Matching must report catalog unavailable rather than accept this alternative as proof of a saved catalog.

Application mapping substitutes zero for omitted interest fields, and the Neo4j projection coalesces absent properties to zero. The [manager page](../../../frontend/src/features/manager/job-positions/JobPositionsManagementPage.tsx) calls [jobPositionApi](../../../frontend/src/shared/api/jobPositionApi.ts), mixes server/cache/default interests, and sends only code/name/status for status toggles. With current defaulting that path can replace omitted interests with zeros; this is a static risk, not a reproduced data-loss incident. Explicit-profile writes versus metadata-only writes must be distinguished during implementation. Uniform server management/Department authorization, genuine stored profile completeness and actual database contents remain unverified; no runtime/data action was performed.

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
| 3. Description | The L&D Manager shall create, view, update, and deactivate job positions, attach a job position to a department during creation, and update its department association; the RIASEC extension maintains an explicit versioned six-interest profile for matching without changing those catalog rules. |
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
