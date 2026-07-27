import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("keeps legal, privacy, and account expectations visible without dark patterns", async ({
  page,
}) => {
  await page.goto("/account");

  await expect(
    page.getByRole("link", { name: "Learner data and controls" }),
  ).toHaveAttribute("href", "/learner-data");
  await expect(
    page.getByRole("link", { name: "Legal & Transparency" }).first(),
  ).toHaveAttribute(
    "href",
    "https://project-42.dev/legal-transparency",
  );
  await expect(
    page.getByText(/Hosted sign-in and records may be temporarily unavailable/i),
  ).toBeVisible();
  await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(0);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("keeps account policy links readable at narrow width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profile");
  await expect(
    page.getByRole("link", { name: "How Project 42 protects learner data" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Service and legal expectations" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
