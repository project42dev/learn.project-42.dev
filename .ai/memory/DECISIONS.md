# Decisions

- Browser sign-in uses OIDC Authorization Code with PKCE and stores access tokens
  in session storage.
- Browser-local learning remains available before registration and for accounts
  that are pending, rejected, suspended, or revoked.
- Export and deletion controls direct learners to sign in again when recent
  authentication is required.
- Account deletion uses an exact confirmation phrase and a seven-day cancellation
  window.
