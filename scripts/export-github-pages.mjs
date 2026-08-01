import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { buildRouteInventory } from "./link-integrity.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const clientRoot = path.join(projectRoot, "dist", "client");
const workerPath = path.join(projectRoot, "dist", "server", "index.js");

// Defaults reproduce the full-site export exactly - tests/github-pages-export.test.mjs
// depends on that. --domain and --routes together produce a filtered export of just
// the given route prefixes under a distinct domain, used to publish /admin and
// /account to their own subdomains (AB#6851) without duplicating Learn's toolchain.
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  }),
);
const canonicalDomain = args.get("domain") ?? "learn.project-42.dev";
const routePrefixes = args.get("routes")?.split(",").map((value) => value.trim()).filter(Boolean) ?? null;
const isFilteredExport = routePrefixes !== null;
const outputRoot = path.join(
  projectRoot,
  "dist",
  args.get("out") ?? "pages",
);

function matchesRoutePrefix(route) {
  if (!routePrefixes) return true;
  return routePrefixes.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}

const endpointFiles = new Map([
  ["/manifest.webmanifest", "manifest.webmanifest"],
  ["/robots.txt", "robots.txt"],
  ["/sitemap.xml", "sitemap.xml"],
]);

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function outputPathForRoute(route) {
  if (route === "/") return path.join(outputRoot, "index.html");
  return path.join(outputRoot, route.replace(/^\/+/, ""), "index.html");
}

// Routes that learn.project-42.dev handed off to their own subdomains
// (AB#6851, AB#6227). Learn's build still renders them - the app keeps working
// for local dev, Playwright, and the subdomain exports that reuse these very
// components - but the HTML Learn *publishes* is replaced with a redirect, so
// the old public URLs stop serving a second live copy of each surface.
//
// This is deliberately an export-time transform rather than runtime
// headers().get("host") branching inside the pages: a previous attempt at the
// runtime version broke CI, because Playwright drives a live `vinext start`
// server whose per-request Host is not learn.project-42.dev, so any
// host-conditional redirect either fired for the tests or would have had to
// special-case them. Only the published artifact needs to redirect, and only
// the default full-site export produces it.
const RETIRED_ROUTES = new Map([
  ["/account", "https://account.project-42.dev/account/"],
  ["/admin", "https://admin.project-42.dev/admin/"],
]);

