# REQ-013 — manual UI checklist, 2026-11-18

Agent browser/Playwright verification: Not Run at the user's explicit request; user will inspect the UI. No live URL was opened or verified. Use the running deployment's workspace-prefixed `/expert/modules` and `/ld-manager/modules` routes.

Prerequisites: authenticated Expert and L&D accounts in the same organization, existing owned modules; one module created and one imported through Excel/ZIP. Use isolated test content for any new creation/import.

- At desktop width, confirm the Responsible person / Người phụ trách column follows Module and shows the actual creator/importer, including when a different Expert views it.
- At mobile width, confirm the owner field and label remain visible; long names wrap. Module titles remain left aligned.
- Confirm no Assign for intake, Receive for editing, or waiting/not-received statuses appear, including View module details.
- Confirm existing content, versions, historical attribution, review and publication controls remain available to the proper actors.
- Confirm imported modules begin as owned drafts; another Expert remains view-only.
- Confirm missing authoring data, if encountered, is shown neutrally and does not invent a person or offer acceptance.

Historical intake Playwright journey is explicitly skipped because the feature has been retired; prior evidence remains historical. No live API, console/network, screenshot or reload verification is claimed for this run.
