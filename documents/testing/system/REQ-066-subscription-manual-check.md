# Subscription Lifecycle Manual Checklist

**Verified local environment:** 2026-10-23, web `http://127.0.0.1:8092`, API health `http://127.0.0.1:18084/actuator/health`, SMTP capture `http://127.0.0.1:8029`. The isolated project is stopped after testing; volumes are preserved.

## Prerequisites and Safe Startup

- Java 21, Docker Desktop, Node/npm and Chrome; existing repository dependencies.
- Do not use real accounts or merchant/SMTP credentials in the isolated test project.
- Test-only fixtures/provider live under backend test source and its separate Dockerfile, not the production jar/image.
- Existing development services at `:8088` and their V8 database remain untouched. Do not point test scripts at that stack.

```powershell
docker compose -p adapt-learn-graph-subscription-test -f compose.dev.yml -f compose.subscription-test.yml up --build -d
```

Wait for API health `UP` and web HTTP 200. The test override has independent ports/volumes and explicit blank merchant credentials. It does not perform financial operations.

For a reproducible synthetic setup, run the three Playwright specs:

```powershell
Set-Location frontend
$env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8092'
npx.cmd playwright test --config=playwright.system.config.ts REQ-028-subscription-purchase REQ-032-plan-configuration REQ-066-subscription-renewal
```

The specs create independent synthetic verified registrants/admins; secrets are test fixtures, not production credentials. For interactive review, use the ordinary registration/Mailpit flow at `/guest/register`, or the test fixture helper in the test spec. Do not copy fixture keys or accounts to a live environment.

## Guest

1. Complete registration/email/TOTP and save recovery codes, then open `/guest/plans`.
2. Compare all six fields of Starter/Growth/Enterprise. Select a plan and confirm the displayed current version.
3. At `/guest/checkout`, verify the exact amount, Vietnam-time expiry and distinct payment/activation/readiness panels. A redirect or browser storage change must not mark paid.
4. Use only the isolated test provider fixture to generate a signed test webhook. Confirm one activated subscription/workspace, including duplicate delivery and reload.
5. For a terminal-unpaid test order, reconcile first; confirm fresh terms for replacement. Pending/uncertain orders cannot create a second payable attempt.
6. Enter the workspace through the secure handoff. Expired/suspended states must never grant unrestricted workspace access.

## Platform Administrator

1. Sign in at `/login` with a synthetic Platform Administrator and TOTP.
2. Open `/platform-admin/subscriptions`; edit name/description/price/duration/seats. Currency is explicitly VND-only.
3. Save and reload. A stale expected version must conflict; previously created orders retain their original terms.
4. Suspend an isolated workspace. Its System Administrator can read billing/status but cannot start renewal or use protected workspace APIs.
5. Reactivate; membership and paid-period checks must still apply. No automatic extension, refund or seat override occurs.

## Organization System Administrator / Employee

1. At `/admin/subscription`, inspect current/scheduled paid periods, allocated/used seats, effective admission ceiling and payment history.
2. Renew through the same verified lifecycle. Active renewal appends, expired renewal begins at application, and at most one paid future period is allowed.
3. Lower-seat renewal requires current use to fit. Its unresolved/scheduled commitment constrains new activations; no Employee is automatically deactivated.
4. Supply real same-organization department/occupation reference records through the owning upstream process. Their absence must show the explicit prerequisite message, not demo options.
5. Open `/admin/users`, choose **Create User**, enter Employee name/email/role/department/occupation and send activation. Inspect Mailpit, open the single-use link, set a password and sign in without Employee MFA. W2 (2026-10-26) moves all user management off Subscription; the Users page also provides list/detail/filter/pagination/edit and membership confirmation actions.
6. Verify the stored fields and seat count. Deactivate/reactivate membership, including concurrent final-seat attempts; only one may acquire the last seat.
7. With a second organization/registrant, attempt cross-organization/order/resource access and forged role headers. Expect denial and no mutation.

## Verification / Cleanup

Repeat relevant flows at desktop and 390x844 mobile widths, EN/VI, reduced motion and keyboard-only input. Check dialog focus, inline errors, screenshots, console/network, then reload/API-read persisted outcomes.

```powershell
docker compose -p adapt-learn-graph-subscription-test -f compose.dev.yml -f compose.subscription-test.yml stop
```

Do not use `down -v` or reset preserved data. Live payOS acceptance is excluded from this local deliverable. Gmail AC-09 remains **Blocked**.

## Non-test Configuration and Operator Boundary

Configure `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, registration encryption/HMAC keys and SMTP settings privately using [.env.example](../../../.env.example). Set `SUBSCRIPTION_PUBLIC_URL` to the real HTTPS frontend origin. Register the externally reachable webhook URL `/api/v1/payments/payos/webhook` through the authorized merchant channel. Coordinate a dedicated merchant order-code namespace before sending traffic.

The optional `platform-bootstrap` profile accepts `subscription.bootstrap.account-id` for an already active, email-verified, MFA-enrolled account; it records an operator audit grant and has no public bootstrap endpoint/default password. Running it, migrating the retained development database, starting merchant traffic, real payments, live email or deploying requires separate authorization. This checklist does not grant that authorization.
