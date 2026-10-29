# Planned initial gap/pathway flow, states and data

Updated2026-10-28. **Confirmed design; scoped C2 source/build exists, not deployed/runtime-verified schema.** Mermaid requires a supporting viewer; no live DB image/rendering/runtime success claimed. [Canonical policy/design](../technical/initial-pathway/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md#14-confirmed-catalog011-policy-and-implementation-contract--2026-10-28) and [source/build receipt](../testing/system/REQ-041-042-v011-source-build.md).

## Product and algorithm flow

```mermaid
flowchart TD
    E["Employee chooses Role then Level: distinct target pair"] --> G["Read-only selected-Level gaps / UNKNOWN"]
    G --> C["Explicit confirmation: revalidate input + selection guards"]
    C --> T["PostgreSQL: request / frozen input / receipt / outbox"]
    T --> W["GENERATING: batch related Neo4j subgraph"]
    W --> F["Eligibility + per-pair focus / difficulty + real readiness definitions"]
    F --> R["Need first; own mastery chooses LOW / MEDIUM / HIGH; UNKNOWN stays null"]
    R --> S["Whole-path objective: fallback quality, unique minutes / price, Supporting benefit, count, IDs"]
    S --> D["Selected module dependency graph + internal gates"]
    D --> O["Topological order + full validation"]
    O -->|valid current and optimum proved| P["AWAITING_EXPERT_REVIEW: immutable proposal + separate warnings"]
    S -->|budget exhausted before proof| B["SEARCH_LIMIT / NOT_PROVEN: no published valid proposal"]
    O -->|missing / cycle / infeasible| U["UNRESOLVED: diagnostic reasons, no learning"]
    T -->|confirmed snapshot: all mandatory known / gap 0| N["NO_LEARNING_REQUIRED: no fabricated completion"]
    P --> X["Authorized Expert: assignment owner or explicitly scoped local substitute"]
    X --> V["Include / exclude: validate fixed module set, warnings, prerequisites and order"]
    V -->|unresolved draft| X
    V -->|valid current exact revision| A["Expert confirmation: approval binds revision + hash"]
    A --> L["Employee: approved ordered pathway"]
    L --> K["Server access gate: approval + permissions + readiness PASS"]
```

## Sequence and transaction boundary

```mermaid
sequenceDiagram
    actor Employee
    participant API as Java API / trusted actor
    participant PG as PostgreSQL
    participant Graph as Neo4j catalog (read-only)
    participant Worker as Planner worker
    actor Expert
    Employee->>API: Preview roleId + levelId
    API->>PG: Read authoritative own profile / selection
    API->>Graph: Validate membership; read selected Level requirements / publication
    API-->>Employee: Gaps + UNKNOWN + gapInputHash / expected selection (no learner writes)
    Employee->>API: Confirm roleId + levelId + expected gap / selection + key
    API->>PG: Reauthorized receipt lookup before new-command preconditions
    API->>PG: Scoped resulting selection / planningInputHash / request / receipt / outbox (planned UoW)
    API-->>Employee: Durable request ID / PENDING or GENERATING (or retained replay)
    Worker->>PG: Claim frozen request / replay check
    Worker->>Graph: Batch relevant skills / prerequisites / providers
    Worker->>Worker: Exact bands / focus coverage / dedup objective search / topo / validate
    alt Optimality proved and current valid
        Worker->>PG: Current claim token + fresh input CAS + proposal / audit / outbox
    else Search exhausted before proof
        Worker->>PG: Run SEARCH_LIMIT / NOT_PROVEN; no valid current proposal
    end
    Expert->>API: Assigned proposal read / include or exclude
    API->>API: Fixed-set coverage / warnings / dependencies; no automatic module replacement
    API->>PG: New immutable draft revision + override / receipt
    Expert->>API: Confirm expected revision + hash + key
    API->>PG: Exact approval / review pointer / receipt transaction if current valid
    Employee->>API: Read current pathway / request module access
    API->>PG: Read own approved exact revision
    API->>API: Recheck content / permissions / actual readiness
    API-->>Employee: Ordered path / safe locks or denied access
```

Graph snapshots and revalidation are used; no distributed PostgreSQL/Neo4j ACID transaction. Worker graph calls are not inside long learner locks.

## State separation

```mermaid
stateDiagram-v2
    state "Awaiting Expert review / UNRESOLVED draft" as EDITABLE_INVALID
    [*] --> PENDING: explicit confirmed intent
    PENDING --> GENERATING: worker claim
    PENDING --> STALE: selection drift
    GENERATING --> AWAITING_EXPERT_REVIEW: current valid proven-best proposal durable
    GENERATING --> NO_LEARNING_REQUIRED: no mandatory need
    GENERATING --> UNRESOLVED: missing content / cycle
    GENERATING --> UNRESOLVED: SEARCH_LIMIT / optimality NOT_PROVEN
    GENERATING --> BLOCKED: missing owner policy
    GENERATING --> FAILED_RETRYABLE: transient outage
    FAILED_RETRYABLE --> GENERATING: exact idempotent retry
    GENERATING --> STALE: input drift
    AWAITING_EXPERT_REVIEW --> EDITABLE_INVALID: exclude creates uncovered need
    EDITABLE_INVALID --> AWAITING_EXPERT_REVIEW: include / revalidation repairs
    EDITABLE_INVALID --> STALE: input drift
    AWAITING_EXPERT_REVIEW --> APPROVED: assigned Expert exact valid hash
    AWAITING_EXPERT_REVIEW --> STALE: input drift
    APPROVED --> ARCHIVED: explicit Role change
    ARCHIVED --> [*]: read-only history
```

APPROVED does not mean every module unlocked. Each applicable backend access still checks real versioned readiness/publication/permissions. Post-learning recalculation is not drawn.

This is the visible lifecycle, not a single persisted enum. Canonical design section5.2 separately proposes generationStatus/reviewStatus/validationStatus: generation SUCCEEDED plus valid draft displays AWAITING_EXPERT_REVIEW; an excluded invalid draft still awaits review but displays UNRESOLVED; exact approval displays APPROVED. Initial generation UNRESOLVED/BLOCKED without a proposal has no include/exclude target. Optional no-gap acknowledgement and stale reviewed-draft refresh commands remain undefined/Proposed, not automatic transitions.

## Logical data relationship — planned format2 extension, not DDL

```mermaid
flowchart LR
    SEL["Existing V25 current selection + revision"] --> GS["Planned gap snapshot: scoped frozen input"]
    PROF["Existing immutable baseline profile / attempt"] --> GS
    CAT["Catalog / policy / compatibility / readiness versions"] --> GS
    GS --> RUN["Planned initial request / run"]
    RUN --> REV["Planned immutable pathway revisions"]
    REV --> MOD["Unique modules + immutable teaching_v2 pairs / coverage / warnings + dependency gates"]
    REV --> LEG["Retain format1 reader / old hashes / old target rows"]
    REV --> OV["Expert include/exclude override history"]
    REV --> AP["Exact revision/hash confirmation"]
    CMD["Scoped operation + key/body hash receipt"] --> RUN
    CMD --> OV
    CMD --> AP
    REV --> CUR["Scoped current lifecycle pointer / CAS"]
    CUR --> READ["Employee approved projection"]
    REV --> AO["Atomic audit / outbox, deduplicated delivery"]
```

Source includes V27 and new unapplied V28/format2; external DB head is unverified. Retain format1 hashes/receipts/approvals; no immutable-history backfill, fake UUID, rank1..5 cap or Neo4j schema edit. Source/build and later manual/UI on the DB-capable machine are separate milestones; no Docker requirement or executable-test authority follows from this diagram.
