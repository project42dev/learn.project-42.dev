# Project 42 Learn

The dedicated Project 42 learning experience at
[learn.project-42.dev](https://learn.project-42.dev): free, provider-neutral AI
learning paths, knowledge checks, progress, badges, and transcripts.

## Develop

```bash
npm ci
npm run dev
```

## Verify

```bash
npm run governance:check
npm run lint
npm test
```

Parallel worktrees can set `PROJECT42_PLAYWRIGHT_PORT` for application browser
tests and `PAGES_PORT` for exported Pages tests. Both default to `48142`.

The site consumes the versioned open-source learning core from
[`project42dev/project42-platform`](https://github.com/project42dev/project42-platform).
The current catalog includes the complete twelve-module Reliable Agent Workflows path
alongside the sixteen-module AI Foundations path. Its practical capstone includes complete
and deliberately flawed calibration packages, eight required operating artifacts,
criterion-level evidence mapping, failed-submission revision, a 100-point rubric,
and the Reliable Agent Operator badge. Profiles preserve attempts, capstone
revisions, evidence links, badges, and portable JSON/CSV exports in device-local
storage. When the public account-API origin is supplied at build time, approved
accounts synchronize those records across devices. New accounts are pending by
default; owners can approve, suspend, or revoke them and maintain exact verified
email-domain auto-approval rules. The accepted lifecycle, consent, retention,
export, deletion, recovery, authorization, and hosted/self-host storage contract
is published as an accessible learner-data page and machine-readable policy.
Profile exports label browser-local records separately from authoritative account
transcripts. Approved accounts request a recent-authentication-protected, audited
CSV from the account service, while learning achievements remain clearly
separate from durable issued credentials.

The Learn site also includes eight accessible visual guides for learning evidence,
grounded research, prompting, provider selection, safe tools, bounded agents,
multi-agent handoffs, and human-gated content freshness. Mermaid sources live in
`@project42/platform` under `content/diagrams/` as the single canonical source of
truth; reviewed SVG and public source artifacts are generated ahead of deployment.
See [`docs/diagram-authoring.md`](docs/diagram-authoring.md) for the validation,
accessibility, and security contract.

The virtual instructor player never calls a model at runtime; it only plays
back pre-generated, human-approved training packages. See
[`docs/virtual-instructor-player.md`](docs/virtual-instructor-player.md) for
the package contract, the runtime prohibition, and the current build status.

## Contributing and support

- [Contributing](CONTRIBUTING.md) covers repository ownership, local setup,
  validation, pull requests, and review expectations.
- [Security](SECURITY.md) provides the private vulnerability-reporting process.
- [Support, compatibility, and deprecation](SUPPORT.md) defines supported
  surfaces, update compatibility, retirement notices, and public help.

`npm run governance:check` rejects missing, empty, private-data-bearing, or
unlinked governance documents.
Project 42 Learn is available under the
[Apache License 2.0](LICENSE).

## Release 0.12.1

Learn `0.12.1` consumes the signed Platform `0.80.0` release. Approved learners
can request an authoritative, recent-authentication-protected account transcript
while signed-out and non-approved learners retain a clearly labelled
browser-local export. The profile distinguishes portable local records, durable
account records, learning achievements, and issued credentials without changing
the HttpOnly-cookie session boundary or presenting achievements as credentials.

## Current release facts

- Site release `0.12.1`
- Platform package `0.94.0`
- Content release `0.42.0`
- 9 learning paths, 83 assessed modules, 69 evidence activities, and 419 reviewed questions
- 9 dedicated learning paths and 4 provider scopes

These facts are generated from `package.json` and the tagged platform catalog into
[`public/release-facts.json`](public/release-facts.json). `npm run facts:check`
fails when versions, licenses, repositories, issue links, counts, or provider coverage
drift.

## Repositories

- `project-42.dev` — public landing experience and brand
- `learn.project-42.dev` — this learning application
- `guide.project-42.dev` — practical Field Guide
- `project42-platform` — reusable Apache-2.0 platform and CC BY 4.0 curriculum
- `project42dev.github.io` — transitional public site

## Deployment

The canonical public instance deploys from this repository to GitHub Pages and is
served at <https://learn.project-42.dev>. Cloudflare manages DNS only.

`npm run pages:build` produces the complete static artifact in `dist/pages`. The
GitHub Pages workflow validates the application and exported artifact before deploying
the exact merged `main` commit. OpenAI Sites is not a production or custom-domain
target for this repository. Production configuration and learner secrets never belong
in git.

The account API owns OIDC Authorization Code with PKCE and issues an opaque,
secure, HttpOnly session cookie. Learn receives no provider token and stores no
bearer token in browser storage. The browser needs only the public API origin
listed in [`.env.example`](.env.example). The API, database, issuer, audience,
OIDC client, session key, first owner, and domain rules are deployed separately;
omitting the API origin keeps Learn in browser-local mode.

The production Pages workflow maps `NEXT_PUBLIC_PROJECT42_API_ORIGIN` into the
reviewed build. It is public browser configuration; OIDC configuration,
credentials, session keys, and learner data must never be stored there.
The protected owner workflow, account-state safeguards, trusted-domain launch
lock, and evidence boundary are documented in
[`docs/owner-administration.md`](docs/owner-administration.md).
The [secure browser-session contract](docs/secure-browser-sessions.md) documents
the API-owned OIDC flow, HttpOnly session and registration-receipt boundaries,
PII-free pending and rejected status, bounded retry, renewal, sign-out, and
failure recovery. A new identity request never creates a learner session:
approved users must complete a new secure sign-in before hosted learner records
become available.
The guarded
[production learner-request acceptance](docs/production-registration-acceptance.md)
uses one private pending-receipt state outside the repository and never runs in
normal CI.
The [browser-to-account migration contract](docs/progress-migration.md) documents
preview, deterministic merge, immutable-evidence conflicts, retry, and recovery.
The guarded
[production migration acceptance](docs/production-progress-migration-acceptance.md)
requires two private authenticated sessions and an explicit immutable-mutation
confirmation. It is never part of normal CI.

### Self-hosted source build

The repository includes a Dockerfile that builds a non-root OCI image for the
independently deployable Project 42 stack. Anonymous pulls of the repository's
GitHub Container Registry package currently return `401`, so the supported
public path is to build the image locally from a tagged source release. The
public account-API origin is compiled into the static Learn artifact at
image-build time:

```text
docker build --build-arg NEXT_PUBLIC_PROJECT42_API_ORIGIN=http://localhost:8787 --tag project42-learn:local .
docker run --rm --publish 3000:8080 project42-learn:local
```

Open <http://localhost:3000> after the identity and account API services are
available. The image exposes an unauthenticated `/health` endpoint on port 8080.
The API-origin build argument is public browser configuration, not a secret.
Rebuild the image when it changes. Configure OIDC and session secrets only on the
account API. The supported Compose reference installation
and production-overlay guidance live in the version-matched
[`project42-platform`](https://github.com/project42dev/project42-platform)
release.

The platform dependency uses a reviewed release tag and the lockfile resolves that
tag to an exact commit. npm `allowScripts` permits only that release dependency to
run its `prepare` script, which generates the published `dist` entrypoint by running
the catalog generator and TypeScript compiler. Changing the platform release requires
reviewing its package scripts and updating the allow-list entry in the same change.
