# Baseline and Skill Assessment keyboard controls

Verified locally on 18 November 2026, against working-tree changes based on `49e39607`. Scope: FR-06.02 and FR-06.08 Employee assessment interaction. No seed, database, scoring, answer-key, API or RIASEC behavior was changed.

## Delivered behavior

The shared `BaselineAttemptPanel` supports number keys in displayed option order: 1–9, and 0 for option 10 when present. Enter with a selected answer saves through the existing command lifecycle and advances only after the returned attempt contains the accepted choice. The final question opens the existing submission confirmation; it never submits automatically. Empty Enter, auto-repeat, modifiers/IME, editing controls, busy/locked/expired/finalized attempts are guarded. Numeric selection moves focus back to the question, and the next question receives focus after accepted navigation. Existing native radio/button keyboard behavior remains available.

## Actual verification

| Check | Result | Boundary |
| --- | --- | --- |
| `BaselineKeyboard.test.tsx` | 10 passed | Both purposes; delayed acceptance, duplicate Enter, final confirmation, unsuccessful save/retry, state/editing guards, tenth option |
| `WF05AssessmentStates.test.tsx` | 1 passed | Existing per-module assessment-state regression |
| `assessment-keyboard.spec.ts` | 5 passed | Installed Chrome: both purposes × EN/VI; mobile unsuccessful-save/retry and no horizontal overflow |
| `npm.cmd run build` | Passed | TypeScript project build and Vite production bundle |
| Scoped oxlint | Passed | Changed application, translations, test and fixture files |
| Additional `RiasecExperience.test.tsx` | 3 passed, 1 failed | Existing autosave case looks for literal `start`; current UI renders `Start assessment`. RIASEC source/test was not edited. This optional regression suite is not fully green. |

Chrome used the existing Playwright config and a Vite server at `http://127.0.0.1:28189`. The fixture renders the real component and translation provider with synthetic papers and controlled in-memory command acknowledgements. Backend API traffic is blocked. This establishes browser/component behavior, not authenticated API persistence, scoring, seed readiness or full-stack acceptance. No Docker service/database was started or modified.

The mobile screenshot was visually inspected: `frontend/test-results/assessment-keyboard-mobile-7a194-uestion-retry-advances-once-system-chrome/mobile-keyboard.png`. Generated `test-results` files are local artifacts and may be replaced by later runs.

Commands from `frontend`:

```powershell
node node_modules/vitest/vitest.mjs run src/features/employee/baseline-assessment/BaselineKeyboard.test.tsx src/features/employee/baseline-assessment/WF05AssessmentStates.test.tsx src/features/employee/riasec/RiasecExperience.test.tsx
npm.cmd run build
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 28189 --strictPort
# A separate terminal, while the local Vite server runs:
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:28189'
node node_modules/@playwright/test/cli.js test --config=playwright.system.config.ts assessment-keyboard.spec.ts
```

Manual check against a prepared real environment: open an active baseline, press 2 then Enter, observe saved answer/next question, repeat in Skill Assessment, and confirm the final question requires explicit submission. With a slow/failed connection, remain on the same question until an accepted answer is returned. This live check remains unverified here.
