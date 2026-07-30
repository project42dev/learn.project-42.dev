# Production progress-migration acceptance

This opt-in test supplies the final production evidence for browser-to-account
progress migration. It proves that one approved learner can import a browser
record, retrieve it through a separately authenticated session, replay the exact
import without duplication, verify it in an account export, and deliberately
retain or remove the browser recovery envelope.

The test writes one permanent assessment attempt and module-completion record.
Use only a dedicated production acceptance account whose learner record is
approved for this purpose. Never run the test with a representative learner,
owner's everyday account, or another person's account.

The normal test and CI commands do not run this suite. The suite fails before
opening a browser unless every production guard is supplied.

## Capture two independent sessions

Sign in twice in separate browser sessions and save each authenticated state
outside the repository. These files contain a production session cookie and are
credentials.

```powershell
npx playwright codegen --save-storage "D:\private\project42-primary.json" https://learn.project-42.dev/profile
npx playwright codegen --save-storage "D:\private\project42-secondary.json" https://learn.project-42.dev/profile
```

Finish sign-in and confirm that the profile identifies the same approved
acceptance account in both windows before closing them. Do not reuse the same
storage-state file for both sessions.

## Supply an explicit run

Set the following values only in the current process. The account identifier is
the opaque Project 42 account ID returned by the account service, not an email
address, Entra subject, or tenant identifier. Choose a new lowercase run ID and
canonical UTC timestamp for every run.

```powershell
$env:PROJECT42_PROGRESS_ACCEPTANCE_CONFIRMATION = "I_UNDERSTAND_THIS_WRITES_IMMUTABLE_PRODUCTION_LEARNER_DATA"
$env:PROJECT42_PROGRESS_ACCEPTANCE_PRIMARY_STATE = "D:\private\project42-primary.json"
$env:PROJECT42_PROGRESS_ACCEPTANCE_SECONDARY_STATE = "D:\private\project42-secondary.json"
$env:PROJECT42_PROGRESS_ACCEPTANCE_ACCOUNT_ID = "<private-opaque-account-id>"
$env:PROJECT42_PROGRESS_ACCEPTANCE_RUN_ID = "production-20260730-001"
$env:PROJECT42_PROGRESS_ACCEPTANCE_OCCURRED_AT = "2026-07-30T12:00:00.000Z"
$env:PROJECT42_PROGRESS_ACCEPTANCE_BACKUP_DECISION = "retain"
$env:PROJECT42_PROGRESS_ACCEPTANCE_LEARN_ORIGIN = "https://learn.project-42.dev"
$env:PROJECT42_PROGRESS_ACCEPTANCE_API_ORIGIN = "https://api.project-42.dev"
npm run test:production:progress-migration
```

`PROJECT42_PROGRESS_ACCEPTANCE_BACKUP_DECISION` must be either `retain` or
`remove-after-verified-export`. Removal affects only the recovery envelope in
the test's temporary browser context. It does not delete the authoritative
server record or modify either source storage-state file.

## Evidence handling

The Playwright attachment contains only the run identifier, timestamp, generated
attempt and import identifiers, revision, backup decision, and evidence counts.
It does not contain the account ID, email, provider identity, tenant, session
cookie, or token. Copy only that sanitized attachment into the private release
evidence.

Do not upload Playwright output, traces, screenshots, downloads, or the two
storage-state files. This suite disables traces, screenshots, and video. Delete
both private storage-state files after the evidence is accepted:

```powershell
Remove-Item -LiteralPath "D:\private\project42-primary.json"
Remove-Item -LiteralPath "D:\private\project42-secondary.json"
```

If the run stops after the import, do not select a new run ID and try again.
Inspect the authoritative progress record first. The same run ID deterministically
reuses the same attempt and import evidence so an exact retry can prove
idempotency.
