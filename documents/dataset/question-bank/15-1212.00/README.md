# Official DRAFT bank — Information Security Analysts

2026-10-22 latest local cutover: official graph imported and fully matched; main PostgreSQL migrated to V22 and135 DRAFT items imported/read back. Exact graph/bank reruns make no changes. Expert/publication/model/runtime readiness remains open; C was not implemented. See [local cutover](LOCAL_CUTOVER.md) and [readback](local-readback.json). Earlier Session1 blockers are superseded by this user-authorized follow-up.

- Occupation: **OCC-15-1212.00 — Information Security Analysts**, code **15-1212.00**, catalog **0.8.0**.
- Full scope: **8 active Roles / 24 active Levels / 15 deduplicated MicroSkills / 135 DRAFT item versions**.
- 3 EASY + 3 MEDIUM + 3 HARD per skill; 45 per label. Correct answer positions A30/B28/C40/D37.
- Source/review are distinct: official package, NEEDS_EXPERT_REVIEW/null reviewer, no published content or calibrated parameters.
- Bank UUID: `2f79de6b-dc62-51a1-982d-0be9d6f588dc`. Stable item/item-version UUIDs and content hashes are in the backend-only manifest.

## Artifacts

| Artifact | Purpose |
| --- | --- |
| [Backend manifest](../../../../backend/src/main/resources/db/seed/question-bank-15-1212.00-v1.json) | DRAFT content, response schema and protected key; never frontend asset |
| [Release manifest](release-manifest.json) | Version/counts/SHA256/status |
| [Latest local cutover](LOCAL_CUTOVER.md) | Approved cleanup, local seed mode, retained migration/history and rollback |
| [Actual local readback](local-readback.json) | Exact graph/item parity and retained PostgreSQL data observations |
| [Catalog scope](catalog-scope.json) | Exact graph-normalized properties and edges; 138 nodes / 622 relationships |
| [Scope paths](scope-paths.csv) | All 250 Role/Level/required-skill paths, thresholds and provenance |
| [Coverage matrix](coverage.csv) | Each skill, counts, Role/Level coverage and exact item-version IDs |
| [Authoring review](authoring-review.json) | Protected option explanations, citations, original authoring keys and review state |
| [Content/source report](SOURCE_REVIEW.md) | Source checks, quality limits and open expert review |
| [Source inventory](SOURCE_INVENTORY.md) | Changed/removed/kept/deferred consumers and rollback |
| [Import contract](IMPORT_CONTRACT.md) | Pre-code field mapping, transaction/authorization/failure rules |
| [Operator import](OPERATOR_IMPORT.md) | Exact required configuration; operation not executed |
| [Workbook parity](workbook-observation.json) | Six node/seven relationship set/field comparisons |
| [Module/source observation](module-source-observation.json) | All 15 referenced modules, content version/hash and study-source trace |
| [Session1 static observation](static-observation.json) | Historical checks before the authorized local cutover; current data evidence is local-readback.json |
| [Session1 observations](../../../testing/system/REQ-002-official-question-bank-session1.md) | Allowed checks and unexecuted acceptance |

## Survey and selection

| Occupation | Roles | Levels | Full union skills | Items at 9/skill |
| --- | --- | --- | --- | --- |
| OCC-15-1252.00 — Software Developers | 10 | 30 | 40 | 360 |
| OCC-15-1243.00 — Database Architects | 10 | 30 | 36 | 324 |
| OCC-15-1253.00 — Software Quality Assurance Analysts and Testers | 10 | 30 | 20 | 180 |
| OCC-15-1299.08 — Computer Systems Engineers/Architects | 10 | 30 | 44 | 396 |
| OCC-15-1212.00 — Information Security Analysts | 8 | 24 | 15 | 135 |

The selected scope has usable definitions/module references for all 15 skills and permits complete bounded authorship. Choosing it reduces workload without reducing the required union. Other Occupations were surveyed only. Nine is sizing; actual feasibility still depends on the future approved model minimum/limits and eligible parameters.

## Exact Roles and Levels

All names/IDs/version/status are captured in the snapshot; every listed Level is active, catalog 0.8.0. J/M/S names are Junior/Middle/Senior and ranks 1/2/3, not item difficulty.

