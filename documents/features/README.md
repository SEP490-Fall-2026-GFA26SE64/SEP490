# Feature and Function Documentation

**Current source:** [System Overview](../adapt_learn_graph_system_overview.md), with requirement mapping in [Product Overview](../PRODUCT_OVERVIEW.md).  
**Aligned:** 2026-10-14. This catalog supersedes the historical SaaS index and interview queue below.

## Current Reading Rules

- The four actors are System Administrator, L&D Manager, Expert, and Employee. Services and algorithms are automated performers.
- This is one organization's internal system. Billing, PayOS, multi-organization registration, and platform subscription administration are excluded.
- Existing requirement/function IDs and file paths remain stable for traceability. Legacy filenames do not establish current business scope.
- A **Current Scope Alignment** section in an existing feature/function document controls over its retained historical description, decisions, status, and acceptance rules. Old test results do not certify revised scope.
- New feature READMEs contain function-level IDs, inputs/outcomes, acceptance scenarios, and open decisions. They are scope drafts, not implementation-ready approved contracts.
- Reclarify baseline-before-role-selection, discipline ownership, publication/approval, reviewed AI guidance, initial pathway confirmation, and evidence-driven adaptation before changing code or schemas.
- Architecture/schema documents describe existing technical fields separately from product design gaps; do not fabricate fields, scoring formulas, or implementation evidence.

## Current Feature Index

