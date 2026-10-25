# Baseline knowledge assessment

REQ-002 estimates initial Employee mastery for an Occupation through an individual adaptive sequence. Employee selects a Role first; authoritative profile coverage determines whether baseline is required. One stable Blueprint per organization+Occupation uses the full deduplicated skill/item union and one question/time pair. Sufficient evidence, rather than a score threshold, initializes mastery.

| Contract | Responsibility |
| --- | --- |
| [Role selection and Occupation baseline](../Target%20role%20selection/Role%20Selection%20and%20Occupation%20Baseline.md) | Entry, profile coverage, retained version and My Mastery |
| [Configure Baseline Assessment](Configure%20Baseline%20Assessment.md) | REQ-002-F02: Save/Preview/Activate, exact version/Draft settings and discard |
| [Complete Baseline Assessment](Complete%20Baseline%20Assessment.md) | REQ-002-F01: pinned adaptive sequence, deadline, sufficiency and result semantics |
| [Lifecycle and transition](Occupation%20Baseline%20Lifecycle%20and%20Transition.md) | Availability, API/retry/locking, compatibility and rollback |
| [Data architecture](Adaptive%20Baseline%20Data%20Architecture.md) | Store ownership, schema/version identity and transaction order |
| [Own result](../Assessment%20results/View%20Assessment%20Result.md) / [history](../Assessment%20results/View%20Assessment%20History.md) | REQ-009 protected reads; recorded scope/provenance preserved |

[Adaptive acceptance plan](../../testing/REQ-002-adaptive-baseline-test-plan.md) and [Role-to-baseline plan](../../testing/REQ-001-002-role-baseline-flow-test-plan.md) define planned verification. [Implementation/evidence review](../../testing/system/REQ-001-002-final-synchronization-review.md) records actual readiness and limitations separately; this contract does not certify production integration.

Confirmed | Provisional: versioned numerical constants | Open: authoritative external owner integration and numerical validation.
