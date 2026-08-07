import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const apiOrigin = process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN;
const hostedIdentityConfigured = Boolean(apiOrigin);
const requestedAt = "2026-07-29T10:00:00.000Z";
const updatedAt = "2026-07-29T10:05:00.000Z";

function responseHeaders(route: Route, extra: Record<string, string> = {}) {
  return {
    "access-control-allow-origin":
      route.request().headers().origin ?? "http://127.0.0.1",
    "access-control-allow-credentials": "true",
    "content-type": "application/json",
    ...extra,
  };
}

async function installRegistrationApi(
  page: Page,
  registration:
    | {
      status?: number;
      headers?: Record<string, string>;
      body: unknown;
    }
    | undefined,
) {
  let statusRequests = 0;
  let acceptanceRequests = 0;
  let acceptedTerms: unknown;
  await page.route(`${apiOrigin}/**`, async (route) => {
    const target = new URL(route.request().url());
    if (target.pathname === "/v1/auth/session") {
      await route.fulfill({
        status: 401,
        headers: responseHeaders(route),
        body: JSON.stringify({
          error: { code: "authentication_required" },
        }),
      });
      return;
    }
    if (target.pathname === "/v1/registration/terms-acceptance") {
      acceptanceRequests += 1;
      acceptedTerms = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        headers: responseHeaders(route),
        body: JSON.stringify({
          acceptance: {
            purpose: "terms-of-service",
            policyVersion: "1.0",
          },
        }),
      });
      return;
    }
    if (target.pathname === "/v1/registration/status") {
      statusRequests += 1;
      await route.fulfill({
        status: registration ? (registration.status ?? 200) : 401,
        headers: responseHeaders(route, registration?.headers),
        body: JSON.stringify(
          registration?.body ?? {
            error: { code: "registration_receipt_invalid" },
          },
        ),
      });
      return;
    }
    if (target.pathname === "/v1/auth/start") {
      await route.abort("aborted");
      return;
    }
    await route.fulfill({
      status: 404,
      headers: responseHeaders(route),
      body: JSON.stringify({ error: { code: "not_found" } }),
    });
  });
  return {
    statusRequests: () => statusRequests,
    acceptanceRequests: () => acceptanceRequests,
    acceptedTerms: () => acceptedTerms,
  };
}