| ID | Feature | Current actor or performer | Contract status |
| --- | --- | --- | --- |
| REQ-001 | [Target role selection](Target%20role%20selection/README.md) | Employee | Reclarify reviewed-guidance/publication gates |
| REQ-002 | [Baseline knowledge assessment](Baseline%20knowledge%20assessment/README.md) | Employee; L&D configures | Reclarify assessment scope and scoring |
| REQ-004 | [Adaptive pathway](Adaptive%20pathway/README.md) | Employee | Initial Expert confirmation required |
| REQ-005 | [Recommendation explanation](Recommendation%20explanation/README.md) | Employee | Retained; detail draft |
| REQ-006 | [Competency graph](Competency%20graph/README.md) | Employee | Retained; detail draft |
| REQ-007 | [Learning modules](Dummy%20learning%20modules/README.md) | Employee | Dummy-only limit removed |
| REQ-008 | [Module assessment](Module%20assessment/README.md) | Employee; Expert configures | Approval and independent learning need detail |
| REQ-009 | [Assessment results](Assessment%20results/README.md) | Employee | Baseline/RIASEC/module history |
| REQ-010 | [Recalculation visibility](Recalculation%20visibility/README.md) | Employee | New-evidence adaptation |
| REQ-011 | [Assigned target roles](Assigned%20target%20roles/README.md) | Expert | L&D assignment; revalidate access |
| REQ-012 | [Micro-skill management](Micro-skill%20management/README.md) | Expert | Assigned-discipline scope |
| REQ-013 | [Learning module management](Learning%20module%20management/README.md) | Expert | Author/organize/submit for approval |
| REQ-014 | [Question management](Question%20management/README.md) | Expert | Module assessment configuration |
| REQ-015 | [Role requirements](Role%20requirements/README.md) | Expert | Competencies/skills/proficiency/importance |
| REQ-016 | [Module outcomes](Module%20outcomes/README.md) | Expert | Assigned-discipline mappings |
| REQ-017 | [Question mapping](Question%20mapping/README.md) | Expert | Skill and difficulty classification |
| REQ-018 | [Target-role graph editing](Target-role%20graph%20editing/README.md) | Expert | Assigned scope; L&D publishes |
| REQ-019 | [Initial pathway review](Initial%20pathway%20review/README.md) | Expert | Confirm before Employee starts |
| REQ-020 | [Pathway adjustment](Pathway%20adjustment/README.md) | Expert | Include/exclude during review |
| REQ-022 | [Account management](Account%20management/README.md) | System Administrator | Create/update/activate/deactivate/access roles |
| REQ-023 | [Target role management](Target%20role%20management/README.md) | L&D Manager; Expert configures | Creation is distinct from publication |
| REQ-024 | [Target role Expert assignment](Expert%20assignment/README.md) | L&D Manager | Separate from discipline assignments |
| REQ-025 | [Employee progress](Employee%20progress/README.md) | L&D Manager | Profiles/gaps/results/learning progress |
| REQ-026 | [Learning statistics](Organizational%20statistics/README.md) | L&D Manager | Supporting monitoring; metrics open |
| REQ-037 | [Access control](Access%20control/README.md) | System enforcement | Four actors; assignment/review boundaries |
| REQ-038 | [First-time password](First-time%20password/README.md) | Employee; system | Supporting policy pending |
| REQ-039 | [Email notifications](Email%20notifications/README.md) | System | Supporting events pending; no billing |
| REQ-040 | [Sensitive data protection](Sensitive%20data%20protection/README.md) | System | Supporting security requirements |
| REQ-041 | [Competency profiling and gap analysis](Competency%20profiling%20and%20gap%20analysis/README.md) | System | Evidence-based estimates |
| REQ-042 | [Initial pathway generation](Initial%20pathway%20generation/README.md) | System | Propose for mandatory Expert review |
| REQ-043 | [Pathway recalculation](Conditional%20pathway%20recalculation/README.md) | System | New evidence changes learning needs |
| REQ-046 | [Consistent learning state](Consistent%20learning%20state/README.md) | System | Evidence/progress/pathway consistency |
| REQ-047 | [RIASEC assessment](RIASEC%20assessment/README.md) | Employee | New scope draft |
| REQ-048 | [Target role guidance](Target%20role%20guidance/README.md) | System; Employee | New scope draft |
| REQ-049 | [AI role guidance review](AI%20role%20guidance%20review/README.md) | Expert | Confirm/revise/reject |
| REQ-050 | [Discipline management](Discipline%20management/README.md) | L&D Manager | New scope draft |
| REQ-051 | [Discipline Expert assignment](Discipline%20Expert%20assignment/README.md) | L&D Manager | New scope draft |
| REQ-052 | [Target role publication](Target%20role%20publication/README.md) | L&D Manager | New scope draft |
| REQ-053 | [Learning offering approval](Learning%20offering%20approval/README.md) | Expert submits; L&D decides | New scope draft |
| REQ-054 | [Learning content](Courses%20and%20learning%20content/README.md) | Expert | New scope draft |
| REQ-055 | [Individual skill learning](Individual%20skill%20learning/README.md) | Employee; system | New scope draft |
| REQ-056 | [Personal profile](Personal%20profile/README.md) | Employee | New scope draft |
| REQ-057 | [System configuration](System%20configuration/README.md) | System Administrator | New scope draft |
| REQ-058 | [System activity monitoring](System%20activity%20monitoring/README.md) | System Administrator | New scope draft |
| REQ-059 | [Knowledge tracing](Knowledge%20tracing/README.md) | System | New scope draft |

## Retired and Deferred Index

| ID | Historical feature | Disposition |
| --- | --- | --- |
| REQ-003 | [Soft skill assessment](Soft%20skill%20assessment/README.md) | Superseded by REQ-047; not equivalent evidence |
| REQ-021 | [AI soft-skill review](AI%20soft-skill%20review/README.md) | Superseded by REQ-049 |
| REQ-027 | [Report export](Report%20export/README.md) | Deferred, not specified by current overview |
| REQ-028 | [Subscription payment](Subscription%20payment/README.md) | Retired, out of scope |
| REQ-029 | [Subscription cancellation](Subscription%20cancellation/README.md) | Retired, out of scope |
| REQ-030 | [Payment statistics](Payment%20statistics/README.md) | Retired, out of scope |
| REQ-031 | [Organization statistics](Organization%20statistics/README.md) | Retired platform/multi-organization scope |
| REQ-032 | [Subscription configuration](Subscription%20configuration/README.md) | Retired, out of scope |
| REQ-033 | [Benchmark dataset creation](Benchmark%20dataset%20creation/README.md) | Historical research, not committed product |
| REQ-034 | [Benchmark execution](Benchmark%20execution/README.md) | Historical research, not committed product |
| REQ-035 | [Benchmark results](Benchmark%20results/README.md) | Historical research, not committed product |
| REQ-036 | [Benchmark comparison](Benchmark%20comparison/README.md) | Historical research, not committed product |
| REQ-044 | [Soft-skill AI comments](Soft-skill%20AI%20comments/README.md) | Superseded by REQ-048 |
| REQ-045 | [Payment confirmation](Payment%20confirmation/README.md) | Retired PayOS scope |

