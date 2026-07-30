import { defineConfig, devices } from "@playwright/test";
import { readRegistrationAcceptanceConfig } from "./tests/production/registration-acceptance-config";

const acceptance = readRegistrationAcceptanceConfig();

export default defineConfig({
  testDir: "./tests/production",
  testMatch: "registration-request.acceptance.spec.ts",
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: acceptance.learnOrigin,
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "production-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
