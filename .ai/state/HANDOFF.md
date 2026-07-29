# Handoff

## Active branch

`feat/account-request-status-ab5695`

Base: exact `origin/main` commit
`35391e81e61d18eee7b5d4788f5c581176144b1f`.

## Scope

Learn now presents the complete learner-facing account-request and private
registration-status experience published by platform `v0.65.0`.

## Implemented

- Pins `@project42/platform` and self-host compatibility metadata to immutable
  `v0.65.0`, peeled commit
  `5a083de3add80ad6635c6319391cba4f7e34b265`.
- Adds a provider-neutral public request entry with privacy, learner-data,
  local-learning, and approval expectations before identity-provider
  navigation.
- Distinguishes API-owned authenticated sessions from the separate HttpOnly
  registration receipt. Pending and rejected requests never become learner
  sessions.
- Consumes only the five PII-free `RegistrationStatus` fields from the released
  platform contract and rejects unsafe, inconsistent, or malformed responses.
- Handles pending, rejected, approved, expired/replaced receipt,
  provider-error, account-unavailable, and temporarily unavailable states with
  accessible fixed copy.
- Avoids automatic polling and server error-detail rendering; retry controls
  honor a bounded `Retry-After` window.
- Preserves browser-local learning and the signed-out deletion-receipt workflow.
- Documents the account/session/receipt boundary and recovery behavior.

## Verification

- Clean `npm@10.9.4 ci` — passed; 737 packages audited, zero vulnerabilities.
- Production-configured `npm run check` — passed.
- Unit tests — 12 passed.
- Rendered route tests — 17 passed.
- Runtime browser tests — 37 passed.
- GitHub Pages artifact tests — 3 passed.
- GitHub Pages browser tests — 37 passed.
- Link integrity — 99 HTML routes, 4 metadata endpoints, 4,402 internal
  references, 142 external links.
- Release facts, brand integrity, diagram integrity, lint, typecheck, container
  contract, production build, and Pages export — passed.
- Changed application/test lines were scanned for private ADO URLs, personal
  email addresses, GUIDs, credentials, secrets, and local paths; none found.

## Delivery boundary

- This worktree contains no deployment, ADO state change, push, pull request,
  merge, production session, Cloudflare, Entra, D1, or other cloud mutation.
- Production approval-flow validation remains outside this local Learn lane and
  requires the released platform API to be deployed and configured.
