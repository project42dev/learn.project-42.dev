# Secure browser sessions

Learn delegates OpenID Connect to the Project 42 account API. The static browser
application knows only `NEXT_PUBLIC_PROJECT42_API_ORIGIN`; identity-provider
endpoints, client credentials, transaction state, PKCE verifier, tokens, and the
session-encryption key remain server-side.

## Browser flow

1. Learn sends the browser to `GET /v1/auth/start` with an exact same-origin
   `return_to` URL.
2. The account API completes Authorization Code with PKCE at its own callback.
3. For an approved account, the API returns the browser to Learn with an opaque
   `Secure`, `HttpOnly`, host-only session cookie scoped to the API host.
4. For a pending or rejected request, the API returns a separate opaque,
   `Secure`, `HttpOnly` registration-receipt cookie. That receipt is not a
   learner session and cannot authorize account or learner-data routes.
5. Learn calls `GET /v1/auth/session` with `credentials: "include"`. When no
   approved session exists, it calls `GET /v1/registration/status`; rendering
   code receives only state, requested and updated timestamps, sign-in
   readiness, and a bounded next action.
6. Approved sessions rotate through `POST /v1/auth/renew`.
7. Sign-out revokes the Project 42 server session through
   `POST /v1/auth/signout`. Learn does not follow an API-supplied external
   logout URL; the next sign-in requires an interactive provider login.

Learn never reads the cookie and never stores an access token, ID token, refresh
token, OIDC transaction, state value, nonce, or PKCE verifier in browser storage.
The only identity-related session-storage record is the short-lived,
single-purpose GitHub account-link transaction; the provider token is exchanged
and retained only by the API.

## Cross-origin requirements

The API must allow the exact Learn origin, return
`Access-Control-Allow-Credentials: true`, reject wildcard origins, and require an
allowed `Origin` on cookie-authenticated mutations. Hosted and self-hosted
deployments must keep Learn and the API on compatible secure origins so the
session cookie is eligible for requests.

## Failure and recovery

- A missing or expired session returns Learn to the signed-out state without
  deleting browser-local learning progress.
- An unreachable API leaves the browser session untouched and offers retry or
  explicit sign-out.
- Pending and rejected requests receive a PII-free status view, never an
  account profile or authenticated learner session. Learn does not automatically
  poll the status route.
- A replaced, expired, or invalidated registration receipt produces a generic
  recovery state that does not reveal whether the owner approved, rejected,
  suspended, or revoked access. The learner starts a new secure sign-in.
- `429` and temporary status failures honor a bounded `Retry-After` delay. Learn
  does not render server error details or automatically retry.
- Suspended and revoked identities receive no learner session and no
  registration receipt. Learn displays only a generic account-unavailable
  state.
- The legacy `/auth/callback` route never exchanges a code or accepts a token. It
  directs old flows to restart through the API-owned route.
- Account suspension, revocation, merge, rollback, or security rotation can
  revoke sessions server-side without relying on browser cleanup.
