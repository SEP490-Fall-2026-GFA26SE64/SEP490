# REQ-053 — L&D module navigation

2026-10-28. Real Compose Playwright spec `frontend/system-tests/REQ-053-ld-module-navigation.spec.ts`: 1 passed (27.3s; total34.5s), no HTTP mocks. Covers main L&D login, Modules, details/history, Learning content, return to approvals, cancel, confirm release, API readback and reload. Screenshot: `frontend/test-results/REQ-053-ld-module-navigation.png`. Uses its own submitted test package.

## Manual Test Checklist

Prerequisites: running Compose stack; existing L&D account; Expert-submitted module for review actions.

| URL / steps | Expected |
| --- | --- |
| http://127.0.0.1:28088/ld-manager/approvals → Modules | `/ld-manager/modules`; L&D Manager Console remains; Content Approval stays selected. |
| Open catalog module | Full catalog details; close retains manager URL. |
| Submitted module → Details & history | Creator/editor/revisions available; no actor switch. |
| Learning content → Approvals & assignments | URLs remain `/ld-manager/`; no Create content for manager. |
| Approve and release → Cancel | Submission remains unchanged. |
| Approve and release → Confirm → reload | Released persists; reviewer recorded. |

Interactive Vietnamese browser check confirmed Modules link retains `/ld-manager/modules` and L&D shell.

