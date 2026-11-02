import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { executionRecordSchema, testPlanSchema, type TestPlan } from "@veriqa/contracts";
import { executeApprovedPlan, repositoryRoot } from "../../apps/api/src/executor.js";
import { PlanStore } from "../../apps/api/src/plans.js";

// Deliberately synthetic approvals live in a separate retained test directory, never in data/approvals.
// These verify runner mechanics; they are not human review of the live AI proposal.
const directory = join(repositoryRoot, "artifacts/runner-checks", randomUUID());
mkdirSync(directory, { recursive: true });
const dataRoot = join(directory, "synthetic-data");
const store = new PlanStore(dataRoot);
const original = testPlanSchema.parse(JSON.parse(readFileSync(join(repositoryRoot, "fixtures/manual-demo-plan.json"), "utf8")));
const fixture: TestPlan = { ...structuredClone(original), id: "runner-check-all-adapters",
  title: "Synthetic runner check, manually authored, not a human-approved product plan" };
const login = fixture.cases[0]!;
login.actions.splice(7, 0, { type: "click", target: "run-baseline" });
login.assertions.push({ type: "checked", target: "run-baseline", expected: true },
  { type: "visible", target: "welcome-heading", expected: true },
  { type: "visible", target: "error-message", expected: false });
fixture.cases.push({ id: "mock-and-different-email", title: "Read delivery and return to email form",
  precondition: "fresh-demo-state", requirementIds: ["login"],
  actions: [...login.actions.slice(0, 4), { type: "click", target: "different-email" }],
  assertions: [{ type: "visible", target: "login-heading", expected: true },
    { type: "visible", target: "mock-otp", expected: false }, { type: "visible", target: "otp-heading", expected: false }] });
fixture.cases.push({ id: "wrong-otp", title: "Literal OTP rejection and displayed mock delivery",
  precondition: "fresh-demo-state", requirementIds: ["login"],
  actions: [...login.actions.slice(0, 3), { type: "fill", input: "otp", value: "000000" },
    { type: "click", target: "verify-otp" }],
  assertions: [{ type: "visible", target: "otp-heading", expected: true },
    { type: "visible", target: "mock-otp", expected: true }, { type: "text", target: "error-message", expected: "Incorrect OTP." }] });
fixture.cases.push({ id: "health", title: "Root navigation and fixed health checks",
  precondition: "fresh-demo-state", requirementIds: ["protected-home"],
  actions: [{ type: "navigate", path: "/" }, { type: "click", target: "check-health" }],
  assertions: [{ type: "text", target: "health-status", expected: "API is healthy (veriqa-api)." },
    { type: "api", operation: "health", expected: { status: 200, body: { status: "ok", service: "veriqa-api" } } }] });
fixture.cases.push({ id: "logout", title: "Logout performs real session invalidation",
  precondition: "fresh-demo-state", requirementIds: ["login", "protected-home"],
  actions: [...login.actions.slice(0, 6), { type: "click", target: "logout" }],
  assertions: [{ type: "url", path: "/login" }, { type: "api", operation: "home",
    expected: { status: 401, error: "Authentication required." } }] });
fixture.cases.push({ id: "fresh-checklist", title: "New case resets prior email checklist and session state",
  precondition: "fresh-demo-state", requirementIds: ["login", "tasks"], actions: login.actions.slice(0, 6),
  assertions: [{ type: "checked", target: "review-requirements", expected: false },
    { type: "checked", target: "run-baseline", expected: false }] });

