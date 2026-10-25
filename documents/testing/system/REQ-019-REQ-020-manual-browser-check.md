# Manual Browser Verification: REQ-019 / REQ-020 & REQ-011 Expert Portal

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
