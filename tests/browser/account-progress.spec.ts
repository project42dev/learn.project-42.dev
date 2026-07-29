import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { LearnerProgress } from "@project42/platform";
import { readFile } from "node:fs/promises";

const hostedIdentityConfigured = Boolean(
  process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN,
);

async function installSignedOutApi(page: Page) {
  if (!hostedIdentityConfigured) return;
  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/v1/auth/session`,
    async (route) => {
      await route.fulfill({
        status: 401,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          error: { code: "authentication_required", message: "Sign in is required." },
        }),
      });
    },
  );
}

test("renders the account state selected by public account-API configuration", async ({
  page,
}) => {
  await installSignedOutApi(page);
  await page.goto("/account");
  if (hostedIdentityConfigured) {
    await expect(
      page.getByRole("heading", { name: "Keep your progress across devices" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in or request access" }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("heading", { name: "Ready for hosted identity configuration" }),
    ).toBeVisible();
    await expect(
      page.getByText(/browser-local learning remains available/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toHaveCount(0);
  }

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("shows the browser-to-account migration boundary on the progress page", async ({
  page,
}) => {
  await installSignedOutApi(page);
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Browser and account status" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      hostedIdentityConfigured
        ? /sign in to request access and synchronize progress after approval/i
        : /has not connected its account service yet/i,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your paths" }),
  ).toBeVisible();
});

test("starts API-owned sign-in without storing an identity-provider token", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The secure-session journey requires account-API configuration.",
  );
  await installSignedOutApi(page);
  const startPattern =
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/v1/auth/start**`;
  await page.route(startPattern, async (route) => route.abort("aborted"));
  await page.goto("/account");
  const expectedReturnTo = new URL("/account", page.url()).toString();

  const requestPromise = page.waitForRequest(startPattern);
  await page
    .getByRole("button", { name: "Sign in or request access" })
    .click();
  const request = await requestPromise;
  const target = new URL(request.url());
  expect(target.pathname).toBe("/v1/auth/start");
  expect(target.searchParams.get("return_to")).toBe(expectedReturnTo);
  expect(
    await page.evaluate(() =>
      Object.keys(window.sessionStorage).filter((key) =>
        key.startsWith("project42.auth."),
      ),
    ),
  ).toEqual([]);
});

