# View Assessment History

**Function:** REQ-009-F02. **Actor:** Employee. This contract defines the adaptive-baseline portion only. RIASEC/module publication, comments and scoring remain separately scoped; interest is not hard-skill mastery. [Complete Baseline](../Baseline%20knowledge%20assessment/Complete%20Baseline%20Assessment.md) defines scoring and [Role-to-baseline](../Target%20role%20selection/Role%20Selection%20and%20Occupation%20Baseline.md) defines profile coverage.

### Goal, actor, trigger and inputs

An Employee opens own baseline history to find recorded terminal attempts/results and invalidated replacement chains. Client sends only supported safe query parameters; trusted server context supplies actor/organization/learner. Choosing another Role inside the Occupation does not create another baseline entitlement or restrict history to the latest Role. One stable Occupation baseline may have invalidated predecessors plus its sole mastery-producing completion; those are distinct attempts, not separate Role baselines.

### Ordered read and output

1. Authenticate/reload authorized Employee and apply organization+learner predicates before filtering, ordering or counting.
2. Read terminal PostgreSQL attempts and exact pinned/immutable result snapshots, including both historical role-scoped and new full-Occupation attempts. Never replace historical rows with current Blueprint/current mastery or read another employee's chain.
3. Return recorded Occupation/optional Role, attempt state/reason, server start/completion times, safe raw/mastery/confidence summary and owned predecessor/successor links. Apply the result disclosure allowlist; an invalidated attempt has no invented mastery.
4. Public scope wording reflects actual recorded scope: new full-Occupation versus earlier Role-specific/earlier union scope. The selected Role does not filter new full-union skill names. No rescore/relabel/reset and no need to reactivate an old Blueprint to view its result.

Baseline history returns terminal attempts by completion time descending, with stable attempt-ID ties. IN_PROGRESS resume belongs to REQ-002-F01. Bounded pagination and broader filtering remain separate open design work; Blueprint pagination does not implicitly approve history controls.

### Read guarantees and error branches

| Branch | Outcome |
| --- | --- |
| Authorized learner with no terminal attempts | Helpful empty list, no fabricated attempts or writes |
| Wrong actor/tenant or tampered scope | Deny without counts/names/results leakage |
| Terminal/replacement added concurrently | One coherent committed query snapshot; next refresh may show new row, no duplicate identity |
| Storage/projection unavailable | Explicit retryable read error, not falsely empty history |
| Old/current Role/Blueprint renamed, deactivated or replaced | Recorded row/date/scope/result retained; read requires no current Catalog readiness |
| Invalidated chain / completed legacy Role A | Show chain without fabricating evidence; preserve existing successful Employee+Occupation allowance |

GET changes no attempt/result/receipt/audit-domain event/pointer/outbox delivery and never finalizes expired attempts. No protected answers, per-response correctness, theta/SE, parameters, internal scope enums or foreign IDs. No baseline localStorage history source. Production Identity, retention duration and broader history comparison/filter policies remain dependencies.

### Acceptance and decisions

AB-R01–R05 in the [test plan](../../testing/REQ-002-adaptive-baseline-test-plan.md) map full/legacy scope, own/foreign/empty/error reads, stable original dates/results, replacement linkage, and no-state-change. These are planned evidence, not execution results.

## Profile versus recorded result

An attempt result is its immutable historical outcome. My Mastery reads authoritative profiles with source attempt/version provenance; it must not replace or relabel that result. Reads never manufacture profile initialization. Later-learning updates and retention/publication rules for other assessment families require their own contracts.

## Alignment and open scope

[Synchronization review](../../testing/system/REQ-001-002-final-synchronization-review.md) records implementation/evidence separately. RIASEC/module result publication and AI-comment visibility, broader history filters/comparison/pagination and retention duration remain Open. Preserve original Role/date/result across changes; no indefinite retention policy is inferred.

Confirmed | Open: external integration and the separately scoped policies above | Rejected: history rewrite, raw score as mastery, protected-data disclosure or GET mutation.
