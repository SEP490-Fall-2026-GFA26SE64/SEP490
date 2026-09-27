# Target Role Selection

Employees browse organization target roles, inspect competency requirements, and choose a development goal.

**Source:** [REQ-001](../../PRODUCT_OVERVIEW.md)  
**Actor:** Employee  
**Clarification:** View Target Roles is active. Existing-pathway learning continues after baseline readiness loss (option A, 2026-09-27), subject to module and assessment availability. The next question concerns soft-skill assessment during that loss, not the deferred result-reuse decision. Choose Target Role remains in clarification for deferred soft-skill reuse, remaining readiness-related effects, concurrent changes, and newly unknown skills on role return. Baseline scope, allowance consumption, evidence-only closure, and evidence-only scope-and-settings prerequisites are confirmed.

**Confirmed expanded baseline scope (2026-09-27):** Option A retains the unknown-gap-only, known-gap exclusion, and no-question completion rules across role-relevant micro-skills and prerequisites to the Expert-configured depth (maximum 5). Expand the scope first, then apply existing evidence to decide which skills need fresh questions. Known gaps remain for pathway planning.

**Confirmed browsing rule (2026-09-26, extended 2026-09-27):** Employees see only published, active, baseline-ready target roles from their organization. Option A defines readiness as defined role requirements and prerequisites, saved baseline settings, and passing eligible-question coverage for the configured scope at the configured cap per difficulty. Learning modules and module assessments are not required for visibility. Draft, inactive, archived, and baseline-incomplete roles are hidden on each request. Existing selection retention is separate from catalog visibility, as confirmed below. This visibility rule does not select a missing-Expert email fallback.

**Confirmed retained selection (2026-09-27):** Keep the employee's selected role after baseline readiness loss. Block new question-based baseline attempts until repair; existing attempts may continue or resume with their preserved settings, scope, pool, and question versions. Evidence-only fulfillment uses its separate scope-and-settings checks without question coverage. Option A confirms that existing active-pathway learning continues, including modules and module assessments subject to their own availability checks. Do not force another role, pause or archive the pathway, or delete history solely because baseline readiness was lost. Voluntary role changes still obey the assessment-in-progress restriction. Soft-skill assessment behavior remains open.

**Confirmed availability checks (2026-09-27):** Option A: Recheck availability on list/detail requests, including load, refresh, search, filter changes, opening details, and returning to roles; no background polling or pushed availability updates. Idle content may remain outdated until the next request. Always recheck before applying an initial selection or confirmed role change; unavailable candidates are rejected without changing the existing role or pathway.

**Confirmed details (2026-09-26):** Role name, description and responsibilities, seniority level, competency requirements, and required proficiency per micro-skill. Assigned expert name is not part of the selected field set.

**Confirmed discovery controls (2026-09-26):** Search by role name and filter by seniority; no required-micro-skill filter.

**Confirmed empty search/filter results (2026-09-26):** Show "No matching roles" with a **Clear filters** action that resets the search and seniority filter.

**Confirmed no available roles (2026-09-26):** Show "No roles available. Please contact your Organization Administrator." This is informational guidance, not an automatic administrator notification.

**Confirmed unavailable role (2026-09-26, extended 2026-09-27):** When a request detects that the viewed role is unpublished, inactive, archived, or no longer baseline-ready, replace its details with "This role is no longer available" and a **Back to roles** action, without automatically redirecting. Option A extends the same behavior to baseline readiness loss, including insufficient question coverage. This browsing change does not itself alter existing selections, pathways, attempts, or history; future learning actions remain open.

**Confirmed active-role limit (2026-09-26):** Each employee can pursue only one active target role at a time.

**Confirmed initial selection approval (2026-09-26):** A valid initial selection takes effect immediately without administrator or expert approval, allowing the employee to proceed to baseline assessment. Expert review of the generated initial pathway remains separate.

**Confirmed role-change timing (2026-09-26):** Employees may change their active target role anytime except while a baseline knowledge, soft skill, or module assessment is in progress.

**Confirmed role-change approval (2026-09-26):** Eligible role changes require no administrator or expert approval. The selected role becomes the employee's sole active target role.

**Confirmed role-change baseline (2026-09-26, qualified 2026-09-27):** Evaluate the baseline requirement using evidence and the destination role's baseline history. A permitted first baseline assesses only unknown gaps; its allowance is consumed at successful test start. Interruption permits resume, not a fresh start. Evidence-only fulfillment separately closes the allowance without a test attempt or fabricated score. For an already-selected role, that fulfillment requires valid requirements, prerequisites, saved settings, and no unknown skills, but skips question coverage. Full coverage still applies to catalog visibility and new selection. Returning to the role does not reset the allowance or reactivate its archived pathway. Newly unknown skills on return and soft-skill reuse remain open.

**Confirmed known-gap handling (2026-09-26):** Skills already evidenced below the new role's required proficiency are known gaps. They skip baseline reassessment and inform pathway planning; they are not treated as mastered.

**Confirmed no unknown gaps (2026-09-26):** No questions are required when no unknown gaps remain. Existing evidence satisfies the baseline requirement without expert waiver approval, allowing progression to pathway planning with known gaps retained.

**Confirmed previous pathway (2026-09-26):** Archive the previous pathway as read-only history when the target role changes. It cannot be resumed, even if the employee returns to that role. Existing mastery evidence remains available under the agreed reuse rules; only the selected role may have an active pathway.

**Provisional soft-skill policy, revisit later (2026-09-26):** Reuse existing soft-skill results and generate new AI comments for the new role. Revalidation means revisiting this product decision later, not adding an operational validation step. The policy remains deferred and is not finalized.

**Confirmed assessment history (2026-09-27):** Retain all previous attempts in the employee's read-only history after a role change, labeled with their original role, date, and results. Switching roles does not delete or relabel historical attempts.

**Confirmed role-change confirmation (2026-09-27):** Explain that the previous pathway will be archived and the new role's baseline requirement evaluated. Offer **Confirm change** and **Cancel**. Cancel preserves the active role and pathway; confirmation applies only to an eligible change and requires no administrator or expert approval.

## Functions

- [View Target Roles](View%20Target%20Roles.md)
- [Choose Target Role](Choose%20Target%20Role.md)