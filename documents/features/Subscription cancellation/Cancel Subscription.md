# Cancel Subscription

## Current Scope Alignment
Retired SaaS scope; follow the [disposition](README.md#current-scope-alignment). No current subscription/cancellation workflow or actor is required.

## Historical Specification
The material below is not a current implementation requirement.

**Function ID:** REQ-029-F01  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Subscription Cancellation](README.md)

## Description

Request cancellation of the organization's subscription. Cancellation is not automatically a refund or an immediate deletion of organization data.

**Input:** Organization subscription and cancellation request.  
**Outcome:** A recorded cancellation with an effective state/date according to the agreed commercial policy.

## Open Decisions

- Immediate cancellation versus end-of-term non-renewal; manual renewal versus recurring billing.
- Confirmation, cancellation reasons, refunds, and already-pending payments.
- Post-cancellation access, retention, reactivation, and notifications.

## Acceptance Baseline

An administrator can cancel only their organization's subscription and receives an explicit statement of when access changes.