test("deterministic executor verification (real Playwright, synthetic runner-check approvals)", async (t) => {
  console.log(`Retained runner checks: ${directory}`);
  const results: unknown[] = [];
  const saved = store.save(fixture);
  await t.test("unapproved saved plan is rejected before browser/server launch", async () => {
    await assert.rejects(executeApprovedPlan({ planId: fixture.id, revision: saved.revision, dataRoot }), /human approval/);
  });
  await t.test("unsupported stored action is revalidated and rejected", async () => {
    const invalid = store.save({ ...original, id: "runner-check-unsupported" });
    const path = join(dataRoot, "plans", invalid.plan.id, `${invalid.revision}.json`);
    writeFileSync(path, JSON.stringify({ ...invalid, plan: { ...invalid.plan,
      cases: [{ ...invalid.plan.cases[0], actions: [{ type: "evaluate", code: "throw new Error()" }] }] } }));
    await assert.rejects(executeApprovedPlan({ planId: invalid.plan.id, revision: invalid.revision, dataRoot }));
  });
  store.approve(fixture.id, saved.revision, "SYNTHETIC RUNNER CHECK ONLY — not human approval");
  await t.test("a concurrent execution is rejected without stealing the existing run lock", async () => {
    const lock = join(repositoryRoot, "artifacts/executor/.active-run");
    mkdirSync(lock);
    try {
      await assert.rejects(executeApprovedPlan({ planId: fixture.id, revision: saved.revision, dataRoot }), /EEXIST/);
      assert.ok(existsSync(lock));
    } finally {
      const { rmSync } = await import("node:fs");
      rmSync(lock, { recursive: true });
    }
  });
  await t.test("approved fixture executes all adapters with fresh state and no OpenAI key", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const run = await executeApprovedPlan({ planId: fixture.id, revision: saved.revision, dataRoot });
      results.push(run.metadata);
      assert.equal(run.metadata.outcome, "passed", JSON.stringify(run.cases));
      assert.deepEqual(run.metadata.counts, { discovered: 8, executed: 8, passed: 8, failed: 0, skipped: 0 });
      assert.equal(run.approval.approvedBy.startsWith("SYNTHETIC"), true);
      assert.equal(executionRecordSchema.safeParse(run).success, true);
    } finally {
      if (previousKey !== undefined) process.env.OPENAI_API_KEY = previousKey;
    }
  });
  await t.test("actual assertion failure preserves expected/actual, screenshot, trace and raw output", async () => {
    const failure = store.save({ ...original, id: "runner-check-assertion-failure", title: "Deliberately wrong runner-check expectation",
      cases: [{ ...original.cases[0]!, actions: [{ type: "navigate", path: "/login" }],
        assertions: [{ type: "text", target: "health-status", expected: "Deliberately wrong runner-check expectation" }] }] });
    store.approve(failure.plan.id, failure.revision, "SYNTHETIC RUNNER CHECK ONLY — intentional expectation mismatch");
    const run = await executeApprovedPlan({ planId: failure.plan.id, revision: failure.revision, dataRoot });
    results.push(run.metadata);
    assert.equal(run.metadata.outcome, "assertion-failed");
    assert.equal(run.metadata.exitCode, 1);
    assert.equal(run.metadata.counts.failed, 1);
    assert.equal(run.cases[0]!.assertions[0]!.actual, "API health has not been checked.");
    assert.equal(run.cases[0]!.assertions[0]!.expected, "Deliberately wrong runner-check expectation");
    for (const suffix of [".png", "trace.zip", "stdout.log", "stderr.log"]) {
      assert.ok(run.metadata.artifacts.some((path) => path.endsWith(suffix)), `Missing ${suffix}`);
    }
    for (const path of run.metadata.artifacts) assert.ok(existsSync(join(repositoryRoot, "artifacts/executor", run.metadata.runId, path)));
  });
  await t.test("unavailable local target is an execution error, never an assertion/product failure", async () => {
    const run = await executeApprovedPlan({ planId: fixture.id, revision: saved.revision, dataRoot, externalTarget: true });
    results.push(run.metadata);
    assert.equal(run.metadata.outcome, "execution-error");
    assert.notEqual(run.metadata.exitCode, 0);
    assert.equal(run.metadata.counts.passed, 0);
    assert.ok(run.cases.every((item) => item.status === "execution-error" && item.phase === "reset"));
    assert.ok(run.cases.every((item) => item.errors.some((error) => /ECONNREFUSED/.test(error))),
      "Unavailable-target verification requires actual connection refusal, not a running server without test controls");
  });
  writeFileSync(join(directory, "summary.json"), JSON.stringify({ label: "synthetic runner checks, not human approvals", results }, null, 2));
});
