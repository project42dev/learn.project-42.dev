import assert from "node:assert/strict";
import test from "node:test";
import { defaultLearnerDataPolicy, starterCatalog } from "@project42/platform";
import diagramConfig from "../config/diagrams.json" with { type: "json" };
import releaseFacts from "../public/release-facts.json" with { type: "json" };

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Project 42 home page", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Project 42/);
  assert.match(html, /Start curious/);
  assert.match(html, /Self-paced learning/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
  assert.ok(
    html
      .replaceAll("<!-- -->", "")
      .includes(
        `Site v${releaseFacts.siteVersion} · Platform v${releaseFacts.platformVersion} · Content v${releaseFacts.contentVersion}`,
      ),
  );
});

test("renders canonical versions, counts, providers, licenses, and project links", async () => {
  const response = await render("/about");
  const html = (await response.text()).replaceAll("<!-- -->", "");

  assert.equal(response.status, 200);
  for (const version of [
    releaseFacts.siteVersion,
    releaseFacts.platformVersion,
    releaseFacts.contentVersion,
    releaseFacts.learnerDataPolicy.policyVersion,
  ]) {
    assert.ok(
      html.includes(`v${version}`) || html.includes(version),
      `About page is missing version ${version}`,
    );
  }
  for (const count of [
    releaseFacts.counts.learningPaths,
    releaseFacts.counts.assessedModules,
    releaseFacts.counts.evidenceActivities,
    releaseFacts.counts.reviewedQuestions,
    releaseFacts.counts.resources,
    releaseFacts.counts.providerScopes,
  ]) {
    assert.ok(html.includes(`>${count}<`), `About page is missing count ${count}`);
  }
  assert.ok(
    html.includes(
      `${releaseFacts.counts.providerImplementations} named provider implementations`,
    ),
  );
  for (const provider of releaseFacts.providers) {
    assert.ok(html.includes(provider.name));
    assert.ok(html.includes(provider.description));
  }
  for (const url of [
    releaseFacts.repositories.site,
    releaseFacts.repositories.platform,
    releaseFacts.repositories.issues,
    releaseFacts.licenses.software.url,
    releaseFacts.licenses.curriculum.url,
  ]) {
    assert.ok(html.includes(url));
  }
  assert.deepEqual(releaseFacts.learnerDataPolicy, {
    schemaVersion: defaultLearnerDataPolicy.schemaVersion,
    policyId: defaultLearnerDataPolicy.policyId,
    policyVersion: defaultLearnerDataPolicy.policyVersion,
    accountBackedRecords: defaultLearnerDataPolicy.accountBackedRecords,
    hostedRecordStore: defaultLearnerDataPolicy.adapters.hostedRecordStore,
    referenceRecordStore:
      defaultLearnerDataPolicy.adapters.referenceRecordStore,
  });
});

test("renders the learner-data disclosure and machine-readable policy", async () => {
  const [page, endpoint] = await Promise.all([
    render("/learner-data"),
    render("/learner-data/policy"),
  ]);
  const html = await page.text();

  assert.equal(page.status, 200);
  assert.match(html, /Your learning data, without fine print/);
  assert.match(html, /Private to this browser/);
  assert.match(html, /Account-backed records/);
  assert.match(html, /Not enabled/);
  assert.match(html, /email address is never your account key/i);
  assert.match(html, /Consent and choice/);
  assert.match(html, /Retention and recovery/);
  assert.match(html, /Export and deletion/);
  assert.match(html, /Visibility is not permission/);
  assert.ok(html.includes(defaultLearnerDataPolicy.policyVersion));
  assert.ok(html.includes("/learner-data/policy"));

  assert.equal(endpoint.status, 200);
  assert.match(endpoint.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await endpoint.json(), defaultLearnerDataPolicy);
});

test("renders the one-time legacy progress migration experience", async () => {
  const response = await render("/import-progress");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Keep the progress you already earned/);
  assert.match(html, /project-42\.dev\/transfer-progress/);
  assert.match(html, /Import previous progress/);
});

test("renders account, approval, and cross-device progress surfaces", async () => {
  const [accountResponse, profileResponse] = await Promise.all([
    render("/account"),
    render("/profile"),
  ]);
  assert.equal(accountResponse.status, 200);
  assert.equal(profileResponse.status, 200);
  const account = await accountResponse.text();
  const profile = await profileResponse.text();
  assert.match(account, /Account and access/);
  assert.match(account, /Ready for hosted identity configuration/);
  assert.match(profile, /browser privately or synchronize an approved account/i);
});

