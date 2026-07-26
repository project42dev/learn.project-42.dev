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

The site consumes the versioned open-source learning core from
[`project42dev/project42-platform`](https://github.com/project42dev/project42-platform).
The current catalog includes the complete twelve-module Reliable Agent Workflows path
alongside the sixteen-module AI Foundations path. Its practical capstone includes complete
and deliberately flawed calibration packages, eight required operating artifacts,
criterion-level evidence mapping, failed-submission revision, a 100-point rubric,
and the Reliable Agent Operator badge. Profiles preserve attempts, capstone
revisions, evidence links, badges, and portable JSON/CSV exports in device-local
storage. Account-backed cross-device learning records remain active implementation
work. The accepted lifecycle, consent, retention, export, deletion, recovery,
authorization, and hosted/self-host storage contract is now published as an
accessible learner-data page and machine-readable policy.

The Learn site also includes eight accessible visual guides for learning evidence,
grounded research, prompting, provider selection, safe tools, bounded agents,
multi-agent handoffs, and human-gated content freshness. Mermaid files under
`diagrams/` are the editable source of truth; reviewed SVG and public source
artifacts are generated ahead of deployment. See
[`docs/diagram-authoring.md`](docs/diagram-authoring.md) for the validation,
accessibility, and security contract.

## Current release facts

- Site release `0.1.0`
- Platform package `0.39.0`
- Content release `0.30.0`
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

The platform dependency uses a reviewed release tag and the lockfile resolves that
tag to an exact commit. npm `allowScripts` permits only that release dependency to
run its `prepare` script, which generates the published `dist` entrypoint by running
the catalog generator and TypeScript compiler. Changing the platform release requires
reviewing its package scripts and updating the allow-list entry in the same change.
