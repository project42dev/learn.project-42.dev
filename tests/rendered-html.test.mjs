import assert from "node:assert/strict";
import test from "node:test";
import { defaultLearnerDataPolicy, starterCatalog } from "@project42/platform";
import diagramConfig from "../node_modules/@project42/platform/content/diagrams/catalogue.json" with { type: "json" };
import releaseFacts from "../public/release-facts.json" with { type: "json" };

const hostedIdentityConfigured = Boolean(
  process.env.NEXT_PUBLIC_PROJECT42_API_ORIGIN,
);

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() { }, passThroughOnException() { } },
  );
}

test("renders the Project 42 home page", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Project 42/);
  assert.match(html, /Two ways to take the same course/);
  assert.match(html, /Self-paced/);
  assert.match(html, /Instructor-led/);
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
    // Not counts.resources: it is 0 on this site (the references live on
    // guide.project-42.dev) and the About page no longer renders a tile that
    // would read as "Project 42 has no practical resources". The assertion was
    // also close to vacuous, since `>0<` matches a zero anywhere in the page.
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
  // accountBackedRecords is deliberately excluded from this comparison: the
  // platform package's defaultLearnerDataPolicy.accountBackedRecords is a
  // generic self-host default ("planned"), which would be correct for an
  // unconfigured deployment but is not this one. Checking it against the raw
  // constant here would happily lock in a stale, understated value - exactly
  // how AB#6425 survived - so it is pinned separately below instead.
  assert.deepEqual(
    {
      schemaVersion: releaseFacts.learnerDataPolicy.schemaVersion,
      policyId: releaseFacts.learnerDataPolicy.policyId,
      policyVersion: releaseFacts.learnerDataPolicy.policyVersion,
      hostedRecordStore: releaseFacts.learnerDataPolicy.hostedRecordStore,
      referenceRecordStore: releaseFacts.learnerDataPolicy.referenceRecordStore,
    },
    {
      schemaVersion: defaultLearnerDataPolicy.schemaVersion,
      policyId: defaultLearnerDataPolicy.policyId,
      policyVersion: defaultLearnerDataPolicy.policyVersion,
      hostedRecordStore: defaultLearnerDataPolicy.adapters.hostedRecordStore,
      referenceRecordStore:
        defaultLearnerDataPolicy.adapters.referenceRecordStore,
    },
  );

  // Pin the published claim to the released capability directly, rather than
  // to the platform's generic self-host default.
  assert.equal(
    releaseFacts.learnerDataPolicy.accountBackedRecords,
    "available",
    "the durable account-backed record contract is released; published facts must not understate it",
  );
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
  // The policy states what the software supports; the page must state what this
  // deployment actually offers, so an unconfigured build still reads "Not
  // enabled" even though the released capability is "available" (AB#6425).
  assert.match(
    html,
    hostedIdentityConfigured ? /Available/ : /Not enabled/,
    "the disclosure page must describe this build's real record capability",
  );
  assert.match(html, /email address is never your account key/i);
  assert.match(html, /Consent and choice/);
  assert.match(html, /Retention and recovery/);
  assert.match(html, /Export and deletion/);
  assert.match(html, /Visibility is not permission/);
  assert.ok(html.includes(defaultLearnerDataPolicy.policyVersion));
  assert.ok(html.includes("/learner-data/policy"));
  assert.match(html, /https:\/\/project-42\.dev\/legal-transparency/);

  assert.equal(endpoint.status, 200);
  assert.match(endpoint.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await endpoint.json(), defaultLearnerDataPolicy);
});

