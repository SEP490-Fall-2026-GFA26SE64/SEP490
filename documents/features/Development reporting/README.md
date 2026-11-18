# Employee and Department Development Reporting

**Source alignment — 2026-11-07.** [Current rule-flow input/ownership contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) separates diagnostics, official evidence, bypass and pending supplementation. No new reporting or notification delivery result is asserted.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 2.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-04.07](#fr-04-07) | Partial (implemented slice) | L&D Manager reads a real, same-organization development report: Dashboard (KPI cards and charts only — status mix, department summaries, assessment outcomes, pathway timeline, target roles, job-position readiness, learning activity) and an Employees list (search, department, job position and status filters) with a per-employee profile showing competency compared with target, skill gaps, read-only learning pathway, assessment outcomes and official achievements. Values come from target selection, pathway, assessment and evidence owners; missing data is shown as unavailable, never estimated. | Training ROI, recording/updating costs and monetary benefits, and reporting-period filtering are not implemented. |
| [FR-07.09](#fr-07-09) | Foundation only | Analytics snapshots and ROI-scenario schema exist. Employee and department development summaries are aggregated from the real FR-04.07 report; the former sample ROI/outcome screens were removed. | No backend cost/benefit ledger or use case calculates actual training ROI from persisted source records; no ROI screen is active. |

**Entry points:** `/ld-manager/dashboard`, `/ld-manager/employees`, `/ld-manager/employees/:accountId`; API `GET /api/v1/ld/development/employees[/{accountId}]` (L&D Manager of the same organization only; Employees receive 403, other accounts 404). `/ld-manager/team-matrix`, `/ld-manager/learning-outcomes`, `/ld-manager/evaluations` and `/ld-manager/roi-forecast` redirect to these pages.

**Rules in the delivered slice:** pathway progress counts fulfilled required steps and excludes waived (bypassed) steps; Baseline passes are shown separately from official achievements; NEED_REVIEW levels are flagged without revoking achievement; requirement statuses use the same classification as the Employee Overview. Reads never finalize attempts or change learner state.

**Code references:** [development pages](../../../frontend/src/features/manager/development/), [report service](../../../backend/src/main/java/com/adaptlearngraph/services/EmployeeDevelopmentReportService.java), [report queries](../../../backend/src/main/java/com/adaptlearngraph/repository/DevelopmentReportJpaRepository.java), [analytics/ROI schema](../../../backend/src/main/resources/db/migration/V4__pathway_analytics_and_evaluation.sql), [route wiring](../../../frontend/src/app/App.tsx). Evidence: [system](../../testing/system/FR-04-07-ld-employee-development-20261116.md).

## Assessment/pathway reporting boundary - 2026-11-05

This is the directly affected input/meaning contract for FR-04.07 and FR-07.09, confirmed for the affected input meanings; it does not implement reporting, change ROI formulas or redesign screens. Dated prototype/evidence notes retain their original scope.

Authorized same-organization L&D reporting must read official exact skill/knowledge achievements separately from baseline diagnostics, lessons, group assessment outcomes, optional module progress and pathway requirement revisions. Baseline pass is not certified achievement; approved bypass is unmet/waived; NEED_REVIEW does not revoke ACHIEVED. A requirement satisfied by one alternative does not require every alternative to complete.

Filter and aggregate only authorized scope/period with provenance, explicit missing data and distinct fulfilled/waived/pending counts. Reads do not finalize attempts or update profile/pathway. Synthetic browser values are not observed organization results. [Adaptive profile/completion rules](../Adaptive%20engine/README.md#profile-and-evidence-precedence) own these meanings; cost/benefit and department-reporting scope remains unchanged.

Current rule-flow input/schema owners are mapped in the technical contract. Those source paths do not establish a complete reporting/audit reader or mail delivery; no new runtime/production acceptance is claimed.

## Requirements

<a id="fr-04-07"></a>

### FR-04.07: Monitor employee development

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.07 |
| 2. Requirement Name | Monitor employee development |
| 3. Description | The L&D Manager shall view employee competency profiles, skill gaps, assessment outcomes, learning progress, training ROI, and department development summaries; filter results by department, job position, and reporting period; and record or update training costs and monetary benefits with their period, currency, and supporting basis. |
| 4. Actor | L&D Manager |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-07-09"></a>

### FR-07.09: Generate development summaries and ROI

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.09 |
| 2. Requirement Name | Generate development summaries and ROI |
| 3. Description | The System shall aggregate employee and department development results and calculate training ROI from recorded costs and monetary benefits. |
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
| <a id="req-025"></a>REQ-025 | [FR-04.07](#fr-04-07) |
| <a id="req-025-f01"></a>REQ-025-F01 | [FR-04.07](#fr-04-07) |
| <a id="req-025-f02"></a>REQ-025-F02 | [FR-04.07](#fr-04-07) |
| <a id="req-026"></a>REQ-026 | [FR-04.07](#fr-04-07) |
| <a id="req-026-f01"></a>REQ-026-F01 | [FR-04.07](#fr-04-07) |
| <a id="req-068"></a>REQ-068 | [FR-04.07](#fr-04-07); [FR-07.09](#fr-07-09) |
| <a id="req-068-f01"></a>REQ-068-F01 | [FR-04.07](#fr-04-07) |
| <a id="req-068-f02"></a>REQ-068-F02 | [FR-04.07](#fr-04-07) |
| <a id="req-068-f03"></a>REQ-068-F03 | [FR-07.09](#fr-07-09) |
| <a id="req-068-f04"></a>REQ-068-F04 | [FR-07.09](#fr-07-09) |
