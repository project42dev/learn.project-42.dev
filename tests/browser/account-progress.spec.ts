import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("keeps account features safely disabled until public OIDC settings exist", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Ready for hosted identity configuration" }),
  ).toBeVisible();
  await expect(page.getByText(/browser-local learning remains available/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toHaveCount(0);

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
    page.getByText(/has not connected its account service yet/i),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your paths" }),
  ).toBeVisible();
});
