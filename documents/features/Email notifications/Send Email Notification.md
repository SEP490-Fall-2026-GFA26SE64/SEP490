# Send Email Notification

## Current Scope Alignment
System sends only separately agreed account/learning/review events to authorized current actors. Billing events are excluded. The former baseline-blocked Expert notification was tied to the superseded role-specific configuration flow and is not part of the current adaptive REQ-002 contract unless reconfirmed. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-039-F01  
**Actor:** Automated system; authorized account holders are recipients  
**Status:** Pending clarification  
**Feature:** [Email Notifications](README.md)

## Description

Send email when an agreed product event occurs. No adaptive-baseline email event is currently confirmed. The overview also suggests account access, pathway readiness/revision and expert reviews; those events are not yet confirmed here.

**Input:** Eligible event, recipient, and approved template data.  
**Outcome:** A notification delivery attempt with an observable success/failure state.

## Open Decisions

- Remaining event-to-recipient matrix, including whether adaptive Blueprint/item/parameter shortages produce an L&D or Expert notification, and message content/language.
- Immediate messages versus digests; delivery timing and retry limits.
- Duplicate suppression, resolution detection and reassignment handling, audit history, delivery retry semantics, and sensitive data prohibited from message bodies.

## Acceptance Baseline

Messages go only to intended authorized recipients and do not claim an unverified payment or expose stored credentials.

- If an adaptive baseline shortage notification is later approved, it must use trusted organization scope, avoid duplicate delivery and never bypass the start blocker. No such event is currently part of REQ-002 acceptance.