test("links account and profile surfaces to privacy and legal expectations", async () => {
  for (const route of ["/", "/account", "/profile", "/learner-data"]) {
    const response = await render(route);
    assert.equal(response.status, 200, route);
    assert.match(
      await response.text(),
      /https:\/\/project-42\.dev\/legal-transparency/,
      route,
    );
  }

  const account = await render("/account");
  const accountHtml = await account.text();
  assert.match(accountHtml, /Learner data and controls/);
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
  const [accountResponse, profileResponse, adminResponse] = await Promise.all([
    render("/account"),
    render("/profile"),
    render("/admin"),
  ]);
  assert.equal(accountResponse.status, 200);
  assert.equal(profileResponse.status, 200);
  assert.equal(adminResponse.status, 200);
  const account = await accountResponse.text();
  const profile = await profileResponse.text();
  const admin = await adminResponse.text();
  assert.match(account, /Account and access/);
  assert.match(account, /Check a deletion request/);
  assert.match(account, /cannot search by email, name, or account identifier/i);
  assert.match(
    account,
    hostedIdentityConfigured
      ? /not retained by this page/i
      : /Deletion-status lookup becomes available/i,
  );
  assert.match(
    account,
    hostedIdentityConfigured
      ? /Loading your Project 42 account/
      : /Ready for hosted identity configuration/,
  );
  assert.match(profile, /browser privately or synchronize an approved account/i);
  assert.match(admin, /Project 42 administration/);
  // Duplicate-account reconciliation moved to the learner profile (AB#6231):
  // the owner console must no longer advertise or offer it.
  assert.doesNotMatch(admin, /recover duplicate learner accounts/i);
  assert.doesNotMatch(admin, /Review and merge learner records/i);
  assert.match(
    admin,
    hostedIdentityConfigured
      ? /Checking owner access/
      : /Hosted identity is not configured/,
  );
});

// The landing page offers the choice; each format owns its own route. This
// guards the defect that prompted the split: the root used to be a copy of the
// project-42.dev home page, and the header's own Learn link pointed at /learn,
// so the same nav item landed on two different URLs depending on where it was
// clicked from and the first page you saw was one you had already seen.
test("splits the landing choice from the two format routes", async () => {
  const [home, learn, onDemand] = await Promise.all([
    render("/"),
    render("/learn"),
    render("/ondemand"),
  ]);
  assert.equal(home.status, 200);
  assert.equal(learn.status, 200);
  assert.equal(onDemand.status, 200);

  const homeHtml = await home.text();
  const learnHtml = await learn.text();
  const onDemandHtml = await onDemand.text();

  assert.match(homeHtml, /Two ways to take the same course/);
  assert.match(homeHtml, /href="\/learn"/, "the landing page offers self-paced");
  assert.match(homeHtml, /href="\/ondemand"/, "the landing page offers on demand");
  // Scoped to <main>, because "Start curious. Become capable." is the brand
  // tagline and legitimately appears in og:image:alt on every page. The defect
  // was the hero copy, not the social card.
  const homeBody = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(homeHtml);
  assert.ok(homeBody, "the landing page has no main element");
  assert.doesNotMatch(
    homeBody[1],
    /Start curious/,
    "the landing page must not be a copy of the project-42.dev home page",
  );

  assert.match(learnHtml, /Learning paths with a clear next step/);
  assert.match(onDemandHtml, /The classroom, on demand/);
  assert.doesNotMatch(
    learnHtml,
    /agents-and-guardrails-preview\.mp4/,
    "the film belongs to the on-demand rendering, not to the written index",
  );
});

// The instructor-led lesson is a second rendering of one module, so it has to
// carry the module's own material: the real class script as its transcript,
// the module's sources, and the same knowledge check. A page that only played
// a video would be a different product from the one ADR-0020 describes.
test("renders an on-demand lesson as the full class, not a video embed", async () => {
  const response = await render("/ondemand/ai-foundations/agents-and-guardrails");
  assert.equal(response.status, 200);
  const html = (await response.text()).replaceAll("<!-- -->", "");

  assert.match(html, /agents-and-guardrails-preview\.mp4/, "plays the lesson");
  assert.match(html, /Partial render/, "says so when the film is incomplete");
  assert.match(
    html,
    /How the class runs, and every word of it/,
    "carries the transcript",
  );
  assert.match(
    html,
    /what makes an AI system agentic/,
    "the transcript is the real class script, not placeholder copy",
  );
  assert.match(html, /Sources and verification/, "carries the module's sources");
  assert.match(html, /knowledge-check/i, "carries the same knowledge check");
});

test("publishes an on-demand route only for lessons that were filmed", async () => {
  // A class script exists for forty modules and one has been rendered. The
  // route must follow the film, not the script, or the catalogue advertises
  // thirty-nine lessons nobody can watch.
  const unfilmed = await render("/ondemand/ai-foundations/what-ai-does");
  assert.equal(unfilmed.status, 404);
});

