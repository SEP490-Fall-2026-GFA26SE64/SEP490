# REQ-060-F01-F03: Manual registration and Gmail acceptance

**Approved scope:** registration, email proof, mandatory authenticator, recovery and secure resume only. See [contract](../../features/Organization%20onboarding/README.md) and [actual results](REQ-060-registration.md).  
**Live status, 2026-10-21:** Not run / Blocked. Do not enter credentials, proof codes, QR secrets or recovery codes in chat or evidence.

The user deferred live acceptance and requested shutdown. The isolated test stack was stopped at 20:10 +07:00 with both database volumes preserved. Use the [system startup commands](REQ-060-registration.md#commands) before section A; the local URLs are not currently running.

## A. Isolated local review

Prerequisites: isolated test stack running, Chrome, synthetic `@example.test` addresses, and access to Mailpit. Actor: Guest/prospective administrator with no organization membership.

1. Open <http://127.0.0.1:8089/guest/register>. Submit valid organization/admin details and a 12-128-character password. Leave slug/industry/headcount empty.
   - Expected: saved pending registration, generated reserved slug, no subscription/workspace entry. Optional values remain null, not fabricated defaults.
2. Open <http://127.0.0.1:8026>, inspect only the message for your synthetic account, and enter its six-digit code in the registration page.
   - Expected: email verified; authenticator enrollment remains mandatory. The email alone cannot complete registration.
3. Scan the locally rendered QR or manually enter its key into an authenticator. Enter its current code.
   - Expected: ten recovery codes shown once. Store them privately and acknowledge; completed registration shows committed read-only details.
4. Sign out and open <http://127.0.0.1:8089/guest/resume>. Enter password, then a fresh authenticator code.
   - Expected: same saved registration. Reusing an already accepted time-step code fails; wait for the next code. No workspace access is granted.
5. In a separate browser context, sign in and choose recovery. Enter one unused recovery code and enroll a replacement authenticator.
   - Expected: old sessions are denied immediately; replacement codes/factor supersede old ones. Recovery alone does not grant a full session.
6. Use another synthetic email/browser context and try duplicate email, reserved/conflicting slug, incorrect code and refresh.
   - Expected: explicit errors, preserved initial form input and no exposure of another registration. Pending/full fields are intentionally different DTO projections.
7. Review at 1440px and 375px, keyboard Tab/Enter, paste codes, and visible error focus.
   - Expected: no horizontal overflow or header overlap; no secret material in screenshots/storage.

Automated equivalents passed. This checklist is not evidence that a human has performed the live Gmail run.

## B. Configure live Gmail outside chat

Use a dedicated controlled Gmail sender/inbox and its supported app-password/SMTP policy. No production deployment or real payments are involved.

1. In your own terminal, copy [the template](../../../.env.example) to ignored `.env.registration-live`. Confirm `git check-ignore .env.registration-live` lists that file. Never commit it.
2. In the editor configure:
   - Independent database/Neo4j passwords.
   - `POSTGRES_PORT=15434`, `NEO4J_HTTP_PORT=7476`, `NEO4J_BOLT_PORT=7689`, `API_PORT=18082`, `WEB_PORT=8090`, after checking they are free.
   - `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_AUTH=true`, `SMTP_STARTTLS=true`.
   - `SMTP_USERNAME`, `SMTP_PASSWORD` and `SMTP_FROM` for the controlled sender, outside chat.
   - Two independent CSPRNG-generated 32-byte Base64 values for `REGISTRATION_ENCRYPTION_KEY` and `REGISTRATION_HMAC_KEY`. Keep them stable for this database. Never use the deterministic Mailpit fixture keys.
   - `REGISTRATION_COOKIE_SECURE=false` only for this loopback HTTP check. HTTPS deployments require Secure cookies and separate production review.
3. To generate/store the keys locally without printing them, after creating the ignored file:

```powershell
$settings = Get-Content .env.registration-live
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
foreach ($name in @('REGISTRATION_ENCRYPTION_KEY', 'REGISTRATION_HMAC_KEY')) {
    $bytes = New-Object byte[] 32
    $rng.GetBytes($bytes)
    $settings = $settings -replace "^$name=.*$", ($name + '=' + [Convert]::ToBase64String($bytes))
}
$rng.Dispose()
$settings | Set-Content .env.registration-live
Remove-Variable settings, bytes, rng
```

Do not regenerate keys after enrolling real test accounts: existing encrypted factors/proofs depend on them. Do not run `docker compose config` or inspect container environment into shared logs/chat.

4. After operator confirmation, start the separate local project:

```powershell
docker compose --env-file .env.registration-live -p adapt-learn-graph-registration-live -f compose.dev.yml up --build -d
```

Do not include the Mailpit test override. Expected live URL is <http://127.0.0.1:8090/guest/register>, but record the actual reachable URL and health result. Starting this project must not replace an existing shared stack.

## C. Assisted live acceptance (AC-09)

The owner performs sensitive browser actions; record only outcome, actual time/environment and redacted observations.

| Step | Expected result | Actual result |
| --- | --- | --- |
| Register using the controlled inbox | One pending registration; saved data retained if SMTP fails. | Not run |
| Inspect Gmail Inbox/Spam and arrival time | Real message reaches controlled Gmail inbox; SMTP status alone is insufficient. | Not run |
| Enter email proof privately in browser | Email verified and authenticator setup offered. | Not run |
| Scan QR/manual key in a real authenticator; confirm code | Registration completes; privately save ten recovery codes. | Not run |
| Sign out and sign in with password + fresh authenticator code | Same saved fields/stage returned; no workspace entry. | Not run |
| Optional assisted recovery using one saved code | Restricted re-enrollment, old-session revocation and replacement factors/codes. | Not run |

Only the first five confirmed outcomes, plus the existing automated recovery checks, satisfy the agreed assisted live gate. If Gmail policy blocks app passwords, mail never reaches the inbox, or any required action cannot be completed, keep AC-09 Blocked and record the exact next action. Never invent reviewer names/timestamps.

## D. Stop without deleting data

When the operator no longer needs the services:

```powershell
docker compose --env-file .env.registration-live -p adapt-learn-graph-registration-live -f compose.dev.yml stop
```

For the synthetic test stack, retain its fixture-key environment and use `docker compose -p adapt-learn-graph-registration-test -f compose.dev.yml -f compose.registration-test.yml stop`. Preserve volumes and keys; no `down -v`, reset, payment, commit or deployment is authorized by this checklist.

## E. Public landing review (revision 13)

Prerequisites: current dev stack running at <http://127.0.0.1:8088/>, Chrome, preferably a fresh browser context. Actor: unauthenticated Guest; no account, organization or inbox is required. These are non-mutating navigation checks; do not submit registration or send live email. Automated equivalents and screenshot inspection passed on 2026-10-21; this does not claim a human completed the checklist.

1. Open <http://127.0.0.1:8088/>. Also open `/home` and `/guest`.
   - Expected: both aliases return to the public home. Hero, illustrative graph, benefits, registration steps, FAQ and final CTA appear; brand text is readable.
2. Choose **Register your organization** or **Get started**.
   - Expected: <http://127.0.0.1:8088/guest/register> shows the existing real registration form. Navigate back without submitting.
3. Choose **Resume registration**, then return and choose **Workspace sign in**.
   - Expected: `/guest/resume` shows secure registration sign-in; `/login` shows enterprise sign-in and the existing demo-role controls, without the two guest signup/resume links. The sign-in brand returns home.
4. Select VI/EN (inside the menu on mobile), open the FAQ with Enter/Space, and use Tab through links.
   - Expected: localized copy and control labels, announced expanded states and visible focus. First Tab on a fresh landing reaches **Skip to content**; Enter focuses main.
5. Use DevTools responsive view at 375x812 and 812x375. Open the menu, focus an item, press Escape, then reopen and follow a section link.
   - Expected: focus returns to the menu trigger on Escape; the menu closes on section navigation; CTA is reachable in landscape; no horizontal scrolling, clipped text or header-obscured FAQ focus.
6. Emulate `prefers-reduced-motion: reduce` in DevTools Rendering and reload.
   - Expected: all sections and graph paths are visible without animated translation/scale/path drawing. With a `.dark` class on the root HTML element in DevTools Elements, text and brand remain readable against themed surfaces.

Source navigation: [GuestLandingPage.tsx](../../../frontend/src/features/guest/GuestLandingPage.tsx), [App.tsx](../../../frontend/src/app/App.tsx), [browser spec](../../../frontend/system-tests/REQ-060-landing.spec.ts). Payment, workspace activation and live Gmail acceptance remain separate work.
