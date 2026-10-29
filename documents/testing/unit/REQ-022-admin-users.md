# REQ-022 / REQ-066: Administrator Pages W2 — Unit and Build Evidence

## R1 visual follow-up, 2026-10-26

Refined user toolbar, row actions, role-selection controls, billing hierarchy and receipt links preserve the W2 operations. [R1 unit/build evidence](REQ-039-transactional-email.md) records the focused 29-test frontend suite and successful production build/lint. Existing warnings are not misrepresented as clean lint. W2 results below are retained as history.

**Date:** 2026-10-26. **Approved revision:** [W2](../../features/Subscription%20lifecycle/README.md#w2-administrator-pages-refactor--awaiting-approval).

## Executed Checks

From `frontend`:

```powershell
npm.cmd test -- --maxWorkers=2
npm.cmd run build
```

Final frontend run: **69 passed across 16 files, exit 0**. TypeScript/Vite production build: **Passed, exit 0**. The existing large-bundle warning remains.

Focused lint on the Administrator page owners, `AdminPageLayout`, typed client, `WorkspaceBoundary`, shared layout and W2 browser spec exited **0**. It reported the existing shared layout's sidebar state-synchronization-in-effect pattern; no new lint error was suppressed.

Backend final focused selector:

```powershell
.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=MemberProfileUpdateTest,SubscriptionAccessPolicyTest,SubscriptionPlanApiIntegrationTest,PaymentOrderPostgresIntegrationTest,HexagonalArchitectureTest" test
```

**36 passed, exit 0**, finished 19:25:30 +07:00 (4 profile-domain, 5 access-policy, 5 HTTP, 19 PostgreSQL and 3 ArchUnit).

## Assertions

| Acceptance | Actual result |
| --- | --- |
| ADMIN-AC01 | Existing WorkspaceLayout/sidebar reused, User Accounts active navigation, actual account/organization shown, demo role links retained and no fabricated profile/organization selector used on the corrected pages. |
| ADMIN-AC02 | Real-response member and pending-invitation projections, name/email search, role/status filters, detail dialog, pagination and filtered empty state verified. |
| ADMIN-AC03 | Edit dialog keeps activated email read-only and submits exactly permitted fields, expected revision and CSRF header. Profile domain rejects invalid names, empty/null/platform roles and negative revisions; preserves legitimate nullable non-Employee assignments. |
| ADMIN-AC04/05 | Expired Users route remains readable with deactivation but no Create/Edit/reactivation; suspended Users route is denied with billing recovery navigation. |
| ADMIN-AC06 | Subscription uses the existing sidebar and has no Create User, activation form or embedded user directory; navigation to User Accounts and renewal remain. |
| ADMIN-AC07 | Build/typecheck and all frontend regressions, including original login appearance, passed. ArchUnit passed. |

The new component suite has seven cases. Isolated test doubles validate component behavior; real API/storage/browser evidence is recorded in the integration/system files, not inferred from those doubles.

## Retained Corrections

- First UI build found a misplaced JSX conditional closing brace in the opt-in organization-switcher branch; fixed and rebuilt.
- Next build found an `unknown` error value used directly as a React child condition; replaced with an explicit null check. No cast or silent fallback was added.
- EN/VI notices now store a semantic result instead of stale-language text; the shared Pagination component has an optional locale with unchanged English default for older callers.
- Completion feedback now waits for query refresh so the user list and seat summary settle together before a dialog closes.

No new dependency or physical schema migration was introduced. Other actor pages retain the existing shared-layout default behavior; the trusted identity/logout presentation is opt-in for the two Administrator pages.
