import { test } from "@playwright/test";

// The published learn.project-42.dev artifact retires the routes that moved to
// their own subdomains (AB#6851 /account -> account.project-42.dev, AB#6227
// /admin -> admin.project-42.dev): scripts/export-github-pages.mjs writes a
// redirect stub for them instead of the rendered page. The app still renders
// both surfaces - the live server serves them, and each subdomain's own
// filtered export reuses these very components - so only the run that serves
// the published artifact (playwright.pages.config.ts, project "chromium-pages")
// must skip the specs that exercise them.
//
// tests/github-pages-export.test.mjs asserts the redirect stubs themselves, so
// skipping here loses no coverage of the retirement.
export const PAGES_ARTIFACT_PROJECT = "chromium-pages";

/**
 * Call inside a test that drives a route retired from the published artifact.
 * Skips only that test, and only in the published-artifact run.
 */
export function skipOnRetiredPagesRoute(route: string): void {
  test.skip(
    test.info().project.name === PAGES_ARTIFACT_PROJECT,
    `${route} is retired in the published artifact; it now lives on its own subdomain.`,
  );
}
