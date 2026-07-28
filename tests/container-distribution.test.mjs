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

  assert.match(dockerfile, /USER 101/);
  assert.match(dockerfile, /RUN npm ci\r?\n/);
  assert.doesNotMatch(dockerfile, /npm ci --ignore-scripts/);
  assert.match(dockerfile, /COPY --from=build .*dist\/pages/);
  assert.match(dockerfile, /NEXT_PUBLIC_PROJECT42_API_ORIGIN/);
  assert.match(dockerfile, /NEXT_PUBLIC_PROJECT42_OIDC_AUTHORITY/);
  assert.match(dockerfile, /NEXT_PUBLIC_PROJECT42_OIDC_CLIENT_ID/);
  assert.match(dockerfile, /NEXT_PUBLIC_PROJECT42_OIDC_SCOPE/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(nginx, /listen 8080/);
  assert.match(nginx, /location = \/health/);
  assert.match(nginx, /try_files \$uri \$uri\/ \$uri\/index\.html =404/);
  assert.match(nginx, /error_page 404 \/404\.html/);
  assert.equal(
    packageDocument.dependencies["@project42/platform"],
    "github:project42dev/project42-platform#v0.51.1",
  );
  assert.equal(compatibility.application.version, packageDocument.version);
  assert.equal(compatibility.platform.requiredVersion, "0.51.1");
  assert.equal(compatibility.runtime.containerPort, 8080);
  assert.deepEqual(compatibility.identity.requiredClaims, [
    "sub",
    "email",
    "email_verified",
  ]);
});
