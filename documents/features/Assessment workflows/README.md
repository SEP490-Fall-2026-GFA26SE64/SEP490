# Assessment Workflows

**Latest direction — 2026-11-05-r3.** [Target schema/API/flow](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) now maps this flow; it is not applied runtime. Baseline records only assessed skills and never creates unassessed prerequisites; skill assessment can discover them as **Cần bổ sung**. Baseline/skill have two independently configured policies with timed auto-finalization. Cross-target old bypass work is parallel/non-gating. Affected old dev records may be rebuilt; normal new-flow history remains. Preserve FE design and classify existing Question Bank content into appropriate knowledge levels with corresponding field changes.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Source reconciliation:** 2026-10-28. **Source requirements in this domain:** 6.

**Feature direction: 2026-11-05.** Affected records below now describe the confirmed organization-rule contract; C1 acceptance is pending. This is intended behavior, not implemented/verified behavior. Source IDs and historical evidence remain reserved. Target technical mapping is now specified in r3; runtime/seed implementation and detailed changed UI review remain pending. Unrelated blank fields remain unspecified. See the [catalog rules](../README.md#reading-rules).

## Current Implementation

**Source-inspected:** 2026-10-28; Question Bank subset locally verified2026-10-30. See the [implementation legend](../README.md#current-implementation-overview). Browser calculations below are not server-evaluated employee evidence.

| Requirement | Status | Current behavior | Remaining boundary |
| --- | --- | --- | --- |
| [FR-04.05](#fr-04-05) | API-backed slice | Authenticated L&D Managers manage organization-scoped baseline drafts/versions, coverage and bounds through persisted APIs. Resource bindings, reviewed catalog, published items and promoted model versions determine readiness. | Real catalog/question review, import and calibration provisioning are separate; absent resources remain explicitly unavailable rather than using demo data. |
| [FR-05.06](#fr-05-06) | API-backed Question Bank slice; local acceptance passed | Expert and L&D Question Bank routes use authenticated organization-scoped persistence for drafts, ownership, versions, review, import, retirement and notifications. | Module assessment construction, question-selection/scoring configuration, Employee exams and calibration are separate. Local verification does not establish production deployment. |
| [FR-06.02](#fr-06-02) | API-backed slice | An authenticated, entitled Employee selects an available organization role and starts/resumes its server baseline. Answers, terminal results and baseline mastery are persisted; reads are restricted to the same learner/organization and commands are replay-safe. | No live attempt is available until that organization's catalog, bank and model are ready. Unrelated browser quizzes do not become authoritative evidence. |
| [FR-06.03](#fr-06-03) | Prototype | The active assessment screen includes an 18-item RIASEC questionnaire, local answer storage and client-side dimension/top-interest calculation. | Results are not submitted to a backend interest-profile service and do not feed a real AI guidance pipeline. The separate RIASEC page file is not the active routed entry. |
| [FR-06.08](#fr-06-08) | Partial; real learning content | The reader resolves authorized approved Module content and persists lesson/video progress. | Content completion is not assessment success or mastery; real module exam construction, admission and grading remain separate. |
| [FR-07.05](#fr-07-05) | Partial | The baseline slice generates/delivers pinned items, evaluates answers and stores results/mastery using the adaptive engine with real workspace authorization. | Module assessment and RIASEC automation remain outside this slice; baseline model calibration and content publication are not supplied automatically. |

**Entry points:** `/ld-manager/baseline-assessments` (also reached from `/ld-manager/baseline-config`), `/ld-manager/question-bank`, `/employee/upskilling?tab=roles`, `/employee/baseline-assessment`, `/employee/my-mastery`, `/expert/assessment-bank`, `/employee/assessment`, `/employee/modules/:moduleId`. `/employee/riasec` redirects to `/employee/assessment?tab=baseline`; the active router does not mount the standalone RIASEC page.

**Workspace integration boundary:** identity, membership and subscription access are checked server-side. Missing resource readiness, invalid/stale commands, wrong-role access and cross-organization requests are not converted into successful outcomes. Historical selections/results and valid nulls are retained. [Architecture](../../ARCHITECTURE.md#workspace-baseline-integration-2026-10-28) describes resource ownership; [dedicated evidence](../../testing/system/REQ-002-workspace-baseline.md) distinguishes local verification from real-content/production readiness.

**Implementation and legacy/prototype references:** [baseline configuration](../../../frontend/src/features/manager/baseline-assessments/BaselineAssessmentManagementPage.tsx), [assessment bank](../../../frontend/src/features/manager/assessment-bank/AssessmentBankPage.tsx), [Employee assessments](../../../frontend/src/features/employee/assessment/AssessmentPage.tsx), [versioned module reader](../../../frontend/src/features/employee/modules/LearningModuleReaderPage.tsx), [assessment schema foundation](../../../backend/src/main/resources/db/migration/V3__assessment_evidence_and_learning.sql), [backend business services](../../../backend/src/main/java/com/adaptlearngraph/services/).

## Requirements

### Shared engine, scope and policy

Expert owns question content, correct answer/explanation, exact skill + knowledge level + assessed outcome, mandatory designation, approval and version. L&D owns reusable organization policies for BASELINE and SKILL_ASSESSMENT. Expert maps module outcomes/prerequisite groups to supported policies; this does not grant arbitrary policy scripting or duplicate L&D policy ownership.

Knowledge levels are FOUNDATION / INTERMEDIATE / ADVANCED, distinct from Role member Level and legacy EASY/MEDIUM/HARD difficulty. No level implies another. MAIN/PREREQUISITE is a group's role in a paper, not a fixed question type.

| Purpose | Scope | Result consumer |
| --- | --- | --- |
| BASELINE | Explicit MODULE_ONLY requirements of the selected Role and member Level, minus exact compatible official achievements. CERTIFICATE_ONLY uses certificate evidence instead of baseline questions. | Initial learning needs; pass skips initial module assignment only. |
| SKILL_ASSESSMENT | Main skill–knowledge requirement after qualifying learning, plus ALL configured prerequisite groups. Official prerequisite achievement does not exempt these groups. | Main completion/official achievement when required conditions hold; prerequisite supplementation or NEED_REVIEW and recalculation. |

The shared engine validates coverage, samples, persists/resumes and scores. It does not approve certificates/bypasses or arbitrarily mutate pathways. RIASEC remains a separate interest workflow.

L&D maintains separate BASELINE and SKILL_ASSESSMENT configurations and active versions, including distinct time limits. Both automatically finalize at their server deadline. L&D configures each group's total count, matching/sampling, mandatory conditions, pass threshold, timing/retake limits and optional all-wrong prerequisite veto. Values come from the organization; 7/10 is an example, not a default. A group must meet its own threshold AND configured mandatory conditions. No aggregate score offsets another group's failure.

Mandatory questions count inside the configured total: include matching approved mandatory items first, then randomly fill from the same skill/knowledge/outcome bank without duplicates. Validate mandatory count fits the total, bank sufficiency and achievable conditions/thresholds. Missing/invalid policy or insufficient bank gives an explicit unavailable/configuration outcome, never a partial successful paper or questions borrowed from another group. Numeric product limits and override precedence remain open for define C2.

Correct = 1; incorrect/unanswered = 0. Negative/partial credit, IRT ability/SE/confidence/calibration, BKT mastery updates and numeric target-gap subtraction are outside the new active flow. Scores describe the sampled paper, not a percentage of all workplace competence.

### Attempt, resume, history and result contract

1. Derive actor, organization, entitlement and staff assignment from trusted server context. Client supplies target/learning references, purpose, answers and expected attempt/revision; it cannot set tenant, reviewer, official achievement or pass status.
2. Read coherent requirement/profile/question/policy versions; resolve baseline exemptions or the complete skill-assessment groups; validate admission and bank coverage.
3. Sample once and persist frozen paper/rules before presenting it. Save answers against that attempt. Reload resumes the same questions, answer state and configured timing; it neither resamples nor resets a deadline. Employee responses never include staff-only answer keys.
4. Finalize once against frozen versions. Output per group: skill/knowledge level, group role where applicable, correct/total, mandatory-condition result, pass/not-pass and reason, with attempt/policy context and downstream completion/pending decision.
5. Retain every attempt, answers, frozen versions and result/decision history. Stale concurrent save/finalize cannot overwrite newer accepted state. Replayed submission/result consumption returns its accepted outcome without duplicate achievements, remediation or revisions. Outage/uncertain outcome remains visible and recoverable, never fabricated success.

Business states distinguish not assessed, unavailable/insufficient bank, in progress/resumable, finalized and downstream processing pending/failed. Missing evidence is not a failed assessment. The r3 target names/transaction/API mapping govern implementation. Configured deadline automatically finalizes the paper once with unanswered items zero; unsupported abandonment/cancellation features are not added.

### Prerequisite results and full retake

| Condition | Main result | Prerequisite consequence |
| --- | --- | --- |
| Main fails its own rules | Incomplete; reuse current step. | Evaluate prerequisite groups separately; do not duplicate the main step. |
| Main and prerequisites pass | May complete when learning and required conditions hold. | No supplementation from those groups. |
| Prerequisite below threshold with at least one correct | Main may pass; retain main group result pending required supplementation before closing the step. | Without official achievement: required remediation. With official achievement: retain ACHIEVED and record NEED_REVIEW/optional review. |
| All answers wrong in a prerequisite and org veto enabled | Main remains incomplete and requires assessment retake, even when prerequisite was officially achieved. | Remediation if not officially achieved; otherwise NEED_REVIEW. Never revoke the prior achievement. |

With veto disabled, ordinary group rules apply; zero correct does not silently enable a veto. Each retake is a NEW full configured paper: main + ALL prerequisite groups, without passing-group score carry-over/exemption. Retaining a main group result while awaiting supplementation is not a partial-paper retake and does not award ACHIEVED. [Profile/recalculation](../Adaptive%20engine/README.md#profile-and-evidence-precedence) defines downstream effects.

### UI continuity and implementation boundary

Keep existing assessment/Question Bank layouts, components, colors, fonts, sizes, spacing and EN/VI. Later implementation changes BE behavior and corresponding fields/data binding; browser quiz/mock state is not integration evidence. The r3 contract specifies target data/policy/attempt/result mapping and same-context diagnostic reuse; C2 must implement it and review detailed changed UI states. No applied schema/runtime readiness is claimed.

<a id="fr-04-05"></a>

### FR-04.05: Manage baseline assessment configuration

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.05 |
| 2. Requirement Name | Manage baseline assessment configuration |
| 3. Description | The L&D Manager shall configure reusable organization policies for baseline and skill assessment, with separate scope and per-group sampling/scoring rules. |
| 4. Actor | L&D Manager |
| 5. Preconditions | Trusted entitled L&D membership; current policy revision and valid scope/bank references. |
| 6. Main Flow | Select purpose; configure groups, counts, mandatory/pass rules, veto and timing/retake limits; validate readiness; save a traceable version for new attempts. |
| 7. Alternative / Exception Flows | Reject stale/unauthorized/impossible configuration; expose insufficient bank; preserve frozen attempts. |
| 8. Postconditions | New policy revision is available with prior history retained; no learner result is awarded. |
| 9. Acceptance Criteria | Shared engine, separate purpose configuration, no default business threshold or cross-group compensation; no required per-Role policy copy. |

<a id="fr-05-06"></a>

### FR-05.06: Manage module assessments

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.06 |
| 2. Requirement Name | Manage module assessments |
| 3. Description | The Expert shall author versioned questions mapped to one skill, knowledge level and outcome, and configure module/main/prerequisite coverage using organization-owned assessment policies. |
| 4. Actor | Expert |
| 5. Preconditions | Trusted authorized same-organization Expert; current ownership/assignment and eligible skill/knowledge/outcome references. |
| 6. Main Flow | Author content/key/explanation and mandatory designation; map exact scope; submit through existing L&D question review; bind approved main/prerequisite coverage to supported org policies. |
| 7. Alternative / Exception Flows | Incomplete drafts stay drafts; missing bank, incompatible outcomes or stale/unapproved versions cannot produce a ready paper. Protect staff answers. |
| 8. Postconditions | Approved versioned questions/coverage are available to the shared engine; historical attempts keep original definitions. |
| 9. Acceptance Criteria | MAIN/PREREQUISITE is a group role; extend legacy difficulty-only mapping while preserving ownership/review/import history. |

#### Implemented Question Bank subset — 2026-10-30

Activity diagram: [ACT-10 — Question Bank authoring and approval](../../diagrams/mermaid/act-10.mmd) ([SVG](../../diagrams/mermaid/act-10.svg), [PNG](../../diagrams/mermaid/act-10.png)). This concise diagram covers the main draft/submission/return/publication flow; secondary lifecycle rules remain specified below. It does not cover complete module-assessment construction.
State machines: [ST-16A — question-version lifecycle](../../diagrams/mermaid/st-16a.mmd) ([SVG](../../diagrams/mermaid/st-16a.svg)) and [ST-16B — question availability](../../diagrams/mermaid/st-16b.mmd) ([SVG](../../diagrams/mermaid/st-16b.svg)).

This subset covers the organization-wide Question Bank across MicroSkills. It does not complete the whole module-assessment requirement above. The routed UI retains the header, four statistics cards, filters, skill-grouped directory and dialogs; it uses the shared [QuestionBankWorkspace](../../../frontend/src/shared/components/question-bank/QuestionBankWorkspace.tsx) and real staff APIs instead of browser mock storage. Legacy Blueprint configuration is not exposed as a persisted Question Bank capability.

- **Authority:** authenticated, entitled same-organization Experts can read. Only the responsible Expert creates/edits/submits/withdraws a question candidate. L&D assigns or transfers responsibility with a reason, reviews/returns and decides availability. Peer Experts are read-only; Employee and other-organization requests cannot read answer-bearing staff data.
- **Content:** one immutable normalized code, plain-text prompt with line breaks, one current approved MicroSkill, four distinct options, exactly one correct answer, EASY/MEDIUM/HARD and explanation. Draft save/import permits missing options/key/difficulty/explanation; submission requires complete valid content. Skill names are server-resolved, not arbitrary imported metadata.
- **Review:** L&D explicitly acknowledges the exact submitted version before approval. Approval publishes that version atomically. Bulk decisions are all-or-nothing; stale revisions require reload/review. Before bulk approval, a dialog identifies selected question codes that still need review or are otherwise ineligible and links to the first question. Server conflicts appear in the dialog with reload guidance; selection is retained after failure. Return/withdraw requires a reason and restores the same draft candidate while preserving event snapshots.
- **Versions/history:** published definitions remain immutable; one successor candidate may be edited without replacing the published predecessor. Creator, responsible Expert, editors, submitters, reviewers, times and reasons remain visible when actually recorded. Legacy absent metadata is never invented; L&D assigns unowned legacy questions. Missing legacy management codes derive deterministically from stable IDs. New question codes are generated by the backend and cannot be entered in the create form; existing codes remain unchanged.
- **Import:** Excel/JSON templates omit question code. Import creates new drafts only; backend generates immutable Q-UUID codes, preview/confirmation retain those codes, and confirming the same batch again does not create duplicates. Code-bearing old templates require a fresh upload. Matching normalized content requires warning acknowledgement; existing questions are never updated by import. Any invalid row blocks the batch. Default configurable limits remain10MiB/500 rows.
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
| 3. Description | The Employee shall take/resume the selected Role–Level baseline, submit answers and review separate diagnostic group results. |
| 4. Actor | Employee |
| 5. Preconditions | Trusted entitled Employee, valid selected Role/member Level, ready policy/bank and compatible official exemptions. |
| 6. Main Flow | Resolve required MODULE_ONLY groups; start/resume frozen persisted attempt; save answers; finalize once; show per-group diagnostics and learning needs. |
| 7. Alternative / Exception Flows | Unavailable/insufficient evidence differs from failed. If all groups are officially exempt, show exemptions and remaining certificate needs without a synthetic pass. |
| 8. Postconditions | Retain diagnostic attempt/results; pass skips initial assignment only, writing neither official ACHIEVED nor module completion. |
| 9. Acceptance Criteria | Same-paper resume; exact official exemptions; no implicit lower-level exemption, self-declared-title exemption, numeric mastery or aggregate pass offset. |

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
| 5. Preconditions | Trusted Employee with authorized requirement/module access, qualified content completion and live admission/prerequisite guards. |
| 6. Main Flow | Learn/resume one eligible choice; take main + all prerequisite groups; inspect supplementation/review; retake a full configured paper when required. |
| 7. Alternative / Exception Flows | Content alone awards no achievement. Main failure/veto keeps step incomplete; retain main result pending non-veto mandatory supplementation. Missing provision routes to Expert. |
| 8. Postconditions | Exact official achievement requires learning + passing assessment and required completion conditions; retain progress/attempt history. |
| 9. Acceptance Criteria | One successful alternative satisfies the step; others remain optional. NEED_REVIEW never revokes official prerequisite achievement; retakes include every configured group. |

<a id="fr-07-05"></a>

### FR-07.05: Generate and evaluate assessments

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-07.05 |
| 2. Requirement Name | Generate and evaluate assessments |
| 3. Description | The System shall generate/evaluate baseline and skill assessment with the shared rule engine and purpose-specific scope/configuration. RIASEC interest-profile calculation remains separate. |
| 4. Actor | System |
| 5. Preconditions | Trusted scope, versioned groups/policy/questions, coherent requirements and eligible admission. |
| 6. Main Flow | Validate coverage; sample/freeze/persist once; save/resume; score each group; finalize and consume result idempotently. |
| 7. Alternative / Exception Flows | Invalid bank/policy, stale commands and outage remain explicit; no partial paper, fabricated evidence or legacy IRT fallback. |
| 8. Postconditions | Reproducible group results and consumer decisions are retained once. Engine approves no certificate/bypass. |
| 9. Acceptance Criteria | Shared mechanics with purpose-specific scope; correct=1, incorrect/unanswered=0; mandatory count/pass conditions, optional veto and full retakes. |


Question Bank implementation reuses current content and workspace: classify each question from actual content/outcome into the correct knowledge level, not a direct legacy-difficulty conversion; keep answer/explanation and true review history. Replace obsolete field controls with knowledge level/outcome/mandatory fields using the same components/design. Ambiguous or invalid questions stay explicitly unready until corrected, never fabricated as reviewed.

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

Question Bank header alignment (2026-11-01): existing authorized Expert Create/Import actions use the compact primary-orange/soft-orange buttons and Plus/Upload icons from Target Roles. Existing dialogs, validation, skills eligibility and L&D review-only boundaries are unchanged. [UI checks](../../testing/system/REQ-013-014-header-actions.md).

Question Bank statistics reuse the Target Roles gradient StatCard treatment, with semantic icons/value colors and concise English/Vietnamese descriptions. Total Bank Items, Published Questions, Awaiting review and Micro-Skills Assessed retain their existing calculations and organization scope.

Question Bank list rows place state, version/difficulty and any pending availability request together at the right end of the question-code header. The code stays left; badges wrap right-aligned on narrow screens. Prompt, responsible Expert and actions remain below. Existing shared Badge colors, values, filtering and action permissions are unchanged.

### Skill Assessment learning prerequisite — 2026-11-05

**Pre-transition implementation:** completing every lesson in one Module records a skill-only learning prerequisite with immutable Skill/Module/revision/content/time provenance. This does not award achievement. [Existing handoff](../../technical/Skill-Learning-Eligibility.md) and [historical evidence](../../testing/system/REQ-013-016-single-skill-eligibility-20261105.md) do not establish the new skill–knowledge/outcome admission or scoring. Legacy/ambiguous completion reconciliation is open for define C2; it cannot automatically exempt every knowledge level.
