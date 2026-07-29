# Handoff

## Active branch

`feat/authoritative-transcripts-ab5176`

Base: exact `origin/main` commit
`c52e944ea07442e6d1e56f4fb450de81924df6bc`.

## Scope

Distinguish browser-local progress exports, authoritative durable-account
transcripts, learning achievements, and issued credentials on the learner
profile. Do not change identity/session storage, release/deployment workflows,
schemas, production, or branding/content.

## Implemented

- Approved learners download the authoritative CSV directly from
  `/v1/me/transcript.csv` through the existing cookie-authenticated API client.
- Signed-out and non-approved learners retain the clearly labelled
  browser-local CSV fallback.
- Recent-authentication failures provide an accessible retry path without
  exposing untrusted API details.
- Learning achievements are labelled as progress evidence, not issued
  credentials; the issued-credential surface remains explicitly empty until a
  server-side credential lifecycle exists.
- Public documentation and browser tests cover authority, retry, cookie-only
  requests, downloads, and accessibility.

## Verification

- Clean `npm ci` — passed; 732 packages audited, zero vulnerabilities.
- Complete `npm run check` — passed.
- Unit tests — 25 passed.
- Rendered route tests — 17 passed.
- Runtime browser suite — 39 passed, zero failed.
- GitHub Pages artifact tests — 3 passed.
- GitHub Pages browser suite — 39 passed, zero failed.
- Link integrity — 99 HTML routes, 4 metadata endpoints, 4,403 internal
  references, 142 external links.
- Release facts, repository governance, brand and diagram integrity, lint,
  typecheck, container contract, builds, exports, and accessibility assertions
  passed.
- `npm audit --audit-level=high` reported zero vulnerabilities.
- `git diff --check` passed.

## Delivery boundary

- This branch is a review candidate only. It must not be merged, released, or
  deployed by this workstream.
- No identity, session, account, database, Worker, Pages, Cloudflare, Entra,
  repository-setting, or production mutation is included.
- Production deployment and authenticated learner validation remain separate
  owner/release gates.
