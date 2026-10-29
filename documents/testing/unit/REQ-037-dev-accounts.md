# REQ-037 — local dev account seed guards

Date: 2026-10-29. Operational local fixture support for existing single-role identity; no product auth or frontend UI changes.

- Executed standalone seed with `DEV_ACCOUNTS_SEED_ALLOWED=false`: refused before database access. Passed.
- Inspected packaged application JAR: no DevAccountsSeed, SubscriptionTestRuntime or ModuleWorkspaceTestFixtures classes. Passed.
- Python tooling syntax compiled and private configuration/credential paths verified ignored by Git. Passed.
- Backend clean-snapshot Maven package with test compilation and `-DskipTests`: passed; this is compilation evidence, not a unit-suite execution.

No new mocked unit suite or unrelated product test rerun is claimed. Real schema, repeatability, identities and permissions are covered in [integration evidence](../integration/REQ-037-dev-accounts.md).
