# REQ-032-F01: Existing Plan Administration

**Date:** 2026-10-23. **URL:** `http://127.0.0.1:8092/platform-admin/subscriptions`.

`REQ-032-plan-configuration.spec.ts` passed in the final **7/7** lifecycle Playwright command recorded under [REQ-028](REQ-028-subscription-purchase.md). It uses a synthetic, verified MFA-enrolled Platform Administrator, actual password/TOTP authentication and real plan APIs.

- Keyboard opens the edit dialog, focus enters the dialog and Tab reaches the labeled field.
- Saving description creates a persisted version; reload shows it.
- Reusing the old expected version returns 409; restoring original commercial text uses the new expected version, not history mutation.
- Mobile plan-administration screenshot captured and inspected; browser page errors are empty.
- No create/delete-plan operation, USD pricing, annual discount or fake platform identity is introduced.

All six commercial fields and concurrent version/history/audit behavior have [PostgreSQL/API evidence](../integration/REQ-032-plan-configuration.md). The final strict-input HTTP test additionally rejects fractional VND and numeric strings without truncating/coercing them.

Evidence: SL-AC05/15/16. Screenshot: `frontend/test-results/subscription-final/REQ-032-.../plan-administration-mobile.png`.

No production Platform Administrator was created. The opt-in `platform-bootstrap` operator profile exists for a previously verified, MFA-enrolled account; executing it against retained/live data requires separate authorization.
