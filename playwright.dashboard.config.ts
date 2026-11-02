import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { PlanStore } from "./apps/api/src/plans.js";

const directory = process.env.VERIQA_DASHBOARD_DIRECTORY
  ?? resolve(`artifacts/dashboard/${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`);
process.env.VERIQA_DASHBOARD_DIRECTORY = directory;
const dataRoot = resolve(directory, "synthetic-data");
mkdirSync(directory, { recursive: true });
const store = new PlanStore(dataRoot);
const fixture = JSON.parse(readFileSync("fixtures/manual-demo-plan.json", "utf8"));
// Test-only definitions and reviewer names remain separate from the actual human-approved live plan.
if (!process.env.VERIQA_DASHBOARD_PASS_REVISION) {
  const passing = store.save({ ...fixture, id: "dashboard-review-check", title: "Synthetic dashboard approval / execution check" });
  const failing = store.save({ ...fixture, id: "dashboard-failure-check", title: "Deliberately wrong dashboard runner-check expectation",
    cases: [{ ...fixture.cases[0], assertions: [{ type: "text", target: "health-status", expected: "Deliberately wrong dashboard expectation" }] }] });
  process.env.VERIQA_DASHBOARD_PASS_REVISION = passing.revision;
  process.env.VERIQA_DASHBOARD_FAIL_REVISION = failing.revision;
}
process.env.VERIQA_DASHBOARD_DATA = dataRoot;
console.log(`Dashboard verification: ${directory}`);

export default defineConfig({
  testDir: "./tests/dashboard", workers: 1, retries: 0, forbidOnly: true, timeout: 90_000,
  metadata: { gitCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    worktreeDirty: !!execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim() },
  outputDir: resolve(directory, "test-results"),
  reporter: [["list"], ["json", { outputFile: resolve(directory, "results.json") }],
    ["html", { outputFolder: resolve(directory, "html"), open: "never" }]],
  use: { baseURL: "http://127.0.0.1:5174", screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "npm run dev --workspace @veriqa/api", env: { VERIQA_TEST_MODE: "1", VERIQA_DATA_DIR: dataRoot },
      url: "http://127.0.0.1:3000/api/health", reuseExistingServer: false, gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 } },
    { command: "npm run dev --workspace @veriqa/demo-web", url: "http://127.0.0.1:5173", reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 } },
    { command: "npm run dev --workspace @veriqa/qa-dashboard", url: "http://127.0.0.1:5174", reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 } },
  ],
});
