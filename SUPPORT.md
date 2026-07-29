# Support, compatibility, and deprecation

This document defines the public support boundary for Project 42 Learn. It does
not grant access to hosted accounts or private operations and does not replace a
self-hoster's own service and data responsibilities.

## Supported surfaces

| Surface | Supported boundary |
| --- | --- |
| Hosted Learn | The current release at [learn.project-42.dev](https://learn.project-42.dev) |
| Source development | The current default branch with Node.js 22.13 or newer and the committed lockfile |
| Self-hosted Learn | The latest published Learn image or source release paired with a compatible Project 42 Platform release |
| Modified distributions | Supported by the organization that made and operates the modification |

Project 42 Learn targets current stable desktop and mobile browsers. Automated
release gates exercise Chromium-based application and exported Pages journeys;
program accessibility validation supplements automation across additional
browsers and assistive technologies. Report browser-specific defects with the
exact browser, operating system, viewport, input method, and release.

## Compatibility

The generated release facts in
[`public/release-facts.json`](public/release-facts.json) identify the exact Learn,
platform, and content versions. Self-hosted installations should keep those
versions compatible and review the matching platform release before updating.

The browser receives only the public account-API origin. Identity-provider
configuration, credentials, session keys, database configuration, and learner
records belong to the account service and must not be compiled into Learn.
Omitting the public API origin keeps the application in browser-local mode.

Stable learning URLs are public contracts. Reusable API, data, learner-record,
and content schemas are owned by
[`project42-platform`](https://github.com/project42dev/project42-platform).
Compatibility changes to those contracts must be adopted through a reviewed,
versioned platform update.

## Deprecation

Deprecations are documented in the affected release and repository guidance
before removal whenever security, privacy, or legal constraints allow. A
deprecation notice identifies:

- the behavior or surface being retired;
- the supported replacement;
- affected hosted and self-hosted versions;
- migration or redirect behavior; and
- rollback or recovery considerations.

Stable routes should retain a redirect or an explicit transition experience
when practical. Security and privacy corrections may require faster removal;
the applicable advisory explains the safe replacement.

## Getting help

Search the repository's
[existing issues](https://github.com/project42dev/learn.project-42.dev/issues)
before opening a new one. A useful support request includes the release,
browser or runtime, deployment mode, reproduction steps, expected behavior,
observed behavior, and sanitized logs.

Never post credentials, personal information, learner records, tenant or
resource identifiers, private configuration, or private operational links.
Use [GitHub Security Advisories](SECURITY.md) for suspected vulnerabilities.
For proposed changes and local validation, read
[CONTRIBUTING.md](CONTRIBUTING.md).
