# Handoff

## Active branch

`feature/account-privacy-controls`

## In progress

- Added the `rejected` account state and owner transition controls.
- Added learner consent, JSON export, deletion request/cancellation, and
  reauthentication controls.
- Added the owner deletion-completion queue.

## Files changed

- `app/components/AuthProvider.tsx`
- `app/components/AccountDashboard.tsx`

## Verification

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run check` — passed, including build, links, 20 browser executions, and
  GitHub Pages export validation.

## Next steps

1. Commit and push the account UI.
2. After platform PR #38 merges, consume reviewed tag `v0.46.0`.
3. Update release facts, rerun the full gate, and open the Learn pull request.
4. Merge and verify the GitHub Pages production deployment.

No production tenant, client, or resource identifiers belong in this repository.