test("recovers when another browser tab wins secure-session rotation", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The secure-session journey requires account-API configuration.",
  );

  const account = {
    id: "rotation-race-account",
    installationId: "test",
    identity: {
      issuer: "https://issuer.example",
      subject: "rotation-race-subject",
    },
    displayName: "Rotation race learner",
    primaryEmail: "learner@example.test",
    emailVerified: true,
    state: "approved",
    roles: ["learner"],
    createdAt: "2026-07-28T00:00:00.000Z",
    updatedAt: "2026-07-28T00:00:00.000Z",
  };
  let sessionRequests = 0;
  let renewalRequests = 0;

  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/**`,
    async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const headers = { "content-type": "application/json" };
      if (pathname === "/v1/auth/session") {
        sessionRequests += 1;
        const firstRead = sessionRequests === 1;
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            account,
            session: {
              expiresAt: new Date(
                Date.now() + (firstRead ? 250 : 60 * 60_000),
              ).toISOString(),
              absoluteExpiresAt: new Date(
                Date.now() + 8 * 60 * 60_000,
              ).toISOString(),
            },
          }),
        });
        return;
      }
      if (pathname === "/v1/auth/renew") {
        renewalRequests += 1;
        await route.fulfill({
          status: 409,
          headers,
          body: JSON.stringify({
            error: {
              code: "session_rotation_conflict",
              message: "Another browser tab already rotated this session.",
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 404,
        headers,
        body: JSON.stringify({ error: { message: "Not found" } }),
      });
    },
  );

  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: account.displayName }),
  ).toBeVisible();
  await expect.poll(() => renewalRequests).toBe(1);
  await expect.poll(() => sessionRequests).toBeGreaterThanOrEqual(2);
  await expect(
    page.getByRole("heading", { name: "Account sign-in needs attention" }),
  ).toHaveCount(0);
});

test("rejects malformed GitHub authorization URLs before storing or navigating", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The GitHub linkage journey requires account-API configuration.",
  );

  const now = "2026-07-28T00:00:00.000Z";
  const account = {
    id: "malformed-github-account",
    installationId: "test",
    identity: {
      issuer: "https://issuer.example",
      subject: "malformed-github-subject",
    },
    displayName: "GitHub safety learner",
    primaryEmail: "learner@example.test",
    emailVerified: true,
    state: "approved",
    roles: ["learner"],
    createdAt: now,
    updatedAt: now,
  };

  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/**`,
    async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const headers = { "content-type": "application/json" };
      if (
        pathname === "/v1/me/identity-links/github" &&
        request.method() === "POST"
      ) {
        const input = request.postDataJSON() as {
          codeChallenge: string;
          returnPath: string;
        };
        const authorization = new URL(
          "https://github.com/login/oauth/authorize",
        );
        authorization.searchParams.set("client_id", "github-client");
        authorization.searchParams.set(
          "redirect_uri",
          new URL("/account/github/callback/", page.url()).toString(),
        );
        authorization.searchParams.set("state", "github-state");
        authorization.searchParams.append("state", "duplicate-state");
        authorization.searchParams.set(
          "code_challenge",
          input.codeChallenge,
        );
        authorization.searchParams.set("code_challenge_method", "S256");
        authorization.searchParams.set("scope", "repo");
        await route.fulfill({
          status: 201,
          headers,
          body: JSON.stringify({
            link: {
              id: "00000000-0000-4000-8000-000000000043",
              state: "github-state",
              returnPath: input.returnPath,
              expiresAt: new Date(Date.now() + 600_000).toISOString(),
            },
            authorizationUrl: authorization.toString(),
          }),
        });
        return;
      }
      const bodies: Record<string, unknown> = {
        "/v1/auth/session": { account },
        "/v1/me/profile": {
          profile: {
            userId: account.id,
            displayName: account.displayName,
            bio: null,
            organization: null,
            location: null,
            websiteUrl: null,
            photoAvailable: false,
            photoUpdatedAt: null,
            createdAt: now,
            updatedAt: now,
          },
        },
        "/v1/me/identities": {
          identities: [
            {
              id: "identity-primary",
              provider: "oidc",
              providerLogin: null,
              displayName: account.displayName,
              status: "active",
              primary: true,
              linkedAt: now,
              lastVerifiedAt: now,
              lastSeenAt: now,
              unlinkedAt: null,
              canUnlink: false,
            },
          ],
        },
        "/v1/me/consents": { consents: [] },
        "/v1/me/deletion": { requests: [] },
      };
      await route.fulfill({
        status: pathname in bodies ? 200 : 404,
        headers,
        body: JSON.stringify(
          bodies[pathname] ?? { error: { message: "Not found" } },
        ),
      });
    },
  );

  await page.goto("/account");
  await page.getByRole("button", { name: "Connect GitHub" }).click();
  await expect(
    page.getByText("The GitHub authorization destination was not valid."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/account\/?$/);
  expect(
    await page.evaluate(() =>
      window.sessionStorage.getItem("project42.identity-link.github.v1"),
    ),
  ).toBeNull();
});

test("handles empty, local-only, and server-only records without overwriting evidence", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The browser-to-account migration requires hosted-account test configuration.",
  );

  const emptyProgress: LearnerProgress = {
    schemaVersion: 1,
    displayName: "Explorer",
    startedPathIds: [],
    completedModuleIds: [],
    attempts: [],
    capstoneSubmissions: [],
    badges: [],
    updatedAt: "1970-01-01T00:00:00.000Z",
  };
  const evidenceProgress: LearnerProgress = {
    ...emptyProgress,
    startedPathIds: ["ai-foundations"],
    completedModuleIds: ["what-ai-does"],
    attempts: [
      {
        id: "scenario-attempt",
        pathId: "ai-foundations",
        moduleId: "what-ai-does",
        contentVersion: "0.38.0",
        scorePercent: 100,
        passed: true,
        completedAt: "2026-07-28T01:00:00.000Z",
      },
    ],
    updatedAt: "2026-07-28T01:00:00.000Z",
  };
  let remoteProgress = emptyProgress;
  let revision = 0;
  let writes = 0;

  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/**`,
    async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const headers = { "content-type": "application/json" };
      if (pathname === "/v1/auth/session") {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            account: {
              id: "migration-scenario-account",
              installationId: "test",
              identity: {
                issuer: "https://issuer.example",
                subject: "migration-scenario-subject",
              },
              displayName: "Migration learner",
              primaryEmail: "learner@example.test",
              emailVerified: true,
              state: "approved",
              roles: ["learner"],
              createdAt: "2026-07-28T00:00:00.000Z",
              updatedAt: "2026-07-28T00:00:00.000Z",
            },
          }),
        });
        return;
      }
      if (pathname === "/v1/me/progress" && request.method() === "GET") {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            progress: {
              revision,
              progress: remoteProgress,
              synchronizedAt: remoteProgress.updatedAt,
            },
          }),
        });
        return;
      }
      if (pathname === "/v1/me/progress") writes += 1;
      await route.fulfill({
        status: 500,
        headers,
        body: JSON.stringify({ error: { message: "Unexpected write" } }),
      });
    },
  );

  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Progress is synchronized" }),
  ).toBeVisible();

  await page.evaluate((progress) => {
    window.localStorage.setItem("project42.progress.v1", JSON.stringify(progress));
  }, evidenceProgress);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Move this browser record into your account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Progress migration preview" }),
  ).toContainText("1 / 0 / 1");

  remoteProgress = evidenceProgress;
  revision = 1;
  await page.evaluate((progress) => {
    window.localStorage.setItem("project42.progress.v1", JSON.stringify(progress));
  }, emptyProgress);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Progress is synchronized" }),
  ).toBeVisible();
  await expect(page.getByText("scenario-attempt")).toHaveCount(0);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const stored = JSON.parse(
          window.localStorage.getItem("project42.progress.v1") ?? "null",
        );
        return stored?.attempts?.map((attempt: { id: string }) => attempt.id);
      }),
    )
    .toEqual(["scenario-attempt"]);
  expect(writes).toBe(0);
});

test("quarantines and downloads an unsupported local record without uploading or replacing it", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The recovery boundary requires hosted-account test configuration.",
  );

  const privateMarker = "device-only-recovery-marker";
  const rawRecord = JSON.stringify({
    schemaVersion: 2,
    displayName: "Future learner",
    startedPathIds: [],
    completedModuleIds: [],
    attempts: [],
    capstoneSubmissions: [],
    badges: [],
    updatedAt: "2026-07-29T12:00:00.000Z",
    privateMarker,
  });
  let progressRequests = 0;
  const requestBodies: string[] = [];

  await page.addInitScript((storedRecord) => {
    window.localStorage.setItem("project42.progress.v1", storedRecord);
  }, rawRecord);
  page.on("request", (request) => {
    const body = request.postData();
    if (body) requestBodies.push(body);
  });
  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/**`,
    async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const headers = { "content-type": "application/json" };
      if (pathname === "/v1/auth/session") {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            account: {
              id: "recovery-account",
              installationId: "test",
              identity: {
                issuer: "https://issuer.example",
                subject: "recovery-subject",
              },
              displayName: "Recovery learner",
              primaryEmail: "learner@example.test",
              emailVerified: true,
              state: "approved",
              roles: ["learner"],
              createdAt: "2026-07-29T12:00:00.000Z",
              updatedAt: "2026-07-29T12:00:00.000Z",
            },
          }),
        });
        return;
      }
      if (pathname === "/v1/me/progress") progressRequests += 1;
      await route.fulfill({
        status: 500,
        headers,
        body: JSON.stringify({ error: { message: "Unexpected request" } }),
      });
    },
  );

  await page.goto("/profile");
  await expect(
    page.getByRole("alert").filter({ hasText: "Your browser record needs recovery." }),
  ).toBeVisible();
  await expect(
    page.getByText(/unsupported progress schema version 2/i),
  ).toBeVisible();
  await expect(page.getByText(privateMarker)).toHaveCount(0);
  await expect(
    page.getByText(/account synchronization is paused/i),
  ).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem("project42.progress.v1")),
    )
    .toBe(rawRecord);
  const quarantine = await page.evaluate(() =>
    JSON.parse(
      window.localStorage.getItem("project42.progress.quarantine.v1") ?? "null",
    ),
  );
  expect(quarantine).toMatchObject({
    schemaVersion: 1,
    sourceKey: "project42.progress.v1",
    rawRecord,
  });
  expect(Object.keys(quarantine).sort()).toEqual([
    "capturedAt",
    "errors",
    "rawRecord",
    "schemaVersion",
    "sourceKey",
  ]);

  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download original browser record" })
    .click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  expect(await readFile(downloadedPath!, "utf8")).toBe(rawRecord);

  expect(progressRequests).toBe(0);
  expect(requestBodies.some((body) => body.includes(privateMarker))).toBe(false);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("previews, safely retries, and deduplicates a browser-to-account merge", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The browser-to-account migration requires hosted-account test configuration.",
  );

  const account = {
    id: "migration-account",
    installationId: "test",
    identity: { issuer: "https://issuer.example", subject: "migration-subject" },
    displayName: "Migration learner",
    primaryEmail: "learner@example.test",
    emailVerified: true,
    state: "approved",
    roles: ["learner"],
    createdAt: "2026-07-28T00:00:00.000Z",
    updatedAt: "2026-07-28T00:00:00.000Z",
  };
  const localProgress: LearnerProgress = {
    schemaVersion: 1,
    displayName: "Browser learner",
    startedPathIds: ["ai-foundations"],
    completedModuleIds: ["what-ai-does"],
    attempts: [
      {
        id: "local-attempt",
        pathId: "ai-foundations",
        moduleId: "what-ai-does",
        contentVersion: "0.38.0",
        scorePercent: 100,
        passed: true,
        completedAt: "2026-07-28T01:00:00.000Z",
      },
    ],
    capstoneSubmissions: [],
    badges: [],
    updatedAt: "2026-07-28T01:00:00.000Z",
  };
  let remoteProgress: LearnerProgress = {
    schemaVersion: 1,
    displayName: "Account learner",
    startedPathIds: ["ai-foundations"],
    completedModuleIds: ["ai-systems-and-use-cases"],
    attempts: [
      {
        id: "account-attempt",
        pathId: "ai-foundations",
        moduleId: "ai-systems-and-use-cases",
        contentVersion: "0.38.0",
        scorePercent: 80,
        passed: true,
        completedAt: "2026-07-28T00:30:00.000Z",
      },
    ],
    capstoneSubmissions: [],
    badges: [],
    updatedAt: "2026-07-28T00:30:00.000Z",
  };
  const imports: Array<{
    importId: string;
    progress: LearnerProgress;
    source: string;
  }> = [];

  await page.addInitScript((storedProgress) => {
    window.localStorage.setItem(
      "project42.progress.v1",
      JSON.stringify(storedProgress),
    );
  }, localProgress);

  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/**`,
    async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const headers = { "content-type": "application/json" };
      if (pathname === "/v1/auth/session") {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({ account }),
        });
        return;
      }
      if (pathname === "/v1/me/progress" && request.method() === "GET") {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            progress: {
              revision: 2,
              progress: remoteProgress,
              synchronizedAt: remoteProgress.updatedAt,
            },
          }),
        });
        return;
      }
      if (pathname === "/v1/me/progress" && request.method() === "POST") {
        const imported = request.postDataJSON() as (typeof imports)[number];
        imports.push(imported);
        if (imports.length === 1) {
          await route.fulfill({
            status: 503,
            headers,
            body: JSON.stringify({
              error: { message: "Temporary migration failure." },
            }),
          });
          return;
        }
        remoteProgress = imported.progress;
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            progress: {
              revision: 3,
              progress: remoteProgress,
              synchronizedAt: "2026-07-28T01:01:00.000Z",
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 404,
        headers,
        body: JSON.stringify({ error: { message: "Not found" } }),
      });
    },
  );

  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Move this browser record into your account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Progress migration preview" }),
  ).toContainText("1 / 1 / 2");
  const confirm = page.getByRole("button", {
    name: "Confirm and merge into my account",
  });
  await expect(confirm).toBeEnabled();

  await confirm.click();
  await expect(page.getByRole("alert")).toContainText(
    "Temporary migration failure.",
  );
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(
    page.getByRole("heading", { name: "Progress is synchronized" }),
  ).toBeVisible();

  expect(imports).toHaveLength(2);
  expect(imports[0].importId).toBe(imports[1].importId);
  expect(imports[1].source).toBe("browser-local-v1");
  expect(imports[1].progress.completedModuleIds).toEqual([
    "ai-systems-and-use-cases",
    "what-ai-does",
  ]);
  expect(imports[1].progress.attempts.map((attempt) => attempt.id)).toEqual([
    "account-attempt",
    "local-attempt",
  ]);
  const recovery = await page.evaluate(() =>
    JSON.parse(
      window.localStorage.getItem(
        "project42.progress.migration.recovery.v1",
      ) ?? "null",
    ),
  );
  expect(recovery).toMatchObject({
    importId: imports[0].importId,
    schemaVersion: 1,
    state: "completed",
  });

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Progress is synchronized" }),
  ).toBeVisible();
  expect(imports).toHaveLength(2);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("blocks migration when an immutable attempt ID contains different evidence", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The browser-to-account migration requires hosted-account test configuration.",
  );

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "project42.progress.v1",
      JSON.stringify({
        schemaVersion: 1,
        displayName: "Explorer",
        startedPathIds: ["ai-foundations"],
        completedModuleIds: [],
        attempts: [
          {
            id: "conflicting-attempt",
            pathId: "ai-foundations",
            moduleId: "what-ai-does",
            contentVersion: "0.38.0",
            scorePercent: 60,
            passed: false,
            completedAt: "2026-07-28T01:00:00.000Z",
          },
        ],
        capstoneSubmissions: [],
        badges: [],
        updatedAt: "2026-07-28T01:00:00.000Z",
      }),
    );
  });

  let importRequests = 0;
  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/**`,
    async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const headers = { "content-type": "application/json" };
      if (pathname === "/v1/auth/session") {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            account: {
              id: "conflict-account",
              installationId: "test",
              identity: {
                issuer: "https://issuer.example",
                subject: "conflict-subject",
              },
              displayName: "Conflict learner",
              primaryEmail: "learner@example.test",
              emailVerified: true,
              state: "approved",
              roles: ["learner"],
              createdAt: "2026-07-28T00:00:00.000Z",
              updatedAt: "2026-07-28T00:00:00.000Z",
            },
          }),
        });
        return;
      }
      if (pathname === "/v1/me/progress" && request.method() === "GET") {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            progress: {
              revision: 1,
              progress: {
                schemaVersion: 1,
                displayName: "Explorer",
                startedPathIds: ["ai-foundations"],
                completedModuleIds: ["what-ai-does"],
                attempts: [
                  {
                    id: "conflicting-attempt",
                    pathId: "ai-foundations",
                    moduleId: "what-ai-does",
                    contentVersion: "0.38.0",
                    scorePercent: 100,
                    passed: true,
                    completedAt: "2026-07-28T01:00:00.000Z",
                  },
                ],
                capstoneSubmissions: [],
                badges: [],
                updatedAt: "2026-07-28T01:00:00.000Z",
              },
              synchronizedAt: "2026-07-28T01:00:00.000Z",
            },
          }),
        });
        return;
      }
      if (pathname === "/v1/me/progress" && request.method() === "POST") {
        importRequests += 1;
      }
      await route.fulfill({
        status: 500,
        headers,
        body: JSON.stringify({ error: { message: "Unexpected request" } }),
      });
    },
  );

  await page.goto("/profile");
  await expect(
    page.getByText("Conflicting immutable evidence needs attention."),
  ).toBeVisible();
  await expect(
    page.getByText(/Assessment attempt conflicting-attempt has different evidence/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm and merge into my account" }),
  ).toBeDisabled();
  expect(importRequests).toBe(0);
});

test("explains a temporarily unreachable hosted account service", async ({ page }) => {
  test.skip(
    !hostedIdentityConfigured,
    "The hosted-account network state requires account-API configuration.",
  );

  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/v1/auth/session`,
    async (route) => route.abort("failed"),
  );

  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Account sign-in needs attention" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "The Project 42 account service could not be reached. Your sign-in was not cleared. Check your connection, then try again.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clear this sign-in" }),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("completes GitHub linkage without exposing the provider token to Learn", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The GitHub linkage journey requires account-API configuration.",
  );

  await page.addInitScript(() => {
    if (window.location.pathname.includes("/account/github/callback")) {
      window.sessionStorage.setItem(
        "project42.identity-link.github.v1",
        JSON.stringify({
          transactionId: "00000000-0000-4000-8000-000000000042",
          state: "github-state",
          verifier: "v".repeat(64),
          returnPath: "/account?linked=github",
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        }),
      );
    }
  });

  const account = {
    id: "github-link-account",
    installationId: "test",
    identity: { issuer: "https://issuer.example", subject: "github-link-subject" },
    displayName: "GitHub link learner",
    primaryEmail: "learner@example.test",
    emailVerified: true,
    state: "approved",
    roles: ["learner"],
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
  };
  let completionRequest: Record<string, unknown> | null = null;
  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/**`,
    async (route) => {
      const request = route.request();
      const origin = request.headers().origin ?? "http://localhost";
      const headers = {
        "access-control-allow-origin": origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "content-type,x-request-id",
        "access-control-allow-methods": "DELETE,GET,POST,PATCH,PUT,OPTIONS",
        "content-type": "application/json",
      };
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/v1/me/identity-links/github/complete") {
        completionRequest = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            linkedIdentity: {
              id: "identity-github",
              provider: "github",
              providerLogin: "project42-learner",
              displayName: "Project 42 learner",
              status: "active",
              primary: false,
              linkedAt: account.createdAt,
              lastVerifiedAt: account.updatedAt,
              lastSeenAt: account.updatedAt,
              unlinkedAt: null,
              canUnlink: true,
            },
            returnPath: "/account?linked=github",
          }),
        });
        return;
      }
      const bodies: Record<string, unknown> = {
        "/v1/auth/session": { account },
        "/v1/me/profile": {
          profile: {
            userId: account.id,
            displayName: account.displayName,
            bio: null,
            organization: null,
            location: null,
            websiteUrl: null,
            photoAvailable: false,
            photoUpdatedAt: null,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
        },
        "/v1/me/identities": {
          identities: [
            {
              id: "identity-primary",
              provider: "oidc",
              providerLogin: null,
              displayName: account.displayName,
              status: "active",
              primary: true,
              linkedAt: account.createdAt,
              lastVerifiedAt: account.updatedAt,
              lastSeenAt: account.updatedAt,
              unlinkedAt: null,
              canUnlink: false,
            },
            {
              id: "identity-github",
              provider: "github",
              providerLogin: "project42-learner",
              displayName: "Project 42 learner",
              status: "active",
              primary: false,
              linkedAt: account.createdAt,
              lastVerifiedAt: account.updatedAt,
              lastSeenAt: account.updatedAt,
              unlinkedAt: null,
              canUnlink: true,
            },
          ],
        },
        "/v1/me/consents": { consents: [] },
        "/v1/me/deletion": { requests: [] },
      };
      await route.fulfill({
        status: pathname in bodies ? 200 : 404,
        headers,
        body: JSON.stringify(
          bodies[pathname] ?? { error: { message: "Not found" } },
        ),
      });
    },
  );

  await page.goto(
    "/account/github/callback/?code=temporary-github-code&state=github-state",
  );
  await expect(page).toHaveURL(/\/account\/?\?linked=github$/);
  await expect(page.getByText("@project42-learner")).toBeVisible();
  expect(completionRequest).toMatchObject({
    transactionId: "00000000-0000-4000-8000-000000000042",
    state: "github-state",
    code: "temporary-github-code",
    codeVerifier: "v".repeat(64),
  });
  expect(JSON.stringify(completionRequest)).not.toContain("github-token");
  expect(
    await page.evaluate(() =>
      window.sessionStorage.getItem("project42.identity-link.github.v1"),
    ),
  ).toBeNull();
});

test("protects the owner route and renders request-correlated audit evidence", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The owner-console journey requires account-API configuration.",
  );

  const account = {
    id: "owner-account",
    installationId: "test",
    identity: { issuer: "https://issuer.example", subject: "owner-subject" },
    displayName: "Test owner",
    primaryEmail: "owner@example.test",
    emailVerified: true,
    state: "approved",
    roles: ["learner", "owner"],
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
  };
  let pendingAccount = {
    id: "pending-account",
    installationId: "test",
    identity: { issuer: "https://issuer.example", subject: "pending-subject" },
    displayName: "Pending learner",
    primaryEmail: "pending@example.test",
    emailVerified: true,
    state: "pending",
    roles: ["learner"],
    createdAt: "2026-07-27T01:00:00.000Z",
    updatedAt: "2026-07-27T01:00:00.000Z",
  };
  const secondPendingAccount = {
    ...pendingAccount,
    id: "pending-account-2",
    identity: {
      issuer: "https://issuer.example",
      subject: "pending-subject-2",
    },
    displayName: "Second pending learner",
    primaryEmail: "pending-2@example.test",
    createdAt: "2026-07-27T01:30:00.000Z",
    updatedAt: "2026-07-27T01:30:00.000Z",
  };
  const accountStateChanges: Array<Record<string, unknown>> = [];
  const accountListRequests: string[] = [];
  const domainChanges: Array<{
    id: string;
    method: string;
    body: Record<string, unknown>;
  }> = [];
  const deletionCompletions: Array<Record<string, unknown>> = [];
  const enabledDomain = {
    id: "domain-enabled",
    domain: "enabled.example.test",
    enabled: true,
    policyVersion: 2,
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
  };
  const disabledDomain = {
    id: "domain-disabled",
    domain: "disabled.example.test",
    enabled: false,
    policyVersion: 3,
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
  };
  const deletionRequest = {
    id: "deletion-1",
    userId: "deletion-account",
    state: "requested",
    requestedAt: "2026-07-20T00:00:00.000Z",
    cancellationDeadline: "2026-07-21T00:00:00.000Z",
    displayName: "Deletion learner",
    primaryEmail: "deletion@example.test",
  };

  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/**`,
    async (route) => {
      const origin = route.request().headers().origin ?? "http://localhost";
      const headers = {
        "access-control-allow-origin": origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "content-type,x-request-id",
        "access-control-allow-methods": "DELETE,GET,POST,PATCH,PUT,OPTIONS",
        "content-type": "application/json",
      };
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      const target = new URL(route.request().url());
      const pathname = target.pathname;
      if (
        pathname === "/v1/admin/accounts" &&
        route.request().method() === "GET"
      ) {
        accountListRequests.push(`${target.pathname}${target.search}`);
        const state = target.searchParams.get("state");
        const cursor = target.searchParams.get("cursor");
        const returnedAccounts =
          cursor === "accounts-pending-2"
            ? [pendingAccount, secondPendingAccount]
            : state === "pending"
              ? [pendingAccount]
              : [account, pendingAccount, secondPendingAccount];
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            accounts: returnedAccounts,
            page: {
              pageSize: 25,
              returnedCount: returnedAccounts.length,
              hasMore: state === "pending" && cursor === null,
              nextCursor:
                state === "pending" && cursor === null
                  ? "accounts-pending-2"
                  : null,
            },
          }),
        });
        return;
      }
      if (
        pathname === "/v1/admin/audit" &&
        route.request().method() === "GET"
      ) {
        if (target.searchParams.get("cursor") === "audit-stale") {
          await route.fulfill({
            status: 400,
            headers,
            body: JSON.stringify({
              error: {
                code: "invalid_admin_cursor",
                message: "The administration cursor no longer matches this query.",
              },
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            events: [
              {
                id: "audit-1",
                action: "account.state.change",
                requestId: "request-1",
                outcome: "success",
                reason: "Approved after review.",
                occurredAt: "2026-07-27T00:00:00.000Z",
              },
            ],
            page: {
              pageSize: 25,
              returnedCount: 1,
              hasMore: true,
              nextCursor: "audit-stale",
            },
          }),
        });
        return;
      }
      if (
        pathname === "/v1/admin/accounts/pending-account/state" &&
        route.request().method() === "PATCH"
      ) {
        const change = route.request().postDataJSON() as {
          state: string;
          reason: string;
        };
        accountStateChanges.push(change);
        pendingAccount = {
          ...pendingAccount,
          state: change.state,
          updatedAt: "2026-07-27T02:00:00.000Z",
        };
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({ account: pendingAccount }),
        });
        return;
      }
      if (
        pathname === "/v1/admin/domains/domain-enabled" &&
        route.request().method() === "PATCH"
      ) {
        const change = route.request().postDataJSON() as Record<string, unknown>;
        domainChanges.push({
          id: enabledDomain.id,
          method: route.request().method(),
          body: change,
        });
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            domain: {
              ...enabledDomain,
              enabled: change.enabled,
              updatedAt: "2026-07-27T02:00:00.000Z",
            },
          }),
        });
        return;
      }
      if (
        pathname === "/v1/admin/domains/domain-disabled" &&
        route.request().method() === "DELETE"
      ) {
        const change = route.request().postDataJSON() as Record<string, unknown>;
        domainChanges.push({
          id: disabledDomain.id,
          method: route.request().method(),
          body: change,
        });
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({ domain: disabledDomain }),
        });
        return;
      }
      if (
        pathname === "/v1/admin/deletions/deletion-1/complete" &&
        route.request().method() === "POST"
      ) {
        deletionCompletions.push(
          route.request().postDataJSON() as Record<string, unknown>,
        );
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            completion: { deletionRequestId: deletionRequest.id },
          }),
        });
        return;
      }
      const bodies: Record<string, unknown> = {
        "/v1/auth/session": { account },
        "/v1/me/profile": {
          profile: {
            userId: account.id,
            displayName: account.displayName,
            bio: null,
            organization: null,
            location: null,
            websiteUrl: null,
            photoAvailable: false,
            photoUpdatedAt: null,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
        },
        "/v1/me/identities": {
          identities: [
            {
              id: "identity-primary",
              provider: "oidc",
              providerLogin: null,
              displayName: "Test owner",
              status: "active",
              primary: true,
              linkedAt: account.createdAt,
              lastVerifiedAt: account.updatedAt,
              lastSeenAt: account.updatedAt,
              unlinkedAt: null,
              canUnlink: false,
            },
            {
              id: "identity-github",
              provider: "github",
              providerLogin: "project42-owner",
              displayName: "Project 42 owner",
              status: "active",
              primary: false,
              linkedAt: account.createdAt,
              lastVerifiedAt: account.updatedAt,
              lastSeenAt: account.updatedAt,
              unlinkedAt: null,
              canUnlink: true,
            },
          ],
        },
        "/v1/me/consents": { consents: [] },
        "/v1/me/deletion": { requests: [] },
        "/v1/admin/accounts": { accounts: [account, pendingAccount] },
        "/v1/admin/domains": {
          domains: [enabledDomain, disabledDomain],
          automaticApprovalEnabled: false,
        },
        "/v1/admin/deletions": { requests: [deletionRequest] },
        "/v1/admin/audit": {
          events: [
            {
              id: "audit-1",
              action: "account.state.change",
              requestId: "request-1",
              outcome: "success",
              reason: "Approved after review.",
              occurredAt: "2026-07-27T00:00:00.000Z",
            },
          ],
        },
      };
      await route.fulfill({
        status: pathname in bodies ? 200 : 404,
        headers,
        body: JSON.stringify(bodies[pathname] ?? { error: { message: "Not found" } }),
      });
    },
  );

  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Sign-in and contributor identity" }),
  ).toBeVisible();
  await expect(page.getByText("@project42-owner")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlink" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect GitHub" }),
  ).toHaveCount(0);

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Accounts and exact-domain approval" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Account approval queue" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".admin-account-list")
      .first()
      .getByText("Pending learner", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".admin-account-list").first().getByText("Test owner", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("1 shown · 1 loaded · more available"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Load more accounts" }).click();
  await expect(
    page
      .locator(".admin-account-list")
      .first()
      .getByText("Second pending learner", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".admin-account-list")
      .first()
      .getByText("Pending learner", { exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByText("Loaded 1 more account. 2 total loaded."),
  ).toBeFocused();
  expect(accountListRequests).toContain(
    "/v1/admin/accounts?pageSize=25&state=pending",
  );
  expect(accountListRequests).toContain(
    "/v1/admin/accounts?pageSize=25&state=pending&cursor=accounts-pending-2",
  );

  await page.getByLabel("Search accounts").fill("missing@example.test");
  await expect(page.getByText("No accounts match this state and search.")).toBeVisible();
  await page.getByLabel("Search accounts").fill("");

  const pendingRow = page
    .locator(".admin-account-list article")
    .filter({ hasText: "pending@example.test" });
  await pendingRow.getByRole("button", { name: "Approve" }).click();
  await expect(
    page.getByRole("heading", { name: "Approve Pending learner" }),
  ).toBeFocused();
  await page
    .locator(".admin-account-action")
    .getByLabel("Reason")
    .fill("Verified invited learner registration.");
  await page.getByRole("button", { name: "Confirm approve" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "changed to approved" }),
  ).toBeVisible();
  expect(accountStateChanges).toEqual([
    {
      state: "approved",
      reason: "Verified invited learner registration.",
    },
  ]);

  await page.getByLabel("Account state").selectOption("all");
  await expect(
    page.locator(".admin-account-list").first().getByText("Test owner", { exact: true }),
  ).toBeVisible();
  expect(accountListRequests.at(-1)).toBe(
    "/v1/admin/accounts?pageSize=25",
  );
  const approvedLearnerRow = page
    .locator(".admin-account-list article")
    .filter({ hasText: "pending@example.test" });
  await approvedLearnerRow.getByRole("button", { name: "Revoke" }).click();
  await page
    .locator(".admin-account-action")
    .getByLabel("Reason")
    .fill("Confirmed permanent security revocation.");
  await expect(
    page.getByRole("button", { name: "Confirm revoke" }),
  ).toBeDisabled();
  await page.getByLabel("Enter REVOKE to confirm").fill("REVOKE");
  await expect(
    page.getByRole("button", { name: "Confirm revoke" }),
  ).toBeEnabled();
  const actionAccessibility = await new AxeBuilder({ page })
    .include(".admin-account-action")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(actionAccessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Cancel" }).click();
  expect(accountStateChanges).toHaveLength(1);

  await expect(
    page.getByRole("heading", { name: "Privileged audit events" }),
  ).toBeVisible();
  await expect(page.getByText("account.state.change")).toBeVisible();
  await expect(page.getByText("Request request-1")).toBeVisible();
  await page.getByRole("button", { name: "Load more audit events" }).click();
  await expect(
    page.getByText(
      "The audit results changed. Reload from the first page before continuing.",
    ),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Reload audit from start" }),
  ).toBeVisible();
  const paginationAccessibility = await new AxeBuilder({ page })
    .include(".admin-pagination")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(paginationAccessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Reload audit from start" }).click();
  await expect(
    page.getByText(
      "The audit results changed. Reload from the first page before continuing.",
    ),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Automatic approval remains locked/i),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Stage disabled rule" })).toBeEnabled();

  const enabledDomainRow = page
    .locator(".domain-list article")
    .filter({ hasText: enabledDomain.domain });
  await enabledDomainRow.getByRole("button", { name: "Disable" }).click();
  await expect(
    page.getByRole("heading", { name: `Disable ${enabledDomain.domain}` }),
  ).toBeFocused();
  const domainReview = enabledDomainRow.locator(".admin-account-action");
  await domainReview
    .getByLabel("Reason")
    .fill("Pause automatic approval during claim validation.");
  const domainActionAccessibility = await new AxeBuilder({ page })
    .include(".domain-list .admin-account-action")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(domainActionAccessibility.violations).toEqual([]);
  await domainReview.getByRole("button", { name: "Confirm disable" }).click();

  const disabledDomainRow = page
    .locator(".domain-list article")
    .filter({ hasText: disabledDomain.domain });
  await disabledDomainRow.getByRole("button", { name: "Remove" }).click();
  await disabledDomainRow
    .locator(".admin-account-action")
    .getByLabel("Reason")
    .fill("Remove obsolete staged domain policy.");
  await disabledDomainRow
    .getByRole("button", { name: "Confirm remove" })
    .click();

  expect(domainChanges).toEqual([
    {
      id: enabledDomain.id,
      method: "PATCH",
      body: {
        enabled: false,
        reason: "Pause automatic approval during claim validation.",
      },
    },
    {
      id: disabledDomain.id,
      method: "DELETE",
      body: { reason: "Remove obsolete staged domain policy." },
    },
  ]);

  const deletionRow = page
    .locator(".admin-account-list article")
    .filter({ hasText: deletionRequest.displayName });
  await deletionRow
    .getByRole("button", { name: "Complete deletion" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Permanently delete Deletion learner" }),
  ).toBeFocused();
  const deletionReview = deletionRow.locator(".admin-account-action");
  await deletionReview
    .getByLabel("Reason")
    .fill("Cancellation period elapsed and request was verified.");
  await expect(
    deletionReview.getByRole("button", {
      name: "Confirm permanent deletion",
    }),
  ).toBeDisabled();
  await deletionReview.getByLabel("Enter DELETE to confirm").fill("DELETE");
  await deletionReview
    .getByRole("button", { name: "Confirm permanent deletion" })
    .click();
  expect(deletionCompletions).toEqual([
    { reason: "Cancellation period elapsed and request was verified." },
  ]);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
