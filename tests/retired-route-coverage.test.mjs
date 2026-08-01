// Guard for the published-artifact test run.
//
// The published learn.project-42.dev artifact serves redirect stubs for the
// routes that moved to their own subdomains (/account -> account.project-42.dev
// AB#6851, /admin -> admin.project-42.dev AB#6227). Any browser spec that drives
// one of those routes therefore has nothing to assert against in the
// dist/pages run, and must either be excluded by playwright.pages.config.ts or
// call skipOnRetiredPagesRoute for that test.
//
// Missing one is easy and fails in an expensive place: the specs that drive
// these routes are themselves gated on NEXT_PUBLIC_PROJECT42_API_ORIGIN, so a
// developer machine without that variable skips them and reports green while CI,
// which sets it, runs them and fails. This test closes that gap by checking the
// sources directly, with no environment or browser needed.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const specDirectory = path.join(projectRoot, "tests", "browser");
const pagesConfigPath = path.join(projectRoot, "playwright.pages.config.ts");

// Matches page.goto("/account"), goto("/admin/..."), goto("/account?auth=..."),
// and the template-literal form, but not goto("/account/github/callback"),
// which is deliberately NOT retired: production GITHUB_LINK_REDIRECT_URI still
// points at learn.project-42.dev/account/github/callback.
const RETIRED_NAVIGATION =
  /goto\(\s*[`"']\/(account|admin)(?![\w/-])(?:\?[^`"']*)?[`"']/;

const pagesConfig = readFileSync(pagesConfigPath, "utf8");
const specFiles = readdirSync(specDirectory).filter((name) =>
  name.endsWith(".spec.ts"),
);

function isExcludedFromArtifactRun(specFileName) {
  // playwright.pages.config.ts lists whole-surface specs as glob patterns.
  return pagesConfig.includes(`/${specFileName}"`);
}

/** Split a spec source into one block per `test(...)` declaration. */
function testBlocks(source) {
  const starts = [];
  const pattern = /^[ \t]*test\(/gm;
  for (const match of source.matchAll(pattern)) {
    starts.push(match.index);
  }
  return starts.map((start, index) =>
    source.slice(start, starts[index + 1] ?? source.length),
  );
}

test("every spec driving a retired route is excluded or skipped in the artifact run", () => {
  const unguarded = [];

  for (const specFileName of specFiles) {
    const source = readFileSync(path.join(specDirectory, specFileName), "utf8");
    if (!RETIRED_NAVIGATION.test(source)) continue;

    if (isExcludedFromArtifactRun(specFileName)) continue;

    for (const block of testBlocks(source)) {
      if (!RETIRED_NAVIGATION.test(block)) continue;
      if (block.includes("skipOnRetiredPagesRoute")) continue;

      const title = block.match(/test\(\s*[`"'](.*?)[`"']/)?.[1] ?? "(unnamed)";
      unguarded.push(`${specFileName}: ${title}`);
    }
  }

  assert.deepEqual(
    unguarded,
    [],
    "These tests drive a route retired from the published artifact but are " +
      "neither excluded by playwright.pages.config.ts nor guarded by " +
      "skipOnRetiredPagesRoute, so they will fail the dist/pages run:\n" +
      unguarded.map((entry) => `  - ${entry}`).join("\n"),
  );
});

test("the retired-route guard actually detects an unguarded test", () => {
  // Proves the matcher above is not vacuously passing.
  const sample = `
test("drives the retired account surface", async ({ page }) => {
  await page.goto("/account");
});
`;
  const blocks = testBlocks(sample);
  assert.equal(blocks.length, 1);
  assert.ok(RETIRED_NAVIGATION.test(blocks[0]));
  assert.ok(!blocks[0].includes("skipOnRetiredPagesRoute"));
});

test("the retired-route guard leaves the GitHub callback route alone", () => {
  const sample = `await page.goto("/account/github/callback");`;
  assert.ok(
    !RETIRED_NAVIGATION.test(sample),
    "The GitHub link callback is not retired and must not be treated as such.",
  );
});
