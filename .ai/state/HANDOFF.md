# Handoff

## Active branch

`agent/learn-governance-docs-ab6434`

Base: exact `origin/main` commit
`ea911e8b28f959d6c83eac44343e87d5dd26bf6d`.

## Scope

Add complete public repository-local contributor, security, support,
compatibility, and deprecation guidance plus deterministic validation. Do not
change product content, identity behavior, release or deployment workflows, or
production.

## Implemented

- Adds `CONTRIBUTING.md` with repository ownership, local setup, validation,
  pull-request, review, privacy, and security-reporting guidance.
- Adds `SECURITY.md` with supported-version boundaries and the private GitHub
  Security Advisory reporting path.
- Adds `SUPPORT.md` with honest hosted, source, self-host, browser,
  compatibility, deprecation, and help boundaries.
- Links all three documents from the README and cross-links their related
  policies.
- Adds a zero-dependency governance validator to the normal `npm run check`
  gate.
- Adds seven deterministic tests that reject missing, empty, private-data-
  bearing, unlinked, incomplete, and broken-link governance documents.

## Verification

- Clean `npm ci` — passed; 732 packages audited, zero vulnerabilities.
- Complete `npm run check` — passed.
- Unit tests — 22 passed, including seven governance tests.
- Rendered route tests — 17 passed.
- Runtime browser suite — 12 passed and 25 configuration-gated cases skipped.
- GitHub Pages artifact tests — 3 passed.
- GitHub Pages browser suite — 12 passed and 25 configuration-gated cases
  skipped.
- Link integrity — 99 HTML routes, 4 metadata endpoints, 4,403 internal
  references, 142 external links.
- Release facts, repository governance, brand and diagram integrity, lint,
  typecheck, container contract, builds, exports, and accessibility assertions
  passed.
- The changed public file set passes the private-material and diff-hygiene
  scans.

## Delivery boundary

- This branch is a review candidate only. It must not be merged, released, or
  deployed by this workstream.
- No product content, identity, session, account, database, Worker, Pages,
  Cloudflare, Entra, repository-setting, or production mutation is included.
