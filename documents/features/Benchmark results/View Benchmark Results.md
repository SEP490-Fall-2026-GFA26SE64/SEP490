# View and Export RQ2 Benchmark Results

**Function ID:** REQ-035-F01
**Actor:** Administrator already signed in to the main portal
**Scope:** RQ2 approved for implementation by the user on 2026-10-21; RQ1/RQ3 deferred.
**Status:** v3 enhancement implemented; see dedicated test evidence for execution status.

## Requirement

Show aggregate and per-depth mean, nearest-rank P95, min/max and counts by graph size. Export PDF only for successful runs; JSON, CSV, datasets and frozen rules support reproducibility. The 150 ms reference is not an automatic NFR verdict.

## Acceptance

- For v3, results/PDF show per-seed/round/hop success N, Mean/Median/P95, failures/timeouts/attempts, actual distinct counts, warm-up and degree statistics. Display descriptive variation of round means; never average P95. Historical runs keep saved N and show unavailable new metrics.

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
- [Unit evidence](../../testing/unit/REQ-035-rq2-research.md)
- [Integration evidence](../../testing/integration/REQ-035-rq2-research.md)
- [System evidence](../../testing/system/REQ-035-rq2-research.md)

This scoped RQ2 agreement supersedes the earlier historical-only disposition for this function. It does not reinstate RQ1/RQ3 product workflows or benchmark comparison REQ-036.

## Approved v3 protocol — 2026-10-21

User approved distinct pairs per hop, multiple seeds and shuffled measured rounds, a full excluded warm-up pass, Median/failure counters and descriptive variation. Current rules/API below supersede earlier fixed-N acceptance for newly created UI studies. Default seeds1..5, pairs500 per hop, rounds3; bounded total1,000,000. Actual unique counts are frozen and displayed, never padded. Snapshots keyed by seed/size; results keyed by seed/size/round. Display failures/timeouts with denominator and keep historical runs readable. See [v3 field contract](../../research/RQ2/API.md) and [rules](../../research/RQ2/RULES.md). Do not claim revised tests passed until recorded in dedicated evidence.

## Seed pagination — 2026-10-21

REQ-035-F01: Admin requested a shorter Latency by graph size and depth table. Each page contains all available sizes/rounds/depths for one seed, in first-result order. Show current seed and page count; use the shared Pagination controls only when multiple seeds have results. Changing experiment resets to the first seed; polling preserves the selected page while more results arrive. Historical single-seed runs show no extra pager. Aggregate variation and PDF/CSV/JSON exports continue to include all seeds. This is presentation-only; no measurement or persistence change.
