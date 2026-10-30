# REQ-002 memory, source/document and schema synchronization

2026-10-23, Asia/Bangkok. User explicitly requested reviewing all `.project` and `s2 work`, removing completed/duplicate coordination material, keeping every bypass/replacement obligation, and checking current code/docs/PostgreSQL drawings. This authorizes this documentation review; no runtime implementation, database mutation, executable tests, stage, commit or push was performed.

## Result and scope

Current baseline/local-demo descriptions now match the inspected source/configuration and current V23 metadata. Earlier handoffs that still described V17, unapplied V23, pending common form/result integration or no demo model/set have been removed from current architecture/routers or explicitly labeled historical. Historical execution evidence, source releases, migrations, learner records and owner requirements remain unchanged.

This review covers REQ-002-F01/F02 and REQ-009 result/history integration, related REQ-001/REQ-041 boundaries and the full PostgreSQL structural inventory. It does not certify implementation of every drafted Function, real production authorization, numerical validity, rendered-browser behavior or executable acceptance. Wider Catalog/RIASEC/gap/pathway/Identity requirements remain with their owners.

## Coordination cleanup and recovery

Before modification,535 files across `.project`, `s2 work` and product `documents` were copied and SHA-256 verified. Recovery: workspace `.tools/memory-schema-sync/20261023/before`, with `backup-manifest.json` and initial Git HEAD/status/index alongside it. Recovery copies were verified again at final review. Original DOCX/PDF/research inputs, prior cutover/merge/demo backups, release artifacts and all learner history are retained.

The active coordination inventory decreased from44 to38 files. Markdown content decreased from about514KB to124KB (about76%); retained research/source documents account for much of the remaining size. [Exact inventory, hashes, changed files and artifact checks](REQ-002-memory-schema-sync-observation.json).

Deleted only these six exact backed-up completed/duplicate files; no recursive directory deletion:

- `s2 work/Ongoing Plan/ADAPTIVE_BASELINE_CONFIRMED_UPDATES.md`
- `s2 work/Ongoing Plan/CLUSTER_2_ADAPTIVE_BASELINE_IMPLEMENTATION_PLAN.md`
- `s2 work/Ongoing Plan/CODEX_PROMPT_RESUME_MAIN_MERGE.md`
- `s2 work/Ongoing Plan/OFFICIAL_QUESTION_BANK_C_D_PLAN.md`
- `.project/requirements/complete/CROSS-CUTTING-temporary-implementation-register/2026-10-06-task.md`
- `.project/requirements/active/CROSS-REQ-system-direction/2026-10-06-product-doc-realignment.md`

Compacted CURRENT, active assessment task, decision ledger, temporary registry, implementation snapshot and the sole Vietnamese progress file. Corrected stale REQ-001 seed/guard/test-gate descriptions and research locations. Preserved the user-maintained model reference tables; removed obsolete copyable session prompts. `CODEX_PROMPTS_QUESTION_BANK_C_D.md` remains a short compatibility redirect because historical Session2 evidence links to it. No retired A7/AB/B9 checklist was recreated.

## Preserved bypasses and source alignment

All TMP-REQ002-01..12 IDs and TMP-REQ001-01..06 remain registered, including retired implementations. Current [demo contract](../../technical/baseline/Local%20Demo%20Flow.md) and workspace `.project/temporary/REQ-002-003-009.md` retain gate, consumers, owner/replacement, protected history, rollback and future verification.

| Reviewed source/contract | Current alignment or explicit gap |
| --- | --- |
| Compose, demo configuration/controller/identity | API profiles local,local-baseline-demo; demo enabled+!prod; allowlisted server persona mapping/cookie. No-cookie defaults to L&D. Blueprint actor uses active=true/static role/Occupation grants without live Identity account/grant/revocation lookup. This is an explicit bypass, now documented accurately. |
| Employee LocalAdaptiveAttemptContext | Separately reloads persisted active account/EMPLOYEE role/org; owned-attempt/tenant queries retained. This does not make the demo cookie real authentication. |
| Demo catalog/eligibility/preview/content/scoring ports | Explicit primary routing permits exact unreviewed ACTIVE graph/DRAFT content. Normal constructors retain stricter review/PUBLISHED checks. Official bank/source review is not mutated. |
| Technical selection/provisioning | Demo findEffective accepts only fixed org/bank/model/mapping and calls exact findPinned.135 fitted SYNTHETIC parameters/reference policy use V18 SEEDED/PROMOTED storage eligibility; no actual-pilot run, real approval, V23 operational selection or receipt. Provisioning checks specific hashes/config/identity/set metadata/count, not every existing parameter value. |
| Adaptive domain/resolver/result query and V20-V22 | New versions/starts use FULL_OCCUPATION_V2/common bounds/full union. Legacy readers retain original Role/exploration pins; full-result names use full pinned union. No reset/repin/rescore. |
| App routes/layout/panel | One adaptive baseline route and existing aliases; visible demo panel; common form/lifecycle/results source exists. Browser/render/keyboard/responsive remains unverified. |
| Legacy authoring/answer reveal/operational C | Explicit gates remain off. Retained shared/module/RIASEC/REQ-001/history consumers are not blanket-deletion targets. Admin demo has no calibration UI. |
| REQ-001 assessment guard | Real PostgreSQL organization+learner-scoped IN_PROGRESS query replaced the boolean runtime bean. Compose still passes unused TARGET_SELECTION_LOCAL_ASSESSMENT_IN_PROGRESS; it has no runtime guard consumer. No config/code change in this review. |
| Numerical/downstream contracts | Finite-grid MAP/local Laplace uncertainty limitations retained; actual-pilot/numerical acceptance open. REQ-041 initialization consumer/delivery and downstream demo exclusion are not integrated; do not fabricate delivered_at/processing receipts/BKT or relabel demo evidence as real. |

