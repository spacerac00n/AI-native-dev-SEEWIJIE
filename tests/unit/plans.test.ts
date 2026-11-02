import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test, type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { runResultMetadataSchema, testPlanSchema } from "@veriqa/contracts";
import { hashPlan, PlanStore } from "../../apps/api/src/plans.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = testPlanSchema.parse(JSON.parse(readFileSync(join(root, "fixtures/manual-demo-plan.json"), "utf8")));
const withActions = (actions: unknown[]) => ({
  ...fixture, cases: [{ ...fixture.cases[0]!, actions }, ...fixture.cases.slice(1)],
});
const withAssertions = (assertions: unknown[]) => ({
  ...fixture, cases: [{ ...fixture.cases[0]!, assertions }, ...fixture.cases.slice(1)],
});

function temporaryStore(context: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "veriqa-plan-test-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  return { directory, store: new PlanStore(directory) };
}

test("manual fixture is a valid three-case definition, not an execution result", () => {
  assert.equal(fixture.source, "manual-fixture");
  assert.equal(fixture.cases.length, 3);
  assert.equal("outcome" in fixture, false);
  assert.match(hashPlan(fixture), /^[a-f0-9]{64}$/);
});

const invalidPlans: [string, unknown][] = [
  ["malformed document", null],
  ["unknown action or generated code", withActions([{ type: "evaluate", code: "process.exit()" }])],
  ["external navigation", withActions([{ type: "navigate", path: "https://example.com" }])],
  ["raw CSS selector", withActions([{ type: "click", target: "#anything" }])],
  ["unsupported input", withActions([{ type: "fill", input: "password", value: "secret" }])],
  ["OTP reference before reading", withActions([{ type: "fill", input: "otp", value: { from: "mock-otp" } }])],
  ["generic API request", withAssertions([{ type: "api", operation: "delete-users", expected: { status: 200 } }])],
  ["API method injection", withAssertions([{ type: "api", operation: "home", method: "DELETE", expected: { status: 401, error: "Authentication required." } }])],
  ["invalid API status", withAssertions([{ type: "api", operation: "home", expected: { status: 999 } }])],
  ["invalid API body", withAssertions([{ type: "api", operation: "health", expected: { status: 200, body: { status: "failed", service: "veriqa-api" } } }])],
  ["string in place of boolean", withAssertions([{ type: "checked", target: "run-baseline", expected: "true" }])],
  ["blank expected text", withAssertions([{ type: "text", target: "error-message", expected: " " }])],
  ["no expected assertions", withAssertions([])],
  ["forged approval inside plan", { ...fixture, approved: true }],
  ["live AI origin without provenance", { ...fixture, source: "live-ai" }],
  ["duplicate cases", { ...fixture, cases: [fixture.cases[0], fixture.cases[0]] }],
  ["duplicate requirements", { ...fixture, requirements: [fixture.requirements[0], fixture.requirements[0]] }],
  ["unknown requirement reference", { ...fixture, cases: [{ ...fixture.cases[0], requirementIds: ["missing"] }] }],
];
for (const [name, input] of invalidPlans) {
  test(`contract rejects ${name}`, () => {
    assert.equal(testPlanSchema.safeParse(input).success, false);
  });
}

test("digest ignores object key order but detects changed expectations", () => {
  const reordered = Object.fromEntries(Object.entries(fixture).reverse());
  assert.equal(hashPlan(testPlanSchema.parse(reordered)), hashPlan(fixture));
  const edited = structuredClone(fixture);
  edited.cases[0]!.assertions = [{ type: "checked", target: "review-requirements", expected: false }];
  assert.notEqual(hashPlan(edited), hashPlan(fixture));
});

test("save/load survives a new store instance and starts unapproved", (context) => {
  const { directory, store } = temporaryStore(context);
  const saved = store.save(fixture);
  const reopened = new PlanStore(directory);
  assert.deepEqual(reopened.load(fixture.id), saved);
  assert.equal(reopened.inspect(fixture.id).status, "unapproved");
  assert.throws(() => reopened.requireApproved(fixture.id, saved.revision), /human approval/);
});

test("invalid input is rejected before any plan is persisted", (context) => {
  const { directory, store } = temporaryStore(context);
  assert.throws(() => store.save({ ...fixture, approved: true }));
  assert.equal(existsSync(join(directory, "plans")), false);
});

test("explicit test approval binds revision and digest and cannot be overwritten", (context) => {
  const { store } = temporaryStore(context);
  const saved = store.save(fixture);
  // This synthetic approval is only test data, not a human review of the interview fixture.
  const approval = store.approve(fixture.id, saved.revision, "contract-test-fixture");
  assert.equal(approval.contentHash, saved.contentHash);
  assert.deepEqual(store.requireApproved(fixture.id, saved.revision).approval, approval);
  assert.throws(() => store.approve(fixture.id, saved.revision, "another-test-actor"));
  assert.deepEqual(store.inspect(fixture.id).approval, approval);
});

