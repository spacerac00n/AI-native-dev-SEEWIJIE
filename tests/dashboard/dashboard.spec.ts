import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

async function approveFixture(page: Page, revision: string) {
  await page.goto("/");
  await page.getByLabel("Or load a saved revision").selectOption(revision);
  await page.screenshot({ path: test.info().outputPath("dashboard-workflow.png") });
  await expect(page.getByRole("button", { name: "Execute approved plan" })).toBeDisabled();
  await page.getByLabel("Reviewer name").fill("SYNTHETIC DASHBOARD CHECK — not actual human review");
  await page.getByLabel("I reviewed the actions and expected results for this exact revision.").check();
  await page.getByRole("button", { name: "Approve exact revision" }).click();
  await expect(page.getByText("Approved by SYNTHETIC DASHBOARD CHECK — not actual human review")).toBeVisible();
}

test("dashboard exact approval, real execution, case assertions, screenshots and logs", async ({ page }) => {
  await approveFixture(page, process.env.VERIQA_DASHBOARD_PASS_REVISION!);
  await page.getByRole("button", { name: "Execute approved plan" }).click();
  const run = page.getByRole("region", { name: "Run details" });
  await expect(run.getByText("3", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(run.locator(".between > .badge").first()).toHaveText(/passed/);
  await run.getByText("login-and-task", { exact: true }).click();
  await expect(run.getByRole("columnheader", { name: "Expected", exact: true })).toBeVisible();
  const screenshot = run.getByRole("img", { name: "Real browser output for login-and-task" });
  await expect(screenshot).toBeVisible();
  const imageResponse = await page.request.get((await screenshot.getAttribute("src"))!);
  expect(imageResponse.status()).toBe(200); expect(imageResponse.headers()["content-type"]).toBe("image/png");
  await run.getByRole("button", { name: "browser-api.log.json", exact: true }).first().click();
  await expect(run.getByText("Open original ↗", { exact: true })).toBeVisible();
  await run.getByRole("button", { name: "stdout.log", exact: true }).click();
  await expect(run.locator(".log-content").last()).toContainText("3 passed");
  const runId = await run.locator(".metadata code").first().innerText();
  await page.getByRole("button", { name: runId.slice(0, 8), exact: true }).click();
  await expect(run).toBeVisible(); // Reselecting the same history row must keep its completed result.
  await page.screenshot({ path: test.info().outputPath("dashboard-passing-run.png"), fullPage: false });
});

test("dashboard preserves a real assertion failure and compares runs without claiming a fix", async ({ page }) => {
  await approveFixture(page, process.env.VERIQA_DASHBOARD_FAIL_REVISION!);
  await page.getByRole("button", { name: "Execute approved plan" }).click();
  const run = page.getByRole("region", { name: "Run details" });
  await expect(run.locator(".between > .badge").first()).toHaveText(/assertion failed/, { timeout: 30_000 });
  await expect(run.getByText('"Deliberately wrong dashboard expectation"', { exact: true })).toBeVisible();
  await expect(run.getByText('"API health has not been checked."', { exact: true })).toBeVisible();
  const trace = run.getByRole("link", { name: "Download Playwright trace" });
  await expect(trace).toBeVisible();
  expect((await page.request.get((await trace.getAttribute("href"))!)).status()).toBe(200);
  const records = readdirSync(join(process.env.VERIQA_DASHBOARD_DATA!, "runs")).map((file) =>
    JSON.parse(readFileSync(join(process.env.VERIQA_DASHBOARD_DATA!, "runs", file), "utf8")));
  const passing = records.find((item) => item.metadata.planId === "dashboard-review-check");
  const failing = records.find((item) => item.metadata.planId === "dashboard-failure-check");
  expect(passing.metadata.counts.passed).toBe(3); expect(failing.metadata.counts.failed).toBe(1);
  await page.getByRole("button", { name: "03 Compare runs" }).click();
  await page.getByLabel("Before run").selectOption(passing.metadata.runId);
  await page.getByLabel("After run").selectOption(failing.metadata.runId);
  await expect(page.getByText(/Different plans\/revisions or incomplete evidence/)).toBeVisible();
  await expect(page.getByText("Expectation changed").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "Real browser output for login-and-task" })).toHaveCount(2);
  await page.screenshot({ path: test.info().outputPath("dashboard-comparison.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: test.info().outputPath("dashboard-mobile.png"), fullPage: true });
});
