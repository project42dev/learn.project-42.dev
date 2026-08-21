import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  defaultLearnerDataPolicy,
  starterCatalog,
} from "@project42/platform";
import { buildRouteInventory } from "../scripts/link-integrity.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(projectRoot, "dist", "pages");

test("exports every governed route for GitHub Pages", async () => {
  const inventory = buildRouteInventory(starterCatalog);
  const manifest = JSON.parse(
    await readFile(path.join(outputRoot, "pages-manifest.json"), "utf8"),
  );

  assert.equal(manifest.canonicalDomain, "learn.project-42.dev");
  assert.deepEqual(manifest.htmlRoutes, inventory.htmlRoutes);
  assert.ok(inventory.htmlRoutes.includes("/account"));
  assert.ok(inventory.htmlRoutes.includes("/account/github/callback"));
  assert.ok(inventory.htmlRoutes.includes("/admin"));
  assert.ok(inventory.htmlRoutes.includes("/auth/callback"));
  for (const route of inventory.htmlRoutes) {
    const relative = route === "/" ? "index.html" : `${route.slice(1)}/index.html`;
    await access(path.join(outputRoot, relative));
  }
});

test("keeps the migrated routes live in the default export AB#6851 AB#6227", async () => {
  // The default export is what the self-host Learn image serves (Dockerfile
  // runs npm run pages:build). A self-hosted deployment has no
  // account.project-42.dev or admin.project-42.dev, so retiring these routes by
  // default would redirect its users to this project's hosted surface.
  // Retirement is opt-in via --retire-migrated-routes and belongs only to the
  // learn.project-42.dev publish.
  const [account, admin] = await Promise.all([
    readFile(path.join(outputRoot, "account", "index.html"), "utf8"),
    readFile(path.join(outputRoot, "admin", "index.html"), "utf8"),
  ]);

  for (const html of [account, admin]) {
    assert.doesNotMatch(html, /<meta http-equiv="refresh"/);
  }
  assert.match(account, /One learning record/);
  assert.match(admin, /Project 42 administration/);
});

test("retires the routes that moved to their own subdomains AB#6851 AB#6227", async () => {
  const retiredRoot = path.join(projectRoot, "dist", "pages-retired-test");
  execFileSync(
    process.execPath,
    [
      path.join(projectRoot, "scripts", "export-github-pages.mjs"),
      "--retire-migrated-routes",
      "--out=pages-retired-test",
    ],
    { cwd: projectRoot, stdio: "pipe" },
  );

  const [account, admin, githubCallback] = await Promise.all([
    readFile(path.join(retiredRoot, "account", "index.html"), "utf8"),
    readFile(path.join(retiredRoot, "admin", "index.html"), "utf8"),
    readFile(
      path.join(retiredRoot, "account", "github", "callback", "index.html"),
      "utf8",
    ),
  ]);

  for (const [html, target] of [
    [account, "https://account.project-42.dev/account/"],
    [admin, "https://admin.project-42.dev/admin/"],
  ]) {
    assert.match(html, new RegExp(`<meta http-equiv="refresh" content="0; url=${target}">`));
    assert.match(html, new RegExp(`<link rel="canonical" href="${target}">`));
    assert.match(html, /<meta name="robots" content="noindex">/);
    // The published artifact must not keep serving a second live copy of a
    // surface that now belongs to its own subdomain.
    assert.doesNotMatch(html, /AccountDashboard|AdminDashboard/);
  }

  assert.doesNotMatch(account, /One learning record/);
  assert.doesNotMatch(admin, /Project 42 administration/);

  // /account/github/callback is the live GitHub identity-link redirect URI
  // (GITHUB_LINK_REDIRECT_URI still points at learn.project-42.dev), so it is
  // deliberately NOT retired - retiring it would break identity linking.
  assert.doesNotMatch(githubCallback, /<meta http-equiv="refresh"/);
});