## Clarification and Verification

The historical interview queue is paused where it conflicts with the new baseline. Start with baseline scope before role selection and L&D configuration, then discipline/role publication and learning approval, baseline/RIASEC guidance and review, initial pathway confirmation, independent skill learning, and evidence-driven recalculation. Existing detailed decisions unaffected by these changes remain reference candidates, not automatically reapproved contracts.

Record future decisions in the owning function. Maintain per-REQ unit/integration/system evidence when implemented; do not rewrite old passed runs as proof of new acceptance. See [testing/README.md](../testing/README.md) for revised verification scope.

## Historical Catalog and Decision Log

<details>
<summary>Superseded 46-feature SaaS catalog, counts, implementation claims, and interview history</summary>

All statuses, counts, actor names, and confirmed rules below describe the earlier scope. Use the current index and each document's alignment section for present requirements.

**Source:** [Product Overview](../PRODUCT_OVERVIEW.md)  
**Created:** 2026-09-26  
**Scope:** 46 feature folders and 84 function documents. Each feature uses the name from the overview and includes its own README. CRUD functions and distinct user operations are documented separately.

## How to Read the Documents

- A feature README describes the capability and links to its functions.
- Each function filename is its function name; its stable ID is `REQ-nnn-Fnn`, linked to the overview requirement through its feature README.
- Each function records the responsible actor or automated performer, description, inputs, outcome, open decisions, and an acceptance baseline.
- Automated performers and external services are not additional human actors. The four human actors remain Employee, Domain Expert, Organization Administrator, and Platform Administrator.
- These are documentation drafts, not implemented functionality or approved detailed specifications. Open questions and suggested answers are not confirmed business rules.
- One function can require several questions. A function becomes **Clarified** only when its important behavior, access, inputs, outputs, validation, exceptional states, and acceptance criteria are agreed and documented.

## Clarification Tracker

**Active contract review:** [Configure Baseline Assessment](Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), REQ-002-F02, is being realigned from an ungrouped role-scoped blueprint to one logical blueprint per Occupation. Existing BE–FE and executable evidence applies only to the earlier local contract.

**Current clarification question:** Approve the Occupation-scoped rules: every Occupation role is present, role total `0` excludes only its questions, at least one role is non-zero, role skills are the de-duplicated union across Levels, and shared-skill coverage is aggregated without repeating a question version.

**Progress:** 2 of 84 functions remain clarified under the current contract. REQ-002-F02 is reopened at documentation review because its acceptance scope changed; its earlier evidence is retained but does not certify Occupation behavior.

**REQ-002-F02 status (2026-10-15):** One Occupation has one logical baseline blueprint containing all current roles; counts and weights remain per role/skill/difficulty, and a zero-total role stays visible without participating in coverage, generation or scoring. Cụm 1-4 are complete and the Function is surface-complete for the approved local/demo scope. Production Identity/Catalog/importer contracts, Employee lifecycle and RIASEC remain separate follow-ups before production-ready status.

**Confirmed soft-skill readiness effect (2026-09-27):** Option A: Baseline readiness loss does not block a separate, otherwise eligible soft-skill assessment. The assessment remains subject to its own configuration and authorization rules. Baseline-start and evidence-only closure rules remain independent.
**Confirmed AI comment visibility (2026-09-27):** Option B: Before expert review is complete, employees see only the summarized result, clearly labeled as AI-generated and pending expert review. The raw comment remains visible only to authorized experts and administrators.

**Added function (2026-09-27):** Configure Baseline Assessment, REQ-002-F02, is part of the existing Baseline knowledge assessment feature. Existing function IDs and the 46-feature structure are unchanged.

