# Complete First-Time Password Setup

## Current Scope Alignment
Support secure initial access under System Administrator account management; delivery/expiry/reset rules remain pending, not subscription activation. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-038-F01  
**Actor:** Newly provisioned account holder among the four human actors  
**Status:** Pending clarification  
**Feature:** [First-Time Password](README.md)

## Description

Allow secure initial account access and require a first-time password to be replaced before normal product use. An activation-link alternative requires explicit agreement rather than silently replacing the requested password flow.

**Input:** Valid initial access proof and a new password.  
**Outcome:** Activated account credentials with initial access proof invalidated according to the agreed policy.

## Open Decisions

- Temporary password delivery versus a one-use setup link.
- Expiry, resend/reissue authority, password policy, and invalid-link handling.
- Restricted first-login session, password confirmation, and notification after setup.

## Acceptance Baseline

Normal protected functions remain unavailable until required first-time password replacement succeeds; credentials are not stored in plaintext.