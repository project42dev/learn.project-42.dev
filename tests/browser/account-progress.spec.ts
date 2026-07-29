import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { LearnerProgress } from "@project42/platform";

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
  const accountStateChanges: Array<Record<string, unknown>> = [];

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
      const pathname = new URL(route.request().url()).pathname;
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
          domains: [],
          automaticApprovalEnabled: false,
        },
        "/v1/admin/deletions": { requests: [] },
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
  await expect(
    page.getByText(/Automatic approval remains locked/i),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Stage disabled rule" })).toBeEnabled();

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
