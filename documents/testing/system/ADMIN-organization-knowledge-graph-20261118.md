# Organization knowledge graph viewer — system/browser evidence (2026-11-18)

**Stack:** isolated Compose project `adapt-learn-graph-kgtest` from `compose.dev.yml` with fresh volumes (web `http://127.0.0.1:8088`, API `18080`). Migrations and all seeds exited 0; the TechNova organization graph has 607 visible (ACTIVE) nodes.

**Setup notes:**

- `compose.dev.yml` could not migrate because two workspace migrations both used version V67. `V67__demo_subscription_prices.sql` was renamed to `V71__demo_subscription_prices.sql` (content unchanged, user-approved). The team must confirm the renumbering before merge.
- The preserved `adapt-learn-graph-dev` volume has Flyway checksum mismatches for V64/V65 from an earlier numbering. It was **not** repaired or reset; that stack was stopped with volumes intact and the isolated project was used instead.

**Command:** `cd frontend; npx playwright test --config=playwright.system.config.ts ADMIN-organization-knowledge-graph`

**Spec:** `frontend/system-tests/ADMIN-organization-knowledge-graph.spec.ts`

## Results — 3/3 Passed (Chrome)

| ID | Scenario | Expected | Result |
| --- | --- | --- | --- |
| S-01 (DOD-1, DOD-2) | Desktop 1440×900, `admin@technova.com` opens `/admin/knowledge-graph` | API 200 with `no-store`; response contains JobPosition, TargetRole, Level, Competency, MicroSkill, LearningModule, Certificate and HAS_SKILL_PREREQUISITE edges; vis-network `<canvas>` rendered; no mock "Competency Graph Engine Connected"; legend lists 7 types + Prerequisite; Zoom/Fit/Re-arrange/Fullscreen controls; summary "607 of 607 nodes shown" | Passed |
| S-02 (DOD-3) | Search a micro-skill name, hide Competencies/Learning modules/Certificates layers, Clear filters | Summary switches to "N highlighted of M nodes shown"; layers restored after clear | Passed |
| S-03 (DOD-2, DOD-3) | Scope a job position, click its node on the canvas, then **Explore branch** | Details card shows name, type/code/status/review badges and "Target roles" relations; exploring switches Node type to Target role and expands the branch (11 nodes) | Passed |
| S-04 (DOD-4) | Mobile 390×844 | Graph shown by default, filter panel hidden; Filters/Graph toggle swaps panels | Passed |
| S-05 | No HTTP ≥ 400, console errors or page errors after sign-in (desktop and mobile) | None | Passed |
| S-06 (DOD-5) | `manager@technova.com` (L&D Manager, same organization) requests the API; also an unknown organization id | Both 403 | Passed |

**Artifacts (inspected):** `frontend/test-results/ADMIN-organization-knowledge-graph/` — `desktop-overview.png`, `desktop-search-layers.png`, `desktop-explore-branch.png`, `mobile-graph.png`, `mobile-filters.png`.

**Run history:** the first three runs failed due to spec issues (legend text is "Micro-skill"; scope selects' accessible names include the selected option; double-clicking after a camera-animating click was non-deterministic, replaced by the details card's **Explore branch** button). No application change was needed. The unauthenticated `/workspace-auth/current` 401 and a pre-sign-in 404 occur before login and are outside the watched window.

**Limits:** English UI only in the browser run (Vietnamese copy covered by component code paths, not asserted). Canvas node positions depend on vis-network physics; clicks rely on Fit graph with a single node. Not production acceptance.

## Manual test checklist

Prerequisite: stack running; sign in as an Organization Administrator (e.g. `admin@technova.com`); open **Knowledge Graph** in the sidebar (`/workspace/{slug}/admin/knowledge-graph`).

1. The page shows a graph canvas (not a table/list) with a node count chip and a legend: Job position, Target role, Level, Competency, Micro-skill, Learning module, Certificate, Prerequisite (dashed red).
2. Use Zoom in/out, Fit graph, Re-arrange layout and Fullscreen; scroll to zoom and drag to pan.
3. Type a name or code in **Name or code** → matching nodes are highlighted; the summary shows "N highlighted of M nodes shown".
4. Pick a Job position → Target role → Level → Competency in turn → the canvas narrows to that branch.
5. Untick Competencies / Learning modules / Certificates → those layers disappear; **Clear filters** restores everything.
6. Click a node → the details card shows its type, code, status, review status, description and related nodes; click a related chip to focus it.
7. Double-click a job position/role/level/competency (or press **Explore branch**) → the next layer of that branch is shown.
8. Narrow the browser (< 1024 px) → Filters/Graph toggle buttons switch panels.
9. Sign in as an L&D Manager, Domain Expert or Employee → the API `/api/v1/organizations/{id}/knowledge-graph` returns 403; the page shows "Access denied" if reached.
