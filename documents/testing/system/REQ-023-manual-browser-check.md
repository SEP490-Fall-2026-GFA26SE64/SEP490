# REQ-023 Manual Browser System Check

Use this checklist against the local development Compose stack to verify the browser-observed end-to-end target role management and expert authoring workflows (REQ-023-F01 through REQ-023-F05).

---

## 1. Start and Verify the Stack

From the project root:

```powershell
docker compose -f compose.dev.yml up --build -d
docker compose -f compose.dev.yml ps
Invoke-RestMethod http://127.0.0.1:8088/api/v1/system/status
Invoke-RestMethod -Uri http://127.0.0.1:8088/api/v1/organizations/comp-technova/target-roles -Headers @{'X-User-Role'='LD_MANAGER'}
```

Expected:
- `postgres` and `neo4j` are healthy.
- `migrate` completed with code `0`.
- `api` is healthy and `web` is running on port `8088`.
- The target-role endpoint returns the seeded roles for `comp-technova` directly from Neo4j (`ROLE-AI-ARCH`, `ROLE-GENAI-01`, `ROLE-MLOPS-02`, `JAVA_BACKEND_P3`).

---

## 2. Check L&D Manager Target Role Creation Flow

1. Open the browser to <http://127.0.0.1:8088/ld-manager/target-roles>.
2. Confirm the active company is `comp-technova` (TecNova Technologies).
3. Click the primary **Create Target Role** button in the header.
4. Fill in the modal form:
   - **Role Code**: `ROLE-DATA-ENG` (must be uppercase)
   - **Role Title**: `Senior Data Platform Engineer`
   - **Job Domain**: `DATA` (Data Engineering & Analytics)
   - **Career Family**: `PYTHON_DATA`
   - **Track**: `PROFESSIONAL`
   - **Assigned Domain Expert**: Select `expert-chen` (Dr. Aris Chen)
   - **Description**: `Enterprise data engineer responsible for streaming ingestion and distributed lakehouse storage.`
5. Click **Initialize Role Draft**.
6. **Expected Outcome**:
   - Toast notification confirms draft role creation.
   - The new role `ROLE-DATA-ENG` appears in the list with a `DRAFT` status badge.
   - No mock data indicator is displayed; data is loaded from the live Neo4j database.
7. Refresh the browser (`Ctrl + F5`) and confirm `ROLE-DATA-ENG` remains in the list in `DRAFT` status.

---

## 3. Check Dispatching to Domain Expert (DRAFT &rarr; SENT)

1. Locate `ROLE-DATA-ENG` in the list.
2. Click the **Send to Expert** button (or action menu option).
3. **Expected Outcome**:
   - Toast notification: `Target Role Sent to Expert`.
   - Status badge transitions from `DRAFT` to `SENT`.
   - Network inspector confirms a `PUT` request to `/api/v1/organizations/comp-technova/target-roles/{roleId}` with `status: "SENT"`.
4. Refresh the browser and confirm the status remains `SENT`.

---

## 4. Check Domain Expert Authoring & Graph Skill Linking

1. Navigate to the Domain Expert portal: <http://127.0.0.1:8088/expert/target-roles>.
2. Confirm user context is `expert-chen` (Dr. Aris Chen).
3. **Isolation Check**:
   - Verify that roles assigned to `expert-rivera` (such as `ROLE-MLOPS-02`) are **not visible** in Chen's queue.
   - `ROLE-DATA-ENG` (and `ROLE-AI-ARCH`) are visible.
4. Select `ROLE-DATA-ENG` to open the micro-skill linking panel.
5. Search and add micro-skills:
   - `Python for Machine Learning` (`MS-PY-001`) &rarr; Set required threshold to `85%`.
   - `Deep Learning & PyTorch` (`MS-DL-001`) &rarr; Set required threshold to `80%`.
6. Click **Save & Publish Role**.
7. **Expected Outcome**:
   - Toast notification confirms publishing.
   - Status badge transitions to `PUBLISHED` (active in graph).
   - In Neo4j, `(:TargetRole)-[:REQUIRES_SKILL { targetMastery: 0.85, status: 'ACTIVE' }]->(:MicroSkill)` edges are created.
