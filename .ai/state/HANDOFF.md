# Handoff

## Active branch

`agent/admin-approval-workflow-ab6227`

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

- Draft pull request: Learn PR #16.
- No Cloudflare, database, Entra, identity configuration, or deployment change
  was made.
- The implementation task and parent administration story remain Active pending
  review, merge, release, and authenticated production validation.

No production tenant, client, owner, learner, or resource identifiers belong in
this repository.