**Custom baseline attempt limit (2026-09-27):** "Baseline assessment is only one attempt per target role." Record one baseline attempt per employee and target role: no completed-baseline retake or limit reset when switching away and returning. Resume is the same attempt. Clarify when the allowance is consumed, incomplete-attempt handling, evidence-only completion, and newly unknown skills on return. The existing-pathway continuation question remains unanswered; no option A or B was selected for it.

**Confirmed allowance timing (2026-09-27):** Option A: Successful baseline start consumes the employee-role allowance. An interrupted attempt can resume but cannot restart as a new attempt, even before any answers are submitted. A request blocked before successful start does not consume it. Evidence-only satisfaction counting is the next question; the existing-pathway continuation question remains unanswered. Function statuses and counts are unchanged.

**Confirmed evidence-only allowance closure (2026-09-27):** Option B: Mark the baseline requirement fulfilled through existing evidence and close the employee-role allowance without creating a test attempt or fabricated score. Known gaps remain for learning; this is not a newly passed test. Returning to the role does not reopen the allowance. Required configuration and coverage checks for this fulfillment remain open and are the next question; existing-pathway continuation is still unanswered. Function statuses and counts are unchanged.

**Confirmed evidence-only prerequisites (2026-09-27):** Option B: For an already-selected role, require valid requirements and prerequisites plus saved baseline settings, then verify no unknown skills in the resolved scope. Skip question coverage for this fulfillment only. Missing settings or invalid scope blocks fulfillment without closing an unused allowance. Catalog visibility, new selection, configuration saving, and question-based tests still require coverage. Resume the unanswered existing-pathway question; no functions are marked clarified by this follow-up.

**Confirmed existing-pathway continuation (2026-09-27):** Option A: Continue learning through existing active-pathway modules and module assessments after baseline readiness loss, subject to their own availability and authorization checks. Do not pause or archive a pathway solely for this loss, or reactivate an archived pathway. Catalog and baseline-start restrictions remain unchanged. The next question concerns soft-skill assessments during readiness loss, separately from deferred soft-skill result reuse. Function statuses and counts are unchanged.

**Clarified selection function (2026-10-01):** [Choose Target Role](Target%20role%20selection/Choose%20Target%20Role.md), REQ-001-F02, owns only the selection transaction. Baseline/gap/pathway generation and soft-skill reuse remain in their owning functions.

**Superseded visibility history (2026-09-27):** The earlier proposal to hide roles based on assessment readiness was superseded for F01 on 2026-09-29. Browse visibility now uses organization, `ACTIVE` status and catalog validity; question coverage belongs to assessment-start.

**Confirmed role readiness (2026-09-27):** Option A: Baseline-ready means defined role requirements and prerequisites, saved baseline settings, and passing eligible-question coverage for the configured scope. Learning modules and module assessments are not visibility prerequisites. Publication, active status, and organization isolation still apply. Readiness-loss behavior and check timing remain open; function counts are unchanged.

**Confirmed open-detail readiness loss (2026-09-27):** Option A: On detecting loss of baseline readiness, replace the role details with "This role is no longer available" and a **Back to roles** action; do not automatically redirect. This does not itself change an existing selection, pathway, attempt, or history. Detection timing and future learning behavior for existing selections remain open; function counts are unchanged.

**Confirmed request-time availability (2026-09-27):** Option A: Recheck on list/detail requests, including loading, refreshing, searching, changing filters, and opening details; no background updates. Always recheck before initial selection or confirmed role change. Idle pages may remain outdated but cannot authorize an unavailable selection. Existing-selection behavior after readiness loss and concurrent-edit consistency remain open; function counts are unchanged.

**Confirmed retained selection (2026-09-27):** Option A: Keep an already-selected role after baseline readiness loss. Block new baseline attempts until repair, but allow existing baseline attempts to continue or resume using their preserved configuration and content. No forced role change, automatic pathway archival, or history deletion follows solely from this loss. Existing-pathway learning, soft-skill assessment, evidence-only completion, remaining notification details, and concurrent-edit consistency remain open; function counts are unchanged.

