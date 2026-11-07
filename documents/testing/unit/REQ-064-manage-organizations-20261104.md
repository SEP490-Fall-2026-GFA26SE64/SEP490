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