test("renders the Learn home and academy index", async () => {
  const [home, learn] = await Promise.all([render("/"), render("/learn")]);
  assert.equal(home.status, 200);
  assert.equal(learn.status, 200);
  assert.match(await home.text(), /Start curious/);
  assert.match(await learn.text(), /Learning paths with a clear next step/);
});

test("renders the complete accessible diagram library", async () => {
  const diagramCatalog = diagramConfig.diagrams;
  const index = await render("/diagrams");
  const indexHtml = await index.text();
  assert.equal(index.status, 200);
  assert.equal(diagramCatalog.length, 8);
  assert.equal((indexHtml.match(/class="diagram-card"/g) ?? []).length, 8);
  assert.match(indexHtml, /See the system, not just the steps/);

  for (const diagram of diagramCatalog) {
    const response = await render(`/diagrams/${diagram.id}`);
    const html = await response.text();
    assert.equal(response.status, 200, `${diagram.id} should render`);
    assert.ok(html.includes(diagram.title));
    assert.ok(html.includes(diagram.altText));
    assert.ok(html.includes(diagram.caption));
    assert.ok(html.includes(`/diagrams/${diagram.source}`));
    assert.match(html, /What this shows/);
    assert.match(html, /Key takeaways/);
  }
});

test("renders stable learning routes", async () => {
  const routes = [
    ...starterCatalog.paths.map((path) => `/learn/${path.id}`),
    ...starterCatalog.paths.flatMap((path) =>
      path.moduleIds.map((moduleId) => `/learn/${path.id}/${moduleId}`),
    ),
  ];

  for (const route of routes) {
    const response = await render(route);
    assert.equal(response.status, 200, `${route} should render`);
    const html = await response.text();
    assert.match(html, /<main\b/, `${route} needs a main landmark`);
    assert.match(html, /<h1\b/, `${route} needs a primary heading`);
  }
});

test("renders complete provider paths plus comparison and migration guidance", async () => {
  for (const pathId of [
    "anthropic-claude-practice",
    "openai-practice",
    "google-gemini-practice",
  ]) {
    const path = starterCatalog.paths.find((candidate) => candidate.id === pathId);
    assert.ok(path);
    assert.ok(path.moduleIds.length >= 7, `${pathId} needs at least seven modules`);
    const response = await render(`/learn/${path.id}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes(path.title));
    for (const moduleId of path.moduleIds) {
      const learningModule = starterCatalog.modules.find(
        (candidate) => candidate.id === moduleId,
      );
      assert.ok(learningModule);
      assert.ok(html.includes(learningModule.title));
    }
  }

  const comparisonPath = starterCatalog.paths.find(
    (candidate) => candidate.id === "providers-in-practice",
  );
  assert.ok(comparisonPath);
  assert.deepEqual(comparisonPath.moduleIds.slice(-3), [
    "compare-provider-capabilities",
    "plan-cross-provider-migration",
    "execute-cross-provider-cutover",
  ]);

  const comparisonModule = starterCatalog.modules.find(
    (candidate) => candidate.id === "compare-provider-capabilities",
  );
  assert.ok(comparisonModule?.comparisonMatrix);
  const comparisonResponse = await render(
    `/learn/${comparisonPath.id}/${comparisonModule.id}`,
  );
  const comparisonHtml = await comparisonResponse.text();
  assert.equal(comparisonResponse.status, 200);
  assert.match(comparisonHtml, /Provider comparison matrix/);
  assert.match(comparisonHtml, /<table class="comparison-table">/);
  assert.match(comparisonHtml, /Documented/);
  assert.match(comparisonHtml, /Changing/);
  assert.match(comparisonHtml, /Non-equivalent/);
  assert.match(comparisonHtml, /Unknown/);
  for (const dimension of comparisonModule.comparisonMatrix.dimensions) {
    assert.ok(comparisonHtml.includes(dimension.title));
  }

  for (const moduleId of comparisonPath.moduleIds.slice(-2)) {
    const learningModule = starterCatalog.modules.find(
      (candidate) => candidate.id === moduleId,
    );
    assert.ok(learningModule);
    const response = await render(`/learn/${comparisonPath.id}/${moduleId}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes(learningModule.title));
    assert.match(html, /Practice activity/);
    assert.match(html, /Knowledge check/);
    assert.match(html, /Sources and verification/);
    for (const section of learningModule.sections.filter((item) => item.code)) {
      assert.ok(
        html.includes(`aria-label="${section.code.label} code example"`),
        `${moduleId} code example needs an accessible name`,
      );
      assert.match(html, /<pre[^>]*tabindex="0"/);
    }
  }
});

