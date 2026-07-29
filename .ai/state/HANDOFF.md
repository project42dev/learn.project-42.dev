# Handoff

## 2026-07-28 browser-progress migration candidate

- Branch: `feat/progress-migration-ab5784`.
- Learn `0.8.0` now previews browser, account, and merged progress before an
  approved learner confirms an import.
- The merge preserves immutable assessment and capstone evidence, combines
  non-conflicting progress deterministically, blocks mismatched immutable IDs,
  keeps a local recovery envelope, and reuses a content-derived import receipt
  across interrupted retries.
- Pull-request CI now supplies non-secret test-only public configuration so hosted
  account tests execute instead of silently skipping.
- The exact candidate passed `npm run check`: 18 runtime browser journeys, 18
  GitHub Pages journeys, rendered routes, link integrity, accessibility, build,
  type, lint, package, and Pages artifact gates.
- No infrastructure, identity-provider configuration, database, Worker, or
  production resource changed.

## Active branch

`feat/progress-migration-ab5784`

## Current candidate

- Learn `0.7.0` adds a searchable, state-filtered owner approval queue.
- Account transitions now use an accessible in-page review form with required
  audit reasons.
- Terminal revocation requires explicit typed confirmation.
- Application and Pages Playwright ports are configurable so isolated worktrees
  can validate concurrently.
- Owner workflow and trusted-domain launch-lock guidance is documented in
  `docs/owner-administration.md`.

## Verification

- `npm run check` passed, including 15 application browser journeys and the same
  15 exported GitHub Pages journeys.
- The targeted owner journey passed with focus, state-change request, terminal
  confirmation, and automated WCAG checks.
- `npm audit --omit=dev` reports zero known production vulnerabilities.
- GitHub CI verify and self-host image checks passed for commit `4905132`.

## Delivery state

- Draft pull request: Learn PR #17.
- No Cloudflare, database, Entra, identity configuration, or deployment change
  was made.
- The implementation task and parent administration story remain Active pending
  review, merge, release, and authenticated production validation.

No production tenant, client, owner, learner, or resource identifiers belong in
this repository.
