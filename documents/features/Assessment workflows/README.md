# Assessment Workflows

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 6.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview). Browser calculations below are not server-evaluated employee evidence.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-04.05](#fr-04-05) | API-backed slice | Authenticated L&D Managers manage organization-scoped baseline drafts/versions, coverage and bounds through persisted APIs. Resource bindings, reviewed catalog, published items and promoted model versions determine readiness. | Real catalog/question review, import and calibration provisioning are separate; absent resources remain explicitly unavailable rather than using demo data. |
| [FR-05.06](#fr-05-06) | Prototype | The Expert assessment bank edits questions, options/correct answer, feedback, skill/difficulty and blueprint configuration in company browser storage. | No connected question/version/selection/scoring API or trusted assigned-module authoring workflow exists. |
| [FR-06.02](#fr-06-02) | API-backed slice | An authenticated, entitled Employee selects an available organization role and starts/resumes its server baseline. Answers, terminal results and baseline mastery are persisted; reads are restricted to the same learner/organization and commands are replay-safe. | No live attempt is available until that organization's catalog, bank and model are ready. Unrelated browser quizzes do not become authoritative evidence. |
| [FR-06.03](#fr-06-03) | Prototype | The active assessment screen includes an 18-item RIASEC questionnaire, local answer storage and client-side dimension/top-interest calculation. | Results are not submitted to a backend interest-profile service and do not feed a real AI guidance pipeline. The separate RIASEC page file is not the active routed entry. |
| [FR-06.08](#fr-06-08) | Prototype | Employees can navigate sample module lessons and take browser quizzes with local outcomes/history. | The reader displays a fixed sample module rather than resolving approved content for the requested module ID; learning completion and assessment submissions are not persisted through business APIs. |
| [FR-07.05](#fr-07-05) | Partial | The baseline slice generates/delivers pinned items, evaluates answers and stores results/mastery using the adaptive engine with real workspace authorization. | Module assessment and RIASEC automation remain outside this slice; baseline model calibration and content publication are not supplied automatically. |

**Entry points:** `/ld-manager/baseline-assessments` (also reached from `/ld-manager/baseline-config`), `/employee/upskilling?tab=roles`, `/employee/baseline-assessment`, `/employee/my-mastery`, `/expert/assessment-bank`, `/employee/assessment`, `/employee/modules/:moduleId`. `/employee/riasec` redirects to `/employee/assessment?tab=baseline`; the active router does not mount the standalone RIASEC page.

**Workspace integration boundary:** identity, membership and subscription access are checked server-side. Missing resource readiness, invalid/stale commands, wrong-role access and cross-organization requests are not converted into successful outcomes. Historical selections/results and valid nulls are retained. [Architecture](../../ARCHITECTURE.md#workspace-baseline-integration-2026-10-28) describes resource ownership; [dedicated evidence](../../testing/system/REQ-002-workspace-baseline.md) distinguishes local verification from real-content/production readiness.

**Legacy/prototype references:** [baseline configuration](../../../frontend/src/features/manager/baseline-config/BaselineAssessmentConfigPage.tsx), [assessment bank](../../../frontend/src/features/manager/assessment-bank/AssessmentBankPage.tsx), [Employee assessments](../../../frontend/src/features/employee/assessment/AssessmentPage.tsx), [sample module reader](../../../frontend/src/features/employee/modules/LearningModuleReaderPage.tsx), [assessment schema foundation](../../../backend/src/main/resources/db/migration/V3__assessment_evidence_and_learning.sql), [backend assessment package](../../../backend/src/main/java/com/adaptlearngraph/assessment/).

## Requirements

<a id="fr-04-05"></a>

### FR-04.05: Manage baseline assessment configuration

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.05 |
| 2. Requirement Name | Manage baseline assessment configuration |
| 3. Description | The L&D Manager shall configure baseline competency coverage, question-selection rules, and scoring rules. |
| 4. Actor | L&D Manager |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-05-06"></a>

### FR-05.06: Manage module assessments

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.06 |
| 2. Requirement Name | Manage module assessments |
| 3. Description | The Expert shall create and update questions for assigned modules, classify questions by micro-skill and difficulty, and configure question-selection and scoring rules. |
| 4. Actor | Expert |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-06-02"></a>

### FR-06.02: Complete baseline assessment

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.02 |
| 2. Requirement Name | Complete baseline assessment |
| 3. Description | The Employee shall take the baseline assessment and submit answers. |
| 4. Actor | Employee |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-06-03"></a>

### FR-06.03: Complete RIASEC assessment

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.03 |
| 2. Requirement Name | Complete RIASEC assessment |
| 3. Description | The Employee shall complete the RIASEC interest assessment and submit answers. |
| 4. Actor | Employee |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-06-08"></a>

### FR-06.08: Complete learning and assessments

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.08 |
| 2. Requirement Name | Complete learning and assessments |
| 3. Description | The Employee shall access learning modules and their learning content, take module assessments, and submit answers. |
| 4. Actor | Employee |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-07-05"></a>

### FR-07.05: Generate and evaluate assessments

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.05 |
| 2. Requirement Name | Generate and evaluate assessments |
| 3. Description | The System shall generate baseline and module assessments, score submitted answers, and calculate RIASEC interest profiles. |
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
| <a id="req-002"></a>REQ-002 | [FR-04.05](#fr-04-05); [FR-06.02](#fr-06-02) |
| <a id="req-002-f01"></a>REQ-002-F01 | [FR-06.02](#fr-06-02) |
| <a id="req-002-f02"></a>REQ-002-F02 | [FR-04.05](#fr-04-05) |
| <a id="req-014"></a>REQ-014 | [FR-05.06](#fr-05-06) |
| <a id="req-014-f01"></a>REQ-014-F01 | [FR-05.06](#fr-05-06) |
| <a id="req-014-f02"></a>REQ-014-F02 | [FR-05.06](#fr-05-06) |
| <a id="req-014-f03"></a>REQ-014-F03 | [FR-05.06](#fr-05-06) |
| <a id="req-014-f05"></a>REQ-014-F05 | [FR-05.06](#fr-05-06) |
| <a id="req-017"></a>REQ-017 | [FR-05.06](#fr-05-06) |
| <a id="req-017-f01"></a>REQ-017-F01 | [FR-05.06](#fr-05-06) |
| <a id="req-017-f02"></a>REQ-017-F02 | [FR-05.06](#fr-05-06) |
| <a id="req-017-f03"></a>REQ-017-F03 | [FR-05.06](#fr-05-06) |
| <a id="req-008"></a>REQ-008 | [FR-06.08](#fr-06-08) |
| <a id="req-008-f01"></a>REQ-008-F01 | [FR-06.08](#fr-06-08) |
| <a id="req-047"></a>REQ-047 | [FR-06.03](#fr-06-03) |
| <a id="req-047-f01"></a>REQ-047-F01 | [FR-06.03](#fr-06-03) |
| <a id="req-067"></a>REQ-067 | [FR-07.05](#fr-07-05) |
| <a id="req-067-f01"></a>REQ-067-F01 | [FR-07.05](#fr-07-05) |
| <a id="req-067-f02"></a>REQ-067-F02 | [FR-07.05](#fr-07-05) |
| <a id="req-067-f03"></a>REQ-067-F03 | [FR-07.05](#fr-07-05) |
