# Multi-organization workspaces: unit, API and frontend evidence

Date: 2026-11-02. Scope: FR-01.04 / FR-07.03 (legacy REQ-060-F04 / REQ-061-F01), FR-03.04 slug display, FR-07.01 organization isolation. See also [integration](../integration/REQ-060-061-multi-org-workspace-20261102.md) and [system](../system/REQ-060-061-multi-org-workspace-20261102.md) evidence.

## Backend unit and API tests

Run inside the full `.\mvnw.cmd -B clean verify` from `backend` (final run: **659 tests, 0 failures, 0 errors, 0 skipped**, BUILD SUCCESS, 18:37 min).

| Test class | Result | Covers |
| --- | --- | --- |
| `PlatformCatalogServiceTest` (new) | 7 passed | Closure rules for Occupation, TargetRole, MicroSkill and Module selections; edges only with both ends; empty selection copies nothing; non-selectable (Level), unknown, blank and more than 300 ids rejected on `catalogSelection`; a missing template allows only an empty selection. |
| `PlatformCatalogControllerTest` (new) | 4 passed | Public catalog exposes only selectable labels without organization fields and is publicly cacheable; closure preview returns server-computed counts with `no-store`; unknown nodes are field errors; missing template is 503. |
| `ScopedSessionCookieSerializerTest` | 4 passed | Added: the guest closure preview reads the registration session that issued its CSRF token, while the public catalog uses the workspace cookie. |
| `WorkspaceLinksTest` (new) | 2 passed | Email/callback paths are built as `/workspace/{slug}/...`; without a usable slug the legacy path is kept (it then redirects in the browser); relative paths are refused. |
| `MacroCompetencyServiceTest` | 2 passed | Listing is organization-scoped; a blank organization returns nothing. |
| `Neo4jQuestionBankSkillReaderTest` | 4 passed | Skills are read only for the caller organization; an organization is required. |
| `WorkspaceMergeAuthorizationTest` | 7 passed | Added: `comp-technova` and `default-org` aliases are no longer accepted (400). |
| `LayeredArchitectureTest` | 4 passed | New classes respect the layered package rules. |
| `MigrationConfigurationTest` | 3 passed | Migration inventory now ends at V47 in every lineage. |

## Frontend unit/component tests

From `frontend`: `npx vitest run --maxWorkers=2` → **292 passed, 6 failed (298)**; `npm run lint` exit 0; `npm run build` exit 0.

New or updated for this change (all passing):

| Test | Covers |
| --- | --- |
| `shared/auth/workspacePaths.test.ts` (new) | Workspace basename detection (including unknown slugs), slug validation, tenant vs shared vs public paths, return-path safety (other slug, `//`, absolute URL, backslash, plain or percent-encoded `.`/`..` segments and non-workspace pages rejected); a malformed slug escape is reported as an unknown workspace instead of crashing. Added after code review. |
| `features/subscription/WorkspaceBoundary.test.tsx` | Editor state survives identity/entitlement revalidation; another organization's slug shows "Workspace not found" with no tenant API request; legacy path redirect keeps query/hash; signed-out deep link goes to `/login?next=`; role-mismatched area denied; `/system-status` stays inside the workspace. |
| `features/auth/LoginPage.test.tsx` | Continue goes only to the member's own workspace for same-slug, legacy, foreign-slug and absolute `next` values; recovery-code flow keeps the slug destination. |
| `features/guest/GuestCatalogPicker.test.tsx` (new) | Empty start, add/remove with closure summary, drop onto "Your catalog", catalog outage keeps registration usable, response parsing rejects unknown labels and drops dangling edges. |
| `features/guest/GuestRegisterPage.test.tsx` | Existing flows with the picker present; empty `catalogSelection` submitted by default; picked items submitted. |
| `features/subscription/PaymentStatusPanel.test.tsx` | Workspace handoff opens `/workspace/{slug}/admin/subscription`. |
| `shared/layouts/WorkspaceLayout.test.tsx` (new) | Shared pages use the signed-in role's portal instead of saved demo state. |
| `app/AppTargetRoleRoute.test.tsx`, `UserManagementPage.test.tsx` | Fixtures now render inside a workspace slug. |

The 6 failures are not caused by this change:

- 5 fail identically on the unmodified `HEAD` worktree (same assertions): `UserManagementPage` "uses the existing sidebar…" and "keeps subscription billing-only…", `EmployeeUpskillingPage` RB05/11 and RB12/16, `RoleBaselineFlow` RB17.
- `initialPathwaySystemGuard.test.ts` timed out (5 s dynamic import) only under the parallel full run; alone it passed 7/7.
