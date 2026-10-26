# REQ-034 — merge reconciliation, 2026-10-26

Research SQL is unchanged and relocated to V27/V28 to avoid baseline V8/V9 collisions. ResearchIntegrationTest now prepares V27 legacy artifacts before applying V28. Execution is blocked by the local Docker daemon HTTP 500; no database round-trip/non-empty-field assertions are claimed passed. Existing Research V8/V9 databases require explicit history reconciliation before startup.

See [merge evidence and manual checklist](../system/REQ-001-002-034-merge-resolution.md).
