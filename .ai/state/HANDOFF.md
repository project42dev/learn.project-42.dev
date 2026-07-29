# Handoff

## Active branch

`feat/authoritative-transcripts-ab5176`

Base: `c52e944ea07442e6d1e56f4fb450de81924df6bc` (`origin/main`)

## Release candidate

Learn `0.11.0` consumes the signed Platform `0.67.1` tag, resolved by the
lockfile to Platform commit `a06aa6a4d394f3344c0ec2ad6839bb29ba2eadb8`.

The candidate:

- labels portable browser-local records separately from authoritative durable
  account transcripts;
- downloads authoritative CSV through the existing HttpOnly-cookie account
  session for approved learners;
- provides an accessible recent-authentication retry and safe failure path;
- distinguishes learning achievements from durable issued credentials; and
- preserves browser-local JSON/CSV export for signed-out and non-approved
  learners.

## Prepared

- `package.json`, package-lock root, public release facts, and self-host
  compatibility identify Learn `0.11.0`.
- The dependency spec, installed package, lockfile resolution, public release
  facts, self-host compatibility, and container contract identify Platform
  `0.67.1`.
- README release notes document the transcript-authority and
  achievement-versus-credential boundaries.
- No identity configuration, token storage, database schema, production
  configuration, tenant/owner identifier, credential, learner data, or private
  operational value is included.

## Verification

- CI-compatible npm 10 `npm ci` passed and audited 738 packages with zero
  vulnerabilities.
- Complete `npm run check` passed.
- Unit tests: 25 passed.
- Rendered route tests: 17 passed.
- Runtime browser suite: 39 passed, zero failed.
- GitHub Pages artifact tests: 3 passed.
- GitHub Pages browser suite: 39 passed, zero failed.
- Release facts verified site `0.11.0`, Platform `0.67.1`, content `0.42.0`,
  eight paths, 72 modules, and four provider scopes.
- Governance, brand, diagram, lint, typecheck, container, build, link,
  accessibility, account-authority, and transcript retry assertions passed.
- `npm audit --audit-level=high` reported zero vulnerabilities.

## Outstanding release gates

- Protected pull-request CI and self-host image verification must pass.
- Merge must preserve the reviewed commits and use the authorized repository
  administrator bypass only after all required checks pass.
- The exact merged commit must be published as the unique remote `v0.11.0` tag;
  the shared local clone contains an unrelated stale local tag that must not be
  moved or deleted.
- The signed release workflow must publish and sign the Pages archive,
  compatibility manifest, checksums, and OCI image.
- GitHub Pages must deploy the exact merged main commit and the production
  profile/transcript surfaces must be validated.

Do not move related Stories to Resolved until all acceptance criteria, signed
release, deployment, and production evidence pass. Never close Stories from
this delivery workflow.
