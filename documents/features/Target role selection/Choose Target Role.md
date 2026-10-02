# Choose Target Role

**Function ID:** REQ-001-F02  
**Actor:** Employee  
**Status:** In clarification  
**Feature:** [Target Role Selection](README.md)

## Description

Select an available organization target role as a personal development goal, with at most one active target role per employee at a time. Its requirements provide the context for baseline assessment and pathway generation.

**Input:** Employee identity and selected target role.  
**Outcome:** A recorded target-role selection associated with the employee.

**Boundary update, 2026-09-29:** A candidate must be currently catalog-available under [View Target Roles](View%20Target%20Roles.md): same organization, `ACTIVE` and catalog-valid. Baseline settings and eligible-question coverage are checked when starting the corresponding assessment, not when browsing or recording the role selection. Earlier baseline-ready catalog references below are retained only where they describe existing-attempt retention and assessment-start behavior.

## Confirmed Rules

**Confirmed expanded scope (2026-09-27):** The unknown-gap-only, known-gap exclusion, and no-question completion rules below apply across role-relevant micro-skills and prerequisites to the Expert-configured depth (maximum 5). Expand the scope before filtering by evidence, including unknown prerequisites even when direct role skills are evidenced. See [Complete Baseline Assessment](../Baseline%20knowledge%20assessment/Complete%20Baseline%20Assessment.md). Earlier depth-3 references in the decision log record the scope before Expert configuration was introduced.

- Employees choose their target role; this does not let them choose pathway modules.
- A role must be currently catalog-available for a new selection: its `organizationId` matches trusted actor context, its status is `ACTIVE`, and its catalog requirements are valid. Missing baseline settings or question coverage does not hide or prevent selecting the role, but it can block a new baseline-assessment start.
- If an already-selected role loses baseline readiness, keep it selected rather than clearing it or requiring another role. Block new baseline attempts until readiness is restored; existing baseline attempts may continue or resume using their preserved starting settings, skill scope, question pool, and question versions. Readiness loss alone does not archive the pathway or delete assessment history. Voluntary role changes remain subject to the existing assessment-in-progress restriction and candidate-availability checks.
- An employee can pursue only one active target role at a time. Multiple simultaneous active target roles are not supported.
- Employees may change their active target role at any time except while an assessment is in progress. This restriction applies to baseline knowledge, soft skill, and module assessments.
- An eligible role change takes effect without Organization Administrator or Domain Expert approval. The new role replaces the previous role as the employee's sole active target role.
- After a role change, evaluate the baseline requirement using existing evidence and prior baseline history for the destination role. A permitted first baseline assesses only unknown gaps relative to that role; a full reassessment of all role requirements is not required. Each employee has only one baseline attempt per target role, so returning to a role with a completed baseline does not permit another attempt or reset that limit.
- If existing evidence shows proficiency below the new role's requirement, treat it as a known gap: exclude that skill from the role-change baseline reassessment and use the gap for pathway planning.
- When no unknown gaps remain after a role change, no assessment questions are required. Existing evidence satisfies the baseline requirement without expert waiver approval, allowing progression to pathway planning. Known gaps still inform the required learning.
- Evidence-only fulfillment closes the employee's baseline allowance for that role without creating a test attempt, answers, fabricated score, or newly passed test (option B, 2026-09-27). Returning to that role does not reopen the allowance, even if requirements later change. For an already-selected role, require valid requirements and prerequisites, saved baseline settings, and no unknown skills in the scope resolved using saved depth; skip question coverage. Missing settings or invalid scope blocks fulfillment without closing an unused allowance. This does not bypass catalog availability or the separate eligibility checks for starting an assessment.
- When the target role changes, archive the previous pathway as read-only history. It is no longer active and cannot be resumed, including if the employee later returns to that role.
- Archiving the pathway does not remove the existing mastery evidence used to identify unknown and known gaps for the newly selected role. Only the selected role may have an active pathway.
- After a role change, retain all previous assessment attempts in the employee's read-only history, labeled with their original target role, date, and results. The role change must not delete or relabel those attempts as belonging to the new role.
- Soft-skill result reuse remains provisional as documented below.
- A valid initial target-role selection takes effect immediately without Organization Administrator or Domain Expert approval. The employee can then proceed to baseline assessment.
- Approval-free role selection does not remove the separate Domain Expert review of the generated initial pathway.
- Before a role change takes effect, show an employee confirmation explaining that the previous pathway will be archived and the new role's baseline requirement evaluated. Provide **Confirm change** and **Cancel** actions. This is employee confirmation, not administrator or expert approval.
- **Cancel** leaves the active role and pathway unchanged. **Confirm change** applies the change only if the selected role is still available and no assessment is in progress.
- Before applying either an initial selection or a confirmed role change, recheck current organization authorization, `ACTIVE` status and catalog validity. Previously displayed content cannot authorize a selection; a failed check leaves the existing selection and pathway unchanged. Assessment-start eligibility is checked separately.
- From Complete Baseline Assessment, 2026-09-27, option A: Successful test start consumes the employee's allowance for that role, even before answering or submitting. Interrupting the assessment permits resume of the same attempt, not a new start. Role selection alone does not consume an attempt; evidence-only fulfillment separately closes the allowance under option B.

