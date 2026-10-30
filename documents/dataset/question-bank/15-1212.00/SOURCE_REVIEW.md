# Content, source and review report

2026-10-22. One official-source **DRAFT** bank is prepared, imported and fully read back locally for Information Security Analysts ([latest cutover](LOCAL_CUTOVER.md), [readback](local-readback.json)). The package is review-ready as an inventory of authored content; it is not human-approved, published, calibrated or production-ready.

## Authorship and coverage

135 original English scenario questions, 540 option texts and 540 individual option explanations, one assessed MicroSkill per item, four options/one key. All 15 required skills have 3 EASY/3 MEDIUM/3 HARD. Correct positions: A30/B28/C40/D37. Exact prompt duplicates: zero. Difficulty is editorial; no observed difficulty, Bloom field, 3PL b, role rank or requiredScore inference. Coverage is full union across all eight Roles and 24 Levels, not a demonstration subset. No bank for the other four Occupations.

The small complete scope was selected after comparing all five Occupations (40/36/20/44/15 union skills) and reading definitions/modules. It includes authorization, networks, configuration, monitoring, hardening and security operations/governance. Its 135-item authoring/review workload is smaller than 180/324/360/396 items for the other full scopes; scope was not trimmed. Workload is content/scenario/source review, not a claimed monetary quote. No external paid authoring service was invoked.

## Technical primary sources

The [machine-readable review sidecar](authoring-review.json) binds every exact item-version/hash to its correct option, explanation for each option, cited document/section, module and review state. Source titles, edition, URL and access date are in that sidecar. Source citations support a technical principle; the scenario, constraints, numerical examples and distractors are author-created applications/inferences, not source-provided exam questions. Definitions/modules set scope; they do not establish answers.

| Source | Applied coverage / inspected principle |
| --- | --- |
| [NIST SP 800-53r5, pinned December 2020 PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf) | AC-1/2/3/5/6, AU-2/6/9, CA-2/7, CM-1/3/6/7, IA-2, IR-1, SC-7, SI-6: access, control selection, hardening and policy/procedure boundaries |
| [NIST SP 800-128, updated 2019](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-128.pdf) | Baseline, change impact/control, record/archive and monitoring, sections 3.2–3.4 |
| [NIST SP 800-137](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-137.pdf) | Defined metrics, coverage, collection, analysis/reporting; original availability/latency examples apply these principles |
| [NIST SP 800-40r4](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-40r4.pdf) | Risk-based patch planning, deployment verification and ongoing monitoring, section 2 |
| [NIST SP 800-30r1](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-30r1.pdf) | Scope/assumptions, threats, likelihood/impact/uncertainty, communicating and maintaining results |
| [NIST SP 800-61r3, April 2025](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf) | DE.AE correlation/criteria, RS.MA prioritization, RS.AN evidence, RS.CO communication, RS.MI containment/eradication and RC.RP recovery |
| [NIST SP 800-92, pinned 2006 final](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-92.pdf) | Log correlation and consistent clock/time-zone interpretation |
| [NIST SP 800-115](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-115.pdf) | Authorized assessment scope/ROE, scanner limitations, validation and report context |
| [NIST SP 800-53Ar5, pinned January 2022 PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53Ar5.pdf) | Examine/interview/test methods, depth/coverage and supported assessment conclusions |
| [RFC 1034](https://www.rfc-editor.org/rfc/rfc1034) | A/CNAME resolution and positive TTL caching; original troubleshooting cases |
| [RFC 1812](https://www.rfc-editor.org/rfc/rfc1812) | IPv4 prefix matching/forwarding and return-path examples |

Official documents/publication pages were opened and relevant sections inspected through web access on 2026-10-22. Editions are pinned technical references; this does not claim every PDF is the newest supplemental release. No source wording is copied as a question. Workbook/package parity is a separate observation: all six node sets and seven relationship sets matched IDs and fields, with no mismatches ([report](workbook-observation.json)).

## Review and limitations

- Ontology official source: confirmed by user; catalog review remains NEEDS_EXPERT_REVIEW with null reviewer/time in the original package. Graph-normalized snapshot omits nulls as the official exporter does.
- AI technical/editorial review: each scenario's explicit constraints, unique intended answer, distractor explanation and source principle are recorded. Static parse/shape/coverage/hash checks found no structural issue. No human expert signature or empirical quality claim.
- Expert review still required: domain correctness/ambiguity, English clarity, distractor plausibility and cueing, difficulty discrimination, role/Level suitability, adequacy of conceptual MCQs versus practical demonstration. Similar neighboring skills (hardening versus vulnerability verification; access controls versus application authorization) intentionally use distinct primary-skill perspectives and require expert scrutiny.
- All items DRAFT. Import does not set review metadata to APPROVED or publish. Authoring review, item publication, catalog publication, model configuration, response provenance and calibration are separate states.
- No learner responses/pilot, item-fit statistics, calibrated a/b/c, minimum evidence or response/time policy chosen. No bootstrap or self-promotion. With an eventual minimum m per skill, at least 15*m responses are needed for feasibility, bounded by the actual model and eligible parameterized supply.
- Latest authorized live parity: the main local legacy graph was backed up and replaced by the official package. Full827-node/4536-edge payload equals the official transformed seed, with six constraints; exact rerun no changes. This supersedes the earlier Session1 connection blocker.
- Latest local import/readback: PostgreSQLV22, one bank/135 DRAFT items, exact all-field item equality and rerun0 new/135 existing. Existing local EMPLOYEE provides created_by only;51/53 original tables and all11 selections unchanged. Exhaustive transaction/conflict/security/executable acceptance remains Not run.

The source files are backend-only resources or internal documentation. No official bank prompt/UUID/hash/rationale is present in the built frontend bundle. Existing shared assessment samples and audited manager answer-reveal code still contain correctOptionId/protectedKey names; see [inventory](SOURCE_INVENTORY.md). This session does not claim a completely mock-free frontend or D1 completion.