**Current browsing contract (updated 2026-09-29):** Employees browse same-organization, `ACTIVE`, catalog-valid roles. Details include role name, description and responsibilities, seniority, competency requirements, and required proficiency per micro-skill; assigned expert name was not selected. Publication and baseline readiness are not part of the current browsing gate.

**Latest discovery decision (2026-09-26):** Option B: Search by role name and filter by seniority; no required-micro-skill filter.

**Current empty-results behavior:** Empty search/filter results show "No matching roles" with a **Clear filters** action. When the organization has no permitted catalog-valid role, show "No roles available. Please contact your Organization Administrator." No automatic administrator notification is introduced.

**Latest clarified function (2026-09-26; final local review 2026-10-02):** View Target Roles (REQ-001-F01). Its confirmed behavior is to replace unavailable role details with "This role is no longer available" and a **Back to roles** action, without automatically redirecting. Executable suites and full-stack catalog/detail browser evidence pass; production Identity/Catalog integration remains pending.

**Confirmed selection limit (2026-09-26):** Option A: One active target role per employee at a time.

**Confirmed initial selection approval (2026-09-26):** Option A: Initial target-role selection takes effect immediately without approval, allowing the employee to proceed to baseline assessment. This does not remove expert review of the generated initial pathway.

**Confirmed role-change timing (2026-09-26):** Option B: Employees may change their active target role anytime except while an assessment is in progress.

**Confirmed role-change approval (2026-09-26):** Option A: Eligible role changes require no approval. The selected role becomes the employee's sole active target role.

**Confirmed role-change baseline (2026-09-26):** Custom answer: Require a baseline assessment after changing roles, but assess only unknown gaps based on the new target role. If there are no unknown gaps, existing evidence satisfies the requirement without questions. Soft-skill result reuse remains provisional.

**Confirmed known-gap handling (2026-09-26):** Option A: Skills with existing evidence below the new role's required proficiency are known gaps. Skip their baseline reassessment and use them for pathway planning.

**Confirmed no unknown gaps (2026-09-26):** Option A: When no unknown gaps remain after a role change, no questions are required; satisfy the baseline requirement using existing evidence and proceed to pathway planning without expert waiver approval.

**Confirmed previous pathway (2026-09-26):** Option A: Archive the previous pathway as read-only history when the target role changes; it cannot be resumed. Existing mastery evidence remains available under the agreed reuse rules.

**Deferred product decision (2026-09-26):** Reuse existing soft-skill results and generate new AI comments relative to the new role. This policy remains provisional and must be revisited before it is treated as finalized.

**Confirmed revalidation meaning (2026-09-26):** Option A: Revalidation means revisiting the soft-skill reuse product decision later, not operational validation of reused results. Continue the interview while preserving this deferred item.

**Confirmed assessment history (2026-09-27):** Option A: Retain all previous assessment attempts in the employee's read-only history after a role change, labeled with their original role, date, and results.

**Latest selection decision (2026-09-27):** Option A: Show a role-change confirmation explaining previous-pathway archival and evaluation of the new role's baseline requirement, with **Confirm change** and **Cancel**. Cancel leaves the role and pathway unchanged.

**Confirmed baseline question type (2026-09-27):** Option A: Baseline knowledge assessments support single-answer multiple-choice questions only. Question types for soft-skill and module assessments remain separate decisions.

**Superseded baseline selection (2026-09-27):** Earlier option B selected random questions with micro-skill coverage. The later adaptive rule below supersedes random-only selection.

**Confirmed adaptive baseline (2026-09-27):** Cover relevant role micro-skills and prerequisites to the configured depth. Group questions by micro-skill, label each Easy, Medium, or Hard, present one at a time, and select the next based on the previous result. Apply the configured question count. The original depth-3 and five-question upper limits were subsequently replaced by depth 5 and 10 questions per micro-skill. Interpret depth as prerequisite hops from role skills (depth 0); exact adaptive transitions and early stopping remain open.

