import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const hostedIdentityConfigured = Boolean(
  process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN &&
    process.env.NEXT_PUBLIC_PROJECT42_OIDC_AUTHORITY &&
    process.env.NEXT_PUBLIC_PROJECT42_OIDC_CLIENT_ID,
);

const ownerId = "00000000-0000-4000-8000-000000000001";
const sourceId = "00000000-0000-4000-8000-000000000002";
const survivorId = "00000000-0000-4000-8000-000000000003";
const mergeId = "00000000-0000-4000-8000-000000000004";
const receiptId = "00000000-0000-4000-8000-000000000005";

const createdAt = "2026-07-28T00:00:00.000Z";
const owner = {
  id: ownerId,
  installationId: "test",
  identity: { issuer: "https://issuer.example", subject: "owner-subject" },
  displayName: "Test owner",
  primaryEmail: "owner@example.test",
  emailVerified: true,
  state: "approved",
  roles: ["learner", "owner"],
  createdAt,
  updatedAt: createdAt,
};
const source = {
  ...owner,
  id: sourceId,
  identity: { issuer: "https://issuer.example", subject: "source-subject" },
  displayName: "Duplicate Learner",
  primaryEmail: "duplicate@example.test",
  roles: ["learner"],
};
const survivor = {
  ...owner,
  id: survivorId,
  identity: { issuer: "https://issuer.example", subject: "survivor-subject" },
  displayName: "Survivor Learner",
  primaryEmail: "survivor@example.test",
  roles: ["learner"],
};

async function installOwnerSession(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "project42.auth.token.v1",
      JSON.stringify({
        accessToken: "deterministic-owner-account-merge-token",
        expiresAt: Date.now() + 3_600_000,
      }),
    );
  });
}

