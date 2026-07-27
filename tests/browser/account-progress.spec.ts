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
