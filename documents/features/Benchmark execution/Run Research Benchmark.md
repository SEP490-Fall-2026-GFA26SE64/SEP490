# Run RQ2 Research Benchmark

**Function ID:** REQ-034-F01
**Actor:** Administrator already signed in to the main portal
**Scope:** RQ2 approved for implementation by the user on 2026-10-21; RQ1/RQ3 deferred.
**Status:** v3 enhancement implemented; see dedicated test evidence for execution status.

## Requirement

Start one asynchronous study with distinct seeds, selected sizes, requested distinct pairs per hop and measured rounds. Freeze all graph/workload plans, import each seed/size once, exclude a full warm-up pass, then measure shuffled rounds of the same pairs. Preserve every success/error attempt and generation/import provenance separately.

## Acceptance

- Show labelled seeds/pairsPerHop/rounds inputs, limits and the upper-total equation. Freeze actual distinct counts and exact total before measurements; never pad a short pool. Preserve legacy fixed-N API/history separately.

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
- [Unit evidence](../../testing/unit/REQ-034-rq2-research.md)
- [Integration evidence](../../testing/integration/REQ-034-rq2-research.md)
- [System evidence](../../testing/system/REQ-034-rq2-research.md)

This scoped RQ2 agreement supersedes the earlier historical-only disposition for this function. It does not reinstate RQ1/RQ3 product workflows or benchmark comparison REQ-036.

## Approved v3 protocol — 2026-10-21

User approved distinct pairs per hop, multiple seeds and shuffled measured rounds, a full excluded warm-up pass, Median/failure counters and descriptive variation. Current rules/API below supersede earlier fixed-N acceptance for newly created UI studies. Default seeds1..5, pairs500 per hop, rounds3; bounded total1,000,000. Actual unique counts are frozen and displayed, never padded. Snapshots keyed by seed/size; results keyed by seed/size/round. Display failures/timeouts with denominator and keep historical runs readable. See [v3 field contract](../../research/RQ2/API.md) and [rules](../../research/RQ2/RULES.md). Do not claim revised tests passed until recorded in dedicated evidence.

## Dataset count input — 2026-10-23

REQ-034-F01: replace comma-separated Dataset seeds with the numeric Datasets per graph size input (Vietnamese: Số bộ dữ liệu mỗi quy mô). Integer1..catalog.maxSeeds (currently10), default catalog.defaultSeeds.length (currently5). N creates N datasets per selected graph size, using automatic seeds[1..N]. Preview budget and POST seeds array use exactly that count. Keep all existing limits and saved explicit seeds/history; no endpoint or store migration. Reject zero, negative, fractional, empty, comma-separated and over-limit values before submission.

## Merge compatibility — 2026-10-26

The merged baseline branch numbers the unchanged Research SQL as V27/V28. Existing Research-only V8/V9 databases require explicit migration-history reconciliation before startup. The feature/API/protocol is unchanged. See [merge verification and manual checks](../../testing/system/REQ-001-002-034-merge-resolution.md).
