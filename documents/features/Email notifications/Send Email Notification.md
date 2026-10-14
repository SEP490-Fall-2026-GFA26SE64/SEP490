# Send Email Notification

## Current Scope Alignment
System sends only separately agreed account/learning/review events to authorized current actors. Billing events are excluded; prior baseline-blocked Expert notifications require revalidation for L&D ownership. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-039-F01  
**Actor:** Automated system; authorized account holders are recipients  
**Status:** Pending clarification  
**Feature:** [Email Notifications](README.md)

## Description

Send email when an agreed product event occurs. Baseline starts blocked by missing configuration or insufficient question coverage are confirmed events. The overview also suggests account access, pathway readiness/revision, expert reviews, payment outcomes, and subscription cancellation; those events are not yet confirmed here.

**Input:** Eligible event, recipient, and approved template data.  
**Outcome:** A notification delivery attempt with an observable success/failure state.

## Confirmed Related Rules

- From [Configure Baseline Assessment](../Baseline%20knowledge%20assessment/Configure%20Baseline%20Assessment.md), 2026-09-27, option A: A baseline start blocked by missing configuration or insufficient question coverage shows an employee message and automatically triggers email to the role's assigned Domain Expert in the same organization. No employee notification action is required. Email delivery success or failure cannot bypass the assessment blocker.
- Option A, 2026-09-27: Limit baseline-block notifications to one per organization and role during a continuous unresolved blocked period, shared across employees and repeated or simultaneous requests. Suppression ends when saved configuration and sufficient eligible coverage are restored; partial repair does not reset it. A later blocked start during a new blocked period can trigger another notification. This is not a periodic reminder policy; failed-delivery retries for the same notification remain open.

## Open Decisions

- On 2026-09-27, the user answered the missing-Expert recipient question by requiring unfinished target roles to be hidden from employees. No fallback recipient was selected. Reconcile which blocked-start scenarios remain applicable after the readiness checklist and existing-role behavior are defined in [View Target Roles](../Target%20role%20selection/View%20Target%20Roles.md); do not treat the visibility change as cancelling all earlier email rules.
- Remaining event-to-recipient matrix, mandatory versus optional messages outside the confirmed automatic baseline-block event, and message content/language. Define fallback handling when the assigned Expert is missing or unavailable.
- Immediate messages versus digests; delivery timing and retry limits.
- Duplicate suppression for other event types, baseline-block resolution detection and reassignment handling, audit history, and sensitive data prohibited from message bodies. The once-per-role-blocked-period baseline policy is confirmed; its delivery retry semantics remain open.

## Acceptance Baseline

Messages go only to intended authorized recipients and do not claim an unverified payment or expose stored credentials.

- Missing configuration and insufficient baseline coverage trigger assigned-Expert notification processing automatically, limited to one notification per organization and role's unresolved blocked period. Repeated or simultaneous starts across employees do not create duplicate notifications. After resolution, a later new blockage and blocked start can trigger a fresh notification. No email is addressed to an unrelated or cross-organization Expert. Delivery failure does not permit the blocked assessment to start.