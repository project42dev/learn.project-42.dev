import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const apiOrigin = process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN;
const hostedIdentityConfigured = Boolean(apiOrigin);
const now = "2026-07-29T12:00:00.000Z";
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const account = {
  id: "profile-controls-account",
  installationId: "test",
  identity: {
    issuer: "https://issuer.example",
    subject: "profile-controls-subject",
  },
  displayName: "Profile learner",
  primaryEmail: "learner@example.test",
  emailVerified: true,
  state: "approved",
  roles: ["learner"],
  createdAt: now,
  updatedAt: now,
};

interface Profile {
  userId: string;
  displayName: string | null;
  bio: string | null;
  organization: string | null;
  location: string | null;
  websiteUrl: string | null;
  photoAvailable: boolean;
  photoUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function initialProfile(): Profile {
  return {
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
  };
}

function jsonHeaders(route: Route) {
  return {
    "access-control-allow-origin":
      route.request().headers().origin ?? "http://127.0.0.1",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type,x-request-id",
    "access-control-allow-methods": "DELETE,GET,POST,PATCH,PUT,OPTIONS",
    "content-type": "application/json",
  };
}

async function fulfillJson(
  route: Route,
  body: unknown,
  status = 200,
): Promise<void> {
  await route.fulfill({
    status,
    headers: jsonHeaders(route),
    body: JSON.stringify(body),
  });
}

async function installBaselineApi(
  page: Page,
  handle: (route: Route, pathname: string) => Promise<boolean>,
): Promise<void> {
  await page.route(`${apiOrigin}/**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: jsonHeaders(route) });
      return;
    }
    const pathname = new URL(request.url()).pathname;
    if (await handle(route, pathname)) return;
    const bodies: Record<string, unknown> = {
      "/v1/auth/session": { account },
      "/v1/me/identities": { identities: [] },
      "/v1/me/consents": { consents: [] },
      "/v1/me/deletion": { requests: [] },
    };
    if (pathname in bodies) {
      await fulfillJson(route, bodies[pathname]);
      return;
    }
    await fulfillJson(route, { error: { code: "not_found" } }, 404);
  });
}

test.describe("hosted profile and learner-data controls", () => {
  test.beforeEach(() => {
    test.skip(
      !hostedIdentityConfigured,
      "Hosted profile tests require account-API configuration.",
    );
  });

  test("edits the existing profile and photo while applying accessible browser preferences", async ({
    page,
  }) => {
    let profile = initialProfile();
    const profilePatches: Array<Record<string, unknown>> = [];
    const photoWrites: Array<{ contentType: string; size: number }> = [];
    let photoRemovals = 0;

    await installBaselineApi(page, async (route, pathname) => {
      const request = route.request();
      if (pathname === "/v1/me/profile" && request.method() === "GET") {
        await fulfillJson(route, { profile });
        return true;
      }
      if (pathname === "/v1/me/profile" && request.method() === "PATCH") {
        const patch = request.postDataJSON() as Record<string, unknown>;
        profilePatches.push(patch);
        profile = {
          ...profile,
          displayName: String(patch.displayName ?? "") || null,
          bio: String(patch.bio ?? "") || null,
          organization: String(patch.organization ?? "") || null,
          location: String(patch.location ?? "") || null,
          websiteUrl: String(patch.websiteUrl ?? "") || null,
          updatedAt: "2026-07-29T12:05:00.000Z",
        };
        await fulfillJson(route, { profile });
        return true;
      }
      if (pathname === "/v1/me/profile/photo" && request.method() === "PUT") {
        photoWrites.push({
          contentType: request.headers()["content-type"] ?? "",
          size: request.postDataBuffer()?.byteLength ?? 0,
        });
        profile = {
          ...profile,
          photoAvailable: true,
          photoUpdatedAt: "2026-07-29T12:06:00.000Z",
        };
        await fulfillJson(route, { photo: { available: true } });
        return true;
      }
      if (pathname === "/v1/me/profile/photo" && request.method() === "GET") {
        await route.fulfill({
          status: 200,
          headers: {
            ...jsonHeaders(route),
            "content-type": "image/png",
          },
          body: onePixelPng,
        });
        return true;
      }
      if (pathname === "/v1/me/profile/photo" && request.method() === "DELETE") {
        photoRemovals += 1;
        profile = {
          ...profile,
          photoAvailable: false,
          photoUpdatedAt: null,
        };
        await fulfillJson(route, { photo: { available: false } });
        return true;
      }
      return false;
    });

    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "How you appear in Project 42" }),
    ).toBeVisible();

    await page.getByLabel("Display name").fill("Ada Learner");
    await page.getByLabel("Organization").fill("Example Lab");
    await page.getByLabel("Location").fill("New York");
    await page.getByLabel("Website").fill("https://example.test/ada");
    await page.getByLabel("About you").fill("Building reliable agents.");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect.poll(() => profilePatches.length).toBe(1);
    await expect(page.getByLabel("Display name")).toHaveValue("Ada Learner");
    expect(profilePatches).toEqual([
      {
        displayName: "Ada Learner",
        bio: "Building reliable agents.",
        organization: "Example Lab",
        location: "New York",
        websiteUrl: "https://example.test/ada",
      },
    ]);

    await page.getByLabel("Profile photo").setInputFiles({
      name: "profile.png",
      mimeType: "image/png",
      buffer: onePixelPng,
    });
    await page.getByRole("button", { name: "Upload photo" }).click();
    await expect(page.getByText("Profile photo saved.")).toBeVisible();
    await expect(page.getByAltText("Current profile")).toBeVisible();
    expect(photoWrites).toEqual([
      { contentType: "image/png", size: onePixelPng.byteLength },
    ]);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Remove photo" }).click();
    await expect(page.getByText("Profile photo removed.")).toBeVisible();
    expect(photoRemovals).toBe(1);

    await page.getByLabel("Language tag for dates and times").fill("en-GB");
    await page.getByLabel("Time zone").fill("America/Los_Angeles");
    await page.getByLabel("Always reduce motion").check();
    await page.getByLabel("Increase contrast").check();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByText("Preferences saved in this browser.")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-project42-reduced-motion",
      "true",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-project42-high-contrast",
      "true",
    );
    expect(
      await page.evaluate(() =>
        JSON.parse(
          window.localStorage.getItem("project42.profile-preferences.v1") ?? "{}",
        ),
      ),
    ).toEqual({
      locale: "en-GB",
      timeZone: "America/Los_Angeles",
      reducedMotion: true,
      highContrast: true,
    });

    await page.reload();
    await expect(page.getByLabel("Always reduce motion")).toBeChecked();
    await expect(page.getByLabel("Increase contrast")).toBeChecked();
    await page.getByLabel("Always reduce motion").uncheck();
    await page.getByLabel("Increase contrast").uncheck();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await page.emulateMedia({ reducedMotion: "reduce", contrast: "more" });
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-project42-reduced-motion",
      /.+/,
    );
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-project42-high-contrast",
      /.+/,
    );
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--ink")
          .trim(),
      ),
    ).toBe("#000");

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("reviews versioned consent and deletion receipts through request and cancellation", async ({
    page,
  }) => {
    const consents = [
      {
        id: "consent-old",
        purpose: "learning-record",
        policyVersion: "2026-06-01",
        decision: "withdrawn",
        decidedAt: "2026-07-27T09:00:00.000Z",
      },
      {
        id: "consent-current",
        purpose: "learning-record",
        policyVersion: "2026-07-27",
        decision: "granted",
        decidedAt: "2026-07-29T09:00:00.000Z",
      },
      {
        id: "consent-optional",
        purpose: "product-improvement",
        policyVersion: "2026-07-27",
        decision: "withdrawn",
        decidedAt: "2026-07-28T09:00:00.000Z",
      },
      {
        id: "consent-legacy",
        purpose: "learner-records",
        policyVersion: "2026-06-01",
        decision: "granted",
        decidedAt: "2026-07-26T09:00:00.000Z",
      },
    ];
    let deletions = [
      {
        id: "deletion-open",
        state: "requested",
        requestedAt: "2026-07-29T10:00:00.000Z",
        cancellationDeadline: "2026-08-05T10:00:00.000Z",
        completedAt: null,
      },
      {
        id: "deletion-completed",
        state: "completed",
        requestedAt: "2026-06-01T10:00:00.000Z",
        cancellationDeadline: "2026-06-08T10:00:00.000Z",
        completedAt: "2026-06-10T10:00:00.000Z",
      },
    ];
    const consentWrites: Array<Record<string, unknown>> = [];
    const deletionWrites: Array<Record<string, unknown>> = [];

    await installBaselineApi(page, async (route, pathname) => {
      const request = route.request();
      if (pathname === "/v1/me/profile" && request.method() === "GET") {
        await fulfillJson(route, { profile: initialProfile() });
        return true;
      }
      if (pathname === "/v1/me/consents" && request.method() === "GET") {
        await fulfillJson(route, { consents });
        return true;
      }
      if (pathname === "/v1/me/consents" && request.method() === "POST") {
        const input = request.postDataJSON() as Record<string, unknown>;
        consentWrites.push(input);
        const consent = {
          id: "consent-new",
          ...input,
          decidedAt: "2026-07-29T12:10:00.000Z",
        };
        consents.push(
          consent as {
            id: string;
            purpose: string;
            policyVersion: string;
            decision: string;
            decidedAt: string;
          },
        );
        await fulfillJson(route, { consent }, 201);
        return true;
      }
      if (pathname === "/v1/me/deletion" && request.method() === "GET") {
        await fulfillJson(route, { requests: deletions });
        return true;
      }
      if (pathname === "/v1/me/deletion" && request.method() === "DELETE") {
        const cancelled = { ...deletions[0], state: "cancelled" };
        deletions = [cancelled, deletions[1]];
        await fulfillJson(route, { deletionRequest: cancelled });
        return true;
      }
      if (pathname === "/v1/me/deletion" && request.method() === "POST") {
        deletionWrites.push(
          request.postDataJSON() as Record<string, unknown>,
        );
        const deletionRequest = {
          id: "deletion-new",
          state: "requested",
          requestedAt: "2026-07-29T12:15:00.000Z",
          cancellationDeadline: "2026-08-05T12:15:00.000Z",
          completedAt: null,
        };
        deletions = [deletionRequest, ...deletions];
        await fulfillJson(route, { deletionRequest }, 201);
        return true;
      }
      return false;
    });

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Consent history" })).toBeVisible();
    const consentRows = page
      .getByRole("table", {
        name: "Every versioned consent decision returned by your account",
      })
      .getByRole("row");
    await expect(consentRows).toHaveCount(5);
    await expect(consentRows.nth(1)).toContainText("learning-record");
    await expect(consentRows.nth(1)).toContainText("2026-07-27");
    await expect(consentRows.nth(1)).toContainText("granted");
    await expect(consentRows.nth(2)).toContainText("product-improvement");
    await expect(
      page.getByRole("cell", { name: "learner-records" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Grant learner-record consent" })
      .click();
    await expect(page.getByText("Learner-record consent recorded.")).toBeVisible();
    expect(consentWrites).toEqual([
      {
        purpose: "learning-record",
        policyVersion: expect.any(String),
        decision: "granted",
      },
    ]);

    await expect(
      page.getByLabel("Deletion request receipt deletion-completed"),
    ).toContainText("Receipt deletion-completed");
    await expect(
      page.getByLabel("Deletion request receipt deletion-open"),
    ).toContainText("Receipt deletion-open");
    await page.getByRole("button", { name: "Cancel deletion" }).click();
    await expect(page.getByText("Deletion request cancelled.")).toBeVisible();
    await expect(page.getByText("cancelled", { exact: true })).toBeVisible();

    await page
      .getByLabel("Enter DELETE MY PROJECT 42 ACCOUNT")
      .fill("DELETE MY PROJECT 42 ACCOUNT");
    await page.getByRole("button", { name: "Request deletion" }).click();
    await expect(
      page.getByLabel("Deletion request receipt deletion-new"),
    ).toContainText("Receipt deletion-new");
    expect(deletionWrites).toEqual([
      { confirmation: "DELETE MY PROJECT 42 ACCOUNT" },
    ]);

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("requires recent authentication and redacts untrusted API failure details", async ({
    page,
  }) => {
    const privateDetail =
      "DATABASE_CONNECTION_STRING=do-not-render tenant-secret=do-not-render";
    const authStartPattern = `${apiOrigin}/v1/auth/start**`;

    await installBaselineApi(page, async (route, pathname) => {
      const request = route.request();
      if (pathname === "/v1/me/profile" && request.method() === "GET") {
        await fulfillJson(route, { profile: initialProfile() });
        return true;
      }
      if (pathname === "/v1/me/profile" && request.method() === "PATCH") {
        await fulfillJson(
          route,
          { error: { code: "internal_error", message: privateDetail } },
          500,
        );
        return true;
      }
      if (pathname === "/v1/me/profile/photo" && request.method() === "PUT") {
        await fulfillJson(
          route,
          { error: { code: "storage_error", message: privateDetail } },
          500,
        );
        return true;
      }
      if (pathname === "/v1/me/consents" && request.method() === "POST") {
        await fulfillJson(
          route,
          { error: { code: "internal_error", message: privateDetail } },
          500,
        );
        return true;
      }
      if (pathname === "/v1/me/export" && request.method() === "GET") {
        await fulfillJson(
          route,
          {
            error: {
              code: "recent_authentication_required",
              message: privateDetail,
            },
          },
          403,
        );
        return true;
      }
      if (pathname === "/v1/auth/start") {
        await route.abort("aborted");
        return true;
      }
      return false;
    });

    await page.goto("/account");
    await page.getByLabel("Display name").fill("Unsafe response check");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(
      page.getByText(
        "Your profile could not be saved. No local learning progress was changed.",
      ),
    ).toBeVisible();

    await page.getByLabel("Profile photo").setInputFiles({
      name: "profile.png",
      mimeType: "image/png",
      buffer: onePixelPng,
    });
    await page.getByRole("button", { name: "Upload photo" }).click();
    await expect(
      page.getByText(
        "Profile photo could not be uploaded. The selected file was not retained by this page.",
      ),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Grant learner-record consent" })
      .click();
    await expect(
      page.getByText("Consent could not be recorded. Your previous decision is unchanged."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Download my data" }).click();
    await expect(
      page.getByText(
        "Sign out and sign in again before exporting this sensitive account data.",
      ),
    ).toBeVisible();
    await expect(page.getByText(privateDetail)).toHaveCount(0);
    await expect(page.getByText(/DATABASE_CONNECTION_STRING/)).toHaveCount(0);

    const requestPromise = page.waitForRequest(authStartPattern);
    await page.getByRole("button", { name: "Sign in again" }).click();
    const request = await requestPromise;
    expect(new URL(request.url()).searchParams.get("return_to")).toBe(
      new URL("/account", page.url()).toString(),
    );
  });
});
