# Production learner-request acceptance

This opt-in check supplies production evidence for the learner account-request
boundary. It verifies that a real pending request has a private registration
receipt but no learner session, that only PII-free status is returned, and that
the narrow, keyboard, and automated accessibility experience remains usable.

Normal tests and CI never run this suite. The suite is read-only, but its
Playwright storage-state file contains a production credential and must remain
outside every repository.

## Capture the pending receipt

Use a dedicated production acceptance identity. Start from the public account
page, complete the configured identity-provider flow, and stop when Learn shows
that the request is waiting for review. Save that browser state outside the
repository:

```powershell
npx playwright codegen --save-storage "D:\private\project42-pending-request.json" https://learn.project-42.dev/account/
```

Do not approve the request before running the check. Record the exact `requestedAt`
UTC timestamp privately from the status response or owner console. Do not use an
email address, identity-provider subject, or account identifier as a run ID.

## Run the check

```powershell
$env:PROJECT42_REGISTRATION_ACCEPTANCE_CONFIRMATION = "I_UNDERSTAND_THIS_USES_A_PRIVATE_PRODUCTION_REGISTRATION_RECEIPT"
$env:PROJECT42_REGISTRATION_ACCEPTANCE_STATE = "D:\private\project42-pending-request.json"
$env:PROJECT42_REGISTRATION_ACCEPTANCE_REQUESTED_AT = "2026-07-30T12:00:00.000Z"
$env:PROJECT42_REGISTRATION_ACCEPTANCE_RUN_ID = "registration-20260730-001"
$env:PROJECT42_REGISTRATION_ACCEPTANCE_LEARN_ORIGIN = "https://learn.project-42.dev"
$env:PROJECT42_REGISTRATION_ACCEPTANCE_API_ORIGIN = "https://api.project-42.dev"
npm run test:production:registration-request
```

The sanitized JSON attachment contains request timestamps and validation
outcomes, but no email, name, identity provider, subject, account identifier,
cookie, token, or tenant value. Copy only that attachment into private release
evidence. Traces, screenshots, and video are disabled.

Delete the credential file after evidence is accepted:

```powershell
Remove-Item -LiteralPath "D:\private\project42-pending-request.json"
```

An identity-provider or callback failure is not a passing request. Preserve its
request ID privately, fix that upstream authentication failure, and repeat the
journey with a new dedicated acceptance identity.
