import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// A unique directory keeps earlier results intact, including failed runs.
const runId = process.env.VERIQA_TEST_RUN_ID
  ?? `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`;
// Workers inherit this ID when Playwright loads the config again.
process.env.VERIQA_TEST_RUN_ID = runId;
const runDirectory = `artifacts/playwright/${runId}`;
console.log(`Playwright artifacts: ${runDirectory}`);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  // Record the actual source revision; dirty worktrees must not look like clean commits.
  metadata: {
    gitCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    worktreeDirty: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim().length > 0,
  },
  outputDir: `${runDirectory}/test-results`,
  reporter: [
    ["list"],
    ["json", { outputFile: `${runDirectory}/results.json` }],
    ["html", { outputFolder: `${runDirectory}/html`, open: "never" }],
  ],
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Own fresh servers so a stale dev process cannot satisfy the smoke checks.
  webServer: [
    {
      command: "npm run dev --workspace @veriqa/api",
      env: { VERIQA_TEST_MODE: "1" },
      url: "http://127.0.0.1:3000/api/health",
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
    {
      command: "npm run dev --workspace @veriqa/demo-web",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
    {
      command: "npm run dev --workspace @veriqa/qa-dashboard",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
  ],
});