test("publishes current release facts and learner-data disclosure", async () => {
  const [home, learnerData, releaseFacts, policy, installedPlatform, application] = await Promise.all([
    readFile(path.join(outputRoot, "index.html"), "utf8"),
    readFile(path.join(outputRoot, "learner-data", "index.html"), "utf8"),
    readFile(path.join(outputRoot, "release-facts.json"), "utf8").then(JSON.parse),
    readFile(path.join(outputRoot, "learner-data", "policy.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(
      path.join(projectRoot, "node_modules", "@project42", "platform", "package.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(path.join(projectRoot, "package.json"), "utf8").then(JSON.parse),
  ]);

  const normalizedHome = home.replaceAll("<!-- -->", "");
  assert.match(normalizedHome, /Project 42/);
  assert.ok(normalizedHome.includes(`Site v${releaseFacts.siteVersion}`));
  assert.match(learnerData, /Your learning data, without fine print/);
  assert.match(learnerData, /href="\/learner-data\/policy\.json"/);
  assert.equal(releaseFacts.siteVersion, application.version);
  assert.equal(releaseFacts.platformVersion, installedPlatform.version);
  assert.equal(releaseFacts.learnerDataPolicy.policyVersion, "2026-07-27");
  assert.equal(
    releaseFacts.learnerDataPolicy.hostedRecordStore,
    "cloudflare-d1",
  );
  assert.deepEqual(policy, defaultLearnerDataPolicy);
});

test("contains GitHub Pages controls without server or Sites metadata", async () => {
  assert.equal(
    await readFile(path.join(outputRoot, "CNAME"), "utf8"),
    "learn.project-42.dev\n",
  );
  await access(path.join(outputRoot, ".nojekyll"));
  await access(path.join(outputRoot, "404.html"));
  await assert.rejects(access(path.join(outputRoot, ".openai")));
  await assert.rejects(access(path.join(outputRoot, "server")));
});

test("a filtered --domain/--routes export publishes only its own routes with cross-subdomain nav links AB#6851", async () => {
  const filteredOutputRoot = path.join(projectRoot, "dist", "pages-account-test");
  execFileSync(
    process.execPath,
    [
      "scripts/export-github-pages.mjs",
      "--domain=account.project-42.dev",
      "--routes=/account",
      "--out=pages-account-test",
    ],
    { cwd: projectRoot, stdio: "pipe" },
  );

  const manifest = JSON.parse(
    await readFile(path.join(filteredOutputRoot, "pages-manifest.json"), "utf8"),
  );
  assert.equal(manifest.canonicalDomain, "account.project-42.dev");
  assert.deepEqual(manifest.htmlRoutes, [
    "/account",
    "/account/github/callback",
  ]);
  assert.deepEqual(manifest.endpoints, []);

  assert.equal(
    await readFile(path.join(filteredOutputRoot, "CNAME"), "utf8"),
    "account.project-42.dev\n",
  );
  await assert.rejects(
    access(path.join(filteredOutputRoot, "learn", "index.html")),
    "a filtered export must not publish routes it doesn't own",
  );
  await assert.rejects(
    access(path.join(filteredOutputRoot, "learner-data")),
    "a filtered export skips site-wide endpoints, not just unowned HTML routes",
  );

  const accountPage = await readFile(
    path.join(filteredOutputRoot, "account", "index.html"),
    "utf8",
  );
  assert.ok(
    accountPage.includes('href="https://learn.project-42.dev/"') || accountPage.includes('href="https://learn.project-42.dev"'),
    "a route this export doesn't own must link back to Learn absolutely",
  );
  assert.ok(
    accountPage.includes('href="/account"') || accountPage.includes('href="https://account.project-42.dev/account"'),
    "a route this export does own must stay a same-host link",
  );
  const rootRedirect = await readFile(
    path.join(filteredOutputRoot, "index.html"),
    "utf8",
  );
  assert.match(rootRedirect, /content="0; url=\/account\/"/);
});
