# Protect Recoverable Sensitive Data

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