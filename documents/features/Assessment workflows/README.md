# Assessment Workflows

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 6.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28; Question Bank subset locally verified2026-10-30. See the [implementation legend](../README.md#current-implementation-overview). Browser calculations below are not server-evaluated employee evidence.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-04.05](#fr-04-05) | API-backed slice | Authenticated L&D Managers manage organization-scoped baseline drafts/versions, coverage and bounds through persisted APIs. Resource bindings, reviewed catalog, published items and promoted model versions determine readiness. | Real catalog/question review, import and calibration provisioning are separate; absent resources remain explicitly unavailable rather than using demo data. |
| [FR-05.06](#fr-05-06) | API-backed Question Bank slice; local acceptance passed | Expert and L&D Question Bank routes use authenticated organization-scoped persistence for drafts, ownership, versions, review, import, retirement and notifications. | Module assessment construction, question-selection/scoring configuration, Employee exams and calibration are separate. Local verification does not establish production deployment. |
| [FR-06.02](#fr-06-02) | API-backed slice | An authenticated, entitled Employee selects an available organization role and starts/resumes its server baseline. Answers, terminal results and baseline mastery are persisted; reads are restricted to the same learner/organization and commands are replay-safe. | No live attempt is available until that organization's catalog, bank and model are ready. Unrelated browser quizzes do not become authoritative evidence. |
| [FR-06.03](#fr-06-03) | Prototype | The active assessment screen includes an 18-item RIASEC questionnaire, local answer storage and client-side dimension/top-interest calculation. | Results are not submitted to a backend interest-profile service and do not feed a real AI guidance pipeline. The separate RIASEC page file is not the active routed entry. |
| [FR-06.08](#fr-06-08) | Prototype | Employees can navigate sample module lessons and take browser quizzes with local outcomes/history. | The reader displays a fixed sample module rather than resolving approved content for the requested module ID; learning completion and assessment submissions are not persisted through business APIs. |
| [FR-07.05](#fr-07-05) | Partial | The baseline slice generates/delivers pinned items, evaluates answers and stores results/mastery using the adaptive engine with real workspace authorization. | Module assessment and RIASEC automation remain outside this slice; baseline model calibration and content publication are not supplied automatically. |

**Entry points:** `/ld-manager/baseline-assessments` (also reached from `/ld-manager/baseline-config`), `/ld-manager/question-bank`, `/employee/upskilling?tab=roles`, `/employee/baseline-assessment`, `/employee/my-mastery`, `/expert/assessment-bank`, `/employee/assessment`, `/employee/modules/:moduleId`. `/employee/riasec` redirects to `/employee/assessment?tab=baseline`; the active router does not mount the standalone RIASEC page.

**Workspace integration boundary:** identity, membership and subscription access are checked server-side. Missing resource readiness, invalid/stale commands, wrong-role access and cross-organization requests are not converted into successful outcomes. Historical selections/results and valid nulls are retained. [Architecture](../../ARCHITECTURE.md#workspace-baseline-integration-2026-10-28) describes resource ownership; [dedicated evidence](../../testing/system/REQ-002-workspace-baseline.md) distinguishes local verification from real-content/production readiness.

**Implementation and legacy/prototype references:** [baseline configuration](../../../frontend/src/features/manager/baseline-config/BaselineAssessmentConfigPage.tsx), [assessment bank](../../../frontend/src/features/manager/assessment-bank/AssessmentBankPage.tsx), [Employee assessments](../../../frontend/src/features/employee/assessment/AssessmentPage.tsx), [sample module reader](../../../frontend/src/features/employee/modules/LearningModuleReaderPage.tsx), [assessment schema foundation](../../../backend/src/main/resources/db/migration/V3__assessment_evidence_and_learning.sql), [backend assessment package](../../../backend/src/main/java/com/adaptlearngraph/assessment/).

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

#### Implemented Question Bank subset — 2026-10-30

This subset covers the organization-wide Question Bank across MicroSkills. It does not complete the whole module-assessment requirement above. The routed UI retains the header, four statistics cards, filters, skill-grouped directory and dialogs; it uses the shared [QuestionBankWorkspace](../../../frontend/src/shared/components/question-bank/QuestionBankWorkspace.tsx) and real staff APIs instead of browser mock storage. Legacy Blueprint configuration is not exposed as a persisted Question Bank capability.

- **Authority:** authenticated, entitled same-organization Experts can read. Only the responsible Expert creates/edits/submits/withdraws a question candidate. L&D assigns or transfers responsibility with a reason, reviews/returns and decides availability. Peer Experts are read-only; Employee and other-organization requests cannot read answer-bearing staff data.
- **Content:** one immutable normalized code, plain-text prompt with line breaks, one current approved MicroSkill, four distinct options, exactly one correct answer, EASY/MEDIUM/HARD and explanation. Draft save/import permits missing options/key/difficulty/explanation; submission requires complete valid content. Skill names are server-resolved, not arbitrary imported metadata.
- **Review:** L&D explicitly acknowledges the exact submitted version before approval. Approval publishes that version atomically. Bulk decisions are all-or-nothing; stale revisions require reload/review. Before bulk approval, a dialog identifies selected question codes that still need review or are otherwise ineligible and links to the first question. Server conflicts appear in the dialog with reload guidance; selection is retained after failure. Return/withdraw requires a reason and restores the same draft candidate while preserving event snapshots.
- **Versions/history:** published definitions remain immutable; one successor candidate may be edited without replacing the published predecessor. Creator, responsible Expert, editors, submitters, reviewers, times and reasons remain visible when actually recorded. Legacy absent metadata is never invented; L&D assigns unowned legacy questions. Missing legacy management codes derive deterministically from stable IDs.
- **Import:** Excel/JSON templates, skill reference IDs, preview then explicit confirmation. Default configurable10MiB/500 rows. Any invalid row, foreign/unassigned code or active candidate blocks the entire batch. Own published codes require explicit successor confirmation. Different-code normalized matching prompt/options produces an acknowledgement warning. Confirmation revalidates current ownership, revisions, catalog and changed matching content.
- **Availability:** Expert requests retirement/reactivation with reason; L&D confirms. Retirement affects the stable question across versions for future selection. Existing published definitions, assessment pins and attempts remain unchanged; reactivation never publishes a draft or promotes IRT parameters.
- **Notifications:** targeted same-organization in-app notices and durable email jobs. SMTP failure retries independently of committed business operations. Acceptance uses local Mailpit only.

Storage/field definitions: [architecture](../../ARCHITECTURE.md#question-bank-authoring--r2-2026-10-30), [graph responsibility boundary](../../neo4j_schema.md). Existing browser data is not imported automatically; no production deployment is implied.

Verification: [unit](../../testing/unit/REQ-014-question-bank.md), [PostgreSQL integration](../../testing/integration/REQ-014-question-bank.md), [real browser/Mailpit results and manual checklist](../../testing/system/REQ-014-question-bank.md). The locally verified authoring workflow preserves the boundary to future module exam construction and calibration.

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