| Role ID and exact name | Level IDs in rank order |
| --- | --- |
| ROLE-BC681F40F67B — Information Security Officer | LV-BC681F40F67B-J (Junior); LV-BC681F40F67B-M (Middle); LV-BC681F40F67B-S (Senior) |
| ROLE-9E24DD1E0AE6 — Information Security Specialist | LV-9E24DD1E0AE6-J (Junior); LV-9E24DD1E0AE6-M (Middle); LV-9E24DD1E0AE6-S (Senior) |
| ROLE-AF49BFEFFAE0 — Information Systems Security Analyst | LV-AF49BFEFFAE0-J (Junior); LV-AF49BFEFFAE0-M (Middle); LV-AF49BFEFFAE0-S (Senior) |
| ROLE-AAF660DA34D9 — Information Systems Security Officer (ISSO) | LV-AAF660DA34D9-J (Junior); LV-AAF660DA34D9-M (Middle); LV-AAF660DA34D9-S (Senior) |
| ROLE-AC875FDD2CC1 — Information Technology Security Analyst (IT Security Analyst) | LV-AC875FDD2CC1-J (Junior); LV-AC875FDD2CC1-M (Middle); LV-AC875FDD2CC1-S (Senior) |
| ROLE-39DE5AAEA190 — Network Security Analyst | LV-39DE5AAEA190-J (Junior); LV-39DE5AAEA190-M (Middle); LV-39DE5AAEA190-S (Senior) |
| ROLE-FE0775936B97 — Security Analyst | LV-FE0775936B97-J (Junior); LV-FE0775936B97-M (Middle); LV-FE0775936B97-S (Senior) |
| ROLE-410E150F21A9 — Systems Analyst | LV-410E150F21A9-J (Junior); LV-410E150F21A9-M (Middle); LV-410E150F21A9-S (Senior) |

## Deduplicated skill union

Each row has nine independent items; all roles/levels requiring it remain in scope. Definitions are exact catalog text, not answer keys.

| Skill ID / exact name | Exact definition | E/M/H |
| --- | --- | --- |
| MS-FS13 — Enforce application authorization | Check permissions for protected actions and resources. | 3/3/3 |
| MS-INF01 — Configure and verify network connectivity | Configure a bounded network connection and check addressing, routing and name resolution. | 3/3/3 |
| MS-INF04 — Maintain configuration records | Keep infrastructure configuration and change records aligned with the deployed state. | 3/3/3 |
| MS-INF05 — Monitor service health | Collect and interpret service measurements and alerts against agreed operating limits. | 3/3/3 |
| MS-INF08 — Apply infrastructure hardening and updates | Apply approved secure configuration and updates, then check operation and protection. | 3/3/3 |
| MS-SEC01 — Analyse information security risks | Identify a bounded security risk, its affected assets and a justified treatment proposal. | 3/3/3 |
| MS-SEC02 — Select and verify security controls | Choose controls for a stated threat or requirement and check their intended protection. | 3/3/3 |
| MS-SEC03 — Configure identity and access controls | Configure and test authentication or authorization rules against an agreed access policy. | 3/3/3 |
| MS-SEC04 — Investigate security alerts | Interpret a security alert and supporting records to decide a justified next action. | 3/3/3 |
| MS-SEC05 — Execute a security incident response procedure | Apply an agreed incident procedure while preserving records and verifying containment. | 3/3/3 |
| MS-SEC06 — Assess technical vulnerabilities | Identify and validate findings in an authorized assessment scope and explain their impact. | 3/3/3 |
| MS-SEC07 — Verify vulnerability remediation | Apply or coordinate an agreed remedy and check that the relevant finding is resolved. | 3/3/3 |
| MS-SEC08 — Document security control assurance | Connect a security requirement, control and check result in a reviewable assurance record. | 3/3/3 |
| MS-SEC09 — Communicate security recommendations | Explain a security finding, decision or control to the audience responsible for action. | 3/3/3 |
| MS-SEC10 — Maintain security policy procedures | Keep an agreed security policy and its operating procedures consistent with the stated scope. | 3/3/3 |

## Integrity pins

| Pin | SHA256 |
| --- | --- |
| ontology_seed.json | `0006bb11ac5c20687eb90be4807289ecea309a5657781543792e18f556eb5125` |
| backend manifest | `52d065a031aa9adca51808c59a7682872b7436343f0c300db84cfe1beb2fe882` |
| catalog-scope.json | `c2454bde23764d061b6b25b54d434141715326d75eaa3201026618e7e4136231` |
| ontology_dataset.xlsx | `046a6fe464f77791a53da65ba4d43eabb25daad3bbe06756681e600de3704136` |

Item content canonicalization and identity/version behavior are specified in IMPORT_CONTRACT.md. The official ontology JSON/workbook and V1-V22 migration bytes are unchanged. Main graph replacement and local migration/import were subsequently authorized and observed; see LOCAL_CUTOVER.md/local-readback.json. The existing EMPLOYEE supplies only creation attribution, not Admin/expert review. Publication, Identity/Catalog permissions and parameters remain prerequisites, not silent defaults.
