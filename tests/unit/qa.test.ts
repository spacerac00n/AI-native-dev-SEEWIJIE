import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { createQaRoutes } from "../../apps/api/src/qa.js";
import { PlanStore } from "../../apps/api/src/plans.js";
import { RunStore } from "../../apps/api/src/run-store.js";
import { generatePlan } from "../../apps/api/src/planner.js";

const fixture = JSON.parse(readFileSync(new URL("../../fixtures/manual-demo-plan.json", import.meta.url), "utf8"));
function setup(t: TestContext, enabled = true) {
  const root = mkdtempSync(join(tmpdir(), "veriqa-qa-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dataRoot = join(root, "data"); const artifactRoot = join(root, "evidence");
  mkdirSync(artifactRoot);
  const store = new PlanStore(dataRoot);
  const saved = store.save(fixture);
  const qa = createQaRoutes({ dataRoot, artifactRoot, executionEnabled: enabled });
  const selection = { planId: saved.plan.id, revision: saved.revision, contentHash: saved.contentHash };
  const post = (path: string, body: unknown, headers = {}) => qa.request(`http://localhost${path}`, { method: "POST",
    headers: { "Content-Type": "application/json", "X-VeriQA-Action": "dashboard", ...headers }, body: JSON.stringify(body) });
  return { root, dataRoot, artifactRoot, store, saved, qa, selection, post };
}

test("QA API lists validated revisions and requires explicit exact-hash human confirmation", async (t) => {
  const { qa, post, selection } = setup(t);
  assert.equal((await (await qa.request("http://localhost/plans")).json()).plans[0].status, "unapproved");
  assert.equal((await post("/plans/approve", { ...selection, approvedBy: "synthetic-test", confirm: false })).status, 400);
  assert.equal((await post("/plans/approve", { ...selection, contentHash: "0".repeat(64), approvedBy: "synthetic-test", confirm: true })).status, 409);
  const approved = await post("/plans/approve", { ...selection, approvedBy: "SYNTHETIC UNIT CHECK", confirm: true });
  assert.equal(approved.status, 201);
  assert.equal((await approved.json()).status, "approved");
  assert.equal((await post("/plans/approve", { ...selection, approvedBy: "synthetic-test", confirm: true })).status, 409);
});

test("QA execution rejects unapproved plans, wrong hashes and targets without reset controls", async (t) => {
  const { post, selection, store, saved } = setup(t, false);
  assert.equal((await post("/runs", { ...selection, captureScreenshots: true })).status, 409);
  store.approve(saved.plan.id, saved.revision, "SYNTHETIC UNIT CHECK");
  assert.equal((await post("/runs", { ...selection, contentHash: "0".repeat(64), captureScreenshots: true })).status, 409);
  const response = await post("/runs", { ...selection, captureScreenshots: true });
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /dev:qa/);
});

test("QA mutation guard rejects foreign origins, missing action headers, and untrusted hosts", async (t) => {
  const { qa, post } = setup(t);
  assert.equal((await post("/plans/generate", { requirements: "test" }, { Origin: "https://example.com" })).status, 403);
  assert.equal((await qa.request("http://localhost/plans/generate", { method: "POST", body: "{}" })).status, 403);
  assert.equal((await qa.request("http://evil.example/plans")).status, 403);
  assert.equal((await post("/plans/generate", { requirements: " " })).status, 400);
  assert.equal((await post("/plans/generate", { requirements: "x".repeat(100_001) })).status, 413);
});

test("QA generation calls the existing planner, allocates a fresh ID and stays unapproved", async (t) => {
  const { dataRoot, artifactRoot, saved, store } = setup(t);
  const { schemaVersion, source, target, ...definition } = fixture;
  void schemaVersion; void source; void target;
  const qa = createQaRoutes({ dataRoot, artifactRoot, executionEnabled: true,
    credentials: () => ({ apiKey: "offline-test-key", model: "offline" }),
    generate: (options) => generatePlan({ ...options, artifactRoot: join(artifactRoot, "offline-planner"),
      transport: async () => new Response(JSON.stringify({ id: "resp_offline", model: "offline-model", status: "completed", usage: null,
        output: [{ content: [{ type: "output_text", text: JSON.stringify({ ...definition, reviewNotes: ["Offline transport fixture only"] }) }] }] })) }),
  });
  const response = await qa.request("http://localhost/plans/generate", { method: "POST",
    headers: { "Content-Type": "application/json", "X-VeriQA-Action": "dashboard" }, body: JSON.stringify({ requirements: "Synthetic requirements" }) });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.match(result.plan.id, /^plan-/);
  assert.equal(result.status, "unapproved"); assert.equal(result.approval, null);
  assert.equal(result.plan.provenance.responseId, "resp_offline");
  assert.equal(store.inspect(saved.plan.id).revision, saved.revision);
});

test("run history preserves rejected, incomplete, active and invalid records without passes", (t) => {
  const { dataRoot, artifactRoot } = setup(t);
  const running = new Set<string>();
  const runs = new RunStore(dataRoot, artifactRoot, running);
  const ids = Array.from({ length: 4 }, () => randomUUID());
  for (const id of ids) { mkdirSync(join(artifactRoot, id)); writeFileSync(join(artifactRoot, id, "attempt.json"), JSON.stringify({ runId: id, startedAt: new Date().toISOString() })); }
  writeFileSync(join(artifactRoot, ids[0]!, "rejection.json"), JSON.stringify({ outcome: "rejected", error: "Unapproved" }));
  running.add(ids[1]!);
  writeFileSync(join(artifactRoot, ids[3]!, "run.json"), JSON.stringify({ metadata: { outcome: "passed" } }));
  assert.equal(runs.detail(ids[0]!).summary.outcome, "rejected");
  assert.equal(runs.detail(ids[1]!).summary.outcome, "running");
  assert.equal(runs.detail(ids[2]!).summary.outcome, "incomplete");
  assert.equal(runs.detail(ids[3]!).summary.outcome, "execution-error");
  assert.equal(runs.list().some((item) => item.outcome === "passed"), false);
});

test("artifact access rejects traversal, unindexed paths and symlink escapes", async (t) => {
  const { root, dataRoot, artifactRoot, qa } = setup(t);
  const id = randomUUID(); const directory = join(artifactRoot, id); mkdirSync(directory);
  writeFileSync(join(directory, "attempt.json"), JSON.stringify({ runId: id }));
  writeFileSync(join(directory, "stdout.log"), "real test log text");
  const runs = new RunStore(dataRoot, artifactRoot, new Set());
  assert.equal(readFileSync(runs.artifact(id, "stdout.log"), "utf8"), "real test log text");
  for (const path of ["../outside", "/etc/passwd", "hidden.txt", "..\\outside"]) assert.throws(() => runs.artifact(id, path));
  const outside = join(root, "outside.log"); writeFileSync(outside, "not accessible");
  symlinkSync(outside, join(directory, "stderr.log"));
  assert.throws(() => runs.artifact(id, "stderr.log"), /outside/);
  const response = await qa.request(`http://localhost/runs/${id}/artifacts?path=stdout.log`);
  assert.equal(response.status, 200); assert.equal(await response.text(), "real test log text");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await qa.request(`http://localhost/runs/${id}/artifacts?path=hidden.txt`)).status, 409);
  assert.equal((await qa.request("http://localhost/runs/not-a-uuid")).status, 400);
});
