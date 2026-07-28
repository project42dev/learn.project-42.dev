# Secure browser sessions

Learn delegates OpenID Connect to the Project 42 account API. The static browser
application knows only `NEXT_PUBLIC_PROJECT42_API_ORIGIN`; identity-provider
endpoints, client credentials, transaction state, PKCE verifier, tokens, and the
session-encryption key remain server-side.

## Browser flow

1. Learn sends the browser to `GET /v1/auth/start` with an exact same-origin
   `return_to` URL.
2. The account API completes Authorization Code with PKCE at its own callback.
3. The API returns the browser to Learn with an opaque `Secure`, `HttpOnly`,
   host-only session cookie scoped to the API host.
4. Learn calls `GET /v1/auth/session` with `credentials: "include"` and receives
   only the bounded account and session-expiry view.
5. Approved sessions rotate through `POST /v1/auth/renew`.
6. Sign-out revokes the Project 42 server session through
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
- Pending, rejected, and suspended accounts retain the server-issued account
  explanation but do not renew approved-only access.
- The legacy `/auth/callback` route never exchanges a code or accepts a token. It
  directs old flows to restart through the API-owned route.
- Account suspension, revocation, merge, rollback, or security rotation can
  revoke sessions server-side without relying on browser cleanup.
