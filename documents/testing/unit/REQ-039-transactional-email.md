# REQ-039: Branded Transactional Email and Payment Metadata

**Date:** 2026-10-26. **Scope:** approved onboarding/billing refinement R1; REQ-039-F01 and related REQ-028/045/060. Local verification only.

## Executed checks

From the repository root:

```powershell
.\backend\mvnw.cmd -f backend\pom.xml '-Dtest=TransactionalEmailTest,PaymentProcessorTest,PayOsPaymentGatewayTest,PaymentOrderPostgresIntegrationTest,RegistrationPostgresIntegrationTest,RegistrationApiIntegrationTest,HexagonalArchitectureTest' test
```

**Passed, exit 0: 78 tests, zero failures/errors/skips.** Includes integration checks; these are not 78 additional unit-only tests. Surefire evidence is in `backend/target/surefire-reports`.

| Acceptance | Executed assertion | Result |
| --- | --- | --- |
| R1 AC-03 | HTML escaping, brand frame, safe action URL, plaintext alternative, MIME multipart/alternative and event header | Passed |
| R1 AC-06 | Actual SDK outgoing JSON contains purchased plan item, quantity one, exact price and nine-character plan marker/order-suffix memo | Passed |
| R1 AC-06 | Long/Unicode package names remain intact in items while transfer memo stays ASCII and bounded | Passed |
| R1 AC-06/07 | Processor retains same order/deadline, passes immutable purchased name and uses order-specific result callback | Passed |
| R1 AC-08/09 | See [PostgreSQL notification evidence](../integration/REQ-039-payment-notifications.md) | Passed |
| R1 AC-10 | Existing authentication/registration API/persistence tests and three ArchUnit rules | Passed |

From `frontend`:

```powershell
npm.cmd test -- src\features\guest\GuestRegisterPage.test.tsx src\features\guest\registrationApi.test.ts src\features\subscription src\features\administration\user-management\UserManagementPage.test.tsx
npm.cmd run build
npm.cmd run lint
```

**Passed, exit 0:** 29 component/API tests in six files; TypeScript/Vite production build; lint. Existing unrelated lint warnings and the large-bundle warning remain; this is not a warning-free repository claim.

Tests cover separated organization/account entry, no early registration command, retained Back navigation, inline invalid-field state and focused summary, backend field-error navigation, nullable fields, truthful payment/setup states, existing administrator operations, required order-code/nullable confirmation mapping and the existing authorized Administrator receipt endpoint.

## Failure history retained

- Initial focused backend run: 51 passed / one failed callback assertion; updated the test's old checkout expectation to the new result route.
- Notification integration exposed use of nonexistent `account.email`; corrected to the actual account `identifier`. The notification retry/recipient/database suite then passed all 21 tests.
- Intermediate frontend compilation found a misplaced JSX provider close and a Testing Library-only option mismatch; both corrected before passing build/tests.
- Final combined backend run above passed all checks. Transient shutdown logs from a closed Testcontainer do not alter the reported exit code/counts.

No dependency, schema, live email or real-payment changes were performed to make these checks pass.
