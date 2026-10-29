# REQ-013 — main merge conflict resolution

Date: 2026-10-29. User-authorized repair of the pending squash merge from main into learning-module-manage. No commit/push or upgrade of the existing database is part of this repair.

## Resolved paths

The merge had 20 unmerged paths: ten both-modified and ten modify/delete. Removed conflict markers alone were insufficient; all paths must also be staged as resolved.

| Original conflict | Resolution |
|---|---|
| `backend/src/test/java/com/adaptlearngraph/assessment/infrastructure/BaselineAssessmentPostgresIntegrationTest.java` | Keep main tests; assert merged latest migration V34. |
| `documents/ARCHITECTURE.md` | Keep main architecture; retain accurate Module persistence and migration boundary. |
| `documents/PRODUCT_OVERVIEW.md` | Keep main Version 2 product and canonical FR-based domain structure. |
| `documents/features/Assigned target roles/View Assigned Target Roles.md` | Preserve branch historical specification with banner linking canonical domain. |
| `documents/features/Courses and learning content/README.md` | Preserve branch historical specification with banner linking canonical domain. |
| `documents/features/Learning module management/Create Learning Module.md` | Preserve branch historical specification with banner linking canonical domain. |
| `documents/features/Learning module management/Delete Learning Module.md` | Preserve branch historical specification with banner linking canonical domain. |
| `documents/features/Learning module management/README.md` | Preserve branch historical specification with banner linking canonical domain. |
| `documents/features/Learning module management/Update Learning Module.md` | Preserve branch historical specification with banner linking canonical domain. |
| `documents/features/Learning module management/View Learning Modules.md` | Preserve branch historical specification with banner linking canonical domain. |
| `documents/features/Learning offering approval/README.md` | Preserve branch historical specification with banner linking canonical domain. |
| `documents/features/Module outcomes/README.md` | Preserve branch historical specification with banner linking canonical domain. |
| `documents/features/README.md` | Keep main Version 2 product and canonical FR-based domain structure. |
| `documents/features/Target role management/Expert Assigned Target Roles.md` | Preserve branch historical specification with banner linking canonical domain. |
| `documents/neo4j_schema.md` | Keep v0.11 Module/TEACHES schema; clarify Version 2 storage/authorization boundary. |
| `documents/testing/system/README.md` | Combine main scope with historical Module evidence links. |
| `documents/testing/unit/README.md` | Combine main scope with historical Module evidence links. |
| `frontend/src/features/auth/LoginPage.test.tsx` | Keep main real workspace login and its tests; remove persona login. |
| `frontend/src/features/auth/LoginPage.tsx` | Keep main real workspace login and its tests; remove persona login. |
| `frontend/src/shared/layouts/WorkspaceLayout.tsx` | Keep real session identity/logout; preserve Module sidebar active routes. |

## Integration changes needed after textual merge

- Module security adapts the existing trusted workspace identity and entitlement, validates one allowed role, and retains CSRF. Demo persona cookies, Basic auth and X-User headers cannot establish identity.
- Module frontend requests reuse workspaceFetch; no second login is introduced. WorkspaceQueryScope is defined at module scope, preserving dialogs/editor state during periodic identity and entitlement checks.
- Expert choices read active organization memberships/roles, and transaction locks use the authenticated organization.
- Module migrations append as V33/V34; main V1–V32 checksums and Module SQL bodies remain unchanged.
- Docker builds include existing Markdown resources required for Module content snapshots.
- Added test-only real-account/paid-workspace fixtures and a browser journey. Fixtures are opt-in test sources and use synthetic local payment observations, never real payments.
- Canonical Learning Catalog implementation rows reflect the actual partial persisted workflow. Historical Module requirements are preserved without replacing the main Version 2 source requirements.

## Verification

[Unit evidence](../unit/REQ-013-main-merge-resolution.md): 34 backend and 23 frontend tests passed; typecheck/build passed. [Integration evidence](../integration/REQ-013-main-merge-resolution.md): 5 passed with real databases.

**Browser: NOT VERIFIED / environment blocked.** The final retry was interrupted after about seven minutes with login still waiting. Earlier attempts failed as detailed below; no full-journey pass is claimed. The spec remains available for rerun on an adequately resourced isolated stack.

Earlier attempts are not passes: fixture organization code violated an uppercase constraint (fixed); grant setup used POST instead of the existing PUT contract (test fixed); unscoped button locators matched multiple imported records (test scoped by Module ID); an entitlement refresh remounted the working page (WorkspaceQueryScope hoisted; dedicated regression passed). A subsequent attempt timed out at login during Hikari thread-starvation warnings/resource contention. The final retry ran after typecheck completion, with a larger bounded timeout and all assertions retained. Its fixture creation took about92s and the CSRF request about39s; API logs also recorded Hikari housekeeper starvation. Resource contention is observed; the end-to-end outcome remains unverified.

Git confirms zero unmerged entries and no conflict markers in application/tests/documents. Whitespace checks on repair paths pass. The complete incoming staged merge contains existing Markdown trailing spaces from main, including the Version 2 source document; those unrelated source-formatting changes were not rewritten.

## Manual checklist

URL: http://127.0.0.1:28188 (isolated verification frontend; API28180). The temporary verification runtime is stopped after testing to release resources; restart its isolated services before manual verification. Checklist below is provided for the user; it is not a claim that all manual steps passed. Prerequisites: verification Compose services and Vite running; verified Expert and L&D accounts with active memberships and an activated workspace; an imported Module plus the existing occupation grant/intake policy. Test-only fixture creates these in the isolated database, never the old database.

1. Sign in through `/login` as L&D; verify actual account name and Manager navigation.
2. Open Modules, find an imported Module, cancel Assign for intake and confirm no change; then assign its responsible occupation.
3. Sign out; sign in as assigned Expert; receive the Module, edit title, save and submit. Expected: persisted revisions and editor history, original creator remains unknown for an imported source.
4. Sign in as L&D; open Modules from approval navigation. Expected: stay under `/ld-manager`, view history, approve and release.
5. Reload. Expected: Released state persists; reviewer identity is recorded separately from creator/editor.
6. Log out from the shared header. Expected: redirect to login and both workspace and Module APIs reject the ended session.
7. Verify a second organization's Expert cannot retrieve the first organization's authoring document; role headers/persona cookies cannot bypass login, and mutations without CSRF fail.

Existing runtime at28088 and its database were not upgraded. Their pre-merge Flyway lineage differs from main starting atV8. Do not use the merged migrations on it without a separate data-preserving migration plan. Private uploads, complete assessment bundle review and production certification remain outside this local verification.
