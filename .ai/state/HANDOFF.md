# Handoff

## Active branch

`fix/device-local-quarantine-ab5424`

## Scope

Learn now fails safely when `project42.progress.v1` contains malformed JSON, an
unsupported schema version, an invalid full record shape, or catalog-incompatible
learning evidence.

## Implemented

- Reuses the platform portable-record validator and catalog reconciliation rules
  before hydrating a device-local record.
- Adds explicit badge and badge-evidence catalog validation.
- Preserves the original storage value byte-for-byte and writes a separate local
  quarantine envelope when browser quota permits.
- Blocks empty-record persistence and account synchronization while recovery is
  required.
- Shows accessible recovery guidance without rendering the raw record.
- Downloads the untouched raw record on explicit learner action.
- Documents the local-only privacy boundary and recovery behavior.

## Verification

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test:unit` — 4 passed.
- Production-configured `npm run build` — passed.
- Production-configured `tests/browser/account-progress.spec.ts` — 12 passed.
- Recovery-state WCAG 2.0/2.1/2.2 A/AA scan — zero violations.
- Production-configured `npm run check` — passed, including 31 runtime and 31
  GitHub Pages browser tests.

## Delivery boundary

- AB#5424 remains Active because exact item-level reconciliation, transcript
  projection guidance, local-backup removal, and authenticated production
  validation remain.
- AB#5784 remains Active because the authenticated production import,
  cross-device retrieval, and replay journey remains.
- No production data, identity configuration, account, database, Worker, platform
  release, or dependency version was changed.
