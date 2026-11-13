# REQ-013 — Desktop Module directory regression correction

2026-11-13. Prior badge refinement moved table activation to 2xl, causing desktop screens below that threshold to display oversized cards. Restored table layout from 768px upward, using an internal horizontal scroller and 1100px minimum table width. Mobile retains cards. Short Vietnamese labels, centered badges, creator-subtitle omission and all preview work remain.

Production build passed with existing bundle advisory. Playwright: **8/8 passed** at 1280/1440/1800/390, both English and Vietnamese. Desktop row display is table-row, headers visible, fixture row height below 160px; page does not overflow horizontally. Mobile stays grid. Badges do not wrap/overflow; Expert subtitle is absent. APIs were isolated fixtures, not live database verification. Screenshot inspected: `/tmp/sep490-module-table-restored-vi.png`; browser evidence: `/tmp/sep490-module-table-browser`.

Manual: open Expert Modules at desktop width in EN and VI; verify one compact row per Module and visible column headers. Narrow the browser and verify only the directory scrolls horizontally; phone width retains mobile layout. No backend/data changes, commits or staging.
