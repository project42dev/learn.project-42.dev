import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const hostedIdentityConfigured = Boolean(
  process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN &&
    process.env.NEXT_PUBLIC_PROJECT42_OIDC_AUTHORITY &&
    process.env.NEXT_PUBLIC_PROJECT42_OIDC_CLIENT_ID,
);

test("renders the account state selected by public OIDC configuration", async ({
  page,
}) => {
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

test("explains a temporarily unreachable hosted account service", async ({ page }) => {
  test.skip(
    !hostedIdentityConfigured,
    "The hosted-account network state requires production OIDC build configuration.",
  );

  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "project42.auth.token.v1",
      JSON.stringify({
        accessToken: "deterministic-browser-test-token",
        expiresAt: Date.now() + 3_600_000,
      }),
    );
  });
  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/v1/session`,
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

test("protects the owner route and renders request-correlated audit evidence", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The owner-console journey requires production OIDC build configuration.",
  );

  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "project42.auth.token.v1",
      JSON.stringify({
        accessToken: "deterministic-owner-browser-test-token",
        expiresAt: Date.now() + 3_600_000,
      }),
    );
  });

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

  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/**`,
    async (route) => {
      const origin = route.request().headers().origin ?? "http://localhost";
      const headers = {
        "access-control-allow-origin": origin,
        "access-control-allow-headers": "authorization,content-type,x-request-id",
        "access-control-allow-methods": "DELETE,GET,POST,PATCH,PUT,OPTIONS",
        "content-type": "application/json",
      };
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      const pathname = new URL(route.request().url()).pathname;
      const bodies: Record<string, unknown> = {
        "/v1/session": { account },
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
        "/v1/admin/accounts": { accounts: [account] },
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

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Accounts and exact-domain approval" }),
  ).toBeVisible();
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
