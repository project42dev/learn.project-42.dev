import assert from "node:assert/strict";
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
  assert.ok(inventory.htmlRoutes.includes("/auth/callback"));
  for (const route of inventory.htmlRoutes) {
    const relative = route === "/" ? "index.html" : `${route.slice(1)}/index.html`;
    await access(path.join(outputRoot, relative));
  }
});

test("publishes current release facts and learner-data disclosure", async () => {
  const [home, learnerData, releaseFacts, policy, installedPlatform] = await Promise.all([
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
  ]);

  const normalizedHome = home.replaceAll("<!-- -->", "");
  assert.match(normalizedHome, /Project 42/);
  assert.ok(normalizedHome.includes(`Site v${releaseFacts.siteVersion}`));
  assert.match(learnerData, /Your learning data, without fine print/);
  assert.match(learnerData, /href="\/learner-data\/policy\.json"/);
  assert.equal(releaseFacts.siteVersion, "0.2.3");
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
