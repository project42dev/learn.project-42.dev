import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const apiOrigin = process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN;
const hostedIdentityConfigured = Boolean(apiOrigin);
const now = "2026-08-01T00:00:00.000Z";

const accountId = "00000000-0000-4000-8000-000000000101";
const otherAccountId = "00000000-0000-4000-8000-000000000102";
const mergeId = "00000000-0000-4000-8000-000000000103";
const receiptId = "00000000-0000-4000-8000-000000000104";

const account = {
  id: accountId,
  installationId: "test",
  identity: { issuer: "https://issuer.example", subject: "self-service-subject" },
  displayName: "Self-service learner",
  primaryEmail: "learner@example.test",
  emailVerified: true,
  state: "approved",
  roles: ["learner"],
  createdAt: now,
  updatedAt: now,
};

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

async function fulfillJson(route: Route, body: unknown, status = 200) {
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
      "/v1/me/profile": {
        profile: {
          userId: account.id,
          displayName: account.displayName,
          bio: null,
          organization: null,
          location: null,
          websiteUrl: null,
          locale: "en-US",
          timeZone: "UTC",
          reducedMotion: false,
          highContrast: false,
          photoAvailable: false,
          photoUpdatedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      },
    };
    if (pathname in bodies) {
      await fulfillJson(route, bodies[pathname]);
      return;
    }
    await fulfillJson(route, { error: { code: "not_found" } }, 404);
  });
}

function installMergeApi(
  page: Page,
  options: { previewMode?: "available" | "expired" | "replayed" } = {},
) {
  const previewMode = options.previewMode ?? "available";
  let proofCount = 0;
  let completionRequest: Record<string, unknown> | null = null;
  let rollbackRequest: Record<string, unknown> | null = null;

  return installBaselineApi(page, async (route, pathname) => {
    const request = route.request();
    if (
      pathname === "/v1/me/account-merge-proof" &&
      request.method() === "POST"
    ) {
      proofCount += 1;
      await fulfillJson(
        route,
        {
          proof: {
            token: `proof_${"a".repeat(44)}_${proofCount}`,
            userId: account.id,
            method: "recent-authentication",
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
          },
        },
        201,
      );
      return true;
    }
    if (
      pathname === "/v1/me/account-merges/preview" &&
      request.method() === "POST"
    ) {
      if (previewMode === "replayed") {
        await fulfillJson(
          route,
          {
            error: {
              code: "invalid_account_merge_proof",
              message: "One proof was already consumed.",
            },
          },
          400,
        );
        return true;
      }
      const body = request.postDataJSON() as {
        sourceUserId: string;
        survivorUserId: string;
      };
      await fulfillJson(
        route,
        {
          merge: {
            id: mergeId,
            status: "preview",
            sourceUserId: body.sourceUserId,
            survivorUserId: body.survivorUserId,
            sourceDisplayName: "Retired side",
            survivorDisplayName: "Surviving side",
            sourcePrimaryEmail: "retired@example.test",
            survivorPrimaryEmail: "learner@example.test",
            proofMethods: {
              source: "recent-authentication",
              survivor: "recent-authentication",
            },
            conflicts: [
              {
                key: "account.displayName",
                field: "displayName",
                sourcePresent: true,
                survivorPresent: true,
                sourceValue: "Retired side",
                survivorValue: "Surviving side",
                required: true,
                description:
                  "Choose the display name retained by the survivor account.",
              },
            ],
            recordCounts: {
              assessment_attempts: { source: 2, survivor: 3 },
            },
            expiresAt:
              previewMode === "expired"
                ? new Date(Date.now() - 1_000).toISOString()
                : new Date(Date.now() + 1_800_000).toISOString(),
          },
        },
        201,
      );
      return true;
    }
    if (
      pathname === `/v1/me/account-merges/${mergeId}/complete` &&
      request.method() === "POST"
    ) {
      completionRequest = request.postDataJSON() as Record<string, unknown>;
      await fulfillJson(route, {
        receipt: {
          id: receiptId,
          mergeCaseId: mergeId,
          receiptDigest: "receipt-digest",
          snapshotDigest: "snapshot-digest",
          mergedAt: new Date().toISOString(),
          recordCounts: { assessment_attempts: 5 },
          status: "completed",
        },
      });
      return true;
    }
    if (
      pathname === `/v1/me/account-merges/${mergeId}/rollback` &&
      request.method() === "POST"
    ) {
      rollbackRequest = request.postDataJSON() as Record<string, unknown>;
      await fulfillJson(route, {
        receipt: {
          id: receiptId,
          mergeCaseId: mergeId,
          receiptDigest: "receipt-digest",
          snapshotDigest: "snapshot-digest",
          mergedAt: new Date().toISOString(),
          recordCounts: { assessment_attempts: 5 },
          status: "rolled-back",
        },
      });
      return true;
    }
    return false;
  }).then(() => ({
    completionRequest: () => completionRequest,
    rollbackRequest: () => rollbackRequest,
  }));
}