## Selected Policy Requiring Revalidation

- On a target-role change, reuse existing soft-skill assessment results and generate new AI comments relative to the new role (option A, 2026-09-26).
- Revalidation means revisiting this product decision later. Keep result reuse and new role-specific AI comments provisional; this does not introduce an operational validation step, an additional expert approval, or a result validity period.

## Open Decisions

1. Deferred product decision: Revisit and finalize the provisional soft-skill result reuse policy. Do not treat it as fully clarified until revalidated.
2. Selection retention, blocking new question-based baseline attempts, continuation of preserved attempts, and evidence-only scope-and-settings checks are confirmed. Option A, 2026-09-27, also confirms continued learning through existing active-pathway modules and module assessments, subject to their own availability checks; baseline readiness loss alone does not pause learning. Define effects on soft-skill assessment and consistency during concurrent selection/setup edits. Reconcile remaining notification details with the baseline-start blockers.
3. Reconcile returning to a role with newly unknown skills after a completed baseline or evidence-only fulfillment: the allowance cannot reopen, and missing evidence must not be treated as mastery. Concurrent evidence-only evaluation and incomplete-attempt recovery details remain open in Complete Baseline Assessment.

The earlier baseline-scope question is resolved. This function remains In clarification for the deferred soft-skill decision and the new related readiness decisions.

## Acceptance Baseline

A valid selection is retained for the employee and is available to the baseline assessment workflow; an unauthorized role cannot be selected.

- A valid initial selection becomes active without entering a pending-approval state, allowing the employee to proceed to baseline assessment.
- A role-change attempt while any assessment is in progress is blocked and leaves the current target role unchanged. When no assessment is in progress, an unfinished pathway alone does not prevent a role change; progress-handling policies still need clarification.
- An eligible change to an available organization target role replaces the active selection without entering a pending-approval state.
- No selection operation may leave an employee with more than one active target role, including simultaneous requests.
- Following a role change, baseline question coverage is limited to unknown gaps for the newly selected role, using existing mastery evidence to determine that scope.
- A skill with existing evidence of proficiency below the new role's requirement is excluded from baseline reassessment but retained as a known gap for pathway planning; skipping reassessment does not mark the skill as mastered.
- If the baseline scope contains no unknown gaps, the baseline requirement is satisfied using existing evidence without presenting questions or requiring expert waiver approval. This must not imply a newly passed assessment or mastery of known gaps, and does not remove separate pathway-review requirements.
- A successful role change archives the previous pathway, preserving its recorded sequence and progress as read-only history. It cannot be resumed, edited, or used to start new assessment attempts, and must not appear as the active pathway for the new role.
- Returning to a previously selected role does not reactivate its archived pathway; the agreed baseline and evidence-reuse rules still apply.
- Returning to a role with a completed baseline does not create another baseline attempt, even if role requirements or question coverage have changed. Retain its original evidence and history without treating newly added skills as assessed. This restriction does not reactivate the archived pathway.
- Returning to a role whose baseline was fulfilled through evidence likewise leaves its allowance closed. Keep that fulfillment distinct from a completed test: no assessment attempt or score is invented, no newly unknown skill is marked mastered, and no archived pathway is reactivated.
- After switching roles, the employee can still view all their previous assessment attempts as read-only history with the original role, date, and recorded results. Historical results remain distinguishable from current competency state and from any evidence reused for the new role.
- Selecting a different role first presents the confirmation; it does not immediately change the active role or archive its pathway. Cancel leaves both unchanged. Confirm change rechecks role availability and the assessment-in-progress restriction before applying the change; a failed eligibility check leaves the existing role and pathway unchanged.
- A candidate role that fails current catalog availability cannot become a new selection through a direct request or stale page. Reject the selection without changing the current role or pathway. Missing baseline settings or question coverage does not make the role catalog-unavailable; the start-assessment function reports that blocker.
- If a candidate becomes unavailable after its details were loaded, reject an initial selection or confirmed role change after the mandatory current-availability check even though the idle page has not updated. An employee with no selected role remains without a selection after this rejection.
- Given a selected role loses eligible-question coverage, retain that role as the employee's selection and keep it browsable while its catalog data remains valid. Reject new baseline starts, but allow an existing baseline attempt to continue and resume with its original configuration and content. Do not force a role change, archive the pathway, or delete history solely because assessment-start eligibility was lost.
- When readiness is restored, a later baseline-start request may pass the readiness check without selecting the role again, subject to all other start conditions. Restoration does not automatically start an attempt.

