# Create RQ2 Dataset

**Function ID:** REQ-033-F02
**Actor:** Administrator already signed in to the main portal
**Scope:** RQ2 approved for implementation by the user on 2026-10-21; RQ1/RQ3 deferred.
**Status:** v3 enhancement implemented; see dedicated test evidence for execution status.

## Requirement

Admin selects one or more of 1000/5000/10000 nodes and 1–10 distinct reproducible seeds. Generate a schema-valid snapshot based on ontology_seed.json, retain source metadata and workload, persist each seed-qualified JSON artifact, and import only to the isolated research instance.

## Acceptance

- Data and results come from backend persistence, not frontend mock stores.
- Reuse the existing portal ADMIN context; no second Research access form. Require CSRF for POST. Local profile uses explicit actor headers; non-local requires a server-authenticated ROLE_ADMIN principal. List scope labels in RQ1 → RQ2 → RQ3 order.
- Respect all ontology fields and invariants, including legitimate nullable review metadata; do not manufacture expert approval.
- Never mutate the operational graph; reject the same database or a research instance containing foreign nodes.
- A failed, interrupted or partial experiment cannot export a completed PDF report.
- Retain source hash/version, seed, rules text/version, environment, counts and measurement details.

## Implementation and evidence

- [Rules](../../research/RQ2/RULES.md)
- [API and field contract](../../research/RQ2/API.md)
- [Manual checks](../../testing/system/REQ-034-manual-browser-check.md)
- [Unit evidence](../../testing/unit/REQ-033-rq2-research.md)
- [Integration evidence](../../testing/integration/REQ-033-rq2-research.md)
- [System evidence](../../testing/system/REQ-033-rq2-research.md)

This scoped RQ2 agreement supersedes the earlier historical-only disposition for this function. It does not reinstate RQ1/RQ3 product workflows or benchmark comparison REQ-036.

## Approved v3 protocol — 2026-10-21

User approved distinct pairs per hop, multiple seeds and shuffled measured rounds, a full excluded warm-up pass, Median/failure counters and descriptive variation. Current rules/API below supersede earlier fixed-N acceptance for newly created UI studies. Default seeds1..5, pairs500 per hop, rounds3; bounded total1,000,000. Actual unique counts are frozen and displayed, never padded. Snapshots keyed by seed/size; results keyed by seed/size/round. Display failures/timeouts with denominator and keep historical runs readable. See [v3 field contract](../../research/RQ2/API.md) and [rules](../../research/RQ2/RULES.md). Do not claim revised tests passed until recorded in dedicated evidence.

## Dataset count input — 2026-10-23

The Admin enters the number of datasets per graph size (integer1..10, default5) instead of a seed list. The UI expands N to seeds1..N; the backend still generates/persists each explicit seed-qualified snapshot using the existing protocol. With3 graph sizes and count5, create15 snapshots. Old seed-qualified datasets remain unchanged.
