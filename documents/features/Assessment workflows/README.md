# Assessment Workflows

**Source alignment — 2026-11-07.** Confirmed behavior is distinguished from checked-in implementation below. [Current source/schema/API contract](../../technical/Organization%20Rule%20Assessment%20and%20Pathway.md) records local profile gates, exact ownership and remaining mismatches. Runtime/database acceptance is not established by this prose update.

**Source:** [Version 2](../../FA26SE267_KNOWLEDGE_GRAPH_BASED_ADAPTIVE_LEARNING__haht43_Version_2.md), section 3.2(c), Functional Requirements.

**Source reconciliation:** 2026-10-28. **Source requirements in this domain:** 6.

**Contract basis:** confirmed behavior plus the later L&D Role–Level / Expert Skill–knowledge configuration decisions. Historical evidence retains its original scope; it is not a fresh passing result.

## Current Implementation

**Source-inspected:** HEAD `61d334c`, 2026-11-07. Implemented below means code exists in the gated local workspace composition; no executable or learner checks were run in this documentation task.

| Requirement | Classification | Current behavior and limit |
| --- | --- | --- |
| FR-04.05 | Implemented; runtime unverified here | L&D manages org+Role+member Level baseline directory, one draft, immutable scoped versions and one active pointer. Partial editor save is separate from complete-and-activate; abandoned drafts remain history. |
| FR-05.06 | Partial | Responsible Expert authors exact Skill/knowledge/outcome/mandatory questions; L&D reviews immutable publication. Expert separately configures org+Skill+knowledge Skill Assessment shared by equivalent modules. Role-derived Skill-policy authorization needs code confirmation; separate direct Skill assignment is not required. |
| FR-06.02 | Implemented; runtime unverified here | Selected Role–Level baseline freezes groups/questions/policy/deadline, resumes accepted answers and returns group diagnostics. Compatible official evidence exempts exact groups; certificate-only needs use evidence, not questions. |
| FR-06.03 | Prototype; re-inspected 2026-11-15 at `fb9d589ab12a` | AssessmentPage contains 18 IT-specific items, 1–5 responses, missing-to-neutral scoring and browser result/completion keys. The separate RiasecAssessmentPage duplicates this prototype. Overview has only a RIASEC placeholder; no server RIASEC workflow was found in the inspected source. The target contract below is not implemented. |
| FR-06.08 | Implemented local path; remaining branches unverified | Exact completed accepted module option admits MAIN + all prerequisite groups. Content completion differs from official achievement; supplementation/veto/full retakes remain explicit. |
| FR-07.05 | Implemented local rule engine | RuleAssessmentAttemptService/RuleAssessment score persisted groups, auto-finalize at server deadline and queue idempotent downstream effects. Legacy IRT services are not this route's fallback. |

**Entry points:** L&D `/ld-manager/baseline-assessments` and `/ld-manager/question-bank`; Expert `/expert/assessment-bank` and `/expert/skill-assessment-config`; Employee selected Roles, `/employee/baseline-assessment`, `/employee/baseline-assessment/:attemptId`, `/employee/my-mastery`, `/employee/modules/:moduleId`. Reader-to-assessment uses the exact step/module/revision. Retake conflicts remain inline. Legacy configuration URLs redirect; RIASEC redirects to the consolidated assessment prototype.

**Sources:** [ScopedAssessmentPolicyService](../../../backend/src/main/java/com/adaptlearngraph/services/ScopedAssessmentPolicyService.java), [RuleAssessmentAttemptService](../../../backend/src/main/java/com/adaptlearngraph/services/RuleAssessmentAttemptService.java), [CurrentRoleKnowledgeCatalog](../../../backend/src/main/java/com/adaptlearngraph/repository/CurrentRoleKnowledgeCatalog.java), [RuleAssessmentOutcomeService](../../../backend/src/main/java/com/adaptlearngraph/services/RuleAssessmentOutcomeService.java), [QuestionBankService](../../../backend/src/main/java/com/adaptlearngraph/services/QuestionBankService.java). Session/tenant/entitlement, owner/revision/retry and answer-key boundaries are enforced in the relevant services; this is not certification of every security branch.

## RIASEC local bilingual assessment — target contract, 2026-11-15

