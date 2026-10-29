# Workspace baseline and initial pathway integration

## Confirmed integration boundary

The current integration combines main `9b76905` with adaptive checkpoint `b2ed102` on Generate-Initial-Adaptive-Pathway. It retains REQ-001-F02, REQ-002-F01/F02, REQ-041-F02, REQ-042-F01, REQ-019-F01, REQ-020-F01/F02 and REQ-004-F01 behavior. The endpoint is the Employee's own Expert-approved pathway display. Learning execution, live readiness, content access and later mastery recalculation remain separate owner integrations.

Workspace authentication supplies the account, organization and single membership role. Every applicable request checks current membership/entitlement. The browser supplies Role/Level, command key and expected revision/hash, never actor/organization/grants/mastery. Cookie persona login is disabled in the shared workspace configuration. CSRF protection covers workspace mutations, including pathway commands. Query caches and pending UI commands are scoped to the authenticated account/organization/role and are discarded on identity changes.

Assigned review context uses the same-tenant workspace display name (or learner ID if missing), not account.identifier, which is an email in main. It does not expose email/contact data or credentials. Legacy demo label reads retain their original format in the separate legacy profile.

## Portable development fixture

The explicitly non-production `workspace-development` profile and `workspace.development-fixtures.enabled` property activate the deterministic Information Security fixture. Its accounts use the real password/session/membership paths. Its checked-in v0.11 catalog and 135-question bank retain their review state; synthetic model/parameter provenance remains explicit. Development-only eligibility adapters permit those exact artifacts for the configured development organization. They do not invent production reviewer identities/timestamps, publish the content, or imply a calibrated production model. Other tenants retain strict publication and operational-resource checks.

The fixture creates the development organization/workspace/entitlement, three real members (L&D Manager, Employee and Expert), bank ownership/resources and exact technical versions. Inserts are idempotent and reject conflicting identities/pins. It creates no Blueprint version/activation, selection, attempt, answer, result, mastery profile, pathway request/revision/approval or readiness PASS. L&D must Save/Preview/Activate, the Employee must complete the actual baseline, and Expert must inspect and approve an exact valid revision.

The development workspace grant is restricted to those three deterministic accounts and WORKSPACE access in the fixture organization, with current account/membership/role, ready workspace and suspension checks retained. It does not create a paid order/subscription period or grant billing/member-administration privileges. All other actors/organizations/actions use normal subscription entitlement. This fixture grant is gated by the non-production profile/property and must be replaced by actual subscription provisioning outside development.

Expert assignment remains a separately gated fixed development scope, restricted to that organization and configured Expert, with real membership/entitlement checks, bounded queue reads and exact persisted approval validity. It is not a production assignment/revocation adapter. Catalog release, semantic compatibility and planning availability/prerequisite definitions use the exact versioned development artifacts behind existing ports. Missing owner inputs deny or report unavailable; they never fall back to persona authentication. LiveReadiness and ContentAccess remain unavailable, so approved plans may show Modules with no learning entry.

## Persistence and compatibility

PostgreSQL owns identity, assessment, original mastery, selection, request/revisions/receipts/approval/audit/outbox. Neo4j owns catalog only. Full-Occupation baseline coverage, original evidence/pins, UNKNOWN reasons, exact 0..1 thresholds, no low-score retake, CAS/replay/fencing and read-only archive behavior are preserved. No development fixture is a production acceptance oracle.

Existing applied SQL is retained byte-exact. The new workspace deployment uses a separate Flyway location containing the main V1–V32 lineage and forward initial-pathway schema versions. It uses a new PostgreSQL volume; retained demo volumes/history are not migrated, reset or assigned to new accounts. Old database upgrades require a separate reviewed migration; Flyway repair/history editing is prohibited. No automatic database reset is part of startup. Rollback disables new admission/dispatch/mutations while retaining forward schema, both revision-format readers and immutable history.

This change targets shared development Compose. Production migration routing/cutover is not authorized or verified here; `compose.prod.yml` is retained from main and must not be used to infer compatibility with either retained or new development databases. A separately approved production migration plan is required before deployment.

## Acceptance and verification boundary

Keep the existing G01–G13, P01–P20, R01–R14 and E01–E09 mapping in the initial-pathway test plan and baseline RB/VB rules. Additional integration acceptance: fresh shared Compose wiring, real sign-in/out/expiry, server role/tenant/entitlement, CSRF rejection, no prior-account cache or pending commands, exact seed gates/provenance/idempotence, no seeded learner outcomes, and one handler/bean/actor path per configuration. Preserve the confirmed Expert queue/catalog/parallel-list layout and Employee Role+Level/roadmap/timeline/EN–VI behavior.

This integration is authorized for source changes, compile/build/type/lint. Executable tests and runtime startup/migration/seed execution are not authorized by this document. Current source integration is not a new passing runtime result or production readiness claim. Record actual verification and remaining limitations in dedicated testing evidence.

Confirmed: real-auth portable development slice, exact temporary assignment/planning fixtures and view-only endpoint. Open: production assignment/catalog semantics/readiness/content, runtime verification and separately approved C3 executable evidence.
