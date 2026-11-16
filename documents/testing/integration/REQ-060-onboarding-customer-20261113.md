# REQ-060: Registration contact and consent persistence

Date: 2026-11-13. FR-01.01/01.04. Real PostgreSQL 17.6 Testcontainers and real HTTP; no production or external inbox/payment claim.

## Final executed checks

| Class | Passed | Failures / errors / skipped | Exit |
| --- | ---: | --- | ---: |
| `com.adaptlearngraph.apis.RegistrationApiIntegrationTest` | 5 | 0 / 0 / 0 | 0 |
| `com.adaptlearngraph.repository.RegistrationPostgresIntegrationTest` | 23 | 0 / 0 / 0 | 0 |

These **28** tests are included in the exact 40-test backend run described in the [unit receipt](../unit/REQ-060-onboarding-customer-20261113.md); they are not added to it again.

## Verified behavior

- New signup rejects missing/false consent, missing/malformed phone and unknown country before creating any account.
- Valid country and formatted domestic/international phones normalize and round-trip through PostgreSQL, JPA projection, domain and full verified API view.
- The stored consent timestamp comes from the server's successful signup time. No client timestamp or invented legal document version is accepted.
- Existing nullable contact/consent records remain readable and can sign in; the migration performs no historical backfill.
- Existing email/TOTP/recovery, restricted/full sessions, account isolation, duplicate signup, slug reservation, rate limits and starter catalog persistence remain covered.
- Restricted verification-stage responses still withhold full registration fields.

Some scenarios deliberately simulate unavailable email delivery/retries and therefore log `MailSendException`; the final Surefire results contain no failures/errors/skips. Live SMTP inbox acceptance is not established by these tests.

## Runtime update

Docker daemon 28.1.1 and Java 21 were available. The existing isolated `alg-starter-r3` stack was retained; no data volume was deleted. Its workspace history was checked at V64, the image was rebuilt, and the forward-only V65 migration was applied. Only its API container was recreated. The API became healthy, the catalog GET returned 200, and the installed history reported V65.

V65 is identical in `db/migration`, `db/module-migration` and `db/workspace-migration`. It adds nullable country, normalized phone and form-consent timestamp columns without defaults or existing-row updates. The API uses the workspace lineage; the three different historical prefixes must not be mixed.

Actual system behavior and its remaining broader-suite issues are tracked in the [browser receipt](../system/REQ-060-onboarding-customer-20261113.md). The API, PostgreSQL and Neo4j on other ports were not replaced.