**Status:** confirmed feature direction, with bounded design choices specified here before implementation. Source inspection establishes code presence only; persistence, authorization, scoring and UI behavior below are not runtime-verified. This interest workflow is independent of baseline/Skill Assessment: no correct answers, pass/fail, achievement, admission dependency, deadline auto-finalization or permanent retake lock. Existing baseline, competency, Role–Level and pathway contracts remain unchanged.

### Instrument, source and language

- Bundle 60 work activities locally in EN/VI, ten for each dimension in fixed vector order R, I, A, S, E, C. The canonical English item text and dimension membership come from the official [Short Form PDF, marked v1](https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf), inspected 2026-11-15. Assign internal IDs `R01`–`R10`, `I01`–`I10`, `A01`–`A10`, `S01`–`S10`, `E01`–`E10`, `C01`–`C10`, reading each section's left column top-to-bottom then right column. These are application IDs, not claimed official O*NET item numbers. Preserve the source wording and membership; do not substitute IT-specific activities.
- The PDF uses checked-activity counts (0–10 per dimension). This application instead adopts the five-response web Short Form scoring described in the [O*NET Interest Profiler Manual v1.0, March 2021, chapter 3, printed pp. 31–32](https://www.onetcenter.org/dl_files/IP_Manual.pdf). Consequently, the local instrument combines that response format with the pinned PDF activity text and a Vietnamese translation: it is an adaptation, not a verbatim paper instrument or a claim to reproduce today's hosted web questionnaire. The [current formats page](https://www.onetcenter.org/IP.html) distinguishes Short Form 60 from Mini-IP 30; do not silently replace the selected 60-item instrument with Mini-IP.
- Response codes are integers: `0` Strongly dislike / Rất không thích; `1` Dislike / Không thích; `2` Unsure / Chưa chắc; `3` Like / Thích; `4` Strongly like / Rất thích. Unsure is an explicit answer, never an unanswered default. Instructions ask about interest in activities rather than present ability, training or pay. Do not retain the prototype's 1–5/Neutral/Enjoy contract.
- Server owns a pinned manifest containing instrument ID/version, source URL/date/content hash, source-to-item mapping, EN/VI text, translation revision, response codes and scoring version. FE renders the same version from the application; there is no external questionnaire, translation or scoring request at runtime. Keep old manifests available for historical rendering. Text/mapping/translation changes create a new version; never reinterpret an existing draft/result under a new manifest. Switching language retains answers by stable item ID, progress and attempt identity.
- Vietnamese text is a project translation, not an officially supplied or psychometrically validated Vietnamese instrument. Under the official [content-license options](https://www.onetcenter.org/license_tools.html), this adaptation uses the [Tools Developer License](https://www.onetcenter.org/license_toolsdev.html), not unmodified redistribution under CC BY-ND. Retain source/license notices, identify modifications and lack of USDOL/ETA endorsement. Section 3(b) requires validation of modified content before introduction and conspicuous modification notices, including the product README and launch surface. Copy the required notice from the license during authorized implementation. No validation study, translation review or release clearance is established here; a disclaimer alone does not fulfill validation. This documentation task neither authors nor runs such a study.

### Draft, submit and scoring

1. Require authenticated active entitled Employee membership. Server derives actor and tenant; attempt IDs, organization IDs or client scores never grant ownership. RIASEC does not require a selected target Role, completed baseline, learning pathway or enabled AI.
2. Start/resume at most one active draft per actor + tenant + instrument version. PostgreSQL stores server-issued attempt ID, pinned manifest, partial answers, revision and timestamps. Autosave is revision-checked; distinguish pending/failed save from accepted save. Reopening resumes the same accepted answers. No timer or expiry is introduced; a retired version is not offered for new starts but its existing draft remains resumable with its pinned manifest.
3. Review all answers before explicit submit. Server accepts exactly 60 distinct known IDs, each with an integer 0–4 under the pinned version; reject duplicate/unknown/missing IDs, invalid values and stale draft revisions without partial finalization. Compute on the server, never trust FE scores. Drafts have no official result or matches.
4. For dimension `d`, `raw[d] = sum(its ten responses)` (0–40), `normalized[d] = raw[d] / 40` (0–1). Optional display is `100 * normalized[d]`, rounded only for display; never rank on rounded values. Persist both six-vectors and scoring version. These values are interest scores, not percentiles, competency/mastery or probabilities.
5. Persist immutable submitted answers, result, instrument/scoring versions, submission locale and server timestamp in one PostgreSQL transaction. Scope command/idempotency identity to actor + tenant + attempt, with payload identity and uniqueness constraints. Identical replay returns the original result even after a lost response; a conflicting replay cannot overwrite it. Concurrent save/submit cannot change a finalized attempt. Submit recovery reads the accepted outcome before offering a new attempt; matching/AI failure cannot undo the saved result.
6. Retake explicitly creates a new draft/attempt without changing earlier submissions. History shows only the actor's own tenant-scoped results with date/version and all six scores; a new version does not convert old scores or mark old attempts failed. Do not import `alg_employee_riasec_result_v1`, its answers or `employee_riasec_completed` as official results, and do not clear unrelated browser data.

Show tied high dimensions as tied; stable R/I/A/S/E/C display ordering is only a presentation convention, not a claimed unique Holland code. Preserve all six scores for [job-position ranking](../Role%20guidance/README.md#riasec-job-position-exploration); top-three letters do not drive matching. A zero vector or equal six scores is saved with an uninformative-profile notice and a review/retake option; it does not produce personalized ranks or imply assessment failure. Distinguish no result, resumable draft, submitting/uncertain outcome, saved result, validation/conflict, access denial and service unavailable in both languages.

### Source evidence and storage transition

[AssessmentPage](../../../frontend/src/features/employee/assessment/AssessmentPage.tsx) and [RiasecAssessmentPage](../../../frontend/src/features/employee/riasec/RiasecAssessmentPage.tsx) contain the 18-item/browser prototypes, including neutral substitution; the active Assessment page also has a 15-minute timer and permanent-retake-lock text. These are superseded only for RIASEC by this target contract, not rules to carry into the new flow. [App routes](../../../frontend/src/app/App.tsx) currently redirect `/employee/riasec` to `/employee/assessment?tab=baseline`; route/caller consolidation is future implementation.

No RIASEC-specific persisted attempt/result implementation was found in the scoped backend inspection. Future storage uses additive, forward-only migrations in the active workspace lineage, whose [configuration](../../../backend/src/main/resources/application-workspace-baseline.yml) defaults to `db/workspace-migration` (deployment override must be checked before coding). Do not rewrite applied migrations or reuse baseline attempts/profile revisions as interest results. Exact DDL/API shapes and manifest transcription belong to implementation; no schema/data change is performed by this contract.

## Requirements

### Shared engine, scope and policy

The responsible Expert authors question content, key/explanation and exact Skill + knowledge + outcome/mandatory mapping; L&D reviews question publication. L&D owns BASELINE configuration per organization + Role + actual member Level. Expert owns SKILL_ASSESSMENT per organization + Skill + knowledge level, shared across equivalent modules. The shared engine does not merge their drafts, activation pointers or version counters. No arbitrary policy scripting is accepted.

Knowledge levels are FOUNDATION / INTERMEDIATE / ADVANCED, distinct from Role member Level and legacy EASY/MEDIUM/HARD difficulty. No level implies another. MAIN/PREREQUISITE is a group's role in a paper, not a fixed question type.

| Purpose | Scope | Result consumer |
| --- | --- | --- |
| BASELINE | Explicit MODULE_ONLY requirements of the selected Role and member Level, minus exact compatible official achievements. CERTIFICATE_ONLY uses certificate evidence instead of baseline questions. | Initial learning needs; pass skips initial module assignment only. |
| SKILL_ASSESSMENT | Main skill–knowledge requirement after qualifying learning, plus ALL configured prerequisite groups. Official prerequisite achievement does not exempt these groups. | Main completion/official achievement when required conditions hold; prerequisite supplementation or NEED_REVIEW and recalculation. |

The shared engine validates coverage, samples, persists/resumes and scores. It does not approve certificates/bypasses or arbitrarily mutate pathways. RIASEC remains a separate interest workflow.

L&D and Expert maintain their separately owned BASELINE and SKILL_ASSESSMENT scopes, active versions and time limits. Both automatically finalize at their server deadline. Baseline editor configures common count/pass settings per knowledge level across its target Skills plus timer/retake limits; baseline mandatory and veto flags are false. Expert configures Skill Assessment group counts/pass/mandatory and optional all-wrong prerequisite veto, plus its own timer/retake limits. Values come from the organization; 7/10 is an example, not a default. A group must meet its own threshold AND configured mandatory conditions. No aggregate score offsets another group's failure.

Mandatory questions count inside the configured total: include matching approved mandatory items first, then randomly fill from the same skill/knowledge/outcome bank without duplicates. Validate mandatory count fits the total, bank sufficiency and achievable conditions/thresholds. Missing/invalid policy or insufficient bank gives an explicit unavailable/configuration outcome, never a partial successful paper or questions borrowed from another group. Current validation bounds groups to 1–500 questions and up to 1,000 unique groups; the configured paper ceiling defaults to 1,000 items. Count, capacity, bank coverage and exact catalog hashes are rechecked before activation/start.

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

Saved draft scopes precede unconfigured scopes. Equivalent modules use common policy parameters, but max-attempt allowance and retake waiting time apply separately to each module's authorized learning context. Module 1 cannot exhaust or delay module 2, and prior Skill achievement does not itself block another eligible module's assessment. Each module still requires its own qualifying completion/access and retry conditions. This is confirmed policy; code confirmation is deferred.

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
| 3. Description | The L&D Manager shall configure baseline policies for each organization Role–member Level; Expert-owned Skill Assessment configuration is separate under FR-05.06. |
| 4. Actor | L&D Manager |
| 5. Preconditions | Trusted entitled L&D membership; current policy revision and valid scope/bank references. |
| 6. Main Flow | Select Role/member Level; create/resume draft; configure knowledge-level counts/pass and timer/retakes; save partial progress or complete and activate atomically after readiness checks. |
| 7. Alternative / Exception Flows | Reject stale/unauthorized/impossible configuration; expose insufficient bank; preserve frozen attempts. |
| 8. Postconditions | New policy revision is available with prior history retained; no learner result is awarded. |
| 9. Acceptance Criteria | One draft and active version per exact Role–Level scope, independent Skill policies, scope-local version numbers, no default pass threshold or cross-group compensation. |

<a id="fr-05-06"></a>

### FR-05.06: Manage module assessments

| Field | Description |
| --- | --- |
| 1. Requirement ID | FR-05.06 |
| 2. Requirement Name | Manage module assessments |
| 3. Description | The Expert shall author versioned questions mapped to Skill/knowledge/outcome and configure Skill Assessment for organization+Skill+knowledge, including MAIN and all configured prerequisite groups; equivalent modules use that same policy. |
| 4. Actor | Expert |
| 5. Preconditions | Trusted authorized same-organization Expert; current ownership/assignment and eligible skill/knowledge/outcome references. |
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
- **Import:** Excel/JSON templates omit question code. Import creates new drafts only; backend generates immutable Q-UUID codes, preview/confirmation retain those codes, and confirming the same batch again does not create duplicates. Code-bearing old templates require a fresh upload. Matching normalized content requires warning acknowledgement; existing questions are never updated by import. Any invalid row blocks the batch. Default configurable limits remain10MiB/500 rows.
- **Availability:** Expert requests retirement/reactivation with reason; L&D confirms. Retirement affects the stable question across versions for future selection. Existing published definitions, assessment pins and attempts remain unchanged; reactivation never publishes a draft or promotes IRT parameters.
- **Notifications:** targeted same-organization in-app notices and durable email jobs. SMTP failure retries independently of committed business operations. Acceptance uses local Mailpit only.

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
| 8. Postconditions | Own tenant-scoped immutable answers and versioned raw/normalized result are saved; matching/AI have separate recoverable states. |
| 9. Acceptance Criteria | Exactly ten mapped items per dimension, 0–4 coding and 0–40 raw sums; locale-independent scores; no neutral default, browser-result promotion, duplicate finalization or changes to baseline/competency/Role–Level/pathway. |

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

All lessons complete records immutable module/content/Skill provenance and an exact knowledge/outcome sidecar. Rule exam admission additionally requires the current accepted pathway step/option, matching module revision/content/Skill version/knowledge/outcomes and trusted Employee context. The retained skill-only eligibility API is informational, not complete exam authorization. [Current technical contract](../../technical/Skill-Learning-Eligibility.md).
