import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { buildRouteInventory } from "./link-integrity.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const clientRoot = path.join(projectRoot, "dist", "client");
const workerPath = path.join(projectRoot, "dist", "server", "index.js");
const outputRoot = path.join(projectRoot, "dist", "pages");
const canonicalDomain = "learn.project-42.dev";

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
      new Request(`https://${canonicalDomain}${route}`),
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

  const inventory = buildRouteInventory();
  for (const route of inventory.htmlRoutes) {
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

  for (const [route, target] of endpointFiles) {
    const response = await fetchRoute(route);
    if (!response.ok) {
      throw new Error(`Cannot export ${route}: HTTP ${response.status}`);
    }
    await writeFile(path.join(outputRoot, target), await response.text());
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

  const notFoundResponse = await fetchRoute("/__project42_not_found__");
  const notFoundHtml = addStaticNavigation(await notFoundResponse.text());
  await writeFile(path.join(outputRoot, "404.html"), notFoundHtml);
  await writeFile(path.join(outputRoot, ".nojekyll"), "");
  await writeFile(path.join(outputRoot, "CNAME"), `${canonicalDomain}\n`);
  await writeFile(
    path.join(outputRoot, "pages-manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        canonicalDomain,
        htmlRoutes: inventory.htmlRoutes,
        endpoints: [
          ...endpointFiles.keys(),
          "/learner-data/policy.json",
        ],
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `GitHub Pages export ready: ${inventory.htmlRoutes.length} HTML routes and ` +
      `${endpointFiles.size + 1} endpoints in ${outputRoot}.`,
  );
}

await main();
