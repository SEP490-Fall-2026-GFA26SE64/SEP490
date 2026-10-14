# Synchronize Learning State

## Current Scope Alignment
Keep assessment evidence, estimates, guidance reviews, learning progress and pathway history consistent with catalog references. Do not assume a distributed transaction between stores. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-046-F01  
**Actor:** Automated system  
**Status:** Pending clarification  
**Feature:** [Consistent Learning State](README.md)

## Description

Coordinate assessment evidence, employee competency state, and pathway records across PostgreSQL and Neo4j. The registration requests transactional consistency; the actual cross-store guarantee must be explicitly specified.

**Input:** A valid learning event and the associated current record versions.  
**Outcome:** Consistent accepted learning state under the agreed commit and visibility contract.

## Open Decisions

- Source of truth and strict atomic visibility versus an explicitly approved eventual-consistency model.
- Ordering, version checks, idempotency, and synchronization boundaries.
- User-visible pending state and behavior during graph or relational database outages.

## Acceptance Baseline

The system does not silently claim cross-database atomicity that its persistence mechanism cannot provide or create conflicting duplicate updates.