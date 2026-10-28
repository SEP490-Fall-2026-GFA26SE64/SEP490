# REQ-045: Provider Dependency Check

**Date:** 2026-10-22. **Scope:** approved payOS SDK addition and its resolved dependency subtree.  
**Contract:** [Subscription Lifecycle revision 3 amendment](../../features/Subscription%20lifecycle/README.md#revision-3-amendment-shared-json-dependency).

## Actual Procedure and Result

1. Added approved `vn.payos:payos-java:2.0.1` to the existing backend Maven manifest.
2. Ran `.\backend\mvnw.cmd -f .\backend\pom.xml dependency:tree "-Dscope=runtime"`: **Passed**, SDK resolved successfully at 21:49 +07:00.
3. Ran the available `appmod-cve-assessment` tool for the SDK and its 12 resolved coordinates: **Failed dependency check**, 11 reported advisories across two shared Jackson dependencies (five High, six Medium).
4. Checked [Maven Central BOM metadata](https://repo.maven.apache.org/maven2/com/fasterxml/jackson/jackson-bom/maven-metadata.xml): Jackson BOM 2.21.8 is published. Remediation initially paused for revision 3 approval.

The scan report is retained in the session artifact `payos-cve-report-1.json`. Dependency locations in the scanner output were empty despite input locations; the affected dependencies resolve through `backend/pom.xml`, including the new SDK subtree. Jackson was already a backend dependency. These findings do not establish exploitability in this application or prove that payOS introduced the underlying version.

| Dependency | Advisory | Reported severity |
| --- | --- | --- |
| jackson-databind 2.21.4 | [CVE-2026-54515](https://github.com/advisories/GHSA-5jmj-h7xm-6q6v) | Medium |
| jackson-databind 2.21.4 | [GHSA-mhm7-754m-9p8w](https://github.com/advisories/GHSA-mhm7-754m-9p8w) | Medium |
| jackson-databind 2.21.4 | [CVE-2026-59889](https://github.com/advisories/GHSA-5gvw-p9qm-jgwh) | Medium |
| jackson-databind 2.21.4 | [CVE-2026-77310](https://github.com/advisories/GHSA-vvgp-rfg2-7rr6) | Medium |
| jackson-databind 2.21.4 | [CVE-2026-19032](https://github.com/advisories/GHSA-wjgm-6hv5-3cvf) | Medium |
| jackson-databind 2.21.4 | [CVE-2026-68497](https://github.com/advisories/GHSA-q4xh-88c3-wmh7) | High |
| jackson-databind 2.21.4 | [CVE-2026-83557](https://github.com/advisories/GHSA-gx83-3vf8-gh7j) | Medium |
| jackson-databind 2.21.4 | [CVE-2026-91776](https://github.com/advisories/GHSA-wv8q-qhhj-9h54) | High |
| jackson-databind 2.21.4 | [CVE-2026-91777](https://github.com/advisories/GHSA-cxp5-3px4-pw24) | High |
| jackson-core 2.21.4 | [CVE-2026-89407](https://github.com/advisories/GHSA-p6pp-m3f8-5c89) | High |
| jackson-core 2.21.4 | [CVE-2026-89425](https://github.com/advisories/GHSA-7hhh-6rmp-j9qf) | High |

The other scanned coordinates were payos-java 2.0.1, okhttp/logging-interceptor 4.12.0, okio/okio-jvm 3.6.0, Kotlin stdlib/common/jdk7/jdk8 1.9.25 and jackson-annotations 2.21. No findings were reported for those coordinates in this scan; that is not whole-project security certification.

## Limits

This dependency check does not certify REQ-045 payment verification/application. A subsequent SDK adapter has [separate local verification evidence](REQ-045-payos-verification.md); runtime webhook processing/application remains unfinished. No live payOS acceptance or financial operation is certified. Live acceptance remains outside the approved local DoD, not Passed.

## Approved Remediation and Recheck

- User explicitly approved revision 3. Added `jackson-bom.version=2.21.8`; payOS SDK remains 2.0.1 and Spring Boot remains 3.5.16.
- Dependency resolution confirmed jackson-core/databind 2.21.8 and jackson-annotations 2.21. The second and final scoped advisory scans both returned **no known findings** for the same 12-coordinate subtree; reports `payos-cve-report-2.json` and `payos-final-cve-report.json` remain in session artifacts. No LLM-only fallback was used.
- The first combined regression run at 21:59 failed: 58 tests, 4 failures and 17 errors. Maven reported all classes up to date and reused an error-bearing compiled `JdbcRegistrationStore.lockEmail` method with an ambiguous JDBC callback overload. This was not silently counted as a pass.
- Made the JDBC callback type explicit, preserving the transaction advisory-lock behavior. Reran:

  `.\backend\mvnw.cmd -f .\backend\pom.xml "-Dtest=Subscription*Test,WorkspaceAuthenticationServiceTest,ScopedSessionCookieSerializerTest,Registration*IntegrationTest,DatabaseSchemaTest,HexagonalArchitectureTest" test`

  At 22:02:56 +07:00: **58 passed, 0 failures, 0 errors, 0 skipped**.

The 11 findings are resolved in the scoped dependency recheck. This is an implementation self-check, not an independent security audit or whole-project certification. All other unfinished lifecycle gates remain unfinished.
