# Administrator Users and Subscription Pages — W2 Browser Evidence

## R1 presentation follow-up, 2026-10-26

The complete directory/create/edit/deactivate/reactivate and real identity/navigation flow passed again in the final **8/8 billing/admin suite, exit 0**, after the compact toolbar/action/role-card and billing typography/receipt-link changes. Desktop/mobile screenshots, role/organization/seat protections and actual persisted operations were verified. See [R1 consolidated evidence and checklist](REQ-039-onboarding-billing-refinement.md); W2 history below is unchanged.

The subsequent focused browser run also passed (one scenario, exit 0), explicitly asserting the `/admin/user` alias redirects to `/admin/users` before exercising the complete directory flow.

**Date:** 2026-10-26. **Contract:** [approved W2](../../features/Subscription%20lifecycle/README.md#w2-administrator-pages-refactor--awaiting-approval).

## Actual Environment

- Isolated Compose project: `adapt-learn-graph-subscription-test`.
- Test frontend: `http://127.0.0.1:8092`; real API/PostgreSQL/Neo4j, synthetic identities, test-only payment double and Mailpit.
- Existing Node 22.15.0, Docker and Chrome/Playwright; no new packages.
- No live payOS/SMTP test traffic; login L1 and Platform Admin pages are not redesigned.

## Browser Runs

From `frontend`, with `SYSTEM_TEST_BASE_URL=http://127.0.0.1:8092`:

| Command | Result |
| --- | --- |
| `npx.cmd playwright test --config=playwright.system.config.ts REQ-022-admin-pages REQ-066-subscription-renewal --output=test-results\admin-pages-w2` | 4 passed, exit 0 |
| Same selectors plus `REQ-037-login-appearance`, output `test-results\admin-pages-w2-final` | 6 passed, exit 0, 2.8 minutes |
| Final W2/REQ-066 selectors, output `test-results\admin-pages-w2-delivery` | 4 passed, exit 0, 2.9 minutes; includes final suspended-directory API denial and settled seat metrics |

## Verified Flows

1. Guest purchase/provisioning/session handoff leads to a real Administrator subscription page with existing sidebar and active Subscription navigation.
2. Subscription shows purchased terms/periods/seat summaries/payment history and renewal, but no activation form or member directory. Manage users navigates to `/admin/users`.
3. Users shows real member list, search/role/status filters, read-only detail, Create/Edit and membership confirmation actions. Last active Administrator deactivation is disabled and backend-protected.
4. Create User records a pending activation row which survives reload. Mailpit supplies the actual link; recipient activation creates the member without using frontend success mocks.
5. Edit saves a changed name and additional role; email is read-only. Reload and server reads retain the changes.
6. Deactivate retains the account and lowers used seats; reactivate restores the seat. Screenshot capture waits for the confirmation dialog and refreshed metrics, not merely a success notice.
7. Desktop and mobile EN/VI, contained table scrolling, sidebar collapse, selected navigation, dialog focus and actual account metadata were exercised. Page errors and unexpected failed requests were asserted empty.
8. The existing demo role menu remains visible. Choosing Platform Admin as an organization-only administrator leads to the existing unauthorized state; the server returns 403. Real logout invalidates the session and returns to `/login`.
9. Existing renewal flow still appends one future period; existing two-organization Employee activation and suspension/reactivation flows pass. Suspension denies Users APIs while billing remains readable.
10. Original illustrated login desktop/mobile and real invalid-password/MFA/recovery/session-reload checks passed unchanged in the six-test regression run.

Pagination/filtered-empty and expired restricted-directory states also have [component evidence](../unit/REQ-022-admin-users.md); storage/authorization/concurrent-seat checks have [integration evidence](../integration/REQ-022-admin-users.md).

## Screenshots

Latest W2 screenshots are under `frontend/test-results/admin-pages-w2-delivery/REQ-022-admin-pages-Admini-33511-ains-demo-navigation-safely-system-chrome/`:

- `administrator-subscription-desktop.png`
- `administrator-users-desktop.png`
- `administrator-users-mobile-vi.png`

Inspected current header/sidebar/content hierarchy, user row actions, billing-only page and mobile overflow. Earlier full-page screenshots were captured after automatic focus scrolling; the test now scrolls to the page top before visual capture. Notices and pagination translate when switching language, rather than retaining stale English text.

## Manual Checklist

After the separately authorized development update, open:

- `http://127.0.0.1:8088/admin/users`
- `http://127.0.0.1:8088/admin/subscription`

Use an authenticated organization Administrator with MFA. Real department/occupation references are prerequisites for Employee creation/assignment; do not substitute prototype data.

1. Verify both pages share the existing Administrator header/sidebar and the selected sidebar item.
2. Open account menu: actual identity/organization, retained demo role links and real logout. Demo navigation must not grant missing roles.
3. On Users, search/filter/page through the list; inspect a user's roles, department, occupation and state.
4. Create a synthetic test user only in the isolated environment. Verify pending/delivery/expiry state, activation and persisted list entry.
5. Edit name/roles/department/occupation; email remains read-only. Reload to verify. Invalid references, stale revision, capacity overflow and last-admin removal must fail explicitly.
6. Deactivate/reactivate with confirmation; preserve account/history and check used seats.
7. On Subscription, verify no Create User/member table, correct paid period/seat summary/history and the link to User Accounts. Renewal still uses the verified payment lifecycle.
8. In the isolated fixture environment, verify expired read/deactivate-only Users behavior and suspended denial; repeat desktop/mobile, keyboard and EN/VI.

Do not test real email/payment merely to review this refactor. The existing payOS provider error is outside W2.

## Development Update Authorization

User selected `apply-w2-api-web`. Preflight found V11 and zero PENDING/RETRY/RUNNING payment/email jobs. The normal API image was built, then environment values were compared internally without outputting secrets; no drift was found. Recreated only API with `--no-deps --no-build`, then restarted only the development frontend. API health is `UP`, new Administrator route source is served at `:8088`, and unauthenticated activation-list read returns 401.

No migration/reset or synthetic/live record creation was performed on the development database. Environment, workers' configured state and ngrok were preserved. An unrelated existing Redis orphan warning was not acted on. Isolated test services are stopped after verification with volumes retained.

```text
startup: PASS — isolated and separately authorized development API healthy
frontend: PASS — exit_code 0; 69 tests, build passed
backend: PASS — exit_code 0; 50 regression checks, final focused 36 checks (overlapping)
e2e: PASS — exit_code 0; final W2/renewal 4 passed; login-inclusive regression 6 passed
overall: PASS — approved local W2 refactor, not live merchant acceptance
```