async function installOwnerApi(
  page: Page,
  options: {
    previewMode?: "available" | "expired" | "replayed";
  } = {},
) {
  let recoveryProofCount = 0;
  let completionRequest: Record<string, unknown> | null = null;
  let rollbackRequest: Record<string, unknown> | null = null;
  const previewMode = options.previewMode ?? "available";

  await page.route(
    `${process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN}/**`,
    async (route) => {
      const request = route.request();
      const origin = request.headers().origin ?? "http://localhost";
      const headers = {
        "access-control-allow-origin": origin,
        "access-control-allow-headers":
          "authorization,content-type,x-request-id",
        "access-control-allow-methods": "DELETE,GET,POST,PATCH,PUT,OPTIONS",
        "content-type": "application/json",
      };
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      const pathname = new URL(request.url()).pathname;
      const commonBodies: Record<string, unknown> = {
        "/v1/session": { account: owner },
        "/v1/admin/accounts": { accounts: [owner, source, survivor] },
        "/v1/admin/domains": {
          domains: [],
          automaticApprovalEnabled: false,
        },
        "/v1/admin/deletions": { requests: [] },
        "/v1/admin/audit": { events: [] },
      };
      if (pathname in commonBodies) {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify(commonBodies[pathname]),
        });
        return;
      }
      if (
        pathname === "/v1/admin/account-merges/recovery-proofs" &&
        request.method() === "POST"
      ) {
        recoveryProofCount += 1;
        const input = request.postDataJSON() as { userId: string };
        await route.fulfill({
          status: 201,
          headers,
          body: JSON.stringify({
            proof: {
              token: `proof_${"a".repeat(44)}_${recoveryProofCount}`,
              userId: input.userId,
              method: "owner-assisted-recovery",
              expiresAt: new Date(Date.now() + 900_000).toISOString(),
            },
          }),
        });
        return;
      }
      if (
        pathname === "/v1/admin/account-merges/preview" &&
        request.method() === "POST"
      ) {
        if (previewMode === "replayed") {
          await route.fulfill({
            status: 409,
            headers,
            body: JSON.stringify({
              error: {
                code: "account_merge_proof_unavailable",
                message: "One proof was already consumed.",
              },
            }),
          });
          return;
        }
        await route.fulfill({
          status: 201,
          headers,
          body: JSON.stringify({
            merge: {
              id: mergeId,
              status: "preview",
              sourceUserId: sourceId,
              survivorUserId: survivorId,
              sourceDisplayName: source.displayName,
              survivorDisplayName: survivor.displayName,
              sourcePrimaryEmail: source.primaryEmail,
              survivorPrimaryEmail: survivor.primaryEmail,
              proofMethods: {
                source: "owner-assisted-recovery",
                survivor: "owner-assisted-recovery",
              },
              conflicts: [
                {
                  key: "account.displayName",
                  field: "displayName",
                  sourcePresent: true,
                  survivorPresent: true,
                  sourceValue: source.displayName,
                  survivorValue: survivor.displayName,
                  required: true,
                  description:
                    "Choose the display name retained by the survivor account.",
                },
              ],
              recordCounts: {
                assessment_attempts: { source: 2, survivor: 3 },
                transcript_entries: { source: 1, survivor: 4 },
              },
              expiresAt:
                previewMode === "expired"
                  ? new Date(Date.now() - 1_000).toISOString()
                  : new Date(Date.now() + 1_800_000).toISOString(),
            },
          }),
        });
        return;
      }
      if (
        pathname === `/v1/admin/account-merges/${mergeId}/complete` &&
        request.method() === "POST"
      ) {
        completionRequest = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            receipt: {
              id: receiptId,
              mergeCaseId: mergeId,
              receiptDigest: "receipt-digest",
              snapshotDigest: "snapshot-digest",
              mergedAt: new Date().toISOString(),
              recordCounts: {
                assessment_attempts: 5,
                transcript_entries: 5,
              },
              status: "completed",
            },
          }),
        });
        return;
      }
      if (
        pathname === `/v1/admin/account-merges/${mergeId}/rollback` &&
        request.method() === "POST"
      ) {
        rollbackRequest = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            receipt: {
              id: receiptId,
              mergeCaseId: mergeId,
              receiptDigest: "receipt-digest",
              snapshotDigest: "snapshot-digest",
              mergedAt: new Date().toISOString(),
              recordCounts: {
                assessment_attempts: 5,
                transcript_entries: 5,
              },
              status: "rolled-back",
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

  return {
    completionRequest: () => completionRequest,
    rollbackRequest: () => rollbackRequest,
    recoveryProofCount: () => recoveryProofCount,
  };
}

async function selectAccountsAndPasteProofs(page: Page) {
  const sourceGroup = page.getByRole("group", {
    name: "Duplicate account to retire",
  });
  const survivorGroup = page.getByRole("group", {
    name: "Learner record to keep",
  });
  await sourceGroup.getByLabel("Account", { exact: true }).selectOption(sourceId);
  await survivorGroup
    .getByLabel("Account", { exact: true })
    .selectOption(survivorId);
  await sourceGroup
    .getByLabel("One-time proof from the account holder")
    .fill(`proof_${"s".repeat(48)}`);
  await survivorGroup
    .getByLabel("One-time proof from the account holder")
    .fill(`proof_${"v".repeat(48)}`);
  return { sourceGroup, survivorGroup };
}

test("owner reviews, confirms, and recovers a duplicate-account merge", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The account-merge journey requires production OIDC build configuration.",
  );
  await installOwnerSession(page);
  const api = await installOwnerApi(page);
  await page.goto("/admin");

  const sourceGroup = page.getByRole("group", {
    name: "Duplicate account to retire",
  });
  const survivorGroup = page.getByRole("group", {
    name: "Learner record to keep",
  });
  await sourceGroup.getByLabel("Account", { exact: true }).selectOption(sourceId);
  await survivorGroup
    .getByLabel("Account", { exact: true })
    .selectOption(survivorId);

  for (const group of [sourceGroup, survivorGroup]) {
    await group.locator("summary").click();
    await group
      .getByLabel("Identity-provider recovery completed")
      .check();
    await group.getByLabel("Signed owner attestation recorded").check();
    await group.getByLabel("Recovery reference").fill("support-case-42");
    await group
      .getByLabel("Evidence summary")
      .fill("Two independent recovery methods were reviewed by the owner.");
    await group
      .getByRole("button", { name: "Record governed recovery proof" })
      .click();
  }
  expect(api.recoveryProofCount()).toBe(2);

  await page
    .getByRole("button", { name: "Preview merge consequences" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Merge review" }),
  ).toBeFocused();
  await expect(page.getByText("Created atomically before any records move")).toBeVisible();
  await expect(page.getByText("assessment attempts: 2 duplicate + 3 survivor")).toBeVisible();
  await expect(page.getByText(/Rollback is refused after new profile/i)).toBeVisible();

  await page
    .getByLabel("Keep from survivor: Survivor Learner")
    .check();
  await page
    .getByLabel(new RegExp(`Type MERGE ${sourceId} INTO ${survivorId}`))
    .fill(`MERGE ${sourceId} INTO ${survivorId}`);
  await page.getByRole("button", { name: "Merge accounts" }).click();

  await expect(
    page.getByRole("heading", { name: "Immutable merge receipt" }),
  ).toBeFocused();
  await expect(page.getByText("receipt-digest")).toBeVisible();
  expect(api.completionRequest()).toMatchObject({
    confirmation: `MERGE ${sourceId} INTO ${survivorId}`,
    resolutions: { "account.displayName": "survivor" },
  });

  await page
    .getByText("Roll back from the protected recovery snapshot")
    .click();
  await page
    .getByLabel(new RegExp(`Type ROLL BACK ${mergeId}`))
    .fill(`ROLL BACK ${mergeId}`);
  await page
    .getByLabel("Rollback reason")
    .fill("The owner selected the wrong durable learner record.");
  await page.getByRole("button", { name: "Restore both accounts" }).click();
  await expect(
    page.getByRole("heading", { name: "Recovery completed" }),
  ).toBeVisible();
  expect(api.rollbackRequest()).toEqual({
    confirmation: `ROLL BACK ${mergeId}`,
    reason: "The owner selected the wrong durable learner record.",
  });

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("owner merge UI fails closed for duplicate, cancelled, expired, and replayed reviews", async ({
  page,
}) => {
  test.skip(
    !hostedIdentityConfigured,
    "The account-merge failure states require production OIDC build configuration.",
  );
  await installOwnerSession(page);
  await installOwnerApi(page, { previewMode: "expired" });
  await page.goto("/admin");

  const sourceGroup = page.getByRole("group", {
    name: "Duplicate account to retire",
  });
  const survivorGroup = page.getByRole("group", {
    name: "Learner record to keep",
  });
  await sourceGroup.getByLabel("Account", { exact: true }).selectOption(sourceId);
  await survivorGroup
    .getByLabel("Account", { exact: true })
    .selectOption(sourceId);
  await sourceGroup
    .getByLabel("One-time proof from the account holder")
    .fill(`proof_${"s".repeat(48)}`);
  await survivorGroup
    .getByLabel("One-time proof from the account holder")
    .fill(`proof_${"v".repeat(48)}`);
  await page
    .getByRole("button", { name: "Preview merge consequences" })
    .click();
  await expect(
    page.getByText("The duplicate and survivor must be different accounts."),
  ).toBeVisible();

  await survivorGroup
    .getByLabel("Account", { exact: true })
    .selectOption(survivorId);
  await sourceGroup
    .getByLabel("One-time proof from the account holder")
    .fill(`proof_${"s".repeat(48)}`);
  await survivorGroup
    .getByLabel("One-time proof from the account holder")
    .fill(`proof_${"v".repeat(48)}`);
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
  await installOwnerApi(page, { previewMode: "replayed" });
  await page.reload();
  await selectAccountsAndPasteProofs(page);
  await page
    .getByRole("button", { name: "Preview merge consequences" })
    .click();
  await expect(
    page.getByText(
      "One proof was already consumed. Collect fresh proof for both accounts.",
    ),
  ).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: "Duplicate account to retire" })
      .getByLabel("One-time proof from the account holder"),
  ).toHaveValue("");
});
