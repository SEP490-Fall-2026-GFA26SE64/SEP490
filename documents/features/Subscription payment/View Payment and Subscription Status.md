# View Payment and Subscription Status

## Current Scope Alignment
Retired SaaS scope; follow the [disposition](README.md#current-scope-alignment). No current payment/subscription status workflow is required.

## Historical Specification
The material below is not a current implementation requirement.

**Function ID:** REQ-028-F03  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Subscription Payment](README.md)

## Description

Show the organization's payment outcome and effective subscription status, distinguishing a pending checkout from an activated subscription.

**Input:** Organization purchase/subscription records and verified payment state.  
**Outcome:** An authorized billing-status view.

## Open Decisions

- Current payment only versus payment history, invoices, and receipts.
- Status vocabulary, polling/refresh behavior, and delayed confirmation messaging.
- Visible entitlements, renewal/expiry dates, and failure recovery actions.

## Acceptance Baseline

A successful browser return cannot make an unverified purchase appear as an active paid subscription.