import { defineConfig, devices } from "@playwright/test";
import { readProductionProgressAcceptanceConfig } from "./tests/production/progress-acceptance-config";

const acceptance = readProductionProgressAcceptanceConfig();

export default defineConfig({
  testDir: "./tests/production",
  testMatch: "progress-migration.acceptance.spec.ts",
  timeout: 240_000,
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
