# Multi-organization workspaces: integration evidence

Date: 2026-11-02. Scope: FR-01.04 / FR-07.03 (legacy REQ-060-F04 / REQ-061-F01) and FR-07.01 organization isolation. Real PostgreSQL 17 and Neo4j 5.26 through Testcontainers; no mocked persistence. See also [unit/API/frontend](../unit/REQ-060-061-multi-org-workspace-20261102.md) and [system](../system/REQ-060-061-multi-org-workspace-20261102.md) evidence.

Command, from `backend`: `.\mvnw.cmd -B clean verify`. Final run: **659 tests, 0 failures, 0 errors, 0 skipped**, BUILD SUCCESS (18:37 min). A first full run before the late routing/CSRF fixes also passed (658 tests).

| Test class | Result | Covers |
| --- | --- | --- |
| `WorkspaceCatalogImportNeo4jIntegrationTest` (new) | 2 passed | Two organizations copying the same template get independent node ids and edges owned by themselves; repeating the copy is idempotent; each organization reads only its copy. The worker copies and succeeds, rejects selections that are no longer valid, retries and finally fails. |
| `RegistrationPostgresIntegrationTest` | 22 passed | Added: the catalog selection is stored with the registration; invalid selections create no registration. |
| `PaymentOrderPostgresIntegrationTest` | 27 passed | Added: with a selection, provisioning enqueues the import and the workspace stays PROVISIONING until the copy succeeds (READY) or fails (FAILED, `CATALOG_IMPORT_FAILED`); identity exposes `workspaceSlug`. |
| `TargetRoleAndMicroSkillNeo4jIntegrationTest` | 1 passed | A second organization's role and skills use its own nodes; relationship owners are that organization (previously edges could link by code across organizations). |
| `ModuleAuthoringIntegrationTest` | 2 passed | Published modules keep `organizationId`; teaching links and catalog reads are organization-scoped. |
| `QuestionBankPersistenceIntegrationTest` | 1 passed | Question-bank skills resolve only inside the organization. |
| `MergedMigrationLineageIntegrationTest`, `BaselineAssessmentPostgresIntegrationTest`, `InitialPathwayAdapterIntegrationTest`, `WorkspaceBaselineResourcesIntegrationTest` | 5, 7, 6, 1 passed | V47 applies in all three lineages (`db/migration`, `db/workspace-migration`, `db/module-migration`) on top of existing histories. |

Remaining boundary: the legacy test Neo4j constraints still enforce globally unique TargetRole/MicroSkill/MacroCompetency `code`; the production v0.11 graph only enforces id uniqueness, which the copy relies on. Code collisions on later role edits still use the existing global suffixing behavior.
