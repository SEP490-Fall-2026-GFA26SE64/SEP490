# Local development accounts

This provisions five real-password identities in a dedicated **local-only** database. It never upgrades the old module-authoring-test database, changes product authentication, disables MFA or sends a real payment/email. Synthetic verified-email and paid-subscription records are explicitly local fixtures.

| Role | Email | Boundary |
|---|---|---|
| Platform Administrator | platform.admin@example.test | Platform, no company membership |
| Organization Administrator | org.admin@example.test | SEP490 Development Workspace; enroll MFA on first login |
| L&D Manager | ld.manager@example.test | Same development workspace |
| Domain Expert | expert@example.test | Same development workspace |
| Employee | employee@example.test | Same workspace; required department/occupation reference and learner state |

Passwords are independently generated once in ignored `local/dev-accounts/private.env`. The private sheet is `local/dev-accounts/ACCOUNTS.md`. Never commit either file; preserve them when restarting so encryption keys and credentials remain valid. Repeated seeding verifies matching credentials/roles without resetting passwords, MFA, subscription or history. Conflicting/partial accounts fail without overwrite. Existing synthetic subscription terms expire normally and are not renewed by rerunning seed.

## Prepare and start

Requirements: Java/JDK21+, Python3, Maven wrapper prerequisites, Docker with the project's existing `adapt-learn-graph-backend:dev` JRE image, PostgreSQL17.6 and Neo4j5.26 images. No image is built by these commands. The `prepare` command compiles a clean isolated source snapshot with tests skipped; it is not a test pass. Stop the dedicated API before replacing its JAR during subsequent backend builds.

From repository root:

```sh
python3 tools/dev-accounts/accounts.py prepare
docker compose --env-file local/dev-accounts/private.env -f compose.accounts-dev.yml up -d
# Wait for API startup / Flyway V34 before seeding.
python3 tools/dev-accounts/accounts.py seed
python3 tools/dev-accounts/verify.py
```

From `frontend`, using Node24 and installed lockfile dependencies:

```sh
API_PROXY_TARGET=http://127.0.0.1:28180 npm run dev -- --host 127.0.0.1 --port 8088 --strictPort
```

Open http://localhost:8088/login. API28180 and PostgreSQL28132 bind to loopback; Neo4j HTTP28174/Bolt28187 also bind to loopback for local inspection. Persistent volumes are owned by `sep490-accounts-dev`. Ordinary `docker compose ... stop` preserves them; do not remove volumes if keeping accounts/data.

Organization Administrator must use the normal Set up authenticator/Confirm authenticator flow and save recovery codes. The verification script expects initial MFA enrollment to remain pending; after enrolling, its admin-stage assertion needs a user-provided MFA flow instead of rerunning the first-login assertion. No TOTP secrets are preseeded and no assurance flag is fabricated.

## Scope and limitations

This creates account, membership, profile, learner-state, department/occupation reference, registration, workspace, subscription/payment snapshot and audit records using current schema and existing password/payment persistence. The seed class lives only under backend test sources and is not in the application JAR. It requires an explicit flag and the exact dedicated loopback database name; production/legacy URLs are rejected. No public test fixture API is enabled in the running application.

The occupation reference is an activation fixture, not a Neo4j catalog import. The local Module handover copied the legacy catalog graph and Module workflow snapshots; other PostgreSQL feature stores such as question banks were not migrated. Future catalog imports and feature-specific test data remain separate tasks. Startup uses the normal application with real workspace login, not SubscriptionTestRuntime. This environment does not make unfinished feature pages production ready.

[Verification/manual checklist](../../documents/testing/system/REQ-037-dev-accounts.md).

## Existing Module handover

The user-approved local snapshot is kept privately as legacy-graph-snapshot.json and legacy-module-snapshot.json. copy_catalog_snapshot.py accepts only an empty or exactly matching dev graph and compares every property/edge; it refuses to overwrite later changes. adopt_modules.py runs the test-source DevModulesAdoption CLI on the exact dedicated database. It preserves source revisions/decisions, assigns existing Module documents to expert@example.test, and records migration events; new catalog drafts are received using the existing service with source-derived occupation coverage through Occupation→TargetRole→Level→MicroSkill. One PostgreSQL transaction protects the first handover; a receipt prevents overwriting subsequent work. Repeating adoption only restores missing original pending-assignment history if needed. These are explicit operational commands, never startup jobs/public endpoints.

The canonical frontend is now http://localhost:8088. The five credentials stay the same; sign in again on the new host. Module ownership uses real sessions and createdBy; peers have read-only access and the same-occupation grant does not authorize edits.

## Learning Content local services

Learning Content adds V35 (lessons/assets/settings/progress/import/manual assignment/notifications), V36 (legacy Markdown lesson representation) V37 (fractional video duration) and V38 (separate watched-coverage clock). Original credentials, module histories and volumes are retained. `prepare` generates private MinIO credentials if absent; it does not reset existing ones.

The normal dev Compose includes a private MinIO service and Mailpit capture. Upload settings are at `/platform-admin/learning-upload-settings`; captured test emails are at http://localhost:28125. Registration/payment mail workers remain disabled. Learning emails go only to this local SMTP capture.

If upstream MinIO image retrieval is unavailable, use the same MinIO server built from its official tagged source, without an image build or system-wide toolchain installation:

```sh
python3 tools/dev-accounts/build_minio.py
docker compose --env-file local/dev-accounts/private.env -f compose.accounts-dev.yml -f compose.learning-source-dev.yml up -d
```

This fallback is for local development. It retains the binary, license and build receipt in ignored `local/dev-accounts/minio-build/`; temporary compiler/source caches are removed after compilation. It needs a supported macOS/Linux host and network access to official Go/GitHub sources. No uploaded asset or database is removed. Use both Compose files for subsequent restarts when using this fallback; using only the primary file requests the upstream image again.

Expert module management reuses the current workspace and adds expandable import/confirmed-pathway sections. Employees use `/employee/pathway` and `/employee/modules/:moduleId` with persisted assignments and progress. Module assessments/AI pathway generation remain separate. Unconfirmed-upload assets are currently retained: no automatic deletion policy is enabled.

R4 keeps the same accounts/services: new Module/content authoring and Excel/ZIP import do not require Occupation grants. Legacy catalog intake remains a separate workflow. L&D revision details show numbered lessons, and the existing session adapter revalidates async private-media dispatch. [Current manual checks](../../documents/testing/system/REQ-013-learning-content-R4.md).
