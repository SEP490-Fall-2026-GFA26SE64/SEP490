# Protect Recoverable Sensitive Data

## Current Scope Alignment
System protects profiles, baseline/RIASEC/module evidence and private reviews using appropriate encryption/access rules; AI disclosure and retention remain open. Billing is not current scope. Follow the [current feature contract](README.md#current-scope-alignment) and [System Overview](../../adapt_learn_graph_system_overview.md).

## Historical Specification
Conflicting actors, policies and acceptance below are superseded; old evidence is not revised-scope certification.

**Function ID:** REQ-040-F02  
**Actor:** Automated system  
**Status:** Pending clarification  
**Feature:** [Sensitive Data Protection](README.md)

## Description

Protect sensitive values that the application must later read using suitable encryption and access restrictions. Irreversible hashing is not a substitute for protecting recoverable data.

**Input:** Classified sensitive fields and authorized read/write operations.  
**Outcome:** Protected stored data accessible only through permitted operations.

## Open Decisions

- Field inventory: identity/contact information, assessment responses, AI comments, and payment metadata.
- Field-level versus storage-level encryption, key ownership, rotation, and backup protection.
- Retention, deletion, masking, logs, and disclosure to external AI services.

## Acceptance Baseline

Data required for authorized product use remains recoverable without being broadly readable or unnecessarily disclosed in reports or logs.