function redirectDocument(route, target) {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta http-equiv="refresh" content="0; url=${target}">` +
    `<link rel="canonical" href="${target}">` +
    `<meta name="robots" content="noindex">` +
    `<title>Redirecting…</title></head><body>` +
    `<p>This page has moved. <a href="${target}">Continue to ${target}</a></p>` +
    `</body></html>\n`
  );
}

function addStaticNavigation(html) {
  const navigation = `<script data-project42-static-navigation>
document.addEventListener("click",function(event){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest("a[href]");
  if(!link||link.target||link.hasAttribute("download"))return;
  const url=new URL(link.href,window.location.href);
  if(url.origin!==window.location.origin)return;
  if(url.pathname===window.location.pathname&&url.search===window.location.search)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.assign(url.href);
},true);
</script>`;
  return html
    .replaceAll('href="/learner-data/policy"', 'href="/learner-data/policy.json"')
    .replace("</head>", `${navigation}</head>`);
}

async function writeRoute(route, content) {
  const target = outputPathForRoute(route);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

async function main() {
  if (!(await exists(workerPath)) || !(await exists(clientRoot))) {
    throw new Error('Run "npm run build" before exporting GitHub Pages.');
  }

  const workerUrl = pathToFileURL(workerPath);
  workerUrl.searchParams.set("pages-export", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const fetchRoute = (route) =>
    worker.fetch(
      // The synthetic export request has no real "Host" header, but
      // subdomainLinks.ts's crossDomainHref() reads headers().get("host") to
      // decide whether an /account or /admin link should render relative or
      // absolute. Set it explicitly so a filtered --domain export of a
      // subdomain's own routes gets relative links, and the default full-site
      // export keeps every route relative to learn.project-42.dev.
      new Request(`https://${canonicalDomain}${route}`, {
        headers: { host: canonicalDomain },
      }),
      {
        ASSETS: {
          fetch: async () => new Response("Not found", { status: 404 }),
        },
      },
      { waitUntil() {}, passThroughOnException() {} },
    );

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  await cp(clientRoot, outputRoot, { recursive: true });

  const fullInventory = buildRouteInventory();
  const htmlRoutes = fullInventory.htmlRoutes.filter(matchesRoutePrefix);
  if (isFilteredExport && htmlRoutes.length === 0) {
    throw new Error(`--routes matched no known route: ${routePrefixes.join(",")}`);
  }
  for (const route of htmlRoutes) {
    // Only the default learn.project-42.dev export retires these routes; a
    // filtered --domain export is the subdomain publishing its own copy, which
    // must keep the real page.
    const retiredTarget = isFilteredExport ? undefined : RETIRED_ROUTES.get(route);
    if (retiredTarget) {
      await writeRoute(route, redirectDocument(route, retiredTarget));
      continue;
    }
    const response = await fetchRoute(route);
    if (!response.ok) {
      throw new Error(`Cannot export ${route}: HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error(`Cannot export ${route}: expected HTML, received ${contentType}`);
    }
    await writeRoute(route, addStaticNavigation(await response.text()));
  }

  const exportedEndpoints = [];
  if (!isFilteredExport) {
    for (const [route, target] of endpointFiles) {
      const response = await fetchRoute(route);
      if (!response.ok) {
        throw new Error(`Cannot export ${route}: HTTP ${response.status}`);
      }
      await writeFile(path.join(outputRoot, target), await response.text());
      exportedEndpoints.push(route);
    }

    const policyResponse = await fetchRoute("/learner-data/policy");
    if (!policyResponse.ok) {
      throw new Error(
        `Cannot export /learner-data/policy: HTTP ${policyResponse.status}`,
      );
    }
    const policy = await policyResponse.text();
    JSON.parse(policy);
    await mkdir(path.join(outputRoot, "learner-data"), { recursive: true });
    await writeFile(path.join(outputRoot, "learner-data", "policy.json"), policy);
    exportedEndpoints.push("/learner-data/policy.json");
  }

  const notFoundResponse = await fetchRoute("/__project42_not_found__");
  const notFoundHtml = addStaticNavigation(await notFoundResponse.text());
  await writeFile(path.join(outputRoot, "404.html"), notFoundHtml);

  // A filtered export's own routes never include "/" (the site being
  // republished is a single existing Learn route, e.g. "/account"), but a
  // subdomain root still needs to resolve to something. Redirect it to the
  // one route this export actually owns rather than shipping a dead root.
  if (isFilteredExport && !htmlRoutes.includes("/")) {
    const target = htmlRoutes[0];
    await writeFile(
      path.join(outputRoot, "index.html"),
      `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
        `<meta http-equiv="refresh" content="0; url=${target}/">` +
        `<link rel="canonical" href="https://${canonicalDomain}${target}/">` +
        `<title>Redirecting…</title></head><body>` +
        `<p><a href="${target}/">Continue to ${canonicalDomain}${target}/</a></p>` +
        `</body></html>\n`,
    );
  }
  await writeFile(path.join(outputRoot, ".nojekyll"), "");
  await writeFile(path.join(outputRoot, "CNAME"), `${canonicalDomain}\n`);
  await writeFile(
    path.join(outputRoot, "pages-manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        canonicalDomain,
        htmlRoutes,
        endpoints: exportedEndpoints,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `GitHub Pages export ready: ${htmlRoutes.length} HTML routes and ` +
      `${exportedEndpoints.length} endpoints in ${outputRoot}.`,
  );
}

await main();
