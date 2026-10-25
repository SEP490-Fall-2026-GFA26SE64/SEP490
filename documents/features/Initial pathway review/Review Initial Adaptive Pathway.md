# Review Initial Adaptive Pathway

## Current Scope Alignment
Expert reviews the first Employee/role pathway and its evidence, includes/excludes modules through REQ-020, and confirms it before Employee starts. Initial review is mandatory, not an unresolved advisory choice. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md); reviewer allocation/re-review/reasons remain open.

## Specification

**Function ID:** REQ-019-F01  
**Actor:** Domain Expert  
**Status:** Implemented  
**Feature:** [Initial Pathway Review](README.md)

## Description

Review an authorized employee's initial pathway generated from their assigned occupation and chosen target role (selected directly or guided by baseline and optional RIASEC assessment). The expert inspects the curriculum evidence, includes/excludes learning modules (REQ-020-F01), requests algorithmic regeneration with feedback, or approves the pathway for the employee to begin learning.

**Input:** Employee baseline assessment result, assigned occupation, target role, and generated initial adaptive pathway.  
**Outcome:** Expert inspection, module inclusion/exclusion customization via dual parallel tables with drag-and-drop, pathway regeneration with persistent exclusions and locked progress state, and final pathway approval.

## Confirmed Workflow Rules

- **Review Queue**: All generated pathways (regardless of whether role was selected directly or via optional RIASEC guidance) are routed to `/expert/pathway-review`.
- **Dedicated Audit Workspace Page**: Clicking "Review" or "Inspect" opens a dedicated, full-screen review route `/expert/pathway-review/:pathwayId` providing ample room for comprehensive review and drag-and-drop manipulation.
- **Parallel Interactive Module Tables (Pathway vs. Excluded)**:
  - *Pathway Learning Modules*: Left column containing active study plan steps (Step 1..N) with duration, domain badges, reordering controls, and direct "Exclude" triggers.
  - *Excluded Modules*: Right column containing excluded modules retained for this employee profile, with direct "Include" triggers and dedicated drop zones.
  - *Bi-Directional Drag-and-Drop*: Modules can be dragged between the active pathway and excluded list, or dragged within lists for reordering.
- **Persistent Exclusions Across Regeneration**:
  - Modules placed in the Excluded list are stored as explicit exclusion constraints for subsequent pathway regenerations.
  - When the expert triggers pathway regeneration, the AI replanner strictly omits all excluded modules.
  - After regeneration completes, the Excluded list **still retains the previously excluded modules**, allowing the expert to reconsider, drag them back, or maintain the exclusions.
- **Regeneration Lock & Visual Feedback**:
  - When "Regenerate Pathway" is triggered, the button displays a spinning `RefreshCw` icon (`animate-spin`) and updates text to "Regenerating Pathway...".
  - During regeneration, all editing interactions (dragging, exclude/include buttons, addition from catalog, deletion, reordering, approval) are strictly disabled to prevent race conditions.
  - A prominent progress alert explains the background replanning activity.
- **Actions**:
  - *Include / Exclude Modules*: Expert drags or clicks buttons to move modules between active and excluded lists.
  - *Add Existing Catalog Module*: Expert can search the catalog and drag-and-drop modules directly into either the Pathway Learning Modules table or Excluded Modules table (or use the quick addition buttons). Modules can also be dragged from tables back into the catalog.
  - *Regenerate Pathway*: Expert provides optional guidance notes for the system to generate an updated draft respecting exclusions.
  - *Approve for Learning*: Expert approval transitions pathway to `APPROVED` and unlocks the learning pathway for the employee in `/employee/pathway`.

## Acceptance Baseline

An expert can inspect, reorder, exclude, and regenerate the curriculum for a permitted employee's initial pathway using side-by-side interactive tables on a dedicated page with modification locking during regeneration.