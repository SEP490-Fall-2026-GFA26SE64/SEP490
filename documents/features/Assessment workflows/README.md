# Assessment Workflows

**Source alignment — 2026-11-07.** Confirmed behavior is distinguished from checked-in implementation below. [Current source/schema/API contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) records local profile gates, exact ownership and remaining mismatches. Runtime/database acceptance is not established by this prose update.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Source reconciliation:** 2026-10-28. **Source requirements in this domain:** 6.

**Contract basis:** confirmed shared-Role baseline / Expert Skill–knowledge configuration decisions. Historical evidence retains its original scope; it is not a fresh passing result.

## Shared Role baseline — current contract, 2026-11-19

This section supersedes older Role–member-Level baseline configuration and combined save/activate descriptions below. L&D maintains one baseline policy per organization + Role. The Employee's selected member Level still determines the applicable Skill × knowledge-level requirements and exact compatible official-evidence exemptions; the union across member Levels is used for configuration/readiness only.

- Counts and passing requirements are configured per knowledge level and applied independently to each required Skill × knowledge-level group. The upper bound is the smallest eligible exact Skill/version bank at that knowledge level across the Role, capped at 500. Every group must supply the configured count; shortages block activation and new attempts rather than reducing counts or passing thresholds. A zero-question required group blocks start and identifies its Skill/knowledge level. Existing attempts retain their frozen paper.
- Drafts may be explicitly saved with incomplete banks. Activation requires at least one eligible question in every applicable group across the Role's member Levels, reporting missing Level/Skill/knowledge banks. Admission rechecks the selected Level's bank. Existing group/paper capacity guards remain.
- One shared seconds-per-question setting determines `actual selected questions × seconds per question`; the server freezes the resulting deadline. Retake settings are shared across the Role. There are no new numeric defaults.
- Opening/editing/Next/Back are local and read-only toward persistence. Save draft and Activate are separate explicit actions. Dirty close offers Save draft / Discard changes / Continue editing; save failure keeps the editor open. Activation requires the exact successfully saved revision and is disabled while edits are unsaved. Abandon saved draft is separate from discarding local edits.
- Configurations lists one row per Role, with drafts before unconfigured Roles. Active holds policies used for new attempts. Successful activation opens Active, retains that Role in view and shows where to find History & details. Archived retains inactive versions, abandoned drafts and historical Role-Level policies.
- Historical Role-Level policies are read-only; none is automatically promoted or merged. New baseline starts require an activated shared Role policy. Existing attempts retain IDs, frozen questions/rules, accepted answers, results and original deadlines, and remain resumable under ordinary expiry rules. Skill Assessment scope, quotas and timing semantics are unchanged.
- Results summarize distinct Skills: a Skill passes only when all its required knowledge groups pass. Each level's result and frozen counts/threshold remain available; only failed required levels become initial learning gaps. Keyboard answer selection remains available without shortcut badges or a question-area outline.

