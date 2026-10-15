# View Platform Payment Statistics

## Current Scope Alignment
Retired SaaS billing scope; follow the [disposition](README.md#current-scope-alignment). Platform payment statistics are not a current administrator function.

## Historical Specification
The material below is not a current implementation requirement.

**Function ID:** REQ-030-F01  
**Actor:** Platform Administrator  
**Status:** Pending clarification  
**Feature:** [Payment Statistics](README.md)

## Description

Display platform payment statistics with successful, pending, failed, and cancelled states distinguished where applicable.

**Input:** Authorized platform payment records and reporting filters.  
**Outcome:** Aggregated payment metrics and any agreed drill-down view.

## Open Decisions

- Metrics, date basis/timezone, currency handling, and gross versus net amounts.
- Treatment of refunds, expired payment links, duplicate callbacks, and retries.
- Organization-level drill-down and payment details visible to administrators.

## Acceptance Baseline

Pending payments are not counted as successful paid revenue and duplicate notifications do not inflate statistics.