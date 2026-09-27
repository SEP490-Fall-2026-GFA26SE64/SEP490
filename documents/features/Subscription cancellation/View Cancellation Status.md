# View Cancellation Status

**Function ID:** REQ-029-F02  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Subscription Cancellation](README.md)

## Description

Display whether cancellation is requested, scheduled, or effective, using the state model agreed for subscriptions.

**Input:** Organization subscription and cancellation record.  
**Outcome:** A cancellation-status view with its effective consequences.

## Open Decisions

- Status labels, effective date, remaining access, and refund information.
- Visibility after access expiry and whether cancellation can be reversed.
- Failed cancellation handling and support/contact information.

## Acceptance Baseline

The view reflects the authoritative cancellation record and does not promise unconfirmed refunds or retained access.