test("renders evidence-producing activities for every substantive module", async () => {
  const activityModules = starterCatalog.modules.filter(
    (learningModule) => learningModule.activity,
  );
  assert.equal(activityModules.length, 49);

  for (const learningModule of activityModules) {
    const path = starterCatalog.paths.find((candidate) =>
      candidate.moduleIds.includes(learningModule.id),
    );
    assert.ok(path);
    const response = await render(`/learn/${path.id}/${learningModule.id}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Practice activity/);
    assert.ok(html.includes(learningModule.activity.title));
    assert.match(html, /What to produce/);
    assert.match(html, /Reflect before continuing/);
    assert.ok(
      html.includes(`aria-labelledby="${learningModule.activity.id}-title"`),
      `${learningModule.id} activity needs an accessible label relationship`,
    );
    assert.ok(
      html.includes(`id="${learningModule.activity.id}-title"`),
      `${learningModule.id} activity needs a matching heading id`,
    );
  }

  const legacyResponse = await render("/learn/ai-foundations/what-ai-does");
  assert.equal(legacyResponse.status, 200);
  assert.doesNotMatch(await legacyResponse.text(), /Practice activity/);
});

test("renders the complete AI Foundations curriculum and source provenance", async () => {
  const path = starterCatalog.paths.find(
    (candidate) => candidate.id === "ai-foundations",
  );
  assert.ok(path);
  assert.equal(path.moduleIds.length, 16);
  assert.equal(starterCatalog.modules.length, 55);

  for (const moduleId of path.moduleIds) {
    const learningModule = starterCatalog.modules.find(
      (candidate) => candidate.id === moduleId,
    );
    assert.ok(learningModule);
    const response = await render(`/learn/${path.id}/${moduleId}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes(learningModule.title));
    assert.match(html, /Sources and verification/);
    assert.match(html, /Knowledge check/);
    for (const section of learningModule.sections) {
      assert.ok(html.includes(section.title), `${moduleId} is missing ${section.id}`);
    }
    for (const source of learningModule.sources) {
      assert.ok(html.includes(source.title));
      assert.ok(html.includes(source.publisher));
      assert.ok(html.includes(source.lastVerified));
    }
  }
});

test("renders an accessible scored capstone evidence form", async () => {
  const learningModule = starterCatalog.modules.find(
    (candidate) => candidate.id === "ai-foundations-capstone",
  );
  assert.ok(learningModule?.capstone);
  const response = await render(
    "/learn/ai-foundations/ai-foundations-capstone",
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Applied capstone/);
  assert.match(html, /Required artifacts/);
  assert.match(html, /Evidence rubric/);
  assert.match(html, /Reflection and handoff/);
  assert.match(html, /Score and save capstone evidence/);
  assert.equal(learningModule.capstone.requiredArtifacts.length, 5);
  assert.equal(learningModule.capstone.rubric.criteria.length, 5);

  for (const [index, artifact] of learningModule.capstone.requiredArtifacts.entries()) {
    assert.ok(html.includes(artifact));
    assert.ok(
      html.includes(
        `for="${learningModule.capstone.id}-artifact-${index}"`,
      ),
    );
    assert.ok(
      html.includes(
        `id="${learningModule.capstone.id}-artifact-${index}"`,
      ),
    );
  }
  for (const criterion of learningModule.capstone.rubric.criteria) {
    assert.ok(html.includes(criterion.title));
    assert.ok(html.includes(criterion.description));
    for (const evidence of criterion.evidenceRequired) {
      assert.ok(html.includes(evidence));
    }
  }
});

