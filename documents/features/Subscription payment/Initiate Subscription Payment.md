# Initiate Subscription Payment

## Current Scope Alignment
Retired SaaS scope; follow the [disposition](README.md#current-scope-alignment). No current PayOS/payment workflow is required.

## Historical Specification
The material below is not a current implementation requirement.

**Function ID:** REQ-028-F02  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Subscription Payment](README.md)

## Description

Start a subscription purchase for the organization through PayOS. Access activation depends on verified server-side payment confirmation, not the employee browser or payment redirect.

**Input:** Organization, selected plan/period, and applicable billing data.  
**Outcome:** A recorded payment request and PayOS checkout/payment instructions.

## Open Decisions

- New purchase versus renewal or upgrade; price calculation and prorating.
- Pending payment reuse, expiration, retries, and checkout failure handling.
- Billing details required and whether recurring payment is supported by the selected integration.

## Acceptance Baseline

The payment amount and purchased plan are derived from trusted configuration and associated with the correct organization.