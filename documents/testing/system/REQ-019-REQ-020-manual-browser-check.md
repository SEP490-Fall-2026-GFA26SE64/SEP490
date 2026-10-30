# Manual browser reference: REQ-019 / REQ-020 review pathway

## Current procedure and evidence boundary — 2026-10-29

Current scope is REQ-019-F01/REQ-020-F01/F02 and direct REQ-042-F01/REQ-004-F01 review/read dependencies. [C4 evidence](REQ-002-041-042-workspace-integration.md#c4-review-evidence-synchronization--2026-10-29) records the actual C3 real-system2/2 pass, unit/component/API and real integration results separately. No new manual/executable run occurred in C4. The prototype Regenerate flow, identities, counts and REQ-011 search steps retained below are **historical**, not the current oracle, credentials or instructions for shared8088.

For a later separately authorized manual review, use a disposable scoped workspace with trusted same-tenant L&D/Employee/assigned Expert sessions and actual CSRF, real baseline configuration/responses and current Role+member Level. Never reuse or reset preserved development learner histories. The final C3 environment was isolated38088/final4; services are stopped and history volumes retained, so this document does not instruct restarting them.

| Step / acceptance | Action and expected observation | Existing C3 evidence / remaining limit |
| --- | --- | --- |
| R01/R02 | Assigned Expert opens bounded queue/detail; inspect safe learner/Role/Level/gaps, Included/Excluded/Catalog, totals and dependencies | API/component and real system; foreign/revocation variants in real integration, not a two-browser-tenant claim |
| R03/R05–R08/R14 | Exclude provider, Remove to neutral Catalog, Check unresolved, Include eligible repair; history retained and unresolved cannot approve | Real system repair path plus broader unit/integration variants |
| R03/R14 | Move adjacent independent module by keyboard; reload retains ordinal; prerequisite inversion denies without writes | Keyboard system pass; inversion/no-write integration pass. Native cross-list browser drag **Not run**; intent/payload matrix component-only |
| R09 | Every Check fresh; equal hash avoids redundant detail; preview Roadmap/Timeline has exact saved order, focus/Escape/footer; closing preview sends0 approvals | Component request counts and actual system observations |
| R09/R11/E03 | Only final confirm approves captured revision/hash; uncertain post200 response retries same key/body without duplicate edit; same Employee reloads exact approved order/dependencies | Actual final system revision5/hash/order14; no content/start execution required |
| R12/R14/E07 | Real selection transition archives unresolved revision; equal-hash repair suggestions disabled in EN/VI/narrow; no UI edit; direct stale edit409; history unchanged | Actual final system revision2/6 disabled suggestions/0 UI edits; original failed guard assertion retained and passes after separately approved C2 fix |
| E04–E06 and protected E08/E09 | Content/start/segment/readiness owner execution requires separate approval/integration | **Deferred/Not run**, never infer PASS or completion from displayed approval/unavailable entry |

Commands, dates, actors/tenant/fixtures, expected/actual, counts and artifacts are in the linked C4 receipt; this manual procedure is not itself a Passed result. Production assignment/publication/semantic/readiness/content remain Open/provisional. No management CRUD or full-baseline scope is introduced.

## Historical prototype procedure — retained without current acceptance claim

## Scope
1. **Dedicated Pathway Audit Page** (`/expert/pathway-review/:pathwayId`): Full-page review experience instead of modal dialog.
2. **Parallel Interactive Tables**: "Pathway Learning Modules" vs "Excluded Modules" side-by-side with bi-directional drag-and-drop and button toggling.
3. **Regeneration Spinning Indicator & Interaction Locking**: Spinning icon, disabled modifications, and progress banner during regeneration.
4. **Persistent Exclusions**: Excluded modules are remembered and bypassed during regeneration, and remain in the Excluded list after regeneration for reconsidering.
5. **Expert Target Roles Search & Filter**: Comprehensive multi-field search (title, code, occupation, micro-skills, track, seniority), status filter with dynamic counts, and clear filter button.

---

## Prerequisites
- Frontend dev server running at `http://localhost:8088` (or active port).
- Expert Actor identity: Log in as **Chen Wei** (`chen.wei@adaptlearn.internal`) or navigate to `/expert/pathway-review` and `/expert/target-roles`.

---

## Test Scenario 1: Dedicated Pathway Audit Page & Parallel Drag-and-Drop
1. **Navigate to Pathway Review Queue**:
   - URL: `http://localhost:8088/expert/pathway-review`
   - Observe the table showing initial learning pathway items (e.g. Alex Chen, Liam O'Connor, Zoe Martinez).
   - In Alex Chen's row, observe `3 active (1 excluded)` modules, duration `34 hrs`, and status `AWAITING REVIEW`.
2. **Open Dedicated Review Page**:
   - Click the **Review** button on Alex Chen.
   - Verify browser navigates to URL: `http://localhost:8088/expert/pathway-review/pathway-rev-01`.
   - Verify the review is rendered as a **separate, full-width page** with `← Back to Pathway Review Queue`, employee metadata banner, and action buttons.
3. **Inspect Side-by-Side Parallel Tables**:
   - Left Column: **Pathway Learning Modules** (Shows Step 1, Step 2, Step 3 with `GripVertical` drag handles and "Exclude" buttons).
   - Right Column: **Excluded Modules** (Shows `MOD-003 Transactional Microservice Architecture in Spring Boot` with "Include" button).
4. **Drag and Drop from Pathway to Excluded**:
   - Click and drag `Step 2 (MOD-002 Graph Neural Networks)` from the left table and drop it into the right table.
   - Verify it immediately moves into the **Excluded Modules** table with the `EXCLUDED` badge.
   - Verify the Pathway count updates to `2 Included • 20 hrs` and Excluded updates to `2 Excluded • 24 hrs`.
5. **Click-to-Exclude & Click-to-Include**:
   - On the left table, click the **Exclude** button on `Step 1 (MOD-001)`.
   - Verify it immediately moves to the Excluded table.
   - On the right table, click the **Include** button on `MOD-003`.
   - Verify `MOD-003` moves back into the active Pathway Learning Modules list.
7. **Drag and Drop from Catalog Module Dock**:
   - In the **Add Existing Catalog Module** dock at the top, locate any available module (e.g. `MOD-004 Event-Driven Microservices Architecture`).
   - Notice the drag handle (`GripVertical`) on each catalog item.
   - Click and drag `MOD-004` from the catalog dock and drop it directly into the **Pathway Learning Modules** table on the left.
   - Verify `MOD-004` is inserted into the active pathway steps and disappears from the available catalog dock.
   - Click and drag another catalog module (e.g. `MOD-006 Containerization & Kubernetes`) from the catalog dock and drop it directly into the **Excluded Modules** table on the right.
   - Verify it is added directly to the excluded list.
8. **Drag from Pathway / Excluded back to Catalog**:
   - Drag `MOD-004` from the left table and drop it onto the **Add Existing Catalog Module** dock.
   - Verify it is removed from the pathway and returns to the available catalog list.

---

## Test Scenario 2: Regeneration Spinning Icon, Modification Locking & Persistent Exclusions
1. **Prepare Excluded Modules**:
   - Ensure at least one module (e.g. `MOD-002`) is in the **Excluded Modules** table.
2. **Trigger Regeneration**:
   - Click the **Regenerate Pathway** button in the header.
   - In the modal dialog, observe that the excluded module code (`MOD-002`) is listed under "Excluded Constraints".
   - Type optional instructions: *"Focus heavily on schema refactoring labs"* and click **Start Regeneration**.
3. **Verify Interaction Locking & Spinning Icon**:
   - The modal closes.
   - Observe the **Regenerate Pathway** button displays a spinning `RefreshCw` icon (`animate-spin`) and the text changes to *"Regenerating Pathway..."*.
   - Observe the progress banner: *"AI Replanning in Progress: Recalibrating prerequisite graph while strictly omitting excluded modules... All edits are locked during regeneration."*
   - Verify **all controls are disabled and locked**:
     - Both tables are locked (`opacity-60`, `pointer-events-none`).
     - Dragging is disabled (`cursor-not-allowed`).
     - Buttons ("Exclude", "Include", "Remove", "Add to Pathway", "Approve for Learning") are disabled.
4. **Verify Completed Regeneration & Persistent Exclusions**:
   - After ~1.8 seconds, regeneration completes with a success toast notification.
   - Verify the **Excluded Modules** table **STILL CONTAINS** `MOD-002` (and all previously excluded modules).
   - Verify the active **Pathway Learning Modules** table received the regenerated curriculum (incorporating the new adapted lab without re-adding the excluded module).
   - Verify the expert can now rethink and optionally drag `MOD-002` back or keep it excluded.
   - Verify pathway status badge remains **AWAITING REVIEW** (never REGENERATED), and the Active Regeneration Instructions banner is omitted.
5. **Approve Pathway**:
   - Click **Approve for Learning**.
   - Verify toast confirms pathway approval and badge displays `APPROVED`.

---

## Test Scenario 3: Target Roles Search and Filter in Expert Portal
1. **Navigate to Target Roles**:
   - URL: `http://localhost:8088/expert/target-roles`
2. **Test Search Field**:
   - Type `Java` into the search box:
     - Verify `JAVA_BACKEND_P3` matches.
     - Observe clear button `(X)` appears on the right of the search input.
   - Click `(X)`:
     - Verify search input clears and all assigned roles re-appear.
   - Type `Software Developers` (the Occupation name):
     - Verify roles matching that occupation appear.
   - Type `ROLE-GENAI`:
     - Verify `ROLE-GENAI-01` appears.
3. **Test Status Dropdown**:
   - Select `Published`:
     - Verify only published roles appear (`ROLE-GENAI-01`, `ROLE-AI-ARCH`).
     - Verify `Showing 1-2 of 2 roles` pagination is completely accurate without discrepancy.
   - Select `Drafts`:
     - Verify only draft roles appear (`JAVA_BACKEND_P3`).
4. **Test Filter Reset**:
   - Enter a query that matches 0 roles (e.g. `xyz123nonexistent`).
   - Verify empty state displays with *"No target roles match your active search query or status filter."*.
   - Click **Clear Active Filters**.
   - Verify both search text and status filter reset, and the full role catalog re-renders immediately.