test.describe("learner account request and private status receipt", () => {
  test.beforeEach(() => {
    test.skip(
      !hostedIdentityConfigured,
      "Registration journeys require account-API configuration.",
    );
  });

  test("presents a public provider-neutral request entry with account expectations", async ({
    page,
  }) => {
    await installRegistrationApi(page, undefined);
    await page.goto("/account");

    await expect(
      page.getByRole("heading", { name: "Request a Project 42 account" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Request an account" }),
    ).toBeVisible();
    await expect(
      page.getByText(/does not create an authenticated learner session/i),
    ).toBeVisible();
    await expect(
      page.getByText(/learner data, consent, retention, and recovery/i),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Legal & Transparency page" }),
    ).toHaveAttribute(
      "href",
      "https://project-42.dev/legal-transparency",
    );

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("allows public catalog browsing but requires sign-in for module participation", async ({
    page,
  }) => {
    await installRegistrationApi(page, undefined);
    await page.goto("/learn");
    await expect(
      page.getByRole("heading", { name: /learning paths with a clear next step/i }),
    ).toBeVisible();

    const signIn = page.waitForRequest(`${apiOrigin}/v1/auth/start**`);
    await page.goto("/learn/ai-foundations/research-with-evidence");
    const request = await signIn;
    const returnTo = new URL(
      new URL(request.url()).searchParams.get("return_to") ?? "",
    );
    // Next.js may include a trailing slash; normalize before comparing.
    const normalized = returnTo.pathname.replace(/\/$/, "");
    expect(normalized).toBe("/learn/ai-foundations/research-with-evidence");
    await expect(
      page.getByRole("heading", { name: "Research with evidence" }),
    ).toHaveCount(0);
  });

  test("renders pending status from the HttpOnly receipt without PII or polling", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem(
        "project42.terms-acceptance.v1",
        JSON.stringify({
          termsVersion: "1.0",
          acceptedAt: "2026-07-29T09:59:00.000Z",
        }),
      );
    });
    const api = await installRegistrationApi(page, {
      body: {
        registration: {
          state: "pending",
          requestedAt,
          updatedAt,
          canSignIn: false,
          nextAction: "await-review",
          primaryEmail: "must-not-render@example.test",
          subject: "must-not-render",
        },
      },
    });
    await page.goto("/account?auth=pending");

    await expect(
      page.getByRole("heading", {
        name: "Your access request is waiting for review",
      }),
    ).toBeVisible();
    await expect(page.getByText("pending", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/no hosted learner session exists yet/i),
    ).toBeVisible();
    await expect(page.getByText(/does not poll automatically/i)).toBeVisible();
    await expect(page.getByText("must-not-render@example.test")).toHaveCount(0);
    await expect(page.getByText("must-not-render")).toHaveCount(0);
    await expect(page).toHaveURL(/\/account\/?$/);
    await expect.poll(api.statusRequests).toBe(1);
    await expect.poll(api.acceptanceRequests).toBe(1);
    expect(api.acceptedTerms()).toEqual({
      termsVersion: "1.0",
      acceptedAt: "2026-07-29T09:59:00.000Z",
    });
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem("project42.terms-acceptance.v1"),
      ),
    ).toBeNull();

    const retry = page.getByRole("button", {
      name: /check again in \d+ seconds/i,
    });
    await expect(retry).toBeDisabled();
    await page.waitForTimeout(250);
    expect(api.statusRequests()).toBe(1);

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("shows a rejected decision without exposing a private reason", async ({
    page,
  }) => {
    await installRegistrationApi(page, {
      body: {
        registration: {
          state: "rejected",
          requestedAt,
          updatedAt,
          canSignIn: false,
          nextAction: "contact-owner",
          reason: "private owner note",
        },
      },
    });
    await page.goto("/account?auth=rejected");

    await expect(
      page.getByRole("heading", {
        name: "Your access request was not approved",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/does not expose a private review reason/i),
    ).toBeVisible();
    await expect(page.getByText("private owner note")).toHaveCount(0);
  });

  test("recovers from an expired or replaced receipt through a new secure sign-in", async ({
    page,
  }) => {
    await installRegistrationApi(page, undefined);
    await page.goto("/account?auth=pending");
    await expect(
      page.getByRole("heading", {
        name: "This private request receipt is no longer valid",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/does not reveal whether access was approved/i),
    ).toBeVisible();

    const startRequest = page.waitForRequest(`${apiOrigin}/v1/auth/start**`);
    await page
      .getByRole("button", { name: "Sign in to check access" })
      .click();
    const request = await startRequest;
    const target = new URL(request.url());
    expect(target.searchParams.get("return_to")).toBe(
      new URL("/account", page.url()).toString(),
    );
  });

  test("honors Retry-After and does not expose an account on status throttling", async ({
    page,
  }) => {
    const api = await installRegistrationApi(page, {
      status: 429,
      headers: { "retry-after": "120" },
      body: {
        error: {
          code: "authentication_rate_limited",
          message: "internal detail must not render",
        },
      },
    });
    await page.goto("/account?auth=pending");

    await expect(
      page.getByRole("heading", {
        name: "Request status is temporarily unavailable",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /try again in \d+ seconds/i }),
    ).toBeDisabled();
    await expect(page.getByText("internal detail must not render")).toHaveCount(
      0,
    );
    await page.waitForTimeout(250);
    expect(api.statusRequests()).toBe(1);
  });

  test("handles approved, provider-error, and account-unavailable transitions", async ({
    page,
  }) => {
    await installRegistrationApi(page, {
      body: {
        registration: {
          state: "approved",
          requestedAt,
          updatedAt,
          canSignIn: true,
          nextAction: "sign-in",
        },
      },
    });
    await page.goto("/account?auth=pending");
    await expect(
      page.getByRole("heading", { name: "Your access is ready" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in to continue" }),
    ).toBeVisible();

    await page.unrouteAll({ behavior: "wait" });
    await installRegistrationApi(page, undefined);
    await page.goto("/account?auth=error");
    await expect(
      page.getByRole("heading", {
        name: "The identity provider did not complete the request",
      }),
    ).toBeVisible();

    await page.goto("/account?auth=unavailable");
    await expect(
      page.getByRole("heading", { name: "Hosted account access is unavailable" }),
    ).toBeVisible();
  });
});