test("editing invalidates approval and preserves the old revision and record", (context) => {
  const { directory, store } = temporaryStore(context);
  const original = store.save(fixture);
  store.approve(fixture.id, original.revision, "contract-test-fixture");
  const originalBytes = readFileSync(join(directory, "plans", fixture.id, `${original.revision}.json`), "utf8");
  const edited = store.save({ ...fixture, title: "Edited expectations need new review" });
  assert.notEqual(edited.revision, original.revision);
  assert.equal(store.inspect(fixture.id).status, "unapproved");
  assert.equal(store.inspect(fixture.id, original.revision).status, "superseded");
  assert.ok(store.inspect(fixture.id, original.revision).approval);
  assert.equal(readFileSync(join(directory, "plans", fixture.id, `${original.revision}.json`), "utf8"), originalBytes);
  assert.throws(() => store.requireApproved(fixture.id, original.revision), /human approval/);
  assert.throws(() => store.requireApproved(fixture.id, edited.revision), /human approval/);
  assert.throws(() => store.approve(fixture.id, original.revision, "contract-test-fixture"), /current revision/);
  store.approve(fixture.id, edited.revision, "contract-test-fixture");
  assert.equal(store.requireApproved(fixture.id, edited.revision).status, "approved");
});

test("reverting identical content does not resurrect an older approval", (context) => {
  const { store } = temporaryStore(context);
  const original = store.save(fixture);
  store.approve(fixture.id, original.revision, "contract-test-fixture");
  store.save({ ...fixture, title: "Intermediate edit" });
  const reverted = store.save(fixture);
  assert.equal(reverted.contentHash, original.contentHash);
  assert.notEqual(reverted.revision, original.revision);
  assert.throws(() => store.requireApproved(fixture.id, reverted.revision), /human approval/);
});

test("out-of-band content and approval hash changes fail closed", (context) => {
  const { directory, store } = temporaryStore(context);
  const saved = store.save(fixture);
  store.approve(fixture.id, saved.revision, "contract-test-fixture");
  const planPath = join(directory, "plans", fixture.id, `${saved.revision}.json`);
  writeFileSync(planPath, JSON.stringify({ ...saved, plan: { ...fixture, title: "Tampered" } }));
  assert.throws(() => store.requireApproved(fixture.id, saved.revision), /content hash/);
  writeFileSync(planPath, JSON.stringify(saved));
  const approvalPath = join(directory, "approvals", fixture.id, `${saved.revision}.json`);
  const approval = JSON.parse(readFileSync(approvalPath, "utf8"));
  writeFileSync(approvalPath, JSON.stringify({ ...approval, contentHash: "0".repeat(64) }));
  assert.throws(() => store.requireApproved(fixture.id, saved.revision), /Approval does not match/);
});

test("IDs and revisions cannot traverse storage directories", (context) => {
  const { store } = temporaryStore(context);
  assert.throws(() => store.load("../outside"));
  assert.throws(() => store.load(fixture.id, "../../outside"));
});

test("CLI requires explicit approval flags and checks the exact current revision", (context) => {
  const { directory } = temporaryStore(context);
  const cli = (...args: string[]) => spawnSync(process.execPath,
    ["--import", "tsx", join(root, "apps/api/src/plan-cli.ts"), ...args],
    { cwd: join(root, "apps/api"), encoding: "utf8",
      env: { ...process.env, VERIQA_DATA_DIR: relative(root, directory) } });
  const imported = cli("import", "fixtures/manual-demo-plan.json");
  assert.equal(imported.status, 0, imported.stderr);
  const saved = JSON.parse(imported.stdout);
  assert.ok(existsSync(join(directory, "plans", fixture.id, "current.json")));
  assert.equal(saved.status, "unapproved");
  assert.equal(cli("check", fixture.id, saved.revision).status, 1);
  assert.equal(cli("approve", fixture.id, saved.revision, "--by", "contract-test-fixture").status, 1);
  assert.equal(cli("approve", fixture.id, saved.revision, "--by", "contract-test-fixture", "--confirm").status, 0);
  assert.equal(cli("check", fixture.id, saved.revision).status, 0);
  const edited = cli("import", "fixtures/manual-demo-plan.json");
  assert.equal(edited.status, 0, edited.stderr);
  assert.equal(cli("check", fixture.id, saved.revision).status, 1);
});

const sampleMetadata = {
  schemaVersion: 1, runId: randomUUID(), planId: fixture.id, revision: randomUUID(), contentHash: hashPlan(fixture),
  approvalId: randomUUID(), planSource: "manual-fixture", mode: "replay", execution: "real-playwright",
  testedCommit: "a".repeat(40), worktreeDirty: false,
  startedAt: "2026-11-02T00:00:00.000Z", finishedAt: "2026-11-02T00:00:01.000Z", command: "unit-test-example-only",
  exitCode: 0, outcome: "passed", counts: { discovered: 1, executed: 1, passed: 1, failed: 0, skipped: 0 }, artifacts: [],
};

test("result metadata accepts a consistent synthetic contract example", () => {
  assert.equal(runResultMetadataSchema.safeParse(sampleMetadata).success, true);
});
for (const [name, changes] of [
  ["zero-test pass", { counts: { discovered: 0, executed: 0, passed: 0, failed: 0, skipped: 0 } }],
  ["unapproved pass", { approvalId: null }],
  ["nonzero pass exit", { exitCode: 1 }],
  ["inconsistent counts", { counts: { discovered: 2, executed: 1, passed: 0, failed: 0, skipped: 0 } }],
  ["failure without failed assertions", { outcome: "assertion-failed", exitCode: 1 }],
  ["successful exit for execution error", { outcome: "execution-error" }],
  ["reversed time", { finishedAt: "2026-11-01T00:00:00.000Z" }],
  ["artifact traversal", { artifacts: ["../secret"] }],
] as const) {
  test(`result metadata rejects ${name}`, () => {
    assert.equal(runResultMetadataSchema.safeParse({ ...sampleMetadata, ...changes }).success, false);
  });
}
