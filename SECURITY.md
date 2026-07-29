# Security policy

Project 42 Learn is a public static learner application that communicates with
a separately operated account API. Security-sensitive identity,
authorization, session, database, and secret handling remain server-side.

## Supported versions

Security fixes target the current hosted release and the latest release line
from this repository. Older static builds and unmaintained forks do not receive
guaranteed fixes. Self-hosters should use version-compatible Learn and Project
42 Platform releases as described in [SUPPORT.md](SUPPORT.md).

| Surface | Security support |
| --- | --- |
| Current hosted release | Supported |
| Latest published release line | Supported |
| Older releases and arbitrary commits | Upgrade required |
| Modified forks | Maintainer of the fork is responsible |

## Reporting a vulnerability

Use the repository's private
[GitHub Security Advisory form](https://github.com/project42dev/learn.project-42.dev/security/advisories/new).
Do not open a public issue for a suspected vulnerability.

Include only the minimum information needed to reproduce and assess the issue:

- the affected release or commit;
- the affected route or component;
- clear reproduction steps using synthetic data;
- expected and observed behavior;
- likely impact; and
- a proposed mitigation, if known.

Do not include credentials, tokens, tenant or resource identifiers, private
configuration, personal information, production learner data, or private
operational links. Redact screenshots and logs before attaching them.

## Response

Maintainers will privately triage the report, confirm the affected boundary,
request missing safe evidence, and coordinate remediation. Priority and timing
depend on exploitability, learner impact, affected deployments, and the safety
of the correction.

The public Learn repository cannot grant access to hosted identity, account,
database, or infrastructure systems. Reports involving reusable platform code
may be transferred privately to the
[`project42-platform`](https://github.com/project42dev/project42-platform)
security process.

## Disclosure

Please allow maintainers time to investigate and release a correction before
public disclosure. Maintainers will publish an appropriate advisory or release
note after affected users can safely update. Security or privacy risk may
require immediate behavior changes that take precedence over the normal
deprecation process.

For non-security defects and compatibility questions, follow
[SUPPORT.md](SUPPORT.md). Contributors should also review
[CONTRIBUTING.md](CONTRIBUTING.md).
