# Gotchas

- The platform dependency must reference a reviewed `v`-prefixed Git tag, and
  generated release facts enforce that the installed package version matches it.
- GitHub Pages production OIDC variables are public browser configuration; secrets
  and private tenant operations remain outside this repository.
- The complete check normally takes several minutes because it runs two serialized
  Playwright suites.
