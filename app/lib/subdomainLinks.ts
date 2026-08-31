export const PUBLIC_ORIGIN = "https://project-42.dev";
export const ADMIN_ORIGIN = "https://admin.project-42.dev";

function ownerOriginForPath(path: string): string {
  return path === "/admin" || path.startsWith("/admin/")
    ? ADMIN_ORIGIN
    : PUBLIC_ORIGIN;
}

/**
 * Public learner routes belong to project-42.dev. Privileged administration
 * routes belong to the isolated admin.project-42.dev portal.
 */
export function clientCrossDomainHref(path: string): string {
  const ownerOrigin = ownerOriginForPath(path);
  if (typeof window === "undefined") {
    return ownerOrigin === PUBLIC_ORIGIN ? path : `${ownerOrigin}${path}`;
  }
  return window.location.origin === ownerOrigin ? path : `${ownerOrigin}${path}`;
}
