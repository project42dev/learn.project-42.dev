import { headers } from "next/headers";

// Project 42's public product subdomains (ADR-0009's 2026-08-01 amendment). Each
// route below is "owned" by exactly one of them; a page rendered on a different
// host must link to it absolutely, the same way this app already links to
// guide.project-42.dev in SiteHeader. Paths are unchanged by the move - only the
// host differs - so this stays a pure domain swap, no route remapping.
export const LEARN_DOMAIN = "learn.project-42.dev";
export const ACCOUNT_DOMAIN = "account.project-42.dev";
export const ADMIN_DOMAIN = "admin.project-42.dev";

const ROUTE_OWNERS: Array<{ prefix: string; domain: string }> = [
  { prefix: "/account", domain: ACCOUNT_DOMAIN },
  { prefix: "/admin", domain: ADMIN_DOMAIN },
];

// Migration is in progress: Learn still serves every route today (the ADR's
// documented rollback path keeps it that way until the migration is
// confirmed), so whenever THIS build/request is for learn.project-42.dev
// itself, every route is local - there is no "foreign" route yet. Only once a
// request/build is actually for account. or admin. does the per-route
// ownership table apply, so those two subdomains link back to whichever
// domain (learn., or each other) really owns a given path.
function ownerDomainForPath(path: string, currentHost: string): string {
  if (currentHost === LEARN_DOMAIN) return LEARN_DOMAIN;
  const owner = ROUTE_OWNERS.find(
    (candidate) => path === candidate.prefix || path.startsWith(`${candidate.prefix}/`),
  );
  return owner?.domain ?? LEARN_DOMAIN;
}

/**
 * Resolves an internal Project 42 path to a same-host relative link when the
 * current request is already on the owning subdomain, or an absolute
 * cross-subdomain link otherwise. Falls back to LEARN_DOMAIN as the current
 * host (matching local dev and the default GitHub Pages export) when no host
 * header is available.
 */
export async function crossDomainHref(path: string): Promise<string> {
  let currentHost = LEARN_DOMAIN;
  try {
    currentHost = (await headers()).get("host") ?? LEARN_DOMAIN;
  } catch {
    // headers() throws outside a request context (e.g. a non-request build
    // step); the LEARN_DOMAIN fallback keeps that path's existing behavior.
  }
  const owner = ownerDomainForPath(path, currentHost);
  return currentHost === owner ? path : `https://${owner}${path}`;
}

/**
 * Client-component counterpart of crossDomainHref. Client components render
 * once during the server pass (no headers() access there) and again after
 * hydration; this reads window.location.host, so it resolves to the
 * LEARN_DOMAIN-relative default on the server/static-export pass and
 * self-corrects immediately after hydration if the page is actually being
 * served from a different subdomain.
 */
export function clientCrossDomainHref(path: string): string {
  const currentHost =
    typeof window === "undefined" ? LEARN_DOMAIN : window.location.host;
  const owner = ownerDomainForPath(path, currentHost);
  return currentHost === owner ? path : `https://${owner}${path}`;
}