test.describe("learner-initiated account merge", () => {
  test.beforeEach(() => {
    test.skip(
      !hostedIdentityConfigured,
      "The account-merge journey requires account-API configuration.",
    );
  });

  test("a learner merges a duplicate account into their own without owner involvement", async ({
    page,
  }) => {
    const api = await installMergeApi(page);
    await page.goto("/account");

    await page
      .getByRole("button", { name: "Get this account's proof" })
      .click();
    await expect(page.getByText("Account ID", { exact: true })).toBeVisible();

    await page.getByLabel("Other account's ID").fill(otherAccountId);
    await page
      .getByLabel("Other account's proof")
      .fill(`proof_${"o".repeat(44)}`);
    await page
      .getByLabel("Keep this account; the other account merges into it")
      .check();

    await page
      .getByRole("button", { name: "Preview merge consequences" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Merge review" }),
    ).toBeFocused();
    await expect(
      page.getByText("assessment attempts: 2 from this side + 3 from the other side"),
    ).toBeVisible();
    await expect(page.getByText(/Rollback is refused after new profile/i)).toBeVisible();

    await page.getByLabel("Keep: Surviving side").check();
    await page
      .getByLabel("Type the confirmation below")
      .fill(`MERGE ${otherAccountId} INTO ${accountId}`);
    await page.getByRole("button", { name: "Merge accounts" }).click();

    await expect(
      page.getByRole("heading", { name: "Immutable merge receipt" }),
    ).toBeFocused();
    expect(api.completionRequest()).toMatchObject({
      confirmation: `MERGE ${otherAccountId} INTO ${accountId}`,
      resolutions: { "account.displayName": "survivor" },
    });

    await page.getByText("Roll back this merge").click();
    await page
      .getByLabel("Type the confirmation below")
      .last()
      .fill(`ROLL BACK ${mergeId}`);
    await page
      .getByLabel("Rollback reason")
      .fill("The learner picked the wrong side to keep.");
    await page.getByRole("button", { name: "Restore both accounts" }).click();
    await expect(
      page.getByRole("heading", { name: "Recovery completed" }),
    ).toBeVisible();
    expect(api.rollbackRequest()).toEqual({
      confirmation: `ROLL BACK ${mergeId}`,
      reason: "The learner picked the wrong side to keep.",
    });

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("fails closed for a same-account merge, an expired review, and a replayed proof", async ({
    page,
  }) => {
    await installMergeApi(page, { previewMode: "expired" });
    await page.goto("/account");

    await page
      .getByRole("button", { name: "Get this account's proof" })
      .click();
    await page.getByLabel("Other account's ID").fill(accountId);
    await page
      .getByLabel("Other account's proof")
      .fill(`proof_${"o".repeat(44)}`);
    await page
      .getByLabel("Keep this account; the other account merges into it")
      .check();
    await page
      .getByRole("button", { name: "Preview merge consequences" })
      .click();
    await expect(
      page.getByText("The other account must be different from this one."),
    ).toBeVisible();

    await page.getByLabel("Other account's ID").fill(otherAccountId);
    await page
      .getByRole("button", { name: "Preview merge consequences" })
      .click();
    await expect(
      page.getByText("This review has expired. No merge occurred."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Merge accounts" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Cancel review" }).click();
    await expect(
      page.getByText(/Merge review cancelled. No accounts changed/i),
    ).toBeVisible();

    await page.unrouteAll({ behavior: "wait" });
    await installMergeApi(page, { previewMode: "replayed" });
    await page.reload();
    await page
      .getByRole("button", { name: "Get this account's proof" })
      .click();
    await page.getByLabel("Other account's ID").fill(otherAccountId);
    await page
      .getByLabel("Other account's proof")
      .fill(`proof_${"o".repeat(44)}`);
    await page
      .getByLabel("Keep this account; the other account merges into it")
      .check();
    await page
      .getByRole("button", { name: "Preview merge consequences" })
      .click();
    await expect(
      page.getByText(
        "One proof was already consumed. Get a fresh proof from both accounts and try again.",
      ),
    ).toBeVisible();
  });
});
