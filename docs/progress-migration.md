# Browser-to-account progress migration

Learn keeps browser progress intact until an approved account has been loaded and
the learner confirms a migration preview.

## Merge rules

- Started paths and completed modules are combined by stable ID.
- Assessment attempts and capstone submissions retain their original IDs,
  timestamps, content versions, scores, and evidence.
- Identical attempt or submission IDs with identical evidence are kept once.
- The same immutable ID with different evidence blocks the import. Learn does not
  guess which record is correct.
- Badges are combined by stable ID, retain the earliest earned date, and combine
  evidence-module IDs.
- The account display name is retained unless it is still the default `Explorer`
  value.
- The most recently visited module is selected by its recorded timestamp.

The preview shows browser, account, and resulting counts before confirmation. It
also lists every browser path enrollment, completed module, assessment attempt,
capstone submission, and badge by stable ID with one of four dispositions:
`will add`, `already in account`, `will merge evidence`, or `conflict — import
blocked`.

Learn explains both effects before confirmation:

- merge retains account-only evidence, adds browser-only evidence, and keeps
  identical immutable evidence once;
- replace is unavailable and the preview counts the account-only evidence it
  would remove.

A failed request leaves the browser record unchanged and the account transaction
uncommitted.

## Retry and recovery

Learn derives the import receipt ID from the browser record. Retrying an unchanged
record therefore sends the same receipt and the account API handles it
idempotently. Before sending, Learn stores one local recovery envelope containing
the browser record, the last account record, the proposed merge, and the receipt.
The envelope is marked completed only after the API returns the authoritative
stored record.

The recovery envelope uses the key
`project42.progress.migration.recovery.v1`. It contains learning data but no access
token, identity-provider token, tenant identifier, issuer, subject, or email.
Learn accepts only the documented versioned properties, recomputes the
SHA-256-based import receipt from the retained browser record whenever the
envelope is loaded, and rejects evidence whose creation, completion, or export
verification timestamps are out of order. The original creation timestamp is
preserved across retries and the pending-to-completed transition.

The learner can download a versioned
`project42/progress-reconciliation` JSON package before import and while a
recovery envelope remains. The package contains:

- portable browser, account, and proposed-merge records;
- exact per-item dispositions and conflict evidence;
- browser, account, merge, addition, and replace-risk counts;
- the projected transcript; and
- the deterministic import receipt and recovery state.

After a completed import, Learn retains the original browser/account comparison
until the learner explicitly removes it. The learner can ask Learn to retrieve a
fresh self-scoped account export, verify that its authoritative progress matches
the retained merge, and download it. Removal requires a separate acknowledgement
and is permitted whether or not the learner first verifies an export; it never
silently removes the backup.

## Unsupported browser records

Learn validates the complete local progress shape and every referenced learning
path, module, assessment, capstone, and badge against the current catalog before
hydrating or synchronizing it. Malformed JSON, unsupported future schema versions,
and catalog-incompatible records are quarantined locally.

Quarantine never replaces the original `project42.progress.v1` value with an empty
record. The profile page pauses account synchronization, explains the validation
failure, and lets the learner download the untouched source record. The local
quarantine envelope contains only the raw learning record, validation messages,
the source-key name, and capture metadata; Learn does not add account identifiers,
email addresses, identity claims, session values, or access tokens.

## Validation

The browser suite covers:

- overlapping browser and account records;
- deterministic preservation of attempts from both records;
- an interrupted request followed by a retry with the same receipt;
- reload after a successful import without replay;
- blocking mismatched immutable attempt evidence;
- exact item-level preview and portable reconciliation download;
- retained-backup export verification and explicit removal;
- automated WCAG A/AA checks on the completed journey.

CI builds with non-secret test-only identity and API origins so these hosted-account
tests cannot silently skip on pull requests.
