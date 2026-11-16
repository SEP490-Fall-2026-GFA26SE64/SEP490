# FR-02.01 / REQ-064: read-only organization directory

## 2026-11-04 local execution

Approved slice: provisioned organizations, read-only details, current administrator assignments, current subscription coverage, and named confirmation before suspension/reactivation. Profile editing and preprovisioning registrations are excluded.

Environment: Windows, Java 21.0.6, Node 22.15.0, Maven wrapper, existing Vitest/TypeScript/Vite/oxlint. Acceptance IDs refer to this run's scenarios, not additional product requirements.

| Acceptance | Executable coverage | Actual result |
| --- | --- | --- |
| AC-01/02/07 | `PlatformWorkspaceDirectoryTest` checks batched reads, empty directory, nullable names, inactive memberships, independent suspension, current/expired/future/absent coverage and exact period boundaries | 2 passed |
| AC-02/07 | `SubscriptionMappingsTest` checks explicit DTO projections, required display fields, nullable names/current period, and absence of payment history/pricing/secrets from the directory | 5 passed |
| AC-04/08 | Existing `SubscriptionAccessPolicyTest` | 5 passed |
| Architecture | Existing `LayeredArchitectureTest` | 9 passed |
| AC-01/02/03/05/07 | `subscriptionApi.test.ts` validates response mapping, legitimate nulls and rejection of malformed administrator flags | 7 passed |
| AC-03/04/05 | `PlatformWorkspaceControls.test.tsx` covers loading/empty/error/refetch, no edit controls, real-display shape, named cancel, scoped CSRF, pending-action lockout, persisted-response refetch, and retained error/retry dialog | 8 passed |

Commands from repository root:

```powershell
.\backend\mvnw.cmd -f backend\pom.xml '-Dtest=SubscriptionMappingsTest,PlatformWorkspaceDirectoryTest,SubscriptionAccessPolicyTest,LayeredArchitectureTest,SubscriptionPlanApiIntegrationTest,PaymentOrderPostgresIntegrationTest' test
```

Exit **0**, **57 passed / 0 failed / 0 errors / 0 skipped**. This includes the 21 unit/architecture checks above and 36 real API/persistence checks documented in [integration evidence](../integration/REQ-064-manage-organizations-20261104.md); do not add the first 11-test focused run to this total.

From `frontend`:

```powershell
npm.cmd test -- src\features\subscription\subscriptionApi.test.ts src\features\subscription\PlatformWorkspaceControls.test.tsx
npm.cmd exec -- oxlint src\features\subscription\PlatformWorkspaceControls.tsx src\features\subscription\PlatformWorkspaceControls.test.tsx src\features\subscription\subscriptionApi.ts src\features\subscription\subscriptionApi.test.ts src\features\subscription\SubscriptionFeedback.tsx system-tests\REQ-064-manage-organizations.spec.ts
npm.cmd run build
```

Results: Vitest **15 passed**, exit **0**; scoped lint exit **0**; TypeScript/Vite build exit **0**. Lint retains the existing `SubscriptionFeedback` mixed-hook/component Fast Refresh warning. Build retains the existing large-chunk advisory.

Directly affected frontend regression follow-up: `npm.cmd test -- src\features\subscription` exited **0**, **31 passed across six files**. This includes the 15 focused cases above, not 31 additional cases. Final scoped lint after the Playwright harness corrections also exited **0**.

The initial UI build failed because the shared Button accepts `primary`, not `default`; the caller was corrected and the build rerun successfully. This was an implementation failure, not a passing run.

Backend raw reports: `backend/target/surefire-reports/TEST-com.adaptlearngraph.{repository.PlatformWorkspaceDirectoryTest,helper.SubscriptionMappingsTest,entities.domain.SubscriptionAccessPolicyTest,architecture.LayeredArchitectureTest}.xml`. Component tests use isolated fetch doubles, not real persistence. See [system evidence](../system/REQ-064-manage-organizations-20261104.md) for browser verification and manual steps.

## 2026-11-06 post-pull checks

