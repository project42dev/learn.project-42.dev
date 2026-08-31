# AGENTS.md

## Purpose

This repository preserves the legacy Learn deployment during migration to the unified
public portal at `project-42.dev`. Its public routes and configuration must remain
compatible with the canonical portal until the legacy host is fully retired.

## Stack

- TypeScript, React, Next-compatible app router through vinext
- Cloudflare Worker-compatible deployment
- Reusable learning contracts from `@project42/platform`

## Commands

```bash
npm ci
npm run dev
npm run lint
npm test
```

## Rules

1. Public learning contracts come from `project42-platform`; do not duplicate them here.
2. Stable learning URLs are public contracts.
3. Device-local progress must be labeled honestly; never imply cloud persistence.
4. No secrets, private PMO material, or production learner data.
5. New interaction types require keyboard and reduced-motion review.
6. Build, lint, and rendered-route tests must pass before release.
7. Learning and Field Guide links target relative canonical routes on `project-42.dev`.
