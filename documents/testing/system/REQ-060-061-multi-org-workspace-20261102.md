# Multi-organization workspaces: system evidence and manual checks

Date: 2026-11-02. Scope: FR-01.04 / FR-07.03 (legacy REQ-060-F04 / REQ-061-F01), FR-03.04 slug display and FR-07.01 organization isolation. Local/dev Compose with payOS, email verification and MFA disabled; not production or live-provider acceptance.

Related evidence: [unit/API/frontend](../unit/REQ-060-061-multi-org-workspace-20261102.md), [integration](../integration/REQ-060-061-multi-org-workspace-20261102.md), [architecture](../../ARCHITECTURE.md#multi-organization-workspaces-and-starter-catalog--2026-11-02).

## Environment and commands

Real Spring API, PostgreSQL, Neo4j (seeded v0.11.0 catalog and TechNova development organization) and the Vite web server; no mocked application APIs. Isolated Compose project `alg-multi-org-smoke` with its own ports, images and volumes; the shared development stack was not used. Windows, Node 22, installed Google Chrome, headless, one worker, no retries.

From the repository root:

```powershell
docker compose -f compose.dev.yml -f compose.multi-org-test.yml up -d --build
```

After API health and web HTTP 200, from `frontend`:

```powershell
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8096'
npx playwright test -c playwright.system.config.ts system-tests/REQ-060-061-multi-org-workspace.spec.ts
```

Final run: **8 passed / 0 failed / 0 skipped**, approximately 5.1 minutes, exit 0. Afterwards the isolated project was removed with `down -v` (its own volumes only) and its images deleted.

## Results

| Check | Result |
| --- | --- |
| Public catalog | `GET /api/v1/platform-catalog` returned template 0.11.0 with 378 selectable nodes (5 Job Position, 48 TargetRole, 79 MicroSkill, 246 LearningModule) and 1421 edges without a session. |
| Closure preview | In the browser the Guest added one target role; the server preview showed "204 items and 362 relationships will be copied". The same endpoint without a CSRF token returned 403. |
| Registration → workspace | Registration submitted `catalogSelection` (one id) with 201; the development payment bypass applied the order; **Enter workspace** appeared only after the copy finished and opened `/workspace/{generated slug}/admin/subscription`. All same-origin links on that page were inside the workspace prefix. |
| Copied graph | Neo4j for the new organization: 204 nodes (Job Position 1, TargetRole 1, Level 3, Competency 6, MicroSkill 14, LearningModule 179), all with `sourceId`; 362 relationships, **0** pointing to another organization and **0** reused source ids. The import row was SUCCEEDED after 1 attempt with node/relationship counts 204/362. Four organizations copied the same template in successive runs without collision. |
| Legacy links | TechNova administrator `/admin/subscription?tab=history#top` → `/workspace/workspace-development/admin/subscription?tab=history#top` (the seeded TechNova slug is `workspace-development`). |
| Foreign / unknown slug | TechNova on the new organization's slug and on `/workspace/no-such-workspace/...`, and the new organization on TechNova's slug: "Workspace not found"; **no API request other than `/workspace-auth/current`**; "Go to your workspace" returned to the member's own slug. Desktop 1440×1000 and mobile 390×844. |
| API isolation | Each organization's session received 403 for the other organization's subscription, job positions and micro-skills; `comp-technova` alias returned 400. The new organization's user directory listed only its owner. |
| Deep link | Signed out `/workspace/{TechNova}/admin/users?tab=invites` → `/login?next=...` → after sign-in back to the same path. A `next` pointing to another organization's workspace was ignored and the member landed on their own role home. |
| Role sweep | TechNova Organization Administrator, Domain Expert, L&D Manager and Employee signed in through `/login`, landed on `/workspace/{slug}/<role home>`, and every same-origin navigation link (up to 25 per role) stayed inside the workspace without "Workspace not found"/"Workspace access", page errors, failed requests or HTTP 5xx. |

Allowed known condition: the Domain Expert's question bank page returns 409 "Multiple legacy banks need explicit administrator resolution" because the Compose seed services create two legacy TechNova banks. That store is unchanged by this work; the sweep allows only that 409.

## Defects found and fixed during system testing

- The closure preview first lived at `/api/v1/platform-catalog/closure`; the Guest registration session cookie is scoped to `/api/v1/registration`, so the browser's CSRF token was rejected (403). The preview moved to `POST /api/v1/registration/catalog-closure`; a cookie-scope unit test was added.
- `/system-status` (linked from every portal sidebar) left the workspace; it is now kept inside it, and real sessions choose the portal from their single role rather than saved demo state.
- The guest payment page kept polling after the workspace was ready, producing a 401 once the handoff exchanged the session; polling now stops in that terminal state.
- Graph labels were below the canvas draw threshold for large views; the picker now keeps a readable minimum zoom. The not-found action is a primary button.

## Screenshots

Inspected after load; Vietnamese text was not part of this run.

- [Registration catalog picker, desktop](assets/multi-org-workspace-20261102/registration-catalog-picker-1440.png)
- [New organization workspace, desktop](assets/multi-org-workspace-20261102/tenant-b-workspace-1440.png)
- [Workspace not found, desktop](assets/multi-org-workspace-20261102/foreign-workspace-not-found-1440.png) and [mobile](assets/multi-org-workspace-20261102/foreign-workspace-not-found-390.png)
- [New organization user directory, desktop](assets/multi-org-workspace-20261102/tenant-b-users-1440.png) and [mobile](assets/multi-org-workspace-20261102/tenant-b-users-390.png)

## Manual checks still recommended

1. Drag a node from the graph canvas onto "Your catalog" with a mouse and double-click a node (automated tests used the list buttons and a synthetic drop).
2. Register with a custom slug and confirm the emailed links (renewal payment result, question bank, learning reminders) open `/workspace/{slug}/...` when SMTP is enabled.
3. With payOS enabled, confirm a renewal callback returns to `/workspace/{slug}/admin/subscription/payment-result`.

```text
environment:
  docker: AVAILABLE — isolated Compose PostgreSQL, Neo4j, migrations, seeds and healthy API
  node: AVAILABLE — Node 22
  playwright: AVAILABLE — installed Google Chrome, headless, one worker
startup: PASS — API healthy, web HTTP 200
e2e: PASS — exit_code: 0, passed: 8, failed: 0, skipped: 0
overall: PASS — local/dev multi-organization scope only
```
