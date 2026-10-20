# Feature and Function Documentation

**Current source:** [System Overview](../adapt_learn_graph_system_overview.md), with requirement mapping in [Product Overview](../PRODUCT_OVERVIEW.md).  
**Aligned:** 2026-10-20. This catalog supersedes the historical SaaS index and interview queue below.

## Current Reading Rules

- The four actors are System Administrator, L&D Manager, Expert, and Employee. Services and algorithms are automated performers.
- This is one organization's internal system. Billing, PayOS, multi-organization registration, and platform subscription administration are excluded.
- Existing requirement/function IDs and file paths remain stable for traceability. Legacy filenames do not establish current business scope.
- A **Current Scope Alignment** section in an existing feature/function document controls over its retained historical description, decisions, status, and acceptance rules. Old test results do not certify revised scope.
- New feature READMEs contain function-level IDs, inputs/outcomes, acceptance scenarios, and open decisions. They are scope drafts, not implementation-ready approved contracts.
- REQ-002 adaptive Blueprint/IRT contract is approved for Cluster 1. Target-role selection takes effect immediately; an Employee without a mastery-producing baseline for that role's Occupation must then complete the baseline before mastery-dependent steps. Attempt, invalidation and uncertainty policies are defined in the REQ-002 contracts. Discipline ownership, publication/approval, reviewed AI guidance and initial pathway confirmation remain separate gates.
- Architecture/schema documents describe existing technical fields separately from product design gaps; do not fabricate fields, scoring formulas, or implementation evidence.

## Current Feature Index

| ID | Feature | Current actor or performer | Contract status |
| --- | --- | --- | --- |
| REQ-001 | [Target role selection](Target%20role%20selection/README.md) | Employee | Reclarify reviewed-guidance/publication gates |
| REQ-002 | [Baseline knowledge assessment](Baseline%20knowledge%20assessment/README.md) | Employee; L&D configures | Cluster 1 adaptive 3PL contract approved; runtime not migrated |
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

The historical interview queue is superseded wherever it conflicts with the approved adaptive baseline. REQ-001 owns immediate target-role selection; REQ-002 then owns the required Occupation baseline when no mastery-producing baseline exists. Existing historical decisions outside this confirmed boundary remain reference candidates, not automatically reapproved contracts.

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
- Automated performers and external services are not additional human actors. The current four human actors are System Administrator, L&D Manager, Expert and Employee.
- Each file states whether its contract is approved, proposed or historical. An approved document is still not proof that runtime or tests implement it.
- One function can require several questions. A function becomes **Clarified** only when its important behavior, access, inputs, outputs, validation, exceptional states, and acceptance criteria are agreed and documented.

## Clarification Tracker

**Current REQ-002 direction (2026-10-20):** [Configure Baseline Assessment](Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md) and [Complete Baseline Assessment](Baseline%20knowledge%20assessment/Complete%20Baseline%20Assessment.md) now define an Occupation-scoped adaptive 3PL baseline. L&D finalizes a Blueprint and may run ephemeral Test Blueprint; each Employee receives an individual reload-safe, server-timed attempt. There are no score weights or shared Generate/Review/Publish steps.

**Cluster 1 decision boundary:** Product flow, active-role/exploration sampling, capacity validation, one-success Employee + Occupation allowance, no-grace deadline, invalidated/no-mastery replacement, result disclosure, System Administrator calibration promotion and conservative mastery use are approved. Exact IRT constants/library remain system-owned versioned technical implementation configuration and are not L&D fields.

**Progress:** Cluster 1 Function contracts, target database architecture and acceptance plan are approved. V17 remains the superseded local/demo fixed lifecycle; no adaptive migration/runtime/test completion is claimed.

**Clarified selection function (2026-10-01):** [Choose Target Role](Target%20role%20selection/Choose%20Target%20Role.md), REQ-001-F02, owns only the selection transaction. Baseline/gap/pathway generation and soft-skill reuse remain in their owning functions.

**Superseded visibility history (2026-09-27):** The earlier proposal to hide roles based on assessment readiness was superseded for F01 on 2026-09-29. Browse visibility now uses organization, `ACTIVE` status and catalog validity; question coverage belongs to assessment-start.

**Confirmed request-time availability (2026-09-27):** Option A: Recheck on list/detail requests, including loading, refreshing, searching, changing filters, and opening details; no background updates. Always recheck before initial selection or confirmed role change. Idle pages may remain outdated but cannot authorize an unavailable selection. Existing-selection behavior after readiness loss and concurrent-edit consistency remain open; function counts are unchanged.

**Current browsing contract (updated 2026-09-29):** Employees browse same-organization, `ACTIVE`, catalog-valid roles. Details include role name, description and responsibilities, seniority, competency requirements, and required proficiency per micro-skill; assigned expert name was not selected. Publication and baseline readiness are not part of the current browsing gate.

**Latest discovery decision (2026-09-26):** Option B: Search by role name and filter by seniority; no required-micro-skill filter.

**Current empty-results behavior:** Empty search/filter results show "No matching roles" with a **Clear filters** action. When the organization has no permitted catalog-valid role, show "No roles available. Please contact your Organization Administrator." No automatic administrator notification is introduced.

**Latest clarified function (2026-09-26; final local review 2026-10-02):** View Target Roles (REQ-001-F01). Its confirmed behavior is to replace unavailable role details with "This role is no longer available" and a **Back to roles** action, without automatically redirecting. Executable suites and full-stack catalog/detail browser evidence pass; production Identity/Catalog integration remains pending.

**Confirmed selection limit (2026-09-26):** Option A: One active target role per employee at a time.

**Confirmed initial selection approval (2026-09-26):** Option A: Initial target-role selection takes effect immediately without approval, allowing the employee to proceed to baseline assessment. This does not remove expert review of the generated initial pathway.

**Confirmed role-change timing (2026-09-26):** Option B: Employees may change their active target role anytime except while an assessment is in progress.

**Confirmed role-change approval (2026-09-26):** Option A: Eligible role changes require no approval. The selected role becomes the employee's sole active target role.

**Confirmed previous pathway (2026-09-26):** Option A: Archive the previous pathway as read-only history when the target role changes; it cannot be resumed. Existing mastery evidence remains available under the agreed reuse rules.

**Deferred product decision (2026-09-26):** Reuse existing soft-skill results and generate new AI comments relative to the new role. This policy remains provisional and must be revisited before it is treated as finalized.

**Confirmed revalidation meaning (2026-09-26):** Option A: Revalidation means revisiting the soft-skill reuse product decision later, not operational validation of reused results. Continue the interview while preserving this deferred item.

**Confirmed assessment history (2026-09-27):** Option A: Retain all previous assessment attempts in the employee's read-only history after a role change, labeled with their original role, date, and results.

**Latest selection decision (2026-09-27):** Option A: Show a role-change confirmation explaining previous-pathway archival and evaluation of the new role's baseline requirement, with **Confirm change** and **Cancel**. Cancel leaves the role and pathway unchanged.

### Interview Protocol

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
| REQ-002 | [Baseline knowledge assessment](Baseline%20knowledge%20assessment/README.md) | 2 | 2 |
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
