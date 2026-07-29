# Handoff

## Active branch

`feat/admin-pagination-ab6358`

## Scope

The Learn owner console now consumes the reusable platform's optional
cursor-pagination response contract for:

- `GET /v1/admin/accounts`
- `GET /v1/admin/audit`

The implementation remains compatible with the currently deployed unpaged
platform `v0.63.0` response while the pagination platform release is coordinated.

## Implemented

- Account requests send a bounded `pageSize=25`, preserve the server-side account
  state filter, and pass only the opaque `nextCursor` returned by the API.
- Audit requests use the same bounded continuation contract.
- Load-more controls append records while rejecting duplicate IDs client-side.
- Result summaries distinguish shown, loaded, and more-available records without
  claiming an unknown total.
- Initial loading, empty result, final page, legacy unpaged response, and invalid
  or stale cursor states have explicit user-facing copy.
- An `invalid_admin_cursor` response retains already reviewed rows, stops unsafe
  continuation, and offers a first-page reload.
- Changing the server-side account-state filter or signed-in owner context
  discards pagination state and reloads from the first page.
- Load-more completion and stale-page recovery are announced through live regions
  and move focus to a persistent status target so keyboard users do not lose their
  place when a final-page button disappears.
- The legacy compatibility path treats a response with no `page` member as one
  complete response and never fabricates a continuation.

## Verification

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- Production-configured `npm run build` — passed.
- Production-configured rendered-route suite — 17 passed.
- Self-host container contract — passed.
- Focused paged and legacy owner journeys — 2 passed.
- Complete account-progress and account-merge browser suites — 13 passed.
- Pagination accessibility scan — zero WCAG 2.0/2.1/2.2 A/AA violations.
- Dependency installation audit — zero known vulnerabilities.

## Delivery boundary

- No dependency version, release, deployment, production data, or Azure DevOps
  state was changed.
- The Learn change must not be released until the platform pagination contract is
  published and the coordinated production deployment is approved.
- The public pull-request title and body must not contain private tracker links or
  identifiers. The delivery commit retains its required work-item reference.

No production tenant, client, learner, or resource identifiers belong in this
repository.
