
# Optional integrations: unit, API and frontend evidence

Date: 2026-10-30. Scope: FR-01.01/01.04/07.03 and subscription FR-01.03/07.02/07.04 (legacy REQ-060/061/028). Local development switches only; not live email/payment acceptance.

## Feature-only clean-main retest

After pulling main at `3302bda`, only the approved integration-switch changes were applied to a separate clean worktree. Unrelated catalog/workspace-routing edits and the reverted DEV-DEMO additions were excluded.

- The backend command below exited **0: 50 passed, 0 failures/errors/skips**. Suite counts: configuration 2, workspace authentication 13, payment processor 5, ArchUnit 3, registration API 4, registration PostgreSQL 21, selected payment PostgreSQL 2.
- The frontend command below exited **0: 24 tests passed in 5 files**. `npm run build` exited 0 (TypeScript plus Vite).
- Scoped lint of the affected guest/subscription UI and system-test files exited 0 using the existing host-native oxlint CLI against the clean worktree. The existing mixed-export Fast Refresh warning remains. `git diff --check` exited 0.
- The earlier 52/25 counts below belong to the combined working-tree run, not this isolated patch. Two unrelated callback-routing tests and one unrelated client test were deliberately not included.
- An initial clean registration API run failed because its fixture selected the old migration location. Pointing that test at `classpath:db/workspace-migration` exercises the actual registration schema; the final combined run above passed. Initial lint invocation also failed because the disposable worktree's dependency directory lacked Windows executable/native bindings during container installation; the existing verified Windows installation ran the same linter without changing manifests.

## Historical combined-working-tree backend run

From `backend`:

```powershell
mvn -q '-Dtest=IntegrationPolicyConfigurationTest,WorkspaceAuthenticationServiceTest,PaymentProcessorTest,HexagonalArchitectureTest,RegistrationPostgresIntegrationTest,RegistrationApiIntegrationTest,PaymentOrderPostgresIntegrationTest#developmentBypass*' test
```

Exit 0. Surefire XML: **52 tests, 0 failures, 0 errors, 0 skipped**. Counts are this execution, not the sum of reruns.

| Suite | Tests | Result / boundary |
| --- | ---: | --- |
| IntegrationPolicyConfigurationTest | 2 | Enabled policy accepted; independent false flags and all-false allowed in local/dev only; absent/test/prod/production and mixed development/production profiles rejected. Calls configuration directly, not a production deployment. |
| WorkspaceAuthenticationServiceTest | 13 | Existing auth regression; disabled email/MFA retains actual missing proof; reenabling rejects bypass sessions; wrong passwords remain rejected. Mocked ports. |
| PaymentProcessorTest | 7 | Disabled provider makes no query/create/webhook observation; previously PAID work is finished without conversion/retry; existing uncertainty/expiry/callback behavior retained. Mocked gateway/store. |
| HexagonalArchitectureTest | 3 | Existing dependency-boundary rules pass. |
| RegistrationApiIntegrationTest | 4 | Existing registration HTTP/security regression with real test database; see integration receipt. |
| RegistrationPostgresIntegrationTest | 21 | Real persistence, all email/MFA combinations, actual proof and reenabling; see integration receipt. |
| PaymentOrderPostgresIntegrationTest, selected methods | 2 | Real bypass application/idempotency and external-evidence preservation; see integration receipt. |

Earlier focused backend runs passed (46 tests plus a separate 4-test API regression before the final two added regressions); these are historical attempts, not additional final coverage. Mockito self-attachment/ArchUnit synthetic-origin warnings did not fail checks. An earlier API fixture teardown emitted scheduled connection warnings after its container closed; its assertions and process exited successfully.

## Historical combined-working-tree frontend regression

From `frontend`, enforce one worker directly rather than relying on npm to forward CLI flags:

```powershell
node .\node_modules\vitest\vitest.mjs run --maxWorkers=1 src\features\guest\GuestRegisterPage.test.tsx src\features\guest\registrationApi.test.ts src\features\subscription\PlanCatalog.test.tsx src\features\subscription\PaymentStatusPanel.test.tsx src\features\subscription\subscriptionApi.test.ts
npm run build
```

Focused run: **5 files / 25 tests passed**, exit 0. These component/client checks include default verification flow, skipped-step progression, COMPLETE with a legitimate null email proof, development payment labeling and existing payment/client errors. Component test doubles are not real-adapter evidence.

Typechecked production build (`tsc -b` then Vite) and scoped `npm run lint -- <affected guest/subscription UI and system-test files>` exited 0. Non-blocking warnings: existing large frontend bundle and Fast Refresh mixed exports in `SubscriptionFeedback.tsx`.

Earlier attempts: the first worker startup timed out; a retry passed. A later concurrent run had one existing component test hit its 5-second limit. Serial rerun passed without changing that test's timeout. Those failures are not reported as passing runs.

## Acceptance mapping

| R1 criterion | Evidence |
| --- | --- |
| AC01 independent default-on configuration | Configuration checks, Spring/env/Compose wiring, real all-off runtime in system receipt |
| AC02 email bypass preserves null proof | Registration PostgreSQL mixed-combination checks; client parser regression |
| AC03 MFA bypass retains truthful assurance | Workspace auth/registration checks, real browser identity result |
| AC04 no provider calls, idempotent development application | Processor unit checks and two selected PostgreSQL checks |
| AC05 environment guard and reenabling | Configuration profile matrix; existing-session and real proof/enrollment regressions |
| AC06 UI progression and preserved authorization | Component/client checks and real browser unauthenticated/other-owner/wrong-password checks |
| AC07 required validation and evidence | This receipt, [integration](../integration/REQ-060-061-028-integration-flags-20261030.md), [system/manual checks](../system/REQ-060-061-028-integration-flags-20261030.md) |
