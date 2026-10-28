# Employee Learning Experience

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Aligned:** 2026-10-28. **Source requirements in this domain:** 5.

Each record below corresponds to one source bullet. Unspecified fields are intentionally blank; they are not approved designs or completed acceptance criteria. See the [catalog rules](../README.md#reading-rules) and [complete source coverage](../README.md#source-coverage).

## Current Implementation

**Source-inspected:** 2026-10-28. See the [implementation legend](../README.md#current-implementation-overview). Real sign-in does not make these local learning/profile records authoritative.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-06.01](#fr-06-01) | Prototype | The shared profile screen reads actor-specific browser profiles and offers local name/password changes. | These changes do not update the authenticated account/password or a persisted Employee work profile. Real administrator member edits are a separate feature. |
| [FR-06.05](#fr-06-05) | Prototype | The gap-analysis screen combines local selected-role/skill state with demonstration competency/readiness views. | There is no connected employee mastery/gap API or assessment-driven competency profile. |
| [FR-06.06](#fr-06-06) | Prototype | The pathway screen displays an interactive roadmap/timeline, module links and a browser diagnostic lock, including a demo unlock control. | The displayed Expert-confirmed banner/reviewer and pathways are not read from a persisted approval/generation workflow. Assessment-driven remaining-pathway updates are not implemented. |
| [FR-06.07](#fr-06-07) | Partial | The Skills tab loads real micro-skills/macro competencies through catalog APIs and lets Employees track/untrack skills locally. | Duration/level metadata is synthesized in the browser; tracking and sample module/roadmap content are not a persisted independent-learning context with approved mapped content. |
| [FR-06.09](#fr-06-09) | Prototype | Overview, history and assessment views show seeded/local completion, scores, previous roles/skills and pathway status. | No authoritative progress aggregation from persisted module completion, assessment evidence and pathway revisions is wired to these screens. |

**Entry points:** `/profile`, `/employee/overview`, `/employee/gap-analysis`, `/employee/pathway`, `/employee/upskilling?tab=skills`. Older skills-catalog routes redirect to the consolidated Skills tab.

**Code references:** [profile prototype](../../../frontend/src/features/profile/ProfilePage.tsx), [browser learning state](../../../frontend/src/shared/hooks/useEmployeeLearningState.ts), [gap screen](../../../frontend/src/features/employee/gap-analysis/CompetencyGapAnalysisPage.tsx), [pathway screen](../../../frontend/src/features/employee/pathway/AdaptivePathwayPage.tsx), [real skill reads/local tracking](../../../frontend/src/features/employee/target-roles/UpskillSkillsPanel.tsx), [overview](../../../frontend/src/features/employee/overview/EmployeeOverviewPage.tsx). See [Assessment workflows](../Assessment%20workflows/README.md#current-implementation) for module-reader and quiz limitations.

## Requirements

<a id="fr-06-01"></a>

### FR-06.01: Manage personal profile

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.01 |
| 2. Requirement Name | Manage personal profile |
| 3. Description | The Employee shall view and update personal and work-related profile information. |
| 4. Actor | Employee |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-06-05"></a>

### FR-06.05: Review competency profile and gaps

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.05 |
| 2. Requirement Name | Review competency profile and gaps |
| 3. Description | The Employee shall view the current competency profile and skill gaps against the selected target role. |
| 4. Actor | Employee |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-06-06"></a>

### FR-06.06: Follow a learning pathway

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.06 |
| 2. Requirement Name | Follow a learning pathway |
| 3. Description | The Employee shall view and follow their learning pathway, access its recommended modules, and view pathway updates. |
| 4. Actor | Employee |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-06-07"></a>

### FR-06.07: Learn an individual skill

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.07 |
| 2. Requirement Name | Learn an individual skill |
| 3. Description | The Employee shall browse available micro-skills, select a skill for independent learning, and access its mapped learning modules and content. |
| 4. Actor | Employee |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

<a id="fr-06-09"></a>

### FR-06.09: Track learning progress

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-06.09 |
| 2. Requirement Name | Track learning progress |
| 3. Description | The Employee shall view completed learning activities, assessment outcomes, competency progress, and pathway status. |
| 4. Actor | Employee |
| 5. Preconditions |  |
| 6. Main Flow |  |
| 7. Alternative / Exception Flows |  |
| 8. Postconditions |  |
| 9. Acceptance Criteria |  |

## Legacy ID Traceability

These anchors preserve existing references, not additional functional requirements. They identify related source-level records only; former subfunctions, UI choices, policies and implementation claims are not reconfirmed by this mapping. Historical test results retain their original scope. Legacy IDs remain reserved and must not be reassigned.

| Legacy reference | Current source record / disposition |
| --- | --- |
| <a id="req-056"></a>REQ-056 | [FR-06.01](#fr-06-01) |
| <a id="req-056-f01"></a>REQ-056-F01 | [FR-06.01](#fr-06-01) |
| <a id="req-056-f02"></a>REQ-056-F02 | [FR-06.01](#fr-06-01) |
| <a id="req-006"></a>REQ-006 | [FR-06.05](#fr-06-05) |
| <a id="req-006-f01"></a>REQ-006-F01 | Related to [FR-06.05](#fr-06-05); graph presentation is not a separate function in section 3.2(c). |
| <a id="req-006-f02"></a>REQ-006-F02 | [FR-06.05](#fr-06-05) |
| <a id="req-004"></a>REQ-004 | [FR-06.06](#fr-06-06) |
| <a id="req-004-f01"></a>REQ-004-F01 | [FR-06.06](#fr-06-06) |
| <a id="req-005"></a>REQ-005 | Related to [FR-06.06](#fr-06-06); a separate recommendation-explanation function is not specified in section 3.2(c). |
| <a id="req-005-f01"></a>REQ-005-F01 | Related to [FR-06.06](#fr-06-06); a separate recommendation-explanation function is not specified in section 3.2(c). |
| <a id="req-007"></a>REQ-007 | [FR-06.08](../Assessment%20workflows/README.md#fr-06-08) |
| <a id="req-007-f01"></a>REQ-007-F01 | [FR-06.08](../Assessment%20workflows/README.md#fr-06-08) |
| <a id="req-009"></a>REQ-009 | [FR-06.09](#fr-06-09) |
| <a id="req-009-f01"></a>REQ-009-F01 | [FR-06.09](#fr-06-09) |
| <a id="req-009-f02"></a>REQ-009-F02 | [FR-06.09](#fr-06-09) |
| <a id="req-010"></a>REQ-010 | [FR-06.06](#fr-06-06) |
| <a id="req-010-f01"></a>REQ-010-F01 | [FR-06.06](#fr-06-06) |
| <a id="req-055"></a>REQ-055 | [FR-06.07](#fr-06-07) |
| <a id="req-055-f01"></a>REQ-055-F01 | [FR-06.07](#fr-06-07) |
| <a id="req-055-f02"></a>REQ-055-F02 | [FR-06.07](#fr-06-07) |
| <a id="req-055-f03"></a>REQ-055-F03 | [FR-06.07](#fr-06-07) |
| <a id="req-055-f04"></a>REQ-055-F04 | [FR-06.07](#fr-06-07); [FR-06.08](../Assessment%20workflows/README.md#fr-06-08) |
| <a id="req-070"></a>REQ-070 | [FR-06.09](#fr-06-09) |
| <a id="req-070-f01"></a>REQ-070-F01 | [FR-06.09](#fr-06-09) |
