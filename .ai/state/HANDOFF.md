# Handoff

## Active branch

`main`, at `10d3f36` (chore(deps): bump @project42/platform to v0.72.1).

## Current candidate

Learn `0.12.1` consumes Platform `0.72.1` and content `0.42.0`.

The candidate:

- restores Sign in as the first signed-out profile-menu action;
- describes active learning progress, scores, badges, and transcripts as
  account-backed rather than browser-local;
- replaces remaining browser-local registration, capstone, profile, and
  learner-data claims while preserving portable JSON backup and legacy import;
- keeps account request, sign-in, and recovery reachable from `/account` while
  class, progress, and transcript surfaces remain authentication-gated;
- removes obsolete browser-local merge and signed-out transcript browser tests;
- keeps profile preferences in memory while the account API owns persistence;
- updates consent controls optimistically and rolls back failed writes;
- uses valid hosted progress and authoritative transcript mocks in journeys;
- waits for the semantic module-completion progress write before navigation;
- handles non-privileged Windows symlink checks without hiding other errors;
- separates "Sign in" from "Request an account" (checkbox-gated);
- records pending terms acceptance via `/v1/registration/terms-acceptance`;
- removes retired "Import previous progress" from all navigation;
- adds test for public catalog browsing vs module sign-in requirement;
- adds test for receipt-based terms acceptance persistence.

## Verification

- Audit, facts, governance, release, lint, typecheck, unit, rendered-route,
  link, accessibility, container, and production-acceptance stages passed.
- Production build passed for Learn `0.12.1`.
- Runtime Playwright coverage passed: 32 tests active, two intentionally skipped.
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
- After the active-surface cleanup, lint passed with the same two pre-existing
  warnings, typecheck and a fresh production build passed, and all 20 rendered
  HTML tests passed. The private production registration acceptance remains
  intentionally gated by its external receipt confirmation and state file.

## Platform

- Platform `v0.72.1` tagged and pushed. Migration `0019` adds a partial unique
  index for one current terms grant per learner per policy version.
  `recordRegistrationTermsAcceptance()` and `recordTermsAcceptance()` use
  `INSERT OR IGNORE` with conflict-safe fallback reads for idempotent terms
  acceptance. New `POST /v1/registration/terms-acceptance` endpoint.
- Platform CI verify job passed; secure-self-host-smoke fails on a pre-existing
  infrastructure issue (not caused by these changes).
- Signed release workflow queued for v0.72.1.

## Outstanding release gates

- Platform signed release workflow must complete.
- Learn CI and Deploy to GitHub Pages must complete.
- Platform smoke test failure is pre-existing and not blocking.
- Confirm required GitHub Actions checks pass for the pushed commit.
- Confirm the deployed Learn profile menu exposes Sign in first while signed
  out, and confirm authenticated progress/transcript destinations remain gated.