After merging upstream `888cd27c`, the subscription frontend command above passed **31 tests / 6 files**, exit **0**. Frontend build and scoped lint passed, exit **0**; the existing bundle-size advisory remains. The merged backend unit/architecture checks passed **21 tests**. The combined backend run was not fully green: two existing integration failures also reproduce on untouched upstream; see the [dated integration follow-up](../integration/REQ-064-manage-organizations-20261104.md#2026-11-06-upstream-synchronization). No new browser run is claimed for 6 November.

## 2026-11-13 platform layout restoration

Scope: restore the earlier Platform Administrator sidebar/header, API-derived KPI cards, search/access filters and paginated organization table, preserving the real read-only directory and confirmed suspension/reactivation introduced by `e8ca78a7`. No backend, API, schema or dependency changes.

| Acceptance | Check | Actual result |
| --- | --- | --- |
| Layout AC-01/02 | Existing eight `PlatformWorkspaceControls.test.tsx` scenarios retained; selectors now address table rows, with search separate from profile editing | Passed |
| Layout AC-01 | Case-insensitive administrator-email search, clearing search and explicit no-match versus empty-directory states | Passed |
| Layout AC-01 | Eleven real-shape component fixtures, ten rows per page, next page, filter resets page and KPI counts remain global | Passed |
| Layout AC-02 | Confirmed suspension removes the final active row on page two; pagination clamps to a valid populated page | Passed |
| Layout AC-04 | Subscription component/API regressions | 34 passed across six files, exit 0 |
| Layout AC-04 | TypeScript/Vite build and scoped oxlint | Passed, exit 0 |

Commands from `frontend`:

```powershell
npm.cmd test -- src\features\subscription\PlatformWorkspaceControls.test.tsx
npm.cmd test -- src\features\subscription
npm.cmd run build
npm.cmd run lint -- src\features\subscription\PlatformWorkspaceControls.tsx src\features\subscription\PlatformWorkspaceControls.test.tsx system-tests\REQ-064-manage-organizations.spec.ts system-tests\subscriptionHelpers.ts
```

The focused suite passed **11/11**, included in the **34/34** regression total; do not add them. Original baseline was 8/8. New layout assertions initially failed against the card UI as expected. The first implementation build caught unsupported Testing Library `exact` options and an insufficiently narrow pagination locale; both were corrected without type casts. Build retains only the existing large-chunk advisory.

Component fetch doubles establish presentation behavior, not persistence. Real API/browser evidence and the manual checklist are in the [system receipt](../system/REQ-064-manage-organizations-20261104.md). Backend unit/integration suites were not rerun: their implementation and contracts are unchanged; browser tests exercise the real existing API and stored status transitions separately.

### 2026-11-13 login-home follow-up

The shared `ROLE_HOME.PLATFORM_ADMINISTRATOR` now points to `/platform-admin/organizations`; `WorkspaceLoginPage` continues to use that owner rather than a second redirect rule. Other roles and safe tenant return paths are unchanged.

```powershell
npm.cmd test -- src\shared\auth\workspaceRole.test.ts src\features\auth\LoginPage.test.tsx
npm.cmd run lint -- src\shared\auth\workspaceRole.ts src\shared\auth\workspaceRole.test.ts src\features\auth\LoginPage.test.tsx system-tests\REQ-064-manage-organizations.spec.ts
npm.cmd run build
```

Role/login tests: **18 passed**, exit **0**, including the real component's Continue action targeting organizations and existing MFA/recovery/tenant-return cases. Scoped lint passed, exit **0**. Full build **failed**, exit **2**, on independent guest registration work: `src/features/guest/registrationApi.test.ts:29` supplies a `RegistrationInput` fixture missing `policiesAccepted`, `country` and `adminPhone`. Those files were not changed or the diagnostic suppressed by this task. Full-build acceptance is therefore **Blocked**, not Passed; no completion claim is published for this follow-up. The [system receipt](../system/REQ-064-manage-organizations-20261104.md#2026-11-13-login-home-follow-up) records the passing real-login destination check separately.

### 2026-11-14 organization profile and System Administrator phone

Backend: `OrganizationJpaRepository.Listed` left-joins the registration for slug, industry, headcount, country, organization `createdAt`, registrant account and phone. `JpaSubscriptionWorkspaceStore` flags only the administrator whose account equals the registrant as `systemAdministrator` and assigns the phone to that administrator only. `WorkspaceResponse` adds `workspaceSlug`, `industry`, `headcount`, `country`, `createdAt`; `WorkspaceAdministratorResponse` adds `systemAdministrator` and `phone`. Existing fields are unchanged.

```powershell
# repository root
.\backend\mvnw.cmd -f backend/pom.xml '-Dtest=SubscriptionPlanApiIntegrationTest,SubscriptionMappingsTest,PlatformWorkspaceDirectoryTest,PaymentOrderPostgresIntegrationTest#platformDirectoryUsesPurchasedPlanPeriodsWithoutConflatingSuspensionAndExpiry' '-Dsurefire.failIfNoSpecifiedTests=false' test
```

Result: **15 passed / 0 failed** (API integration 6, mappings 5, directory store 3, real-Postgres directory IT 1). The IT stores `admin_phone` and `country` and asserts slug, country, createdAt, System Administrator flag and phone. Two other `PaymentOrderPostgresIntegrationTest` methods (`editingRolesCannotBypassEmployeeCapacityOrOverwriteFailedProfileChanges`, `replacingASingleRoleUpdatesSeatsAndInitializesLearnerStateWithoutErasingHistory`) fail identically with this change stashed; they are pre-existing and unrelated. A clean full `test-compile` also fails on 25 committed, unmodified catalog/question-bank/module-authoring test files (see system receipt); no full-backend-suite pass is claimed.

Frontend, from `frontend`:

```powershell
npm.cmd test -- src\features\subscription\PlatformWorkspaceControls.test.tsx
npm.cmd run build
npx.cmd oxlint src\features\subscription\PlatformWorkspaceControls.tsx src\features\subscription\subscriptionApi.ts system-tests\REQ-064-manage-organizations.spec.ts
```

Result: **15 passed / 0 failed** (previously 11). New cases cover profile/phone/badge rendering, "Not provided" and "+1 more administrator", profile fallback, legacy responses without the new fields, the details dialog routing Suspend into the existing confirmation, and slug/phone search. Build passed (existing large-chunk advisory only); scoped lint passed with no findings. The 2026-11-13 build blocker in guest registration fixtures no longer reproduces. Real browser evidence is in the [system receipt](../system/REQ-064-manage-organizations-20261104.md#2026-11-14-organization-profile-and-system-administrator-phone).