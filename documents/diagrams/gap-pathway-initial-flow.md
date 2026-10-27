# Planned initial gap/pathway flow, states and data

2026-10-27. **Cluster1 design, not deployed runtime/schema.** Mermaid source is rendered by Markdown viewers supporting Mermaid; no live DB metadata image is replaced. [Canonical design](../features/Initial%20pathway%20generation/Initial%20Pathway%20Flow%20and%20Data%20Design.md).

## Product and algorithm flow

```mermaid
flowchart TD
    E["Employee chooses Role then Level: distinct target pair"] --> G["Read-only selected-Level gaps / UNKNOWN"]
    G --> C["Explicit confirmation: revalidate input + selection guards"]
    C --> T["PostgreSQL: request / frozen input / receipt / outbox"]
    T --> W["GENERATING: batch related Neo4j subgraph"]
    W --> F["Eligibility + suitability + readiness mapping"]
    F --> R["Rank providers per skill: suitable instructionLevel → duration → price"]
    R --> S["Whole-path selection: shared coverage / dedup / alternatives"]
    S --> D["Selected module dependency graph + internal gates"]
    D --> O["Topological order + full validation"]
    O -->|valid current| P["AWAITING_EXPERT_REVIEW: immutable proposal revision"]
    O -->|missing / cycle / infeasible| U["UNRESOLVED: diagnostic reasons, no learning"]
    T -->|confirmed snapshot: all mandatory known / gap 0| N["NO_LEARNING_REQUIRED: no fabricated completion"]
    P --> X["Assigned Expert: inspect / include / exclude"]
    X --> V["Revalidate coverage / eligibility / prerequisites / order"]
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
    Worker->>Worker: Filter / rank / select / topo / validate
    Worker->>PG: Current claim token + CAS fresh input + proposal / audit / outbox
    Expert->>API: Assigned proposal read / include or exclude
    API->>API: Coverage / dependency revalidation
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
    GENERATING --> AWAITING_EXPERT_REVIEW: current valid proposal durable
    GENERATING --> NO_LEARNING_REQUIRED: no mandatory need
    GENERATING --> UNRESOLVED: missing content / cycle
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

## Logical data relationship — Proposed, not DDL

```mermaid
flowchart LR
    SEL["Existing V25 current selection + revision"] --> GS["Planned gap snapshot: scoped frozen input"]
    PROF["Existing immutable baseline profile / attempt"] --> GS
    CAT["Catalog / policy / compatibility / readiness versions"] --> GS
    GS --> RUN["Planned initial request / run"]
    RUN --> REV["Planned immutable pathway revisions"]
    REV --> MOD["Unique modules + per-skill targets + dependency gates"]
    REV --> OV["Expert include/exclude override history"]
    REV --> AP["Exact revision/hash confirmation"]
    CMD["Scoped operation + key/body hash receipt"] --> RUN
    CMD --> OV
    CMD --> AP
    REV --> CUR["Scoped current lifecycle pointer / CAS"]
    CUR --> READ["Employee approved projection"]
    REV --> AO["Atomic audit / outbox, deduplicated delivery"]
```

PostgreSQL migration head is V26; V4/V25 name table origins in that current schema. No fake legacy profile/progress UUID, no rank1..5 truncation, no modification of Neo4j schema or current learner history.
