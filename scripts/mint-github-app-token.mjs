import crypto from "node:crypto";

const appId = process.env.GH_APP_ID;
const privateKey = process.env.GH_APP_PRIVATE_KEY;
const org = process.argv[2];
if (!appId || !privateKey || !org) {
  throw new Error("Usage: GH_APP_ID=... GH_APP_PRIVATE_KEY=... node mint-github-app-token.mjs <org>");
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

const now = Math.floor(Date.now() / 1000);
const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const payload = base64Url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }));
const signingInput = `${header}.${payload}`;
const signature = base64Url(crypto.createSign("RSA-SHA256").update(signingInput).sign(privateKey));
const jwt = `${signingInput}.${signature}`;

const headers = { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json" };
const installation = await fetch(`https://api.github.com/orgs/${org}/installation`, { headers }).then(
  (response) => response.json(),
);
if (!installation.id) {
  throw new Error(`Could not resolve the App installation for org ${org}: ${JSON.stringify(installation)}`);
}
const tokenResponse = await fetch(
  `https://api.github.com/app/installations/${installation.id}/access_tokens`,
  { method: "POST", headers },
).then((response) => response.json());
if (!tokenResponse.token) {
  throw new Error(`Could not mint an installation token: ${JSON.stringify(tokenResponse)}`);
}
process.stdout.write(tokenResponse.token);