test("renders the complete reliable-agent capstone calibration and evidence map", async () => {
  const path = starterCatalog.paths.find(
    (candidate) => candidate.id === "reliable-agent-workflows",
  );
  const learningModule = starterCatalog.modules.find(
    (candidate) => candidate.id === "reliable-agent-capstone",
  );
  assert.ok(path);
  assert.ok(learningModule?.capstone);
  assert.equal(path.moduleIds.length, 12);
  assert.equal(path.moduleIds.at(-1), learningModule.id);

  const response = await render(
    `/learn/${path.id}/${learningModule.id}`,
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Compare evidence before you score/);
  assert.match(html, /Complete exemplar: bounded support-triage agent/);
  assert.match(html, /Flawed exemplar: autonomous support agent/);
  assert.match(html, /Map this score to evidence/);
  assert.equal(learningModule.capstone.requiredArtifacts.length, 8);
  assert.equal(learningModule.capstone.rubric.criteria.length, 6);
  assert.equal(learningModule.capstone.exemplars?.length, 2);
  for (const artifact of learningModule.capstone.requiredArtifacts) {
    assert.ok(html.includes(artifact));
  }
  for (const criterion of learningModule.capstone.rubric.criteria) {
    assert.ok(html.includes(criterion.title));
  }
});

test("all rendered internal navigation links resolve", async () => {
  const entryRoutes = [
    "/",
    "/learn",
    "/profile",
    "/learner-data",
  ];
  const internalLinks = new Set(entryRoutes);

  for (const route of entryRoutes) {
    const response = await render(route);
    const html = await response.text();
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      const url = new URL(match[1], "https://learn.project-42.dev");
      if (url.origin === "https://learn.project-42.dev") {
        internalLinks.add(url.pathname);
      }
    }
  }

  for (const route of internalLinks) {
    const response = await render(route);
    assert.equal(response.status, 200, `${route} linked from the site should render`);
  }
});

test("publishes accessible document landmarks and discovery metadata", async () => {
  const [home, sitemap, robots, manifest] = await Promise.all([
    render("/"),
    render("/sitemap.xml"),
    render("/robots.txt"),
    render("/manifest.webmanifest"),
  ]);
  const html = await home.text();

  assert.equal(home.status, 200);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /id="main-content" tabindex="-1"/);
  assert.match(html, /<nav aria-label="Primary navigation">/);
  assert.match(html, /class="brand-mark"/);
  assert.match(html, /class="brand-mark-four"/);
  assert.match(html, /class="brand-mark-two"/);
  assert.match(html, /href="\/brand\/project-42-mark\.svg"/);
  assert.match(html, /href="\/favicon-32x32\.png"/);
  assert.match(html, /href="\/favicon-16x16\.png"/);
  assert.match(html, /href="\/favicon\.ico"/);
  assert.match(html, /href="\/apple-touch-icon\.png"/);
  assert.match(html, /href="\/manifest\.webmanifest"/);
  assert.match(html, /name="theme-color" content="#0b1225"/);
  assert.equal(sitemap.status, 200);
  assert.equal(robots.status, 200);
  assert.equal(manifest.status, 200);
  const webManifest = await manifest.json();
  assert.equal(webManifest.short_name, "Project 42 Learn");
  assert.equal(webManifest.theme_color, "#0b1225");
  assert.deepEqual(
    webManifest.icons.map(({ src, sizes, purpose }) => ({
      src,
      sizes,
      purpose,
    })),
    [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  );
});

test("keeps labelled relationships valid on learner-journey pages", async () => {
  const routes = [
    "/learn",
    "/learn/ai-foundations",
    "/learn/ai-foundations/research-with-evidence",
    "/learn/ai-foundations/ai-foundations-capstone",
    "/learn/anthropic-claude-practice",
    "/learn/openai-practice",
    "/learn/google-gemini-practice",
    "/learn/providers-in-practice/compare-provider-capabilities",
    "/learn/providers-in-practice/plan-cross-provider-migration",
    "/learn/providers-in-practice/execute-cross-provider-cutover",
    "/profile",
    "/learner-data",
  ];

  for (const route of routes) {
    const response = await render(route);
    const html = await response.text();
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const idSet = new Set(ids);
    assert.equal(ids.length, idSet.size, `${route} contains duplicate element IDs`);
    for (const match of html.matchAll(/\saria-labelledby="([^"]+)"/g)) {
      for (const id of match[1].split(/\s+/)) {
        assert.ok(idSet.has(id), `${route} references missing label ID ${id}`);
      }
    }
    for (const match of html.matchAll(/\saria-describedby="([^"]+)"/g)) {
      for (const id of match[1].split(/\s+/)) {
        assert.ok(
          idSet.has(id),
          `${route} references missing description ID ${id}`,
        );
      }
    }
  }
});