**Confirmed baseline evidence reuse (2026-09-27):** Option A: After a role change, expand the scope to include prerequisites, then ask questions only for unknown skills. Skip evidenced role and prerequisite skills; keep known gaps for pathway planning. With no unknown skills across the expanded scope, existing evidence satisfies the baseline without questions or expert waiver approval. This resolves the baseline-scope question without finalizing the deferred soft-skill reuse policy.

**Confirmed baseline configuration (2026-09-27):** Add a Domain Expert function to configure a role's baseline assessment, including prerequisite depth, questions per micro-skill, and starting difficulty. No fixed starting difficulty was chosen.

**Confirmed configuration limits (2026-09-27):** Hard upper limits are depth 5 and 10 questions per micro-skill, superseding the earlier upper limits. Minimum allowed values remain open.

**Confirmed configuration defaults (2026-09-27):** Option A: New role configurations default to prerequisite depth 3 and 5 questions per micro-skill. These defaults do not change the hard upper limits of depth 5 and 10 questions per micro-skill or settle the starting-difficulty default.

**Confirmed question maximum (2026-09-27):** Option A: The configured question count is a maximum per assessed micro-skill, allowing early stopping. Reaching the maximum does not itself establish mastery or sufficient evidence.

**Confirmed confidence-based stopping (2026-09-27):** Option B: Use confidence-based early stopping for each micro-skill's proficiency estimate. The question maximum still applies even below the confidence threshold; confidence is distinct from percent correct and does not itself imply mastery.

**Latest baseline decision (2026-09-27):** Option A: Use Bayesian proficiency-level estimation, updating probabilities after each answer based on its result and question difficulty. The proficiency levels, priors, response likelihoods, confidence measure, and stopping threshold remain open.

**Deferred proficiency-scale decision (2026-09-27):** The user will choose the Bayesian learner proficiency levels later; no proposed scale was selected. Bayesian estimation remains confirmed. Continue independent configuration questions, then revisit the scale before finalizing REQ-002-F02 and its dependent assessment behavior. Deferred question: Which learner proficiency levels should the Bayesian model estimate for each micro-skill?

**Confirmed starting-difficulty default (2026-09-27):** Option B: Medium for new role configurations. The Domain Expert can change it before saving; existing saved configurations retain their values. Per-skill overrides and configuration activation remain open.

**Confirmed uniform settings (2026-09-27):** Option A: Apply one question maximum and one starting difficulty uniformly across each role's assessed micro-skills, including prerequisites. Per-skill overrides are not supported, resolving the earlier open override question. Actual question counts and later difficulty sequences can still vary through confidence-based stopping and adaptive selection. Configuration activation remains open.

**Confirmed minimum depth (2026-09-27):** Option A: Allow prerequisite depth 0, covering directly required role skills without prerequisite expansion. Depth now ranges from 0 through 5 with default 3. Role-change evidence reuse still applies within the configured scope; the minimum configurable question maximum remains open.

**Confirmed minimum question cap (2026-09-27):** Option B: The smallest configurable question maximum is 3 per micro-skill. The cap ranges from 3 through 10 with default 5. This does not require three answers before early stopping; minimum evidence and handling insufficient confidence at the cap remain open.

**Confirmed configuration activation (2026-09-27):** Option A: Successfully saved settings apply to new attempts immediately, without a separate activation step. In-progress attempts retain their original settings, including on resume. Missing-configuration behavior, historical retention, and concurrent save/start handling remain open.

**Confirmed missing configuration (2026-09-27):** Option A: Block baseline attempt start until an authorized Domain Expert saves a role configuration. Do not use defaults automatically. A successful save removes this blocker but does not bypass other start conditions. Messaging, notifications, and configuration requirements for evidence-only completion remain open.

**Confirmed question-bank validation (2026-09-27):** Option A: Block saving when the question bank cannot support the proposed configuration, explain missing coverage, and preserve any previously active configuration. No warning-only save for this failure. Exact coverage requirements remain open and are the next interview question.

**Confirmed coverage requirement (2026-09-27):** Option B: Require at least the configured question maximum in distinct eligible questions at each of Easy, Medium, and Hard for every micro-skill in the configured scope. A cap of 5 requires at least 15 questions per skill. Surplus at one difficulty cannot replace missing coverage at another; the delivery cap remains 5 total. Question eligibility, multi-skill counting, and later bank changes remain open.

