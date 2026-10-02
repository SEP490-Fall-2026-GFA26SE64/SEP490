# View Adaptive Pathway

**Function ID:** REQ-004-F01  
**Actor:** Employee  
**Status:** Clarified  
**Feature:** [Adaptive Pathway](README.md)

## Description

Display the employee's generated module sequence and module statuses. The employee cannot add, exclude, reorder, or choose pathway modules.

**Input:** Employee's target role and current pathway.  
**Outcome:** A read-only pathway view with access to the relevant module details and assessments.

## Confirmed Rules

- The adaptive pathway provides a dual view: a default List/Timeline view showing the sequential learning progression, and an interactive Graph/DAG view visualizing prerequisite relationships and skill dependencies between modules. Both views remain strictly read-only for pathway composition (employees cannot reorder, add, or exclude modules).
- Module unlocking follows prerequisite relationships: a module becomes unlocked and available for learning and assessment only when all of its prerequisite modules in the pathway have been completed (passed). Modules with no unmet prerequisites are accessible immediately, enabling concurrent learning across independent skill branches. Locked modules clearly display which prerequisite modules must be completed first.
- While an initial pathway is pending Domain Expert review, the employee is granted a preview mode: they can view the full pathway structure labeled "Pending Expert Review", but actions to access module learning materials and start module assessments are gated/disabled until expert approval is completed.
- Module status vocabulary consists of five distinct states:
  1. `Locked`: Prerequisite modules in the pathway have not yet been satisfied.
  2. `Ready`: Prerequisites met, available to start learning.
  3. `In Progress`: Learning materials accessed or assessment in progress.
  4. `Completed`: Module assessment passed, successfully closing its targeted micro-skill gap(s).
  5. `Needs Retake`: Module assessment completed below the passing threshold, requiring review and retake.
- Overall pathway progress is displayed via both module completion percentage (with module count `X / Y completed`) and competency gap resolution (number of required micro-skills acquired).
- Special pathway states are handled with dedicated presentation:
  1. `Generating state`: Displays a progress indicator with status messaging and estimated completion time rather than a blank or partial screen.
  2. `Empty / Fully Qualified state`: When the employee has zero competency gaps for the target role, displays a congratulatory message ("Target Role Competencies Fully Met"), a breakdown of evidenced micro-skills, and direct links to view the [Competency Graph](../Competency%20graph/README.md) or explore other target roles.
  3. `Stale / Recalculation Pending state`: Preserves full access to current pathway modules and assessments while displaying a prominent informational banner explaining that role requirements have updated and recalculation is scheduled/pending.
- Archived pathways are accessed via a dedicated "Pathway History" tab/view. Each historical entry displays a summary card with previous target role name, start date, archived date (reason: target role change), and final completion progress.
- Opening an archived pathway presents its recorded module sequence and module statuses frozen in time as a read-only snapshot, prominently marked with an "Archived" badge. All learning actions, module detail starts, and assessment attempt triggers are disabled.
- From [Choose Target Role](../Target%20role%20selection/Choose%20Target%20Role.md) (REQ-001-F02), 2026-09-26: Changing the target role archives the previous pathway as read-only history, preserving its recorded sequence and progress. The archived pathway cannot be resumed, including after returning to that role.
- Only the selected role may have an active pathway. Archived pathways do not permit edits or new assessment attempts; archiving does not remove mastery evidence available for the agreed role-change baseline rules.
- From the role-readiness interview, 2026-09-27, option A: Loss of baseline readiness alone does not interrupt learning through an existing active pathway. Employees may continue accessing its modules and module assessments subject to their own authorization and availability checks. Do not pause or archive that pathway solely because baseline setup becomes unready. Catalog visibility and baseline-start restrictions remain separate.

## Open Decisions

None. All core display behavior, unlocking policies, expert review gate effects, status vocabulary, special states, and archival navigation for viewing the adaptive pathway are clarified. (Generation algorithms, recalculation triggers, and individual module assessment rules remain governed by their respective requirement functions REQ-042, REQ-010, and REQ-008).

## Acceptance Baseline

The displayed sequence matches the employee's current authorized pathway and does not offer employee editing controls.

- The employee can switch between the default List/Timeline view and the Graph/DAG view without losing their place or state. In both views, the module sequence reflects the system-generated pathway without modification controls.
- Each module in both views clearly displays its status among the five defined states (`Locked`, `Ready`, `In Progress`, `Completed`, `Needs Retake`).
- The pathway header displays overall progress showing percentage, module count (`X / Y completed`), and micro-skill gap closure count.
- If a pathway is actively generating, show the generation progress state instead of an empty or broken list.
- If an employee has zero gaps for the target role, the pathway view displays the congratulatory fully-qualified state with mastery evidence and navigation links rather than an empty module list.
- If a role configuration change marks the current pathway as stale, an informational banner is displayed at the top of the pathway view without interrupting ongoing module or assessment access.
- When an initial pathway is in "Pending Expert Review" status, the pathway is visible with an informative banner/badge indicating review in progress; links to module learning content and assessment starts are inactive. Once approved, the review notice is removed and modules become accessible according to prerequisite rules.
- A module with unmet prerequisites is displayed as locked; attempting to access its learning content or assessment is blocked, and its unmet prerequisite modules are indicated. Modules whose prerequisites are all passed are displayed as accessible.
- Employees can navigate to the "Pathway History" tab to view all previous archived pathways as summary cards (role name, date range, final completion percentage).
- Opening an archived pathway displays the historical snapshot with an "Archived" badge and without any active learning or assessment buttons. Returning to its target role does not reactivate it.
- Given an active pathway with otherwise accessible modules and eligible assessments, loss of the role's baseline question coverage does not hide that pathway or block its learning actions. Preserve progress. An independently unavailable module or assessment remains restricted, and an archived pathway remains non-resumable.

## Decision Log

| Date | Question | Confirmed answer |
| --- | --- | --- |
| 2026-09-27 | Should existing pathway learning continue if the role loses baseline readiness? | Option A: Continue modules and module assessments, subject to their own availability checks. Baseline readiness loss alone does not pause the existing pathway. |
| 2026-09-30 | What visualization mode should be used for the employee's adaptive pathway? | Option A: Dual view (default List/Timeline view with toggle to Graph/DAG view showing prerequisite relationships). |
| 2026-09-30 | What unlocking policy governs modules in the adaptive pathway? | Option A: Prerequisite-based unlocking; modules unlock once their prerequisite modules are passed, allowing parallel progression on independent branches. |
| 2026-09-30 | Does initial Domain Expert review block pathway visibility or assessment access? | Option A: Preview with learning gated; the employee can view the pathway labeled "Pending Expert Review", but access to module content and assessments is blocked until approved. |
| 2026-09-30 | What status vocabulary and progress indicators should be used for pathway modules? | Option A: Five-state vocabulary (Locked, Ready, In Progress, Completed, Needs Retake) and overall progress displaying completion percentage, module count (X/Y), and micro-skills closed. |
| 2026-09-30 | How should special pathway states (generating, empty/qualified, stale) be presented? | Option A: Detailed handling: generating state displays generation progress; empty/qualified state displays congratulations with competency evidence and next-step actions; stale state preserves current pathway with an informational role-update banner. |
| 2026-09-30 | How do employees navigate to archived pathways, and what historical details are displayed? | Option A: Dedicated "Pathway History" tab showing summary cards (role, date range, final progress); opening displays a frozen read-only snapshot badged "Archived" with no learning or assessment actions. |