## Decision Log

| Date | Question | Confirmed answer |
| --- | --- | --- |
| 2026-09-26 | How many active target roles can an employee pursue simultaneously? | Option A: One active target role at a time. |
| 2026-09-26 | Does initial target-role selection require approval? | Option A: No approval; selection takes effect immediately and the employee can proceed to baseline assessment. |
| 2026-09-26 | When may an employee change their active target role? | Option B: Anytime except while an assessment is in progress. |
| 2026-09-26 | Does an eligible role change require approval? | Option A: No approval, consistent with initial selection. |
| 2026-09-26 | After changing roles, how should baseline knowledge be assessed? | Custom answer: Require a baseline assessment, but assess only unknown gaps based on the new target role. |
| 2026-09-26 | If existing evidence shows a skill below the new role's required proficiency, how should it be handled? | Option A: Treat it as a known gap, skip reassessment, and use it for pathway planning. |
| 2026-09-26 | After a role change, what happens if no unknown gaps remain? | Option A: No questions are required; satisfy the baseline requirement using existing evidence and proceed to pathway planning. |
| 2026-09-26 | What happens to the previous pathway when the employee changes roles? | Option A: Archive it as read-only history; it cannot be resumed. |
| 2026-09-26 | After changing roles, how should existing soft-skill results be handled? | Option A, requiring revalidation: Reuse the results and generate new AI comments relative to the new role. Meaning and conditions of revalidation remain open. |
| 2026-09-26 | What does revalidation mean for soft-skill result reuse? | Option A: Revisit this product decision later; keep it provisional for now. No operational revalidation step is required by this answer. |
| 2026-09-27 | After changing roles, how should previous assessment records be handled? | Option A: Retain all attempts in the employee's read-only history, labeled with their original role, date, and results. |
| 2026-09-27 | Should employees confirm a role change before it takes effect? | Option A: Explain previous-pathway archival and evaluation of the new role's baseline requirement, with Confirm change and Cancel actions. |
| 2026-09-27 | Does the expanded baseline scope retain evidence reuse after a role change? | Option A in the baseline interview: Include depth-3 prerequisites in scope, then ask questions only for unknown skills. Keep known gaps for pathway planning; existing evidence still satisfies the baseline when no unknown skills remain. |
| 2026-09-27 | Should an already-selected role be retained when it loses baseline readiness? | Option A: Keep it selected. Block new baseline attempts until repaired, while allowing existing baseline attempts to continue under their preserved configuration. Do not require another role solely because baseline readiness was lost. |
| 2026-09-27 | Does role switching permit a baseline retake for the same role? | Related custom clarification: Only one baseline attempt per employee and target role. Switching away and returning does not reset the limit; handling newly unknown skills after a prior completed baseline remains open. |
