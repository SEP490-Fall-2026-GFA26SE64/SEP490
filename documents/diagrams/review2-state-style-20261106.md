# Scoped state-diagram formatting — 2026-11-06

**Subsequent approved ST-14 correction:** ST-14 now uses `IN_PROGRESS → SUBMITTED → PASSED / FAILED`, evaluated against L&D's configured pass rule. A rule of at least 7/10 is an example, not a global constant. Evidence-sufficiency, auto-submit and adaptive-stop branches are removed from ST-14. Its new [PNG](mermaid/st01-standard-20261106/st-14-rule-based-20261106.png) and [checks/hashes](review2-st14-rule-20261106.json) supersede the earlier ST-14 content-preservation observation and hash below. Other state diagrams are unchanged.

Final scope: **ST-13, ST-14, ST-16, ST-17, ST-18 and ST-19 only**, using the unchanged ST-01 as the visual reference. ST-15 is removed from the current report/image index and [archived](archive/st-15-20261106/README.md). All 14 other ST sources, SVGs and PNGs were restored byte-for-byte to their snapshots from before this formatting task. Existing numbering is preserved.

[Current six images and sources](mermaid/st01-standard-20261106/README.md) · [Checks and hashes](review2-state-style-20261106-checks.json).

## Presentation

The six selected diagrams reuse ST-01's Segoe UI font, neutral rounded states, subtle shadow, status palette, gray transitions, top-down direction and 2x PNG output. Their state labels, transitions, classes and existing aggregate boundaries are unchanged. For composite states, the renderer expands only existing frame bounds to include their own loop labels, without moving states or changing transitions. No artificial phase panels or jump connectors are introduced.

Report 4 uses new PNG paths for these six images to avoid cached older renders. Other ST image paths were restored. ST-15's image, source link, notes and lifecycle-coverage row were removed from the report; no other diagram is renumbered.

## Actual verification

| Check | Result |
| --- | --- |
| ST-01 reference source/SVG/PNG unchanged | Passed, byte comparison |
| 14 out-of-scope ST source/SVG/PNG sets restored | Passed, SHA-256 comparison with pre-task snapshots |
| Six selected graph bodies, labels and classes preserved | Passed, normalized-body comparison ignoring presentation direction |
| Six selected theme/state-spacing configs match ST-01 | Passed |
| Mermaid 12.2.0 syntax/render and browser errors | Passed, six selected diagrams |
| Edge-label versus node and label-label overlaps | None detected |
| Expanded composite-frame overlaps | None detected |
| SVG XML | Passed |
| PNG scale and current copies | Passed, 2x and byte-identical copies |
| Report scope and ST-15 removal | Passed, six current-version image links; other links restored |
| Visual review | Completed, overview plus detailed ST-13/17/18/19 inspection |

Reproduce only the approved six with `node documents/diagrams/render-state-diagrams.cjs <mermaid12.min.js>`. The renderer requires the existing frontend Playwright installation and a supplied Mermaid 12.2.0 standalone library; no project dependency was added. It rejects IDs outside the six-item scope.

The [superseded all-state run](archive/state-style-superseded-20261106/README.md) is historical evidence only. The 14 unrelated diagrams from that run were rolled back. This documentation-only task makes no application/database/runtime acceptance claim.
