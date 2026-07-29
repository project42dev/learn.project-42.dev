# Handoff

## Active branch

`feat/hosted-profile-receipts-ab5419`

## Implemented

- Advanced the reusable platform dependency to released `v0.63.0` at immutable
  commit `8116cd9b8b6d40287cc52986989180d3cbb2e295`; this tag contains merged
  platform PR #104.
- Approved signed-in learners now load and save locale, time zone, reduced motion,
  and increased contrast through the self-scoped `/v1/me/profile` contract.
- Signed-out, unconfigured, legacy-contract, and temporarily offline states retain
  the accessible browser-local preference fallback. Successful hosted saves also
  refresh that non-sensitive offline fallback.
- Consent history displays the API's authoritative `current` or `legacy` contract
  classification without rewriting historical purpose or policy-version evidence.
- A deletion request exposes the API's one-time private receipt for intentional
  copy or download. The raw token is not written to browser storage, URLs,
  analytics, or logs and is discarded from the page when the learner confirms it
  is saved.
- `/account` includes an unauthenticated receipt-based deletion-status form that
  submits only `requestId` and `statusToken`, clears both inputs on submission, and
  renders privacy-safe failure messages without cross-account disclosure.
- Release facts and self-host compatibility now describe platform `0.63.0` and
  content `0.42.0`.

## Verification

- `npm run facts:check` — passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run test:container-contract` — passed.
- Production build with hosted API configuration — passed.
- Rendered-route suite — 17 passed.
- Hosted profile/privacy browser and axe suite — 7 passed.
- Account-progress and account-merge regression suites — 13 passed.
- Combined account browser regression after the platform upgrade — 20 passed.
- Production dependency audit — zero known vulnerabilities.

## Delivery boundary

- This worktree contains a local implementation candidate only. Nothing was
  pushed, published, deployed, or changed in Azure DevOps.
- Production use still requires the Worker release containing platform PR #104
  and its associated D1 migration before hosted preference and receipt behavior
  can be validated end to end.

No production tenant, client, learner, or resource identifiers belong in this
repository.
