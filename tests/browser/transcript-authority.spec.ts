import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createEmptyProgress } from "@project42/platform";
import { readFile } from "node:fs/promises";

const apiOrigin = process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN;

async function installSignedOutApi(page: Page) {
  if (!apiOrigin) return;
  await page.route(`${apiOrigin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const origin = route.request().headers().origin ?? "http://localhost";
    const headers = {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "true",
      "content-type": "application/json",
    };
    if (
      pathname === "/v1/auth/session" ||
      pathname === "/v1/registration/status"
    ) {
      await route.fulfill({
        status: 401,
        headers,
        body: JSON.stringify({
          error: { code: "authentication_required" },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 404,
      headers,
      body: JSON.stringify({ error: { code: "not_found" } }),
    });
  });
}

test("labels and exports the signed-out transcript as browser-local", async ({
  page,
}) => {
  await installSignedOutApi(page);
  await page.goto("/profile");

  await expect(
    page.getByText(
      "This transcript is browser-local. It is useful as a portable learning record, but it is not an authoritative account transcript.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Durable issued credentials" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "These achievements are browser-local and are not issued credentials.",
    ),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download browser-local CSV transcript" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^project-42-browser-local-transcript-/,
  );
  const downloadedPath = await download.path();
  if (!downloadedPath) throw new Error("Local transcript download is unavailable");
  expect(await readFile(downloadedPath, "utf8")).toContain(
    "Path,Module,Completed modules",
  );
  await expect(
    page.getByRole("status").filter({
      hasText: "Browser-local transcript downloaded",
    }),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("approved accounts retry and download the authoritative account transcript", async ({
  page,
}) => {
  test.skip(!apiOrigin, "The authoritative transcript requires API configuration.");

  const now = "2026-07-29T12:00:00.000Z";
  const account = {
    id: "transcript-account",
    installationId: "test",
    identity: {
      issuer: "https://issuer.example.test",
      subject: "transcript-subject",
    },
    displayName: "Transcript learner",
    primaryEmail: "learner@example.test",
    emailVerified: true,
    state: "approved",
    roles: ["learner"],
    createdAt: now,
    updatedAt: now,
  };
  const remoteProgress = createEmptyProgress();
  let transcriptRequests = 0;
  const authorizationHeaders: Array<string | undefined> = [];
  const csv =
    '"schema_version","record_authority","record_type","record_id"\r\n' +
    '"1.0","durable-account-record","path_progress","ai-foundations"\r\n';

  await page.route(`${apiOrigin}/**`, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const origin = request.headers().origin ?? "http://localhost";
    const headers = {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type,x-request-id",
      "access-control-allow-methods": "GET,OPTIONS",
      "content-type": "application/json",
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (pathname === "/v1/auth/session") {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          account,
          session: {
            expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
            absoluteExpiresAt: new Date(
              Date.now() + 8 * 60 * 60_000,
            ).toISOString(),
          },
        }),
      });
      return;
    }
    if (pathname === "/v1/me/progress") {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          progress: { revision: 1, progress: remoteProgress },
        }),
      });
      return;
    }
    if (pathname === "/v1/me/transcript.csv") {
      transcriptRequests += 1;
      authorizationHeaders.push(request.headers().authorization);
      if (transcriptRequests === 1) {
        await route.fulfill({
          status: 401,
          headers,
          body: JSON.stringify({
            error: { code: "recent_authentication_required" },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: {
          ...headers,
          "content-type": "text/csv; charset=utf-8",
          "cache-control": "private, no-store",
        },
        body: csv,
      });
      return;
    }
    await route.fulfill({
      status: 404,
      headers,
      body: JSON.stringify({ error: { code: "not_found" } }),
    });
  });

  await page.goto("/profile");
  const downloadButton = page.getByRole("button", {
    name: "Download authoritative account CSV transcript",
  });
  await expect(downloadButton).toBeVisible();
  await expect(
    page.getByText(/authoritative CSV is generated directly from your durable account record/i),
  ).toBeVisible();
  await expect(
    page.getByText(
      "These achievements can be synchronized in your durable account progress, but they are not issued credentials.",
    ),
  ).toBeVisible();

  await downloadButton.click();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Sign out and sign in again before downloading",
    }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^project42-authoritative-account-transcript-/,
  );
  const downloadedPath = await download.path();
  if (!downloadedPath) {
    throw new Error("Authoritative transcript download is unavailable");
  }
  expect(await readFile(downloadedPath, "utf8")).toBe(csv);
  await expect(
    page.getByRole("status").filter({
      hasText: "Authoritative account transcript downloaded",
    }),
  ).toBeVisible();
  expect(transcriptRequests).toBe(2);
  expect(authorizationHeaders).toEqual([undefined, undefined]);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});
