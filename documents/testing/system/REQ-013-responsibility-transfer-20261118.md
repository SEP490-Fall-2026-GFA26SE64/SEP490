# REQ-013 — responsibility transfer manual checklist, 2026-11-18

Browser/Playwright: **Not Run**, following the user's explicit standing request to inspect the interface personally. No live URL, screenshots, console or network results are claimed.

Use the actual running workspace's `/ld-manager/modules` and `/expert/modules` routes after updating the backend/frontend and applying V70 through that environment's normal migration process. Do not switch migration lineages. No live deployment or migration was performed by the agent.

Prerequisites: one L&D Manager, two active Experts A/B in the same organization; an existing owned module; optionally a development seed module. Use separate test content for destructive or publication actions.

1. As L&D Manager, open the module row actions → Change responsible person / Đổi người phụ trách. Confirm the current owner, eligible same-organization targets and disabled confirmation before selecting a replacement.
2. Transfer A → B. Reload the page: the owner column shows B. In details, creator/importer remains A (or DEVELOPMENT_SEED for a seed source).
3. Open version/history details. Verify A → B, actual Manager and transfer time. Transfer B → A and reload: both transfer events remain.
4. Sign in as the former owner: no edit/submit/archive/restore/delete rights. Sign in as the current owner: only state-appropriate actions are available. Experts never see the transfer action.
5. Confirm module content, learner-facing released version and review state are unchanged, including transfer while awaiting approval or archived.
6. With two manager sessions using the same module version, transfer from the first then submit from the second. The second must report a stale change and retain the successful owner's value after reload.
7. At desktop/mobile widths, check the owner column/field, dialog scrolling, long names, select labels and history readability. If no replacement Expert exists, confirm the empty explanation and disabled action.

Automated component and persistence results are [separate](../unit/REQ-013-responsibility-transfer-20261118.md); they do not substitute for the checks above.