**Confirmed baseline question eligibility (2026-09-27):** Option B: Complete, active questions with valid required fields and mappings count toward baseline coverage and are available for delivery without separate publishing. Incomplete, inactive, or invalidly mapped questions are excluded. Exact field and mapping validation, initial active status, and in-progress effects of later edits remain open; this does not determine other assessment types' publication policies.

### Interview Protocol

**Confirmed blocked-start email limit (2026-09-27):** Option A: One notification per organization and role's unresolved blocked period, shared across employees and retries. Partial repair does not reset suppression; after configuration and coverage are restored, a later blocked start can trigger another notification. Failed-delivery retries remain separate and undecided.

**Confirmed blocked-start notifications (2026-09-27):** Option A: Show an employee message and automatically email the role's assigned Domain Expert when missing configuration or insufficient question coverage blocks baseline start. No employee notification action is required. Repeat-email limits, exact content, delivery failures, and missing or unavailable Expert handling remain open.

**Confirmed baseline starting scope (2026-09-27):** Option A: Preserve the original skill scope of an in-progress attempt, including on resume, despite later role-requirement or prerequisite-relationship changes. No forced restart or insertion/removal of assessed skills. Changes apply to new attempts under their saved settings and coverage checks. Downstream gap-analysis and pathway requirement versions remain open.

**Confirmed baseline question versions (2026-09-27):** Option A: Preserve each starting-pool question's text, options, correct answer, difficulty, and skill mapping throughout the attempt, including unseen questions and on resume. Edits apply to new attempts after current eligibility and coverage validation, without automatically rescoring existing attempts. Retention and explicit invalidation remain open.

**Confirmed in-progress question pool (2026-09-27):** Option A: Preserve the questions eligible at baseline attempt start, including subsequently deactivated questions, for continued adaptive selection and resume. Deactivation alone does not interrupt the attempt or force replacement; new attempts use current eligibility and coverage checks. Content/scoring edits, deletion, and invalidation remain open.

**Confirmed start-time coverage (2026-09-27):** Option A: Recheck eligible question coverage before each new baseline attempt using the same cap-per-difficulty requirement for every skill in the configured scope. Insufficient coverage blocks starting without changing saved settings. In-progress attempts and evidence-only completion dependencies remain separate open decisions.

**Confirmed baseline question mapping (2026-09-27):** Option A: Each baseline question assesses exactly one micro-skill. It counts only toward that skill's coverage at its difficulty and provides answer evidence for that skill. Unmapped or multi-skill-mapped questions are ineligible for baseline use. Mapping rules for module and soft-skill assessments remain open.

1. Ask one question at a time about the current function, providing selectable options and allowing a custom answer.
2. Record each answer in that function's decision log with its date; update confirmed rules, outcomes, and acceptance criteria as needed.
3. Remove only the resolved open question. Do not treat one answered question as clarification of the entire function.
4. Carry shared decisions to affected documents and reconcile material scope changes with the overview. Ask about conflicts rather than silently overriding established constraints.
5. Once all material decisions for the current function are resolved, mark it Clarified, update this tracker, and continue in the order below and then the order of links in each feature README.
6. If a decision is deferred or the interview is paused, retain its pending state and the exact next question here. Never invent an answer to finish the queue.

## Feature Index

