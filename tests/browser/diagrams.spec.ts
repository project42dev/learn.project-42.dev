import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("discovers and reads accessible source-first visual guides", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Visual guides", exact: true }).first().click();
  await expect(page).toHaveURL(/\/diagrams\/?$/);
  await expect(
    page.getByRole("heading", { name: "See the system, not just the steps." }),
  ).toBeVisible();
  await expect(page.locator(".diagram-card")).toHaveCount(8);

  await page
    .getByRole("link", { name: "Explore this visual" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "The learning evidence loop" }),
  ).toBeVisible();
  const diagram = page.locator(".diagram-canvas img");
  await expect(diagram).toBeVisible();
  await expect(diagram).toHaveAttribute("alt", /flow starts at Learn/i);
  await expect(page.getByRole("figure")).toContainText(
    "Project 42 turns study into evidence",
  );
  await expect(page.getByRole("heading", { name: "Key takeaways" })).toBeVisible();

  const viewerTrigger = page.getByRole("button", {
    name: /open full-screen viewer/i,
  });
  await viewerTrigger.click();
  const viewer = page.getByRole("dialog", { name: "The learning evidence loop" });
  await expect(viewer).toBeVisible();
  await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
  await expect(viewer.locator("output")).toHaveText("100%");
  for (let index = 0; index < 12; index += 1) {
    await page.getByRole("button", { name: "Zoom in" }).click();
  }
  await expect(viewer.locator("output")).toHaveText("400%");
  await expect(viewer.locator(".diagram-viewer-viewport")).toBeVisible();
  const canScroll = await viewer.locator(".diagram-viewer-viewport").evaluate(
    (element) =>
      element.scrollWidth > element.clientWidth ||
      element.scrollHeight > element.clientHeight,
  );
  expect(canScroll).toBe(true);

  const dialogAccessibility = await new AxeBuilder({ page })
    .include(".diagram-viewer")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(dialogAccessibility.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(viewerTrigger).toBeFocused();

  const [svg, source] = await Promise.all([
    request.get("/diagrams/learning-evidence-loop.svg"),
    request.get("/diagrams/learning-evidence-loop.mmd"),
  ]);
  expect(svg.status()).toBe(200);
  expect(svg.headers()["content-type"]).toContain("image/svg+xml");
  expect((await svg.text())).toContain("project42:source-sha256=");
  expect(source.status()).toBe(200);
  expect(await source.text()).toContain("accTitle: The learning evidence loop");

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("keeps diagram pages readable at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/diagrams/safe-agent-loop");
  await expect(page.getByRole("heading", { name: "The bounded agent loop" })).toBeVisible();
  await expect(page.locator(".diagram-canvas")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
