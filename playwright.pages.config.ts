import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PAGES_PORT ?? "48142");
if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("PAGES_PORT must be an integer from 1024 to 65535.");
}
const serverOrigin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: process.env.CI ? 120_000 : 60_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: serverOrigin,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // Distinct from playwright.config.ts's "chromium" project on purpose.
      // This run serves the published dist/pages artifact, where routes handed
      // off to their own subdomains (/account, /admin - AB#6851, AB#6227) are
      // redirect stubs rather than the live surface. Specs that exercise those
      // surfaces check this project name and skip, because the app itself still
      // renders them for the live server and for the subdomains' own exports.
      name: "chromium-pages",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run pages:serve",
    url: serverOrigin,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
