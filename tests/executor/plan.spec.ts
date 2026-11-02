import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { planApprovalSchema, savedPlanSchema, type CaseExecution } from "@veriqa/contracts";
import { hashPlan } from "../../apps/api/src/plans.js";
import { API, AssertionFailure, performAction, verifyAssertion } from "./adapters.js";

const directory = process.env.VERIQA_EXECUTION_DIR!;
const snapshot = JSON.parse(readFileSync(join(directory, "input.json"), "utf8"));
const saved = savedPlanSchema.parse(snapshot.saved);
const approval = planApprovalSchema.parse(snapshot.approval);
if (hashPlan(saved.plan) !== saved.contentHash || approval.planId !== saved.plan.id
  || approval.revision !== saved.revision || approval.contentHash !== saved.contentHash) {
  throw new Error("Execution snapshot does not match the approved content");
}

for (const definition of saved.plan.cases) {
  test(`${definition.id}: ${definition.title}`, async ({ page }, testInfo) => {
    const started = Date.now();
    const caseDirectory = join(directory, "cases", definition.id);
    mkdirSync(caseDirectory, { recursive: true });
    const result: CaseExecution = { caseId: definition.id, title: definition.title,
      requirementIds: definition.requirementIds, status: "execution-error", durationMs: 0,
      phase: "reset", assertions: [], errors: [], artifacts: [] };
    const logs: unknown[] = [];
    page.on("console", (message) => { if (message.type() === "error" || message.type() === "warning")
      logs.push({ kind: "console", type: message.type(), message: message.text() }); });
    page.on("pageerror", (error) => logs.push({ kind: "pageerror", message: error.message }));
    page.on("requestfailed", (request) => logs.push({ kind: "requestfailed", url: request.url(), error: request.failure() }));
    page.on("response", (response) => { if (response.status() >= 400)
      logs.push({ kind: "http-error", url: response.url(), status: response.status() }); });
    try {
      const reset = await page.request.post(`${API}/api/demo/__test/reset`, { timeout: 5_000, maxRedirects: 0 });
      if (reset.status() !== 200) throw new Error(`Synthetic state reset unavailable (HTTP ${reset.status()}); enable test mode`);
      expect(await reset.json()).toEqual({ reset: true });
      result.phase = "actions";
      const values = {};
      for (const [index, action] of definition.actions.entries()) {
        await test.step(`Action ${index + 1}: ${action.type}`, () => performAction(page, action, values));
      }
      result.phase = "assertions";
      for (const [index, assertion] of definition.assertions.entries()) {
        await test.step(`Assertion ${index + 1}: ${assertion.type}`,
          () => verifyAssertion(page, assertion, index, result.assertions, (value) => logs.push({ kind: "api", value })));
      }
      result.status = "passed";
      result.phase = "complete";
    } catch (error) {
      result.status = error instanceof AssertionFailure ? "assertion-failed" : "execution-error";
      result.errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      result.durationMs = Date.now() - started;
      writeFileSync(join(caseDirectory, "observation.json"), JSON.stringify(result, null, 2));
      writeFileSync(join(caseDirectory, "browser-api.log.json"), JSON.stringify(logs, null, 2));
      await testInfo.attach("case-observation", { path: join(caseDirectory, "observation.json"), contentType: "application/json" });
    }
  });
}
