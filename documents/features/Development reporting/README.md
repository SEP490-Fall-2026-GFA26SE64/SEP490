# Employee and Department Development Reporting

**Latest direction — 2026-11-05-r3.** [Target schema/API/flow](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) now maps this flow; it is not applied runtime. Baseline records only assessed skills and never creates unassessed prerequisites; skill assessment can discover them as **Cần bổ sung**. Baseline/skill have two independently configured policies with timed auto-finalization. Cross-target old bypass work is parallel/non-gating. Affected old dev records may be rebuilt; normal new-flow history remains. Preserve FE design and classify existing Question Bank content into appropriate knowledge levels with corresponding field changes.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 2.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview).

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-04.07](#fr-04-07) | Prototype | Team matrix/outcomes screens show employee readiness, gaps, progress and cohort summaries with local filtering/drill-down. Their inputs are browser-company data, fixed telemetry and synthetic fallback metrics. | No real employee-development aggregation or complete department/job position/reporting-period filtering is connected. Recording/updating costs and monetary benefits with period, currency and supporting basis is not implemented. |
| [FR-07.09](#fr-07-09) | Foundation only | Analytics snapshots and ROI-scenario schema exist; the UI presents sample metrics and projections. | No backend cost/benefit ledger or use case calculates actual training ROI and department summaries from persisted source records. Forecast/demo values are not measured benefits. |

**Entry points:** `/ld-manager/team-matrix`, `/ld-manager/learning-outcomes`. `/ld-manager/roi-forecast` redirects to the team matrix; the standalone ROI forecast page is not the active route. Prototype export controls do not introduce a new Version 2 requirement.

**Code references:** [team matrix](../../../frontend/src/features/manager/team-matrix/TeamMatrixPage.tsx), [learning outcomes](../../../frontend/src/features/manager/learning-outcomes/LearningOutcomesPage.tsx), [analytics/ROI schema](../../../backend/src/main/resources/db/migration/V4__pathway_analytics_and_evaluation.sql), [backend business services](../../../backend/src/main/java/com/adaptlearngraph/services/) (no analytics service is implemented yet), [route wiring](../../../frontend/src/app/App.tsx).

## Assessment/pathway reporting boundary - 2026-11-05

This is the directly affected input/meaning contract for FR-04.07 and FR-07.09, pending C1 acceptance; it does not implement reporting, change ROI formulas or redesign screens. Dated prototype/evidence notes retain their original scope.

Authorized same-organization L&D reporting must read official exact skill/knowledge achievements separately from baseline diagnostics, lessons, group assessment outcomes, optional module progress and pathway requirement revisions. Baseline pass is not certified achievement; approved bypass is unmet/waived; NEED_REVIEW does not revoke ACHIEVED. A requirement satisfied by one alternative does not require every alternative to complete.

Filter and aggregate only authorized scope/period with provenance, explicit missing data and distinct fulfilled/waived/pending counts. Reads do not finalize attempts or update profile/pathway. Synthetic browser values are not observed organization results. [Adaptive profile/completion rules](../Adaptive%20engine/README.md#profile-and-evidence-precedence) own these meanings; cost/benefit and department-reporting scope remains unchanged.

Target fields/storage/versioning and state rules are specified in r3. C2 still must implement exact scoped constraints, classify real content, handle dependency failures and present detailed changed UI/data binding for review. No runtime/production readiness is claimed.

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
