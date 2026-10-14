# Configure Subscription Offerings

## Current Scope Alignment
Retired SaaS scope; follow the [disposition](README.md#current-scope-alignment). Technical System Administrator settings are separately REQ-057, not subscription offerings.

## Historical Specification
The material below is not a current implementation requirement.

**Function ID:** REQ-032-F01  
**Actor:** Platform Administrator  
**Status:** Pending clarification  
**Feature:** [Subscription Configuration](README.md)

## Description

Maintain subscription offerings used in organization purchases, including the commercial attributes and entitlements selected during clarification.

**Input:** Offering configuration and requested changes.  
**Outcome:** Subscription configuration available to pricing, checkout, and entitlement enforcement.

## Open Decisions

- Fixed plans versus per-seat pricing, periods, limits, currency, and taxes.
- Create/update/retire controls, validation, and effective dates.
- Existing subscriber price protection, plan versioning, upgrades, and grace periods.

## Acceptance Baseline

Organization checkout uses an identifiable valid configuration; modifying a plan cannot silently alter the recorded terms of an existing payment.