test("points the header's Learn link at the landing page, not at a format", async () => {
  const home = await render("/");
  const html = await home.text();
  const nav = /<nav aria-label="Primary navigation">([\s\S]*?)<\/nav>/.exec(html);
  assert.ok(nav, "primary navigation is missing");
  assert.match(
    nav[1],
    /<a href="\/">Learn<\/a>/,
    "clicking Learn from inside Learn must not move you to a second page",
  );
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
  // Path-level routes are public (catalog/descriptions).
  // Module-level routes require authentication (RequireAuth guard).
  const routes = [
    ...starterCatalog.paths.map((path) => `/learn/${path.id}`),
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
  // Path-level routes are public (catalog/descriptions).
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

  // Module-level routes require authentication (RequireAuth guard).
  // Verify the catalog data integrity, but skip server-side rendering
  // of gated module pages.
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
  for (const dimension of comparisonModule.comparisonMatrix.dimensions) {
    assert.ok(dimension.title);
  }

  for (const moduleId of comparisonPath.moduleIds.slice(-2)) {
    const learningModule = starterCatalog.modules.find(
      (candidate) => candidate.id === moduleId,
    );
    assert.ok(learningModule);
    for (const section of learningModule.sections.filter((item) => item.code)) {
      assert.ok(section.code.label);
    }
  }
});

test("renders evidence-producing activities for every substantive module", async () => {
  // Module-level routes require authentication (RequireAuth guard).
  // Verify catalog data integrity without server-side rendering.
  const activityModules = starterCatalog.modules.filter(
    (learningModule) => learningModule.activity,
  );
  assert.equal(activityModules.length, releaseFacts.counts.evidenceActivities);

  for (const learningModule of activityModules) {
    const path = starterCatalog.paths.find((candidate) =>
      candidate.moduleIds.includes(learningModule.id),
    );
    assert.ok(path);
    assert.ok(learningModule.activity.title);
    assert.ok(learningModule.activity.id);
  }
});

test("renders the complete AI Foundations curriculum and source provenance", async () => {
  // Module-level routes require authentication (RequireAuth guard).
  // Verify catalog data integrity without server-side rendering.
  const path = starterCatalog.paths.find(
    (candidate) => candidate.id === "ai-foundations",
  );
  assert.ok(path);
  assert.equal(path.moduleIds.length, 16);
  assert.equal(
    starterCatalog.modules.length,
    releaseFacts.counts.assessedModules,
  );

  for (const moduleId of path.moduleIds) {
    const learningModule = starterCatalog.modules.find(
      (candidate) => candidate.id === moduleId,
    );
    assert.ok(learningModule);
    assert.ok(learningModule.title);
    for (const section of learningModule.sections) {
      assert.ok(section.title, `${moduleId} is missing ${section.id}`);
    }
    for (const source of learningModule.sources) {
      assert.ok(source.title);
      assert.ok(source.publisher);
      assert.ok(source.lastVerified);
    }
  }
});

test("renders an accessible scored capstone evidence form", async () => {
  // Module-level routes require authentication (RequireAuth guard).
  // Verify catalog data integrity without server-side rendering.
  const learningModule = starterCatalog.modules.find(
    (candidate) => candidate.id === "ai-foundations-capstone",
  );
  assert.ok(learningModule?.capstone);
  assert.equal(learningModule.capstone.requiredArtifacts.length, 5);
  assert.equal(learningModule.capstone.rubric.criteria.length, 5);

  for (const artifact of learningModule.capstone.requiredArtifacts) {
    assert.ok(artifact);
  }
  for (const criterion of learningModule.capstone.rubric.criteria) {
    assert.ok(criterion.title);
    assert.ok(criterion.description);
    for (const evidence of criterion.evidenceRequired) {
      assert.ok(evidence);
    }
  }
});

test("renders the complete reliable-agent capstone calibration and evidence map", async () => {
  // Module-level routes require authentication (RequireAuth guard).
  // Verify catalog data integrity without server-side rendering.
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
  assert.equal(learningModule.capstone.requiredArtifacts.length, 8);
  assert.equal(learningModule.capstone.rubric.criteria.length, 6);
  assert.equal(learningModule.capstone.exemplars?.length, 2);
  for (const artifact of learningModule.capstone.requiredArtifacts) {
    assert.ok(artifact);
  }
  for (const criterion of learningModule.capstone.rubric.criteria) {
    assert.ok(criterion.title);
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