| Requirement | Feature folder | Function count | Clarified |
| --- | --- | --- | --- |
| REQ-001 | [Target role selection](Target%20role%20selection/README.md) | 2 | 2 |
| REQ-002 | [Baseline knowledge assessment](Baseline%20knowledge%20assessment/README.md) | 2 | 0 |
| REQ-003 | [Soft skill assessment](Soft%20skill%20assessment/README.md) | 1 | 0 |
| REQ-004 | [Adaptive pathway](Adaptive%20pathway/README.md) | 1 | 0 |
| REQ-005 | [Recommendation explanation](Recommendation%20explanation/README.md) | 1 | 0 |
| REQ-006 | [Competency graph](Competency%20graph/README.md) | 1 | 0 |
| REQ-007 | [Dummy learning modules](Dummy%20learning%20modules/README.md) | 1 | 0 |
| REQ-008 | [Module assessment](Module%20assessment/README.md) | 1 | 0 |
| REQ-009 | [Assessment results](Assessment%20results/README.md) | 2 | 0 |
| REQ-010 | [Recalculation visibility](Recalculation%20visibility/README.md) | 1 | 0 |
| REQ-011 | [Assigned target roles](Assigned%20target%20roles/README.md) | 1 | 1 |
| REQ-012 | [Micro-skill management](Micro-skill%20management/README.md) | 4 | 1 |
| REQ-013 | [Learning module management](Learning%20module%20management/README.md) | 4 | 0 |
| REQ-014 | [Question management](Question%20management/README.md) | 4 | 0 |
| REQ-015 | [Role requirements](Role%20requirements/README.md) | 3 | 3 |
| REQ-016 | [Module outcomes](Module%20outcomes/README.md) | 2 | 0 |
| REQ-017 | [Question mapping](Question%20mapping/README.md) | 2 | 0 |
| REQ-018 | [Target-role graph editing](Target-role%20graph%20editing/README.md) | 2 | 0 |
| REQ-019 | [Initial pathway review](Initial%20pathway%20review/README.md) | 1 | 0 |
| REQ-020 | [Pathway adjustment](Pathway%20adjustment/README.md) | 2 | 0 |
| REQ-021 | [AI soft-skill review](AI%20soft-skill%20review/README.md) | 1 | 0 |
| REQ-022 | [Account management](Account%20management/README.md) | 5 | 0 |
| REQ-023 | [Target role management](Target%20role%20management/README.md) | 5 | 5 |
| REQ-024 | [Expert assignment](Expert%20assignment/README.md) | 2 | 2 |
| REQ-025 | [Employee progress](Employee%20progress/README.md) | 1 | 0 |
| REQ-026 | [Organizational statistics](Organizational%20statistics/README.md) | 1 | 0 |
| REQ-027 | [Report export](Report%20export/README.md) | 1 | 0 |
| REQ-028 | [Subscription payment](Subscription%20payment/README.md) | 3 | 0 |
| REQ-029 | [Subscription cancellation](Subscription%20cancellation/README.md) | 2 | 0 |
| REQ-030 | [Payment statistics](Payment%20statistics/README.md) | 1 | 0 |
| REQ-031 | [Organization statistics](Organization%20statistics/README.md) | 1 | 0 |
| REQ-032 | [Subscription configuration](Subscription%20configuration/README.md) | 1 | 0 |
| REQ-033 | [Benchmark dataset creation](Benchmark%20dataset%20creation/README.md) | 3 | 0 |
| REQ-034 | [Benchmark execution](Benchmark%20execution/README.md) | 2 | 0 |
| REQ-035 | [Benchmark results](Benchmark%20results/README.md) | 1 | 0 |
| REQ-036 | [Benchmark comparison](Benchmark%20comparison/README.md) | 1 | 0 |
| REQ-037 | [Access control](Access%20control/README.md) | 2 | 0 |
| REQ-038 | [First-time password](First-time%20password/README.md) | 1 | 0 |
| REQ-039 | [Email notifications](Email%20notifications/README.md) | 1 | 0 |
| REQ-040 | [Sensitive data protection](Sensitive%20data%20protection/README.md) | 2 | 0 |
| REQ-041 | [Competency profiling and gap analysis](Competency%20profiling%20and%20gap%20analysis/README.md) | 2 | 0 |
| REQ-042 | [Initial pathway generation](Initial%20pathway%20generation/README.md) | 1 | 0 |
| REQ-043 | [Conditional pathway recalculation](Conditional%20pathway%20recalculation/README.md) | 2 | 0 |
| REQ-044 | [Soft-skill AI comments](Soft-skill%20AI%20comments/README.md) | 1 | 0 |
| REQ-045 | [Payment confirmation](Payment%20confirmation/README.md) | 2 | 0 |
| REQ-046 | [Consistent learning state](Consistent%20learning%20state/README.md) | 2 | 0 |

</details>
