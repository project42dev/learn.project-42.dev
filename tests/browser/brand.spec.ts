import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("publishes visible accessible branding and complete icon assets", async ({
  page,
  request,
}) => {
  await page.goto("/");

  const homeBrand = page.getByRole("link", { name: "Project 42 home" });
  await expect(homeBrand).toBeVisible();
  await expect(homeBrand.locator("svg.brand-mark")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(page.locator("svg.brand-mark")).toHaveCount(2);

  const iconAssets = [
    ["/brand/project-42-mark.svg", "image/svg+xml"],
    ["/favicon-16x16.png", "image/png"],
    ["/favicon-32x32.png", "image/png"],
    ["/favicon-48x48.png", "image/png"],
    ["/apple-touch-icon.png", "image/png"],
    ["/icon-192x192.png", "image/png"],
    ["/icon-512x512.png", "image/png"],
    ["/icon-maskable-512x512.png", "image/png"],
    ["/og.png", "image/png"],
  ] as const;

  for (const [path, contentType] of iconAssets) {
    const response = await request.get(path);
    expect(response.status(), `${path} should load`).toBe(200);
    expect(response.headers()["content-type"]).toContain(contentType);
    expect((await response.body()).length).toBeGreaterThan(100);
  }

  const favicon = await request.get("/favicon.ico");
  expect(favicon.status()).toBe(200);
  expect(favicon.headers()["content-type"]).toMatch(
    /image\/(?:x-icon|vnd\.microsoft\.icon)/,
  );
  expect((await favicon.body()).length).toBeGreaterThan(100);

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest.short_name).toBe("Project 42");
  expect(manifest.icons).toHaveLength(3);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.emulateMedia({ forcedColors: "active" });
  await expect(homeBrand.locator("svg.brand-mark")).toBeVisible();
});
