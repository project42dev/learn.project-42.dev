# Contributing to Project 42 Learn

Thank you for helping improve the public Project 42 learning experience. This
repository owns the Learn application at
[learn.project-42.dev](https://learn.project-42.dev), including its learner
interface, account surfaces, visual guides, and integration with the reusable
Project 42 Platform.

## Before you begin

Choose the repository that owns the change:

- Learn application behavior and presentation belong here.
- Reusable learning contracts, schemas, adapters, and curriculum belong in
  [`project42-platform`](https://github.com/project42dev/project42-platform).
- Practical Field Guide material belongs in
  [`guide.project-42.dev`](https://github.com/project42dev/guide.project-42.dev).
- The public landing experience and shared brand belong in
  [`project-42.dev`](https://github.com/project42dev/project-42.dev).

Never commit credentials, access tokens, private operational records, tenant or
resource identifiers, personal information, or production learner data. Use
synthetic fixtures and the public example configuration only. Report suspected
vulnerabilities through the private process in [SECURITY.md](SECURITY.md), not a
public issue.

## Local development

Use Node.js 22.13 or newer and the committed npm lockfile. Install the
Playwright Chromium binary used by the browser and accessibility checks:

```text
npm ci
npx playwright install chromium
npm run dev
```

These npm and Playwright commands are the same in PowerShell, Command Prompt,
bash, and zsh. Copy the example environment file with the command for your
shell:

```powershell
# PowerShell
Copy-Item .env.example .env.local
```

```cmd
rem Command Prompt
copy .env.example .env.local
```

```sh
# macOS and Linux
cp .env.example .env.local
```

On a Linux development host that does not already provide Chromium system
libraries, run `npx playwright install --with-deps chromium` instead. This may
require the host's normal package-administration privileges.

`NEXT_PUBLIC_PROJECT42_API_ORIGIN` is public browser configuration. Do not add
OIDC credentials, session keys, provider secrets, database identifiers, or
other private configuration to this repository or its build variables.

Keep stable learning URLs compatible. Reuse public contracts from
`@project42/platform` instead of copying them into this application. New
interaction patterns require keyboard, zoom/reflow, contrast, screen-reader,
and reduced-motion consideration.

## Validation

Run the narrowest relevant checks while developing and the complete gate before
requesting review:

```text
npm run governance:check
npm run lint
npm run typecheck
npm test
npm run check
```

`npm run check` validates release facts, repository governance, generated brand
and diagram assets, lint and types, the container contract, application and
exported Pages builds, links, browser journeys, and accessibility assertions.
Parallel browser runs can set `PROJECT42_PLAYWRIGHT_PORT` and `PAGES_PORT` to
unused local ports. For example:

```powershell
# PowerShell
$env:PROJECT42_PLAYWRIGHT_PORT = "48143"
$env:PAGES_PORT = "48144"
npm run check
```

```cmd
rem Command Prompt
set PROJECT42_PLAYWRIGHT_PORT=48143
set PAGES_PORT=48144
npm run check
```

```sh
# macOS and Linux
PROJECT42_PLAYWRIGHT_PORT=48143 PAGES_PORT=48144 npm run check
```

Documentation-only changes must still pass `npm run governance:check` and any
link checks affected by the change. Update tests when behavior or a public
contract changes.

## Pull requests

Keep each pull request focused and explain:

- what changed and why;
- the learner, contributor, or operator impact;
- the tests and manual checks performed;
- compatibility, accessibility, privacy, and rollback implications; and
- any public GitHub issue that provides context.

Do not place private planning links, private work-item references, personal
information, credentials, or operational identifiers in a public branch,
commit body, pull-request description, screenshot, fixture, or test output.
Maintainers may add internal traceability through approved private mechanisms.

Reviewers verify repository ownership, public/private boundaries, stable URLs,
platform compatibility, tests, accessible interaction, and documentation. A
green check is necessary but does not replace review.

## Security

Read [SECURITY.md](SECURITY.md) before reporting a vulnerability. For supported
versions, compatibility, deprecation, and general help, see
[SUPPORT.md](SUPPORT.md).
