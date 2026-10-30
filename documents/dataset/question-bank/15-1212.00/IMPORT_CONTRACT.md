# Official question bank import contract

Session1 Q1–Q5, 2026-10-22, followed by explicit user-authorized local cleanup/import. REQ-002-F01/F02 dependency; C and executable acceptance remain outside scope. [LOCAL_CUTOVER.md](LOCAL_CUTOVER.md) supersedes the original no-graph-write boundary and adds the following local seed exception.

## Source, scope and sizing

Select OCC-15-1212.00, Information Security Analysts, catalog 0.8.0: eight active Roles, 24 active Levels, 15 deduplicated required MicroSkills. Include every active HAS_ROLE/HAS_LEVEL/REQUIRES_SKILL path; retain Competencies/HAS_SKILL and teaching Modules as trace. No tenant permission inferred from global nodes. Original Session1 was graph-read-only; the later explicit cleanup replaced the exact backed-up legacy main graph using the existing official importer. The question-bank importer itself remains graph-read-only. NEEDS_EXPERT_REVIEW/null reviewer stays unchanged. Other four Occupations receive no bank.

Author 135 original English four-option/one-answer items: three EASY, three MEDIUM, three HARD per skill. Nine is release sizing, not a scoring policy, model minimum, level rank or IRT parameter. MCQ coverage does not certify practical competence. With a future model minimum m, a feasible maximum needs at least 15*m plus the model's own limits/eligible parameter supply. No numerical policy is selected here.

## Explicit local seed exception and actual readback

The subsequent user instruction excludes production bank CRUD/import authorization workflow from this task. `question-bank.import.local-seed=true` is default-off and allowed only with local/demo + question-bank-import and enabled=true, excluding prod. It checks the configured creator exists, is active and belongs to the configured active organization; no administrator role is required or granted in that mode. The normal default mode still checks persisted administrator role. All file/source/scope/target/identity/content/parity/transaction/conflict checks remain unchanged. No schema/DTO field added. No reviewer, model/parameter or PUBLISHED state fabricated.

Actual local target15432, existing creator/organization00000000-0000-0000-0000-000000000001: imported135 DRAFT versions, exact rerun0 new/135 existing; all fields read back equal manifest. Main graph exact official827/4536; PostgreSQLV22.51 of53 prior tables and all11 selection rows unchanged. Earlier blocked/Not run descriptions below refer to the original Session1 checkpoint; current manual evidence is linked from LOCAL_CUTOVER.md. Executable acceptance remains Planned/Not run.

## Field inventory before runtime edits

| Source / trusted value | Destination | Rule |
| --- | --- | --- |
| questionBank.id/name | question_bank.question_bank_id/name | Stable UUID/nonblank name; existing identity must agree |
| configured ownerAccountId | question_bank.created_by | Existing active creator in configured active organization; normal mode additionally requires System Administrator; explicit local seed mode uses existing account without granting/faking Admin |
| DB clock | question_bank.created_at | Default now(); never overwritten on rerun |
| itemVersionId/itemId/version | item_version identity columns | Stable UUIDs, integer >0; check PK and (item_id,version), prohibit cross-bank item identity |
| prompt | prompt | English nonblank original scenario |
| responseSchema | response_schema | SINGLE_CHOICE, exactly A/B/C/D, distinct nonblank texts |
| protectedKey | protected_key | Exactly correctOptionId, identifies one option; backend only |
| publicationState | publication_state | DRAFT only; this importer cannot publish |
| contentHash | content_hash | SHA256 of recursively key-sorted compact UTF-8 JSON: item without contentHash, plus questionBankId; preserve array order; no Unicode normalization |
| exact MicroSkill ID/name | micro_skill_id/micro_skill_name_snapshot | V8 direct string metadata; no UUID bridge or new graph property |
| difficulty | difficulty | EASY/MEDIUM/HARD, three each in v1 |
| manifestVersion/catalogVersion/sourceSha256/scopeSha256 | Import envelope/release sidecar | Not new entity columns |
| rationale, option explanations, primary citations, review | Authoring sidecar only | Never FE assets, Preview or Employee DTO |

Bank has no organization/version column. Tenant enforcement uses its creator's organization and trusted operation configuration; this grants no runtime Catalog permission. Item has no separate audit/reviewer columns. No migration required. Preserve V1–V22, historical nullable direct metadata, item_skill_mapping and dual readers.

## Ordered operation and failures

Separate offline `question-bank-import` profile, explicit enabled property, no web/Flyway. Normal/migrate startup cannot import. Operator config must supply manifest resource/version/byte SHA256, scope resource/byte SHA256, original ontology SHA256, Occupation ID, bank UUID, real owner/organization UUIDs and exact PostgreSQL JDBC URL. Resources restricted to file:/classpath:. No credentials/default owner bundled.

Strict JSON parsing rejects duplicate keys/unknown fields. Validate hashes, exact identities and all 135 shapes/full 15-skill coverage before writes. Read the flat official subset snapshot; compare all selected graph node/relationship properties, excluding export-only/null fields. Verify complete active membership and ownership, not only existence of skill names, inside one read-only transaction in configured database. Missing/unreachable/drifted/ambiguous graph fails; review metadata is compared, never promoted. Offline authoring can finish without live parity; import cannot skip parity.

Open one PostgreSQL transaction, assert target URL, lock bank scope, lock/recheck real administrator/account/tenant/role, preflight existing bank and item identities and every persisted JSON/hash/content field. Create only missing bank/items. Exact rerun writes nothing. Any mismatch, cross-bank identity, dependency/SQL/commit error rolls back the whole operation. No ON CONFLICT DO NOTHING, UPDATE, DELETE, graph write, publication, fake account/selection, IRT, Blueprint or learner/history write. New content requires a new item version and manifest release. A DRAFT manifest rerun against subsequently published rows conflicts; never implicitly unpublish. Concurrent identity collision rolls back; retry identical verified input after resolving cause.

Graph and PostgreSQL have no distributed transaction. Snapshot parity is checked immediately before DB work; future publication/admission must revalidate authoritative current release/permissions. Manifest version/hash is release/operator evidence, not a newly invented DB receipt. Item identities/hashes enforce per-item conflicts. Report aggregate bank/count/created-versus-existing only, never prompt/options/key/rationale. Unknown commit outcome: rerun identical verified input/owner, never generate new IDs.

## Acceptance-to-test mapping

| Rule | Planned evidence; executable scope remains Not run |
| --- | --- |
| Full union, exact IDs/version/review | Static package/snapshot/coverage; future real-adapter ownership/extra-edge/drift tests |
| Four options/one key, sources and rationale | Static shape/hash/source inspection; human expert review still Open |
| Tenant/admin/bank/URL boundary | Future foreign/inactive/revoked actor and wrong-target tests |
| Atomicity, rerun and conflict | Future real PG rollback/rerun/collision/commit-uncertainty and every-field conflict cases |
| Protected content boundary | Static assets/DTO inspection; future API/bundle assertions |
| Preserve pins/history/graph | Static write inventory; future DB readback/digest with read-only Neo4j credentials |

Main-only compilation/static observations are not executable acceptance; existing 39 IDs stay Planned/Not run. Production readiness needs Catalog review/release/permissions, content expert review/publication, Identity, approved model/calibration and C/D.

Confirmed | Proposed: no further decision needed for offline authoring | Provisional: AI technical review/editorial difficulty | Open: live/owner/tenant, expert/publication, C/D | Rejected: fake actor/reviewer, automatic IRT promotion, reduced union, graph reseed/history reset.
