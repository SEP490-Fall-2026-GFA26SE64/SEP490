# Review 2 Role-Level diagram verification — 2026-11-06

**Later scoped state-format revision:** only ST-13/14/16/17/18/19 follow ST-01. All other STs were restored; ST-15 is removed from the current report. [Current state-format verification](review2-state-style-20261106.md) supersedes the older state-image hashes/presentation observations below. Their recorded business/source checks remain historical.

**Current ACT-05 layout:** one continuous top-down flow, no panels and no P/L/C/B continuation circles. Main actions share one vertical axis; errors sit to the right, and return arrows run outside the content. [Current evidence and hashes](review2-act05-vertical-20261106.json) supersede ACT-05 results/images from the original batch and rejected panel iteration. All 35 nodes, 41 edges and original labels are retained. Orthogonal routes are checked against every unrelated node box; text bounds and SVG XML are checked. Other diagram results remain unchanged.

The [vertical SVG renderer](render-act05-vertical.cjs) reads the nodes, labels and exact edges from Mermaid, validates Mermaid syntax with 11.12.0, then uses fixed SVG coordinates to keep the main flow vertical and arrows clear of nodes. Chrome via the existing frontend Playwright dependency exports PNG and checks text bounds. This is a source-derived fixed SVG render, not an automatic Mermaid-layout claim; generic Mermaid viewers can position the same business graph differently. Reproduce with `node documents/diagrams/render-act05-vertical.cjs <mermaid.min.js> [chrome.exe]`. No application dependencies were added. The panel-rendering script and legend were removed. Historical panel-check JSON remains evidence of the superseded iteration, not the current layout.

Scope: approved documentation revision R1 for Report 3/Report 4. No application, database, dependency or deployment changes. These ERDs define a proposed flow model; they are not a capture of deployed tables. Shared Account/Organization/content entities are scoped references, not full replacements for the existing physical schema.

## Updated artifacts

- [ACT-05](mermaid/act-05.png): L&D Role-Level configuration/validation/activation, matching baseline admission, valid profile, Employee request, Expert review, learning/recalculation, completion or bypass-only target release, return to baseline for the new target.
- [ST-13](mermaid/st-13.png), [ST-14](mermaid/st-14.png), [ST-17](mermaid/st-17.png), [ST-18](mermaid/st-18.png), [ST-19](mermaid/st-19.png): matching configuration, profile and target-change lifecycle. Bypass remains Needs supplementation.
- [ST-15 — historical, now archived](archive/st-15-20261106/st-15.png): the initial revision preserved business states/transitions and changed unsafe label punctuation. ST-15 was subsequently removed at the user's request. ST-16's initial compatibility result predates its later scoped visual refresh.
- CERD-01..04 and LERD-01..04: four corresponding flow views; 27 distinct entities. LERDs enumerate every attribute defined in the scoped target model, with type, PK/FK and nullability. Cross-view references and target constraints are documented in Report 4 section 2.2.
- Historical DB-01..08 artifacts and physical table/field dictionary remain preserved. The report links to archived sources rather than displaying whole-system key-only diagrams as the new flow.

## Actual verification

| Check | Result | Method |
| --- | --- | --- |
| Mermaid syntax and render | Passed, 16 sources | Mermaid 11.12.0 parse/render in headless Chrome using installed Playwright; no page errors. |
| Updated SVG XML | Passed, 15 SVGs | PowerShell XML parse after XMLSerializer export. ST-16 original assets were not replaced. |
| Target attribute completeness | Passed | Compared every entity box in all four LERDs with the scoped model's complete attribute definitions, including repeated entities. This does not claim parity with every existing physical column. |
| Flow/state consistency | Passed | Source assertions for activation/error branches, learning loop, role return and guarded replacement; errors do not release the target. |
| Preservation | Passed | ST-15 semantic comparison ignoring punctuation; ST-16 byte comparison; retained physical table/field dictionary comparison; original color sets/font configuration comparison. |
| Report asset references | Passed | All selected Mermaid/image references resolve; SVG/PNG/source files exist. |
| Visual review | Passed | ACT-05 checked in three full-size screenshot sections; state-machine/ERD overview and detailed views inspected. Removed punctuation-generated nodes and shortened overlapping state labels. |
| Whitespace | Passed | `git diff --check` scoped to the two reports and Mermaid artifacts. |

[Machine-readable results, dimensions and SHA-256 artifact hashes](review2-role-level-20261106-checks.json).

## Manual review checklist

- [x] L&D invalid configuration cannot activate; Employee requires matching Active Role-Level config.
- [x] Valid baseline creates the selected Role-Level profile; invalid baseline does not fabricate a profile.
- [x] Employee reviews profile before request; initial Expert review remains explicit.
- [x] Learning/skill results update profile and recalculate remaining work; normal adaptation does not invent a new Expert approval.
- [x] Missing both module and certificate provision is distinguished from generic generation failure.
- [x] Completion or accepted bypass-only permits a new target; remaining ordinary work keeps the target locked.
- [x] New Role-Level returns to matching baseline admission and retains history.
- [x] Report palettes, fonts and entity/state box styling retained; no new color scheme.
- [x] ERDs omit unrelated subscription/payment/ROI domains and include target field nullability.

Runtime unit/API/integration/system testing: not applicable to this documentation-only revision; no product behavior or production readiness is claimed.
