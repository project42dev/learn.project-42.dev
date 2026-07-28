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
storage. When public OIDC and API settings are supplied at build time, approved
accounts synchronize those records across devices. New accounts are pending by
default; owners can approve, suspend, or revoke them and maintain exact verified
email-domain auto-approval rules. The accepted lifecycle, consent, retention,
export, deletion, recovery, authorization, and hosted/self-host storage contract
is published as an accessible learner-data page and machine-readable policy.

The Learn site also includes eight accessible visual guides for learning evidence,
grounded research, prompting, provider selection, safe tools, bounded agents,
multi-agent handoffs, and human-gated content freshness. Mermaid files under
`diagrams/` are the editable source of truth; reviewed SVG and public source
artifacts are generated ahead of deployment. See
[`docs/diagram-authoring.md`](docs/diagram-authoring.md) for the validation,
accessibility, and security contract.

## Current release facts

- Site release `0.8.0`
- Platform package `0.51.1`
- Content release `0.36.0`
- 6 learning paths, 55 assessed modules, 49 evidence activities, and 257 reviewed questions
- 6 dedicated learning paths and 4 provider scopes

These facts are generated from `package.json` and the tagged platform catalog into
[`public/release-facts.json`](public/release-facts.json). `npm run facts:check`
fails when versions, licenses, repositories, issue links, counts, or provider coverage
drift.

## Repositories

- `project-42.dev` — public landing experience and brand
- `learn.project-42.dev` — this learning application
- `guide.project-42.dev` — practical Field Guide
- `project42-platform` — reusable Apache-2.0 platform and CC BY 4.0 curriculum
- `project42dev-ops` — private planning and operations
- `project42dev.github.io` — transitional public site

## Deployment

The canonical public instance deploys from this repository to GitHub Pages and is
served at <https://learn.project-42.dev>. Cloudflare manages DNS only.

`npm run pages:build` produces the complete static artifact in `dist/pages`. The
GitHub Pages workflow validates the application and exported artifact before deploying
the exact merged `main` commit. OpenAI Sites is not a production or custom-domain
target for this repository. Production configuration and learner secrets never belong
in git.

The browser uses OIDC Authorization Code with PKCE and needs the public build values
listed in [`.env.example`](.env.example). It contains no client secret. The API,
database, issuer, audience, first owner, and domain rules are deployed separately
from the open-source platform; omitting the public values keeps Learn in
browser-local mode.

The production Pages workflow maps repository Actions variables with the same
`NEXT_PUBLIC_PROJECT42_*` names into the reviewed build. These values are public
browser configuration; credentials and learner data must never be stored there.
The protected owner workflow, account-state safeguards, trusted-domain launch
lock, and evidence boundary are documented in
[`docs/owner-administration.md`](docs/owner-administration.md).
The [browser-to-account migration contract](docs/progress-migration.md) documents
preview, deterministic merge, immutable-evidence conflicts, retry, and recovery.

### Self-hosted image

The repository also builds a non-root OCI image for the independently deployable
Project 42 stack. Public browser settings are compiled into the static Learn
artifact at image-build time:

```bash
docker build \
  --build-arg NEXT_PUBLIC_PROJECT42_API_ORIGIN=http://localhost:8787 \
  --build-arg NEXT_PUBLIC_PROJECT42_OIDC_AUTHORITY=http://localhost:8080/realms/project42 \
  --build-arg NEXT_PUBLIC_PROJECT42_OIDC_CLIENT_ID=project42-learn \
  --build-arg NEXT_PUBLIC_PROJECT42_OIDC_SCOPE="openid profile email" \
  --tag project42-learn:local .

docker run --rm --publish 3000:8080 project42-learn:local
```

Open <http://localhost:3000> after the identity and account API services are
available. The image exposes an unauthenticated `/health` endpoint on port 8080.
All four build arguments are public browser configuration—not secrets. Rebuild
the image when those values change. The supported Compose reference installation
and production-overlay guidance live in the version-matched
[`project42-platform`](https://github.com/project42dev/project42-platform)
release.

The platform dependency uses a reviewed release tag and the lockfile resolves that
tag to an exact commit. npm `allowScripts` permits only that release dependency to
run its `prepare` script, which generates the published `dist` entrypoint by running
the catalog generator and TypeScript compiler. Changing the platform release requires
reviewing its package scripts and updating the allow-list entry in the same change.
