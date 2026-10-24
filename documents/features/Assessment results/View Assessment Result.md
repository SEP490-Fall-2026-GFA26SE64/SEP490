# View Assessment Result

**Function:** REQ-009-F01. **Actor:** Employee. This contract defines the adaptive-baseline portion only. RIASEC/module publication, comments and scoring remain separately scoped; interest is not hard-skill mastery. [Complete Baseline](../Baseline%20knowledge%20assessment/Complete%20Baseline%20Assessment.md) defines scoring and [Role-to-baseline](../Target%20role%20selection/Role%20Selection%20and%20Occupation%20Baseline.md) defines profile coverage.

### Goal, actor and trigger

An Employee opens the result of an owned terminal attempt after completion or from history. Show what was actually assessed then; do not replace the immutable outcome with current mastery, a later Role or today's baseline version. Every new-format result covers the full pinned Occupation union regardless of selected Role. Legacy Role-specific results keep their original scope; their existing successful allowance remains consumed.

### Source → processing → storage → output

1. Read trusted Employee/organization and authorize the attempt scope. Client supplies only its returned attempt ID; actor/tenant/learner and calculated output are server-owned.
2. Query PostgreSQL by organization+learner+attempt ID and terminal state, joining the exact pinned Blueprint and immutable attempt/skill results. Never resolve current Catalog/configuration or trigger finalization on GET.
3. Return safe attempt/Occupation/original optional Role snapshots, terminal reason/times, replacement links, explanatory raw correct/answered score, conservative per-skill mastery and plain-language confidence. New full-Occupation skill names come from the deduplicated pinned union, including skills outside the entry Role; legacy reads retain original role restriction.
4. Keep theta/SE, point mastery, keys/correctness/responses/rationales, technical pins/parameters, internal scope enums and evidence/outbox/receipt internals outside Employee disclosure. Public scope wording must distinguish an earlier Role baseline from the new Occupation baseline without relabeling evidence. Public assessmentScope is OCCUPATION, EARLIER_ROLE or EARLIER_OCCUPATION; internal policy/pins remain private.

Reads write no attempt/revision/result/evidence/pointer/domain receipt. A successful display is not proof of delivered REQ-041 mastery/gap/pathway processing. Follow shared UI/tokens and natural EN/VI; Role remains provenance, not a new baseline section.

### Errors, dependencies and concurrency

| Branch | Expected result |
| --- | --- |
| No result/foreign learner/foreign tenant/nonterminal ID | Public not-found without leaking existence; do not finalize or invent score/mastery |
| Invalid identifier/wrong actor | Validate/deny with no data/state change |
| INVALIDATED no-mastery attempt | Show invalidation/replacement context; no fabricated skill mastery or default zero result |
| Terminal result becomes available during read | Coherent committed snapshot; retry the read if not yet available |
| Database/pinned projection failure | Explicit dependency error, not empty/zero score; retry GET only |
| Blueprint replaced/deactivated, Role renamed/changed | Recorded snapshots/results remain unchanged |

Identity supplies trusted authorization. Missing/ambiguous pinned projections fail explicitly; ownership predicates must never be removed. Implementation limits are recorded separately. Historical retention/deletion duration remains outside this scope.

### Acceptance and decisions

AB-R01–R05 in the [test plan](../../testing/REQ-002-adaptive-baseline-test-plan.md) cover authorized full/legacy/invalidated outputs, unknown/foreign/nonterminal IDs, dependency errors, immutable scope/names and no-state-change. These mappings are planned; actual execution evidence is recorded separately.

## Profile versus recorded result

An attempt result is its immutable historical outcome. My Mastery reads authoritative profiles with source attempt/version provenance; it must not replace or relabel that result. Reads never manufacture profile initialization. Later-learning updates and retention/publication rules for other assessment families require their own contracts.

## Alignment and open scope

[Synchronization review](../../testing/system/REQ-001-002-final-synchronization-review.md) records implementation/evidence separately. RIASEC/module result publication and AI-comment visibility, broader history filters/comparison/pagination and retention duration remain Open. Preserve original Role/date/result across changes; no indefinite retention policy is inferred.

Confirmed | Open: external integration and the separately scoped policies above | Rejected: history rewrite, raw score as mastery, protected-data disclosure or GET mutation.
