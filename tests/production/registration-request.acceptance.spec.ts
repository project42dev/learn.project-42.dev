import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { parseRegistrationStatus } from "../../app/lib/registrationStatus";
import { readRegistrationAcceptanceConfig } from "./registration-acceptance-config";

const acceptance = readRegistrationAcceptanceConfig();
const registrationCookie = "__Host-project42_registration";
const sessionCookie = "__Host-project42_session";
const localMarker = "project42.registration.acceptance.local-marker";

test("a pending receipt authorizes status only and remains accessible", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    storageState: acceptance.statePath,
    viewport: { width: 320, height: 720 },
  });
  const page = await context.newPage();

  try {
    const cookies = await context.cookies(acceptance.apiOrigin);
    const receipt = cookies.find(({ name }) => name === registrationCookie);
    if (!receipt?.httpOnly || !receipt.secure || !receipt.value) {
      throw new Error(
        "The private browser state does not contain a secure HttpOnly registration receipt.",
      );
    }
    if (cookies.some(({ name }) => name === sessionCookie)) {
      throw new Error(
        "The pending-request acceptance state must not contain a learner session.",
      );
    }

    const sessionResponse = await context.request.get(
      `${acceptance.apiOrigin}/v1/auth/session`,
      { failOnStatusCode: false },
    );
    if (sessionResponse.status() !== 401) {
      throw new Error(
        "The pending registration receipt unexpectedly authorized a learner session.",
      );
    }

    const statusResponse = await context.request.get(
      `${acceptance.apiOrigin}/v1/registration/status`,
      { failOnStatusCode: false },
    );
    if (!statusResponse.ok()) {
      throw new Error(
        `The private registration receipt was rejected (${statusResponse.status()}).`,
      );
    }
    const status = parseRegistrationStatus(await statusResponse.json());
    if (
      status.state !== "pending" ||
      status.requestedAt !== acceptance.requestedAt ||
      status.canSignIn ||
      status.nextAction !== "await-review"
    ) {
      throw new Error(
        "The private receipt does not identify the expected pending request.",
      );
    }

    let pageStatusRequests = 0;
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname === "/v1/registration/status"
      ) {
        pageStatusRequests += 1;
      }
    });
    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: localMarker, value: acceptance.runId },
    );
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
    await expect(page).toHaveURL(/\/account\/?$/);
    await expect.poll(() => pageStatusRequests).toBe(1);
    await page.waitForTimeout(500);
    expect(pageStatusRequests).toBe(1);

    const checkButton = page.getByRole("button", {
      name: /check again in \d+ seconds/i,
    });
    await expect(checkButton).toBeDisabled();
    await checkButton.focus();
    await expect(checkButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Keep learning in this browser" }),
    ).toBeFocused();

    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        localMarker,
      ),
    ).toBe(acceptance.runId);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);

    await testInfo.attach("production-registration-acceptance.json", {
      body: Buffer.from(
        `${JSON.stringify(
          {
            schemaVersion: 1,
            runId: acceptance.runId,
            state: status.state,
            requestedAt: status.requestedAt,
            updatedAt: status.updatedAt,
            learnerSessionStatus: sessionResponse.status(),
            statusRequestCount: pageStatusRequests,
            narrowViewport: "320x720",
            automatedAccessibilityViolations: 0,
          },
          null,
          2,
        )}\n`,
      ),
      contentType: "application/json",
    });
  } finally {
    await context.close();
  }
});