Replacement owners remain explicit: Person1 Identity/session/grants/revocation; Person2 Catalog visibility/publication/release/discovery/REQ-001 references; content/model owners reviewed publication, approved real versions and actual-pilot dataset/numerical policy; Person3 operational C port integration; REQ-041/downstream delivery and demo-data exclusion. Selected-role entry is still a dependency; walkthrough uses direct Occupation exploration. SRSv2 actor/SaaS/S2-S4 conflicts remain open, not silently adopted.

## PostgreSQL current version and drawings

Read-only metadata observation: PostgreSQL17.6, public Flyway history V1-V23 all successful. All23 source checksums match history;38 protected migration/release source SHA-256 values match the prior Session3 preservation manifest. No migration upgrade was needed or performed.

The single repeatable-read READ ONLY catalog snapshot contains86 platform tables/703 columns/610 constraints, including185 foreign keys (172 distinct parent/child pairs),207 indexes,97 user triggers and39 functions. Public Flyway metadata is outside those86 platform tables. No account/answer/business data rows or credentials are included. One check remains explicitly `NOT VALID`: `baseline_adaptive_blueprint_version.occupation_baseline_name_time_limits`, matching unchanged V21 source; this review does not validate historical rows or alter that constraint.

[Current diagrams and reproduction commands](../../diagrams/README.md) include an overview plus six detail groups owning17+32+13+9+9+6 tables. Sources/SVGs replace the old V17 drawings; all703 column labels/types/nullability/PK/FK markers were checked against the captured catalog. External parent stubs expose cross-group references; [all185 FK definitions](../../diagrams/postgresql-foreign-keys.md) preserve composite constraints. [Metadata catalog](../../diagrams/postgresql-schema-catalog.json) also records defaults/checks/indexes/trigger/function definitions and migration hashes.

All seven PostgreSQL SVGs and corrected runtime topology rendered successfully with local PlantUML1.2025.10/Smetana; PNG previews were visually inspected. No blank/error image or missing column was found. The32-table legacy/shared SVG is dense and intended for zoom; new adaptive views are separated. The superseded20 October target remains explicitly historical. Neo4j ontology0.8.0 fields/drawing were preserved; no fresh full graph readback is claimed.

Renderer: [official pinned release](https://github.com/plantuml/plantuml/releases/tag/v1.2025.10), downloaded into the workspace; SHA-256 `4a01ea09b317180fb8e7eef712dfdca725409d2ee1919e4b5adfe9d8362b6fe5`. Rendering runs locally; no schema is uploaded to a rendering service.

## Commands, checks and remaining work

Actual commands: read-only `docker compose ... exec -T postgres psql -X -qAt ...` for version/history; `python documents/diagrams/Generate-PostgresqlDiagrams.py` for one READ ONLY catalog transaction/source checksum comparison; local `java -jar ... -failfast2 -tsvg` and `-tpng` on explicit diagram paths. Artifact validation checked exact group/column coverage, SVG XML/text, local Markdown targets, recovery hashes and protected source hashes. `git diff --check` returned0; index remains empty. These are documentation checks, not executable product tests.

Git at review: branch REQ-002-Baseline-Knowledge-Assessment, HEAD70679bb43e1798f1235a17d6a9a843701e76a796. Existing dirty/untracked runtime/test work was preserved; this review changes only coordination/documentation and diagram-generation artifacts. No stage/commit/push, stack restart, import, migration, account/attempt write or reset.

Next visible step: user follows the [updated full walkthrough](../../../../../s2%20work/Test%20Guides/REQ-002-F02-full-walkthrough-test-guide.md) and records actual UI behavior. Real owner integration and separately approved Cluster3 AB/QBI/C/DEMO/legacy/numerical/concurrency verification remain open. Roll back the demo by disabling its profile/property/FE flags and rebuilding while preserving schema/volumes/provenance/history; no down migration, restore-over-live or history deletion.
