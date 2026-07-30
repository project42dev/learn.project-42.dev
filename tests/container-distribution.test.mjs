import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("self-host image is non-root and uses the supported public configuration", async () => {
  const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");
  const nginx = await readFile(
    new URL("../self-host/nginx.conf", import.meta.url),
    "utf8",
  );
  const packageDocument = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const compatibility = JSON.parse(
    await readFile(new URL("../self-host/compatibility.json", import.meta.url), "utf8"),
  );
  const authProvider = await readFile(
    new URL("../app/components/AuthProvider.tsx", import.meta.url),
    "utf8",
  );
  const environmentExample = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );

  assert.match(dockerfile, /USER 101/);
  assert.match(dockerfile, /RUN npm ci\r?\n/);
  assert.doesNotMatch(dockerfile, /npm ci --ignore-scripts/);
  assert.match(dockerfile, /COPY --from=build .*dist\/pages/);
  assert.match(dockerfile, /NEXT_PUBLIC_PROJECT42_API_ORIGIN/);
  assert.doesNotMatch(dockerfile, /NEXT_PUBLIC_PROJECT42_OIDC_AUTHORITY/);
  assert.doesNotMatch(dockerfile, /NEXT_PUBLIC_PROJECT42_OIDC_CLIENT_ID/);
  assert.doesNotMatch(dockerfile, /NEXT_PUBLIC_PROJECT42_OIDC_SCOPE/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(nginx, /listen 8080/);
  assert.match(nginx, /location = \/health/);
  assert.match(nginx, /try_files \$uri \$uri\/ \$uri\/index\.html =404/);
  assert.match(nginx, /error_page 404 \/404\.html/);
  assert.equal(
    packageDocument.dependencies["@project42/platform"],
    "github:project42dev/project42-platform#v0.69.0",
  );
  assert.equal(compatibility.application.version, packageDocument.version);
  assert.equal(compatibility.platform.requiredVersion, "0.69.0");
  assert.equal(compatibility.runtime.containerPort, 8080);
  assert.equal(
    compatibility.identity.protocol,
    "API-owned OIDC Authorization Code with PKCE",
  );
  assert.equal(compatibility.identity.sessionTransport, "secure-http-only-cookie");
  assert.equal(compatibility.identity.browserTokenStorage, "forbidden");
  assert.deepEqual(compatibility.identity.publicConfiguration, [
    "NEXT_PUBLIC_PROJECT42_API_ORIGIN",
  ]);
  assert.deepEqual(compatibility.identity.requiredClaims, []);
  assert.match(authProvider, /credentials: "include"/);
  for (const route of [
    "/v1/auth/start",
    "/v1/auth/session",
    "/v1/auth/renew",
    "/v1/auth/signout",
  ]) {
    assert.ok(authProvider.includes(route), `${route} must be used by Learn`);
  }
  assert.doesNotMatch(authProvider, /project42\.auth\.token/);
  assert.doesNotMatch(authProvider, /authorization.*Bearer/i);
  assert.doesNotMatch(authProvider, /access_token/);
  assert.doesNotMatch(authProvider, /location\.assign\(body\.logoutUrl\)/);
  assert.match(
    authProvider,
    /hasSingleSearchParam\(target, "redirect_uri", redirectUri\)/,
  );
  assert.match(
    authProvider,
    /hasSingleSearchParam\(target, "code_challenge", codeChallenge\)/,
  );
  assert.match(authProvider, /\[\.\.\.target\.searchParams\]\.length/);
  assert.match(
    authProvider,
    /replaceState\(\{\}, "", "\/account\/github\/callback\/"\)/,
  );
  assert.doesNotMatch(environmentExample, /OIDC_(AUTHORITY|CLIENT|SCOPE)/);
});
