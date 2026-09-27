# Hash Passwords and Verification Secrets

**Function ID:** REQ-040-F01  
**Actor:** Automated system  
**Status:** Pending clarification  
**Feature:** [Sensitive Data Protection](README.md)

## Description

Store passwords using salted adaptive hashes rather than plaintext. Other verification-only secrets can use appropriate one-way representations; their exact inventory is not yet agreed.

**Input:** Password or applicable verification-only secret.  
**Outcome:** A stored verifier that supports validation without recovering the original value.

## Open Decisions

- Inventory of password, activation, and reset secrets requiring one-way storage.
- Algorithm and work-factor policy, credential migration, and rehashing.
- Secret expiry, logging exclusions, and access to stored verifiers.

## Acceptance Baseline

Password verification does not depend on storing decryptable or plaintext passwords; a fast general-purpose password hash alone is insufficient.