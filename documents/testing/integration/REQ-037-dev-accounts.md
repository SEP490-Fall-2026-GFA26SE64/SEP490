# REQ-037 — persisted dev identities

Date: 2026-10-29. Dedicated Compose `sep490-accounts-dev`; database `adapt_learn_graph_dev_accounts`, API28180. Existing legacy database preserved.

## Passed checks

- Actual Flyway latest version34; five persisted active accounts; four active company memberships with one role each; Platform Administrator has no organization/membership.
- Employee has non-null department/occupation references and learner state. Starter subscription activated through existing payment persistence with an explicitly synthetic local observation; no payment gateway or mail delivery.
- Seeding twice: still five identities and one DEV_ACCOUNTS_CREATED audit event. Existing matching credentials remain unchanged.
- `python3 tools/dev-accounts/verify.py`: five real password sign-ins, expected stages, authorization and logout passed. Platform reaches platform workspace API and is denied Module API. L&D/Expert/Employee receive workspace entitlement and Module session but are denied platform workspace API. Organization Administrator receives SETUP_MFA with no exposed role/identity until enrolled and cannot enter Module API. All ended sessions return401.

The first seed attempt failed a deferred Employee department/occupation constraint and rolled back completely. Required reference fixtures were added; no constraint was weakened. The initial verification incorrectly expected the admin role to be exposed before MFA; corrected to the existing empty-role enrollment contract, then all five passed.

This is real database integration acceptance on Compose, not a new Testcontainers run. Local fixture verification timestamps do not prove email delivery; synthetic PAID is not a financial transaction. Existing product tests are not relabeled as runs for this operation.
