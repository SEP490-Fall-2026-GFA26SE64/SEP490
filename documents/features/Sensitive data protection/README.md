# Sensitive Data Protection

## Current Scope Alignment

**Source:** [System Overview](../../adapt_learn_graph_system_overview.md); REQ-040. **Performer:** System. **Status:** Supporting security detail pending.
Protect credentials, profiles, baseline/RIASEC/module responses, guidance and reviews through appropriate hashing/encryption and authorized access. Do not expose secrets in activity monitoring or technical settings. Billing/payment data is not a new product requirement.

## Historical Specification
Use the alignment above where older details conflict.

Protect important information using hashing where recovery is unnecessary and encryption/access controls where recovery is required.

**Source:** [REQ-040](../../PRODUCT_OVERVIEW.md)  
**Execution:** Automated security controls, not a fifth human actor.

## Functions

- [Hash Passwords and Verification Secrets](Hash%20Passwords%20and%20Verification%20Secrets.md)
- [Protect Recoverable Sensitive Data](Protect%20Recoverable%20Sensitive%20Data.md)