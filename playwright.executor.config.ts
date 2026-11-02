import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const directory = process.env.VERIQA_EXECUTION_DIR;
if (!directory) throw new Error("Use npm run execute -- <plan-id> <revision>");

export default defineConfig({
  testDir: "./tests/executor",
  testMatch: "plan.spec.ts",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: true,
  timeout: 30_000,
  expect: { timeout: 3_000 },
  outputDir: resolve(directory, "test-results"),
  reporter: [["list"], ["json", { outputFile: resolve(directory, "playwright.json") }]],
  use: { screenshot: "only-on-failure", trace: "retain-on-failure", actionTimeout: 5_000, navigationTimeout: 5_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.VERIQA_EXTERNAL_TARGET === "1" ? [] : [
    { command: "npm run dev --workspace @veriqa/api", env: { VERIQA_TEST_MODE: "1" },
      url: "http://127.0.0.1:3000/api/health", reuseExistingServer: false, timeout: 15_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 } },
    { command: "npm run dev --workspace @veriqa/demo-web", url: "http://127.0.0.1:5173",
      reuseExistingServer: false, timeout: 15_000, gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 } },
  ],
});
