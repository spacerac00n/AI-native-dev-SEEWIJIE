import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { executionRecordSchema, testPlanSchema, type ExecutionRecord } from "@veriqa/contracts";
import { hashPlan } from "../../apps/api/src/plans.js";

// Contract examples only: no product execution or human approval is claimed by this unit fixture.
const plan = testPlanSchema.parse(JSON.parse(readFileSync(new URL("../../fixtures/manual-demo-plan.json", import.meta.url), "utf8")));
const revision = randomUUID();
const contentHash = hashPlan(plan);
const approval = { schemaVersion: 1 as const, approvalId: randomUUID(), planId: plan.id, revision,
  contentHash, approvedBy: "SYNTHETIC CONTRACT EXAMPLE", approvedAt: "2026-11-02T00:00:00.000Z", decision: "approved" as const };
function example(): ExecutionRecord {
  return { schemaVersion: 1, metadata: { schemaVersion: 1, runId: randomUUID(), planId: plan.id, revision,
    contentHash, approvalId: approval.approvalId, planSource: plan.source, mode: "replay", execution: "real-playwright",
    testedCommit: "a".repeat(40), worktreeDirty: true, startedAt: "2026-11-02T00:00:00.000Z",
    finishedAt: "2026-11-02T00:00:01.000Z", command: "synthetic-unit-example-only", exitCode: 0, outcome: "passed",
    counts: { discovered: 3, executed: 3, passed: 3, failed: 0, skipped: 0 }, artifacts: ["stdout.log"] },
  durationMs: 1000, target: "local-demo", serverMode: "managed", plan: { plan, revision, contentHash,
    createdAt: "2026-11-02T00:00:00.000Z" }, approval,
  cases: plan.cases.map((item) => ({ caseId: item.id, title: item.title, requirementIds: item.requirementIds,
    status: "passed", durationMs: 1, phase: "complete", errors: [], artifacts: [],
    assertions: item.assertions.map((definition, index) => ({ index, definition, expected: null, actual: null, status: "passed" })) })),
  errors: [] };
}

test("execution contract accepts a consistent synthetic example with comparison identities", () => {
  assert.equal(executionRecordSchema.safeParse(example()).success, true);
});
for (const [name, edit] of [
  ["wrong revision approval", (value: ExecutionRecord) => { value.approval = { ...value.approval, revision: randomUUID() }; }],
  ["wrong case identity", (value: ExecutionRecord) => { value.cases[0]!.caseId = "other-case"; }],
  ["incomplete passed case", (value: ExecutionRecord) => { value.cases[0]!.assertions = []; }],
  ["failed assertion in passed case", (value: ExecutionRecord) => { value.cases[0]!.assertions[0]!.status = "failed"; }],
  ["top-level error in passed run", (value: ExecutionRecord) => { value.errors.push("runner crashed"); }],
  ["case artifact traversal", (value: ExecutionRecord) => { value.cases[0]!.artifacts.push("../outside.png"); }],
  ["mismatched source provenance", (value: ExecutionRecord) => { value.metadata.planSource = "live-ai"; }],
] as const) {
  test(`execution contract rejects ${name}`, () => {
    const value = example();
    edit(value);
    assert.equal(executionRecordSchema.safeParse(value).success, false);
  });
}