[Technical API/storage transition](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md#shared-role-baseline-2026-11-19) defines scope IDs, compatibility and command behavior. [Deployment configuration](../../../deploy/README.md#riasec-route-and-private-inference) distinguishes a missing RIASEC route from asynchronous AI failure. These source contracts do not establish remote deployment state.

## Baseline and Skill Assessment — source update, 2026-11-18

**Keyboard controls — 2026-11-18:** the shared Employee baseline/Skill Assessment panel now supports number keys to select displayed answers and Enter to save and advance after server acceptance. The final question opens explicit submission confirmation. State, duplicate/repeat, modifier/IME and editing-control guards retain the original command lifecycle. [Verification](../../testing/system/assessment-keyboard-20261118.md): 10 component tests and 5 isolated Chrome journeys passed; build/scoped lint passed. This is browser interaction evidence, not new live assessment persistence acceptance.

At `2c2468b5`, scoped configuration, Role-derived Expert Skill access, draft-first directories, module-specific retake contexts and mandatory-question quotas exist in active local source. [Ordered flow/API/worker/schema contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md#current-flow-2026-11-18) supersedes older code-confirmation notes here. RIASEC below remains a separate workflow.

L&D configures BASELINE per org+Role+member Level; assigned-Role Experts share SKILL_ASSESSMENT per org+Skill+knowledge. Save draft is distinct from activation; immutable policy versions, pointer revisions, catalog hashes, abandoned drafts and command receipts preserve history. New Skill policies explicitly configure mandatoryCount for every MAIN/prerequisite group; exactly that many mandatory plus the remaining ordinary items are sampled within totalCount. All sampled mandatory answers must be correct when quota > 0, alongside the independent requiredCorrectCount. Baseline editor has no mandatory/veto condition. Legacy frozen null-quota papers retain their original semantics.

New question/module/evidence matching is Skill+knowledge+Skill version in the trusted organization, with no Outcome Code filter. V63 sidecars and V64 mandatory_count are reflected in the [current schema](../../diagrams/postgresql-assessment.svg). Actual module completion + accepted pathway option admits MAIN + all configured prerequisite groups. Retake allowance/wait is keyed by selection/step/module/revision; equivalent module 1 cannot exhaust module 2. Scores freeze before durable outcome processing; WAITING_SUPPLEMENT is not a failed or discarded paper. No new tests/runtime actions occur in this document update.

## Current Implementation

**Current rule-flow source inspected:** `2c2468b5`,2026-11-18. Code presence is distinguished from dated runtime evidence; this task adds no executable/runtime result.

| Requirement | Classification | Current behavior and limit |
| --- | --- | --- |
| FR-04.05 | Implemented in source; remote state unverified | L&D manages org+Role baseline policies, local editor state, explicit saved drafts and separate activation. Legacy Role-Level policies remain read-only history. |
| FR-05.06 | Partial | Responsible Expert authors exact Skill/knowledge/outcome/mandatory questions; L&D reviews immutable publication. Expert separately configures org+Skill+knowledge Skill Assessment shared by equivalent modules. Current catalog restricts policy editing to Skills required by assigned active Roles; no direct Skill assignment is required. |
| FR-06.02 | Implemented; runtime unverified here | Selected Role–Level baseline freezes groups/questions/policy/deadline, resumes accepted answers and returns group diagnostics. Compatible official evidence exempts exact groups; certificate-only needs use evidence, not questions. |
| FR-06.03 | Implemented local opt-in; source re-inspected 2026-11-18 | Overview owns 60 EN/VI activities, server autosave/takeover, raw 0–40 scores, current/history/inactive/recovery and durable AI. Latest history/permanent-delete UI has build/static evidence only. |
| FR-06.08 | Implemented local path; remaining branches unverified | Exact completed accepted module option admits MAIN + all prerequisite groups. Content completion differs from official achievement; supplementation/veto/full retakes remain explicit. |
| FR-07.05 | Implemented local rule engine | RuleAssessmentAttemptService/RuleAssessment score persisted groups, auto-finalize at server deadline and queue idempotent downstream effects. Legacy IRT services are not this route's fallback. |

**Entry points:** L&D `/ld-manager/baseline-assessments` and `/ld-manager/question-bank`; Expert `/expert/assessment-bank` and `/expert/skill-assessment-config`; Employee selected Roles, `/employee/baseline-assessment`, `/employee/baseline-assessment/:attemptId`, `/employee/my-mastery`, `/employee/modules/:moduleId`. Reader-to-assessment uses the exact step/module/revision. Retake conflicts remain inline. Legacy configuration URLs redirect; RIASEC entries redirect to `/employee/overview?tab=riasec`.

**Sources:** [ScopedAssessmentPolicyService](../../../backend/src/main/java/com/adaptlearngraph/services/ScopedAssessmentPolicyService.java), [RuleAssessmentAttemptService](../../../backend/src/main/java/com/adaptlearngraph/services/RuleAssessmentAttemptService.java), [CurrentRoleKnowledgeCatalog](../../../backend/src/main/java/com/adaptlearngraph/repository/CurrentRoleKnowledgeCatalog.java), [RuleAssessmentOutcomeService](../../../backend/src/main/java/com/adaptlearngraph/services/RuleAssessmentOutcomeService.java), [QuestionBankService](../../../backend/src/main/java/com/adaptlearngraph/services/QuestionBankService.java). Session/tenant/entitlement, owner/revision/retry and answer-key boundaries are enforced in the relevant services; this is not certification of every security branch.

<a id="riasec-local-bilingual-assessment--target-contract-2026-11-15"></a>

<a id="riasec-personal-assessment--current-implementation-2026-11-18"></a>

## RIASEC personal assessment — current implementation, 2026-11-18

**Source inspected:** `2c2468b5`. The confirmed 17 November implementation supersedes the earlier 15–16 November designs. This optional Employee interest workflow is independent of baseline, Skill Assessment, selected Role, mastery and pathway. It has no pass/fail, timer or permanent retake lock.

### Instrument and scoring

- [Local manifest](../../../frontend/src/features/employee/riasec/riasecInstrument.ts): `alg-riasec-60-en-vi-v1`,60 EN/VI work activities, ten per R/I/A/S/E/C; stable application IDs R01–R10 through C01–C10. It records the pinned Short Form PDF URL, retrieval date/hash, item mapping, project translation revision and license/modification notices. Current active UI does not render those notice fields; see [source limits](../Employee%20experience/README.md#current-riasec-source-limits). This combines PDF activities with five responses and an unvalidated project translation; no external questionnaire/translation call is made.
- Responses: integer 0 Strongly dislike,1 Dislike,2 Unsure,3 Like,4 Strongly like. Unanswered is absent, never default Unsure. Language changes preserve item IDs/answers.
- [RiasecRules](../../../backend/src/main/java/com/adaptlearngraph/entities/domain/RiasecRules.java) validates all 60 known IDs at submit and sums ten responses per dimension. Only six **raw integers 0–40** and scoring version `onet-short-form-0-4-sum-v1` are persisted. There is no stored normalized vector, percentage, percentile, AI scoring or mastery write.
- The rich manifest is frontend-bundled; the backend pins version constants and ID/response rules. V74 stores no manifest archive, draft instrument version or submission locale. Multi-instrument draft migration/historical manifest replay are not implemented.

### Owner, draft and submit

All operations derive organization/account from `RoleBaselineFlow.Identity.requireEmployee()` (authenticated active entitled Employee); no client owner or manager personal-results API is accepted. Controller/config require `local,workspace-baseline`, exclude `local-baseline-demo`/`prod`, and require `riasec.enabled=true`.

One `platform.riasec_workspace` row per organization/account holds at most one non-expiring draft, partial answers, revision, editor UUID and update time. Start resumes an existing draft. Saves replace its answer map under owner-row lock with expected draft/revision/editor checks. Explicit takeover increments revision and fences the former editor. No discard/expiry command exists. Browser results are not promoted; pending unsaved answers remain in the current tab and can be lost on closing before save succeeds.

Review and confirmation precede submit. Under one transaction the server scores **saved** answers, inserts a result, queues AI and clears the draft. Draft UUID becomes `result_id`: replay while the owned receipt is retained returns that same ID. The command carries editor/draft/revision, not trusted client scores. Starting another draft preserves the previous current result.

### Current, history and retention

Current is newest active submission by `submitted_at DESC,result_id DESC`, independently of the viewed result. The radar exposes raw 0–40 values through hover/touch/keyboard and preserves all six equal scores without deriving a unique Holland code. Current comparison details show names and paired scores, but no separate leading-group/meaning summary, boundary-tie disclosure or equal/zero-profile notice is rendered. Those earlier confirmed presentation directions must not be described as completed current UI. Zero/equal profiles are valid saved results and may enter AI; no zero-norm/cosine rejection rule applies.

Overview provides assessment/current/history/inactive summary cards and one searchable/filterable history dialog. Confirmed View opens active history without changing current; inactive rows have no View action. Inactive (soft delete), Recover and permanent Delete have distinct confirmations. Recovery is allowed for **seven days after deletion**, preserves scores/AI snapshots and does not rerun AI. Current is recomputed from original submission time, so restoring an older result need not make it current. Deleting again restarts the seven-day clock. Permanent delete accepts only an owned unexpired inactive result; scheduled cleanup removes expired inactive rows.

New assessment and restore reject any own queued/processing AI; delete/purge reject a running target result. Only the current active FAILED result may retry AI. The latest history/permanent-delete follow-up has build/type-check/lint evidence, without fresh browser/executable verification.

### API and storage

Base `/api/v1/employee/riasec`; successful/mapped failure responses use no-store, with existing session/CSRF security.

| Method / suffix | Purpose |
| --- | --- |
| GET base | Own draft/results/currentId, current active position IDs and catalog availability |
| POST /draft | Start/resume with editorId |
| PUT /draft | Save answers with editorId/draftId/revision |
| POST /draft/takeover | Claim latest draft with expected revision |
| POST /submit | Finalize saved answers; return stable receipt ID |
| DELETE /results/{id} | Mark inactive |
| POST /results/{id}/restore | Restore within seven days |
| DELETE /results/{id}/permanent | Permanently remove an inactive result |
| POST /results/{id}/retry | Requeue current FAILED AI only |

Invalid/incomplete requests return400; draft/editor conflicts, running AI and non-retryable actions409; missing/expired owned results are unavailable; persistence failures503. [Controller](../../../backend/src/main/java/com/adaptlearngraph/apis/RiasecController.java), [service](../../../backend/src/main/java/com/adaptlearngraph/services/RiasecService.java), [store](../../../backend/src/main/java/com/adaptlearngraph/repository/RiasecStore.java) define exact codes/guards.

Forward [workspace V74](../../../backend/src/main/resources/db/workspace-migration/V74__riasec_personal_exploration.sql) creates only `riasec_workspace` and `riasec_result`: [storage schema](../../diagrams/riasec-storage.svg). Answers/scores/version/time remain immutable until owner deletion; AI and retention fields change through their lifecycle. Result includes status/deadline/run fence/model/prompt/recommendation JSON/failure code. No second editable Job Position catalog, baseline/profile reuse or Neo4j learner node is created. Retired migrations/data are not restored; the migration SQL retains its historical V72 pre-application comments after renumbering to V74.

Canonical entry is `/employee/overview?tab=riasec`; standalone/learner and recognized Assessment RIASEC entries redirect there. Remaining AssessmentPage prototype constants are excluded from active quiz/result lists. [Employee surface](../Employee%20experience/README.md#overview-riasec-tab), [AI](../Role%20guidance/README.md#riasec-job-position-exploration), [profile fields](../Departments%20and%20occupations/README.md#riasec-job-position-profiles) own related boundaries. This documentation task runs no application/tests; adaptation, general AI quality and production readiness remain unvalidated.

## Requirements

### Shared engine, scope and policy

The responsible Expert authors question content, key/explanation and exact Skill + knowledge + Skill version/mandatory mapping; L&D reviews question publication. L&D owns BASELINE configuration per organization + Role; selected member Level determines each Employee's requirements. Expert owns SKILL_ASSESSMENT per organization + Skill + knowledge level, shared across equivalent modules. The shared engine does not merge their drafts, activation pointers or version counters. No arbitrary policy scripting is accepted.

Knowledge levels are FOUNDATION / INTERMEDIATE / ADVANCED, distinct from Role member Level and legacy EASY/MEDIUM/HARD difficulty. No level implies another. MAIN/PREREQUISITE is a group's role in a paper, not a fixed question type.

| Purpose | Scope | Result consumer |
| --- | --- | --- |
| BASELINE | Explicit MODULE_ONLY requirements of the selected Role and member Level, minus exact compatible official achievements. CERTIFICATE_ONLY uses certificate evidence instead of baseline questions. | Initial learning needs; pass skips initial module assignment only. |
| SKILL_ASSESSMENT | Main skill–knowledge requirement after qualifying learning, plus ALL configured prerequisite groups. Official prerequisite achievement does not exempt these groups. | Main completion/official achievement when required conditions hold; prerequisite supplementation or NEED_REVIEW and recalculation. |

The shared engine validates coverage, samples, persists/resumes and scores. It does not approve certificates/bypasses or arbitrarily mutate pathways. RIASEC remains a separate interest workflow.

L&D and Expert maintain their separately owned BASELINE and SKILL_ASSESSMENT scopes and active versions. Both automatically finalize at their frozen server deadline. Baseline editor configures common count/pass settings per knowledge level, seconds per actual question and Role retake limits; baseline mandatory and veto flags are false. Expert configures Skill Assessment group counts/pass/mandatory and optional all-wrong prerequisite veto, plus its own fixed timer/retake limits. Values come from the organization; 7/10 is an example, not a default. A group must meet its own threshold AND configured mandatory conditions. No aggregate score offsets another group's failure.

Mandatory quota counts inside total: new Skill policies sample exactly mandatoryCount approved mandatory items and fill the remainder from ordinary items in the same Skill/knowledge/Skill-version bank, without duplicates. Quota0 means ordinary-only sampling. Legacy null-quota frozen papers keep their earlier selection semantics. Validate mandatory count fits the total, bank sufficiency and achievable conditions/thresholds. Skill Assessment requires its complete configured bank; baseline positive shortfalls follow the proportional allocation rule above, while a zero required bank blocks the entire start. No group borrows questions from another. Current validation bounds groups to 1–500 questions and up to 1,000 unique groups; the configured paper ceiling defaults to 1,000 items. Count, capacity, bank coverage and exact catalog hashes are rechecked before activation/start.

Correct = 1; incorrect/unanswered = 0. Negative/partial credit, IRT ability/SE/confidence/calibration, BKT mastery updates and numeric target-gap subtraction are outside the new active flow. Scores describe the sampled paper, not a percentage of all workplace competence.

### Attempt, resume, history and result contract

1. Derive actor, organization, entitlement and staff assignment from trusted server context. Client supplies target/learning references, purpose, answers and expected attempt/revision; it cannot set tenant, reviewer, official achievement or pass status.
2. Read coherent requirement/profile/question/policy versions; resolve baseline exemptions or the complete skill-assessment groups; validate admission and bank coverage.
3. Sample once and persist frozen paper/rules before presenting it. Save answers against that attempt. Reload resumes the same questions, answer state and configured timing; it neither resamples nor resets a deadline. Employee responses never include staff-only answer keys.
4. Finalize once against frozen versions. Output per group: skill/knowledge level, group role where applicable, correct/total, mandatory-condition result, pass/not-pass and reason, with attempt/policy context and downstream completion/pending decision.
5. Retain every attempt, answers, frozen versions and result/decision history. Stale concurrent save/finalize cannot overwrite newer accepted state. Replayed submission/result consumption returns its accepted outcome without duplicate achievements, remediation or revisions. Outage/uncertain outcome remains visible and recoverable, never fabricated success.

Business states distinguish not assessed, unavailable/insufficient bank, in progress/resumable, finalized and downstream processing pending/failed. Missing evidence is not a failed assessment. The current contract names/transaction/API mapping govern implementation. Configured deadline automatically finalizes the paper once with unanswered items zero; unsupported abandonment/cancellation features are not added.

### Confirmed scope, ordering and module retry rules

Expert Skill-policy editing follows assigned Roles: an Expert may configure Skills contained in any Role they are assigned, and Experts of different Roles sharing the Skill edit one common Skill-knowledge policy. A separate direct Skill assignment is not required. Enforce trusted organization/membership/entitlement, Role-derived scope and revision/replay checks.

Saved draft scopes precede unconfigured scopes. Equivalent modules use common policy parameters, but max-attempt allowance and retake waiting time apply separately to each module's authorized learning context. Module 1 cannot exhaust or delay module 2, and prior Skill achievement does not itself block another eligible module's assessment. Each module still requires its own qualifying completion/access and retry conditions. This is confirmed policy and is present in CurrentRoleKnowledgeCatalog context keys and RuleAssessmentAttemptService counters/wait guards at the 18 November source checkpoint; runtime acceptance remains version-scoped.

### Prerequisite results and full retake

| Condition | Main result | Prerequisite consequence |
| --- | --- | --- |
| Main fails its own rules | Incomplete; reuse current step. | Evaluate prerequisite groups separately; do not duplicate the main step. |
| Main and prerequisites pass | May complete when learning and required conditions hold. | No supplementation from those groups. |
| Prerequisite below threshold with at least one correct | Main may pass; retain main group result pending required supplementation before closing the step. | Without official achievement: required remediation. With official achievement: retain ACHIEVED and record NEED_REVIEW/optional review. |
| All answers wrong in a prerequisite and org veto enabled | Main remains incomplete and requires assessment retake, even when prerequisite was officially achieved. | Remediation if not officially achieved; otherwise NEED_REVIEW. Never revoke the prior achievement. |

With veto disabled, ordinary group rules apply; zero correct does not silently enable a veto. Each retake is a NEW full configured paper: main + ALL prerequisite groups, without passing-group score carry-over/exemption. Retaining a main group result while awaiting supplementation is not a partial-paper retake and does not award ACHIEVED. [Profile/recalculation](../Adaptive%20engine/README.md#profile-and-evidence-precedence) defines downstream effects.

### UI continuity and implementation boundary

The current routed configuration/Question Bank/reader flows reuse the existing visual system. Source includes module assessment badges and direct reader-to-assessment navigation. Schema and code presence do not verify all runtime branches. Missing active scope, catalog drift, insufficient approved bank, retake wait/limit and stale revisions stay explicit errors. Draft-first ordering and Role-derived Skill-policy editing are confirmed in the technical contract; implementation confirmation remains separate.

<a id="fr-04-05"></a>

### FR-04.05: Manage baseline assessment configuration

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-04.05 |
| 2. Requirement Name | Manage baseline assessment configuration |
| 3. Description | The L&D Manager shall configure one baseline policy per organization Role; selected member Level still determines Employee requirements. Expert-owned Skill Assessment configuration is separate under FR-05.06. |
| 4. Actor | L&D Manager |
| 5. Preconditions | Trusted entitled L&D membership; current policy revision and valid scope/bank references. |
| 6. Main Flow | Select Role; edit local knowledge-level counts/pass, seconds per question and retakes; explicitly Save draft; separately Activate that saved revision after all-Level readiness checks. |
| 7. Alternative / Exception Flows | Reject stale/unauthorized/impossible configuration; expose insufficient bank; preserve frozen attempts. |
| 8. Postconditions | New policy revision is available with prior history retained; no learner result is awarded. |
| 9. Acceptance Criteria | One draft and active version per Role scope, selected-Level requirements, proportional shortfall threshold rounded up, zero-bank blocking, frozen actual-count deadline, independent Skill policies and preserved historical papers. |

<a id="fr-05-06"></a>

### FR-05.06: Manage module assessments

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.06 |
| 2. Requirement Name | Manage module assessments |
| 3. Description | The Expert shall author versioned questions mapped to Skill/knowledge/outcome and configure Skill Assessment for organization+Skill+knowledge, including MAIN and all configured prerequisite groups; equivalent modules use that same policy. |
| 4. Actor | Expert |
| 5. Preconditions | Trusted authorized same-organization Expert; current ownership/assignment and eligible Skill/knowledge/Skill-version references. |
| 6. Main Flow | Author content/key/explanation and mandatory designation; map exact scope; submit through existing L&D question review; configure and activate the exact Skill–knowledge policy after complete bank/readiness checks. |
| 7. Alternative / Exception Flows | Incomplete drafts stay drafts; missing bank, incompatible outcomes or stale/unapproved versions cannot produce a ready paper. Protect staff answers. |
| 8. Postconditions | Approved versioned questions/coverage are available to the shared engine; historical attempts keep original definitions. |
| 9. Acceptance Criteria | MAIN/PREREQUISITE is a group role; extend legacy difficulty-only mapping while preserving ownership/review/import history. |

#### Implemented Question Bank subset — 2026-10-30

Activity diagram: [ACT-10 — Question Bank authoring and approval](../../diagrams/mermaid/act-10.mmd) ([SVG](../../diagrams/mermaid/act-10.svg), [PNG](../../diagrams/mermaid/act-10.png)). This concise diagram covers the main draft/submission/return/publication flow; secondary lifecycle rules remain specified below. It does not show scoped policy activation, timed Employee papers or downstream achievement processing.
State machines: [ST-16A — question-version lifecycle](../../diagrams/mermaid/st-16a.mmd) ([SVG](../../diagrams/mermaid/st-16a.svg)) and [ST-16B — question availability](../../diagrams/mermaid/st-16b.mmd) ([SVG](../../diagrams/mermaid/st-16b.svg)).

This subset covers the organization-wide Question Bank across MicroSkills. It does not complete the whole module-assessment requirement above. The routed UI retains the header, four compact statistics cards, filters, responsive question directory and dialogs; it uses the shared [QuestionBankWorkspace](../../../frontend/src/shared/components/question-bank/QuestionBankWorkspace.tsx) and real staff APIs instead of browser mock storage. Legacy Blueprint configuration is not exposed as a persisted Question Bank capability.

- **Authority:** authenticated, entitled same-organization Experts can read. Only the responsible Expert creates/edits/submits/withdraws a question candidate. L&D assigns or transfers responsibility with a reason, reviews/returns and decides availability. Peer Experts are read-only; Employee and other-organization requests cannot read answer-bearing staff data.
- **Content:** one immutable normalized code, plain-text prompt with line breaks, one current approved MicroSkill, four distinct options, exactly one correct answer, knowledge level, one assessed outcome, mandatory flag and explanation. Draft save/import permits incomplete fields; submission requires complete valid content. Skill names are server-resolved, not arbitrary imported metadata.
- **Review:** L&D explicitly acknowledges the exact submitted version before approval. Approval publishes that version atomically. Bulk decisions are all-or-nothing; stale revisions require reload/review. Before bulk approval, a dialog identifies selected question codes that still need review or are otherwise ineligible and links to the first question. Server conflicts appear in the dialog with reload guidance; selection is retained after failure. Return/withdraw requires a reason and restores the same draft candidate while preserving event snapshots.
- **Versions/history:** published definitions remain immutable; one successor candidate may be edited without replacing the published predecessor. Creator, responsible Expert, editors, submitters, reviewers, times and reasons remain visible when actually recorded. Legacy absent metadata is never invented; L&D assigns unowned legacy questions. Missing legacy management codes derive deterministically from stable IDs. New question codes are generated by the backend and cannot be entered in the create form; existing codes remain unchanged.
- **Import:** Excel/JSON templates omit question code. Import creates new drafts only; backend generates immutable Q-UUID codes, preview/confirmation retain those codes, and confirming the same batch again does not create duplicates. Code-bearing old templates require a fresh upload. Matching normalized content requires warning acknowledgement; existing questions are never updated by import. Any invalid row blocks the batch. Default configurable limits remain10MiB/500 rows. At the import Review step, each parsed question offers View as test taker using the server-preview content before confirmation. Closing the viewer retains the batch and warning acknowledgement; local trial choices create no answers, scores or mastery. After confirmation, Expert can preview only the newly created questions as a test taker, navigate items and use desktop/mobile/full preview. The viewer reads persisted versions from the confirmation response, matched by the generated import codes. Answers remain neutral; the staff-only answer key/explanation is collapsed separately. Trial choices are local UI state and do not record answers, scores or mastery. The neutral question body is shared with the current Employee attempt presentation.
- **Availability:** Expert requests retirement/reactivation with reason; L&D confirms. Retirement affects the stable question across versions for future selection. Existing published definitions, assessment pins and attempts remain unchanged; reactivation never publishes a draft or promotes IRT parameters.
- **Notifications:** targeted same-organization in-app notices only. Question Bank actions for Experts and L&D Managers do not send email.

Storage/field definitions: [architecture](../../ARCHITECTURE.md#question-bank-authoring--r2-2026-10-30), [graph responsibility boundary](../../neo4j_schema.md). Existing browser data is not imported automatically; no production deployment is implied.

Verification: [unit](../../testing/unit/REQ-014-question-bank.md), [PostgreSQL integration](../../testing/integration/REQ-014-question-bank.md), [real browser/Mailpit results and manual checklist](../../testing/system/REQ-014-question-bank.md). Those records describe the older locally verified authoring workflow; they do not verify the current knowledge mapping, scoped Skill policies or rule exam engine.

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
| 3. Description | The Employee shall complete the local EN/VI 60-item Short Form-based interest assessment and retain server-scored results independently of learning assessments. |
| 4. Actor | Employee |
| 5. Preconditions | Trusted active entitled Employee membership; locally available pinned instrument. AI and target selection are not required. |
| 6. Main Flow | Start/resume a revisioned draft; answer/review 60 items in EN/VI; submit once; inspect six scores and own immutable history; optionally explore job positions or retake. |
| 7. Alternative / Exception Flows | Reject incomplete/invalid/stale submission; recover uncertain outcomes by replay; preserve draft on save failure; expose access/service errors and uninformative results explicitly. |
| 8. Postconditions | Own tenant-scoped answers, six raw 0–40 scores and versions are saved; AI has separate recoverable state and results support inactive/recovery/permanent deletion. |
| 9. Acceptance Criteria | Exactly ten mapped items per dimension, 0–4 coding and 0–40 raw sums; locale-independent scores; no neutral default, browser-result promotion, duplicate finalization or changes to baseline/competency/Role–Level/pathway. |

<a id="fr-06-08"></a>

### FR-06.08: Complete learning and assessments

The Skill knowledge-level assessment section and Pathway requirement details use shared assessment history, attempt limits and cooldown across Pathway and Individual Skill for the same Employee, organization, Skill, knowledge level and Skill version. The Learning Module Reader focuses on lesson consumption and completion, guiding learners back to their originating Skill knowledge-level tab or Pathway view to start or review assessments rather than embedding inline exam controls at the bottom of the lesson. Selecting a completed eligible module supplies learning evidence for a new paper without resetting history. Identifiable historical attempts count toward the shared allowance; original source, results and achievements remain intact. Multiple existing active papers can each be resumed and prevent a new paper until normal completion or original deadline handling. Unknown historical scope requires reconciliation. Exact learning admission, question selection, scoring and Baseline behavior remain authoritative; errors preserve progress.

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


Question Bank source now exposes knowledge level/outcome/mandatory fields in the existing workspace and requires complete mapping before publication. Development classification/publication is separate fixture wiring; it does not prove semantic correctness of every question or genuine human review. Repeated CORE01 Foundation choices remain a known fixture limitation, with no rewrite in this task.

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

Question Bank statistics use shared neutral-surface StatCards, semantic icons/value colors and concise English/Vietnamese descriptions. Total Bank Items, Published Questions, Awaiting review and Micro-Skills Assessed retain their existing calculations and organization scope.

Question Bank Directory uses a responsive seven-column presentation: question/code, MicroSkill, knowledge level, Responsible Expert, state, latest recorded update and permitted actions. Responsible Expert comes from question ownership, independently of creator, editor, submitter and reviewer. Available names use initials; absent ownership is Unassigned and unresolved identities remain unavailable. Shared badges, typography, borders and compact Eye/Pencil/Power actions follow Job Positions; desktop column headers use the same 11px uppercase semibold treatment, with text-sm primary row content and text-xs secondary values/metadata matching the reference table. Power retains the existing availability-request workflow. Question codes can be copied in the directory, details, editor, import review and review feedback with shared success/error toasts. Existing search, filters, pagination and permissions remain available; L&D selected-question actions are approval and clear selection.

The right-side detail panel has Question content and History & versions tabs. Content separates a two-column overview, labelled responsibility, prompt/answers/explanation and assessment configuration. Correct answers use a green check; permitted empty draft fields have explicit empty states. The configuration explains that mandatory designation applies to Skill Assessment while Baseline uses its own selection policy. History groups a compact version selector and state badge with separate recorded identities, without repeating the selected-version description. Chronological events identify action, actor, affected question/version, actual time and optional reason; View question snapshot exposes stored historical content with a clear description. Its scoped font family/sizes follow Job Positions. Historical assignment recipients are explicitly unavailable where the API does not record them, independently of current ownership; assignment and reassignment are not guessed from event order. Optional missing metadata uses a dash. Compact codes retain complete copyable text and toast/error feedback. Its authorized actions and Close remain outside the content scroller; drawer submission and approval require confirmation without a new mandatory reason. Closing preserves filters/page and returns focus to the source. Exact-version review acknowledgement remains required for approval; returning a question retains the existing reason-based workflow. L&D can search eligible Experts and assign or reassign a single question with a required reason and revision check; failures retain selection and input. No bulk assignment or unsupported profile data is introduced. [R5 history verification](../../testing/system/REQ-014-question-history-r5-20261111.md); [R4 drawer verification](../../testing/system/REQ-014-question-details-r4-20261111.md); [R3 verification and limitations](../../testing/system/REQ-014-responsibility-r3-20261110.md); [earlier compact-directory verification](../../testing/system/REQ-014-compact-directory-20261110.md).

The draft editor groups basic information, assessment configuration and question/answer content, with a live preview and visible header/footer outside the content scroller. Correct-answer selection uses the shared radio controls; it can be cleared to retain a null draft answer. Desktop uses a 65/35 form/preview layout with sticky preview; smaller screens expose preview through a collapsible section. Prompt, answer choices and explanation support multiline input with bounded automatic height and vertical scrolling. Long unbroken text wraps without truncation; preview A–D labels remain fixed and top-aligned beside long answers. Preview content is keyboard-scrollable while the existing dialog footer remains accessible. Form fields retain inner spacing so focused borders remain visible at the scroll-container edge. Empty fields remain explicitly empty. Local field feedback identifies missing prompt/Skill while server failures preserve entered values. Prompt and current Skill remain required to save; incomplete draft answers and knowledge level retain their permitted nullability. Knowledge-level guidance distinguishes draft save from submission requirements. All question fields, generated codes and Expert/L&D authority remain unchanged.

Question import uses Upload, Validate and Confirm steps, shown by a compact circular linear stepper with completed check indicators and primary-colored current progress. Progress remains outside the content scroller. Keyboard file browsing and drag/drop share the existing XLSX/JSON parser and real preview/confirm API. The UI displays selected file metadata, configured size/row limits, actual accepted/rejected draft totals and distinct matching-content candidates reported by server warnings. Source-row references are shown when available; unknown server errors are retained without fabricated field attribution. Errors block progress, warnings require acknowledgement, and confirmation creates drafts only. The same shared dialogs and tokens support desktop, tablet and mobile. [Local UI verification and limitations](../../testing/system/REQ-014-assessment-bank-ui-r2-20261110.md); [stepper/form refinement](../../testing/system/REQ-014-question-form-refinement-20261110.md).


### Skill Assessment learning prerequisite — source 2026-11-07

All lessons complete records immutable module/content/Skill provenance and an exact knowledge/Skill-version sidecar. Rule exam admission additionally requires the current accepted pathway step/option, matching module revision/content/Skill version/knowledge and trusted Employee context. The retained skill-only eligibility API is informational, not complete exam authorization. [Current technical contract](../../technical/Skill-Learning-Eligibility.md).