8. Refresh the browser (`Ctrl + F5`).
   - Confirm the micro-skills and their thresholds remain attached and displayed.

---

## 5. Check Successor Draft Creation (v1.0 &rarr; v1.1)

1. Return to the L&D Manager portal: <http://127.0.0.1:8088/ld-manager/target-roles>.
2. Find `ROLE-AI-ARCH` (currently `ACTIVE` v1.0).
3. Click **Create Successor Draft** on the card or row actions.
4. **Expected Outcome**:
   - Toast notification: `Successor Draft Initialized`.
   - A new item `ROLE-AI-ARCH` with version `1.1` and status `DRAFT` appears.
   - The successor draft `v1.1` is positioned **immediately beneath** `v1.0` in the sorted catalog view.
   - The active `v1.0` remains unchanged (`ACTIVE`), ensuring existing learner enrollments remain pinned.
5. Refresh the browser (`Ctrl + F5`).
   - Confirm both `v1.0` and `v1.1` persist and load from Neo4j without any duplicate code errors.

---

---

## 6. Check Domain Expert Rejection with Mandatory Reason

1. As Domain Expert (`expert-chen`), locate an assigned role in `DRAFT` or `SENT` status (e.g. `ROLE-DATA-ENG`).
2. Click the **Reject** button (X icon).
3. **Expected Outcome**:
   - The **Reject Target Role** modal opens.
   - A mandatory textarea is present: `Reason for Rejection *`.
   - The **Confirm Rejection** button is disabled until a reason is typed.
4. Enter reason: `Required micro-skill benchmark thresholds exceed junior level entry criteria.`
5. Click **Confirm Rejection**.
6. **Expected Outcome**:
   - Role status transitions to `REJECTED`.
   - Rejection reason is stored in Neo4j (`r.rejectionReason = "..."`).
   - Page reload preserves `REJECTED` status and reason.
7. Return to L&D Manager portal (<http://127.0.0.1:8088/ld-manager/target-roles>):
   - The role displays a `REJECTED` badge with the rejection reason callout in the table row and inside the **View Details** modal.

---

## 7. Check Published Versions Collapsing, Ordering & Whole-Line Interactivity

1. Ensure multiple published versions exist for a role (e.g. `v1.0`, `v1.1`, `v1.2`, and `v2.0` of `JAVA_BACKEND_P3`).
2. **Expected Outcome**:
   - Only the newest version (`v2.0`) is shown as the primary row in the table.
   - An interactive indicator badge (`3 previous versions (click row to view)`) with a chevron appears in the role title cell and code cell.
   - The entire row is highlighted with interactive cursor styling (`cursor-pointer select-none`).
   - Older published versions are collapsed inside by default.
   - The successor draft `+` button is visible only on the newest published version (`v2.0`).
3. Click **anywhere on the primary table row** (not just a small button):
   - The row toggles expansion and displays all previous published versions immediately beneath `v2.0`.
   - The previous versions are strictly ordered **ascending by version**: `v1.0` &rarr; `v1.1` &rarr; `v1.2`.
   - The previous version rows display a `Previous v...` badge and history icon.
   - The previous version rows have **no `+` create successor draft button** (drafting from historical versions is prohibited).
   - Any action buttons inside the row (such as View Details, Linked competencies, or Targets) stop propagation so clicking an action opens its respective dialog without triggering row collapse.
   - Clicking the primary row again cleanly collapses the previous versions.
4. Verify that the orange `under v1.0` badge is completely removed.
5. Verify that `Archived` status has been removed from all filters, dropdowns, and status badges.

---

## 8. Finish and Report

To stop the containers while preserving local data:

```powershell
docker compose -f compose.dev.yml down
```

Report template:

```text
Target Role Creation (DRAFT) in Neo4j: PASS | FAIL
Dispatch to Expert (SENT) and Isolation: PASS | FAIL
Expert Rejection with Reason Stored: PASS | FAIL
Expert Micro-Skill Linking & Publish: PASS | FAIL
Published Versions Collapsing & Indicator: PASS | FAIL
Historical Version Draft Disabled: PASS | FAIL
Successor Draft (v1.1) Ordering & Persistence: PASS | FAIL
Browser/OS/Date:
```
