# Create Account

**Function ID:** REQ-022-F01  
**Actor:** Organization Administrator  
**Status:** Pending clarification  
**Feature:** [Account Management](README.md)

## Description

Create an account belonging to the administrator's organization and initiate the agreed first-access process. This cannot create a Platform Administrator.

**Input:** Account identity, organization, and permitted initial access role.  
**Outcome:** An organization account ready for activation or first-time login.

## Open Decisions

- Required fields, email uniqueness, single versus bulk creation, and subscription seat checks.
- Whether an email can belong to multiple organizations and who creates the first Organization Administrator.
- Activation delivery, account state before first login, and handling failed notification delivery.

## Acceptance Baseline

The new account belongs to the correct organization and cannot receive platform-level privileges through this operation.