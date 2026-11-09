# FR-02.01 / REQ-064: organization directory persistence/API evidence

## 2026-11-04 execution

Environment: Windows, Java 21.0.6, Docker Desktop Linux engine 28.1.1, disposable PostgreSQL 17.6-alpine Testcontainers, real Flyway migrations, JPA repositories and HTTP sessions/CSRF. No development database was reset.

| Acceptance | Test/scenario | Expected and observed | Result |
| --- | --- | --- | --- |
| AC-01/02/03/07/08 | `SubscriptionPlanApiIntegrationTest.platformDirectoryExposesOnlyProvisionedRowsAndCurrentAdministratorAssignments` | Organization with no workspace excluded; distinct current administrator profiles/emails and inactive assignment flags remain organization-scoped; no subscription/current period represented truthfully; directory is no-store and omits payment history/credentials | Passed |
| AC-04/08 | Same authenticated API scenario | Anonymous directory 401, organization user 403, foreign workspace suspension 403, platform identity still denied tenant-only billing; missing CSRF 403; missing/null suspended intent 400 with unchanged state | Passed |
| AC-04 | Same API scenario | Suspend and reactivate persist, retain READY setup, and append the two expected trusted audit actions | Passed |
| AC-04/07 | `PaymentOrderPostgresIntegrationTest.platformDirectoryUsesPurchasedPlanPeriodsWithoutConflatingSuspensionAndExpiry` | Paid plan name/start/end round-trip; administratively suspended workspace still has ACTIVE paid coverage; exact period end yields EXPIRED and null current while suspension remains | Passed |
| Regression | Remaining cases in `SubscriptionPlanApiIntegrationTest` and `PaymentOrderPostgresIntegrationTest` | Existing identity/profile, plan ownership, subscription/seat/concurrency/payment-replay/rollback/renewal and suspension boundaries preserved | Passed |

Actual command from repository root:

```powershell
.\backend\mvnw.cmd -f backend\pom.xml '-Dtest=SubscriptionMappingsTest,PlatformWorkspaceDirectoryTest,SubscriptionAccessPolicyTest,LayeredArchitectureTest,SubscriptionPlanApiIntegrationTest,PaymentOrderPostgresIntegrationTest' test
```

Exit **0**. Authenticated API suite **6 passed**; payment/workspace persistence suite **30 passed**; **36 real API/integration checks total**. They are included in the combined **57 passed / 0 failed / 0 errors / 0 skipped**, not additional to it. Unit/architecture coverage is separated in [unit evidence](../unit/REQ-064-manage-organizations-20261104.md).

Fixtures use independent account/organization UUIDs and current stored role assignments. Positive paid-period assertions use actual stored purchased terms and payment application, not UI prototypes or manufactured review metadata. Directory queries load only required period display fields and administrator projections in batches; they do not call tenant billing/member endpoints or read each organization's full payment history.

Raw reports: `backend/target/surefire-reports/TEST-com.adaptlearngraph.apis.SubscriptionPlanApiIntegrationTest.xml` and `backend/target/surefire-reports/TEST-com.adaptlearngraph.repository.PaymentOrderPostgresIntegrationTest.xml`.

The log contains expected injected rollback/mail-delivery errors. It also contains an existing scheduled-session cleanup connection error after the API test's disposable database stops; Surefire reports no test errors. No unrelated teardown code was changed.

Scope: no schema migration, Neo4j data change, profile-edit implementation, live payment/email operation or production readiness claim. Browser behavior and the manual checklist are recorded in [system evidence](../system/REQ-064-manage-organizations-20261104.md).

## 2026-11-06 upstream synchronization

Updated to upstream `888cd27c` and reapplied the feature with a clean three-way merge. The same combined backend command above exited **1**: **55 passed, 2 failed, 0 errors, 0 skipped**. Both failures are in existing department-reference authorization regressions:

- `PaymentOrderPostgresIntegrationTest.userEditPreservesHistoricalAssignmentsButRejectsForeignNewReferencesAndLastAdminRemoval`
- `PaymentOrderPostgresIntegrationTest.memberInvitationAndActivationStayInsideTheInvitingOrganization`

Both expected `SubscriptionFailure` but received `DataIntegrityViolationException` from department/organization foreign-key constraints. A separate detached worktree at untouched upstream `888cd27c` reproduced both failures with:

```powershell
.\backend\mvnw.cmd -f <upstream-worktree>\backend\pom.xml '-Dtest=PaymentOrderPostgresIntegrationTest#memberInvitationAndActivationStayInsideTheInvitingOrganization+userEditPreservesHistoricalAssignmentsButRejectsForeignNewReferencesAndLastAdminRemoval' test
```

Baseline result: **2 failed / 0 passed**, exit **1**, same exception/constraint failures. The directory's new tests, authenticated API suite and architecture checks passed in the merged run. These upstream defects were not changed as part of this directory feature. The user explicitly authorized commit/push with these known upstream failures on 2026-11-06. This is not a green full-backend verdict; the 4 November passing run remains historical. Browser tests were not rerun for this synchronization.
