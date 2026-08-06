# Handoff

## Active branch

`main`, based on `2d2ae33` before the final account-backed copy correction.

## Current candidate

Learn `0.12.1` consumes Platform `0.72.0` and content `0.42.0`.

The candidate:

- restores Sign in as the first signed-out profile-menu action;
- describes active learning progress, scores, badges, and transcripts as
  account-backed rather than browser-local;
- keeps account request, sign-in, and recovery reachable from `/account` while
  class, progress, and transcript surfaces remain authentication-gated;
- removes obsolete browser-local merge and signed-out transcript browser tests;
- keeps profile preferences in memory while the account API owns persistence;
- updates consent controls optimistically and rolls back failed writes;
- uses valid hosted progress and authoritative transcript mocks in journeys;
- waits for the semantic module-completion progress write before navigation;
- handles non-privileged Windows symlink checks without hiding other errors.

## Verification

- Audit, facts, governance, release, lint, typecheck, unit, rendered-route,
  link, accessibility, container, and production-acceptance stages passed.
- Production build passed for Learn `0.12.1`.
- Runtime Playwright coverage passed: 31 tests active, two intentionally skipped.
- GitHub Pages export produced 101 HTML routes and four endpoints.
- GitHub Pages artifact tests passed: six of six.
- GitHub Pages Playwright passed: 31 tests active, two intentionally skipped.
- The focused reliable-agent journey passed after waiting for the specific
  completed-module PUT.
- The focused legal/account responsive suite passed: two of two.
- After the final copy correction, lint passed with two pre-existing warnings,
  typecheck and a fresh production build passed, and the focused account,
  profile, transcript, and legal browser suite passed with 17 active tests and
  two intentional skips.

## Outstanding release gates

- Commit and push the final account-backed copy correction on `main`.
- Confirm required GitHub Actions checks pass for the pushed commit.
- Confirm the deployed Learn profile menu exposes Sign in first while signed
  out, and confirm authenticated progress/transcript destinations remain gated.
