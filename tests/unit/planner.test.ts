import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generatePlan } from "../../apps/api/src/planner.js";
import { PlanStore } from "../../apps/api/src/plans.js";

const fixture = JSON.parse(readFileSync(new URL("../../fixtures/manual-demo-plan.json", import.meta.url), "utf8"));
const { schemaVersion, source, target, ...definition } = fixture;
void schemaVersion; void source; void target;
const draft = { ...definition, reviewNotes: [] };
const key = "unit-only-credential-not-real";
function response(output: unknown = draft, status = "completed", refusal = false) {
  return new Response(JSON.stringify({ id: "resp_offline", model: "offline-model", status,
    usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
    output: [{ content: [{ type: refusal ? "refusal" : "output_text", text: JSON.stringify(output) }] }],
  }), { headers: { "x-request-id": "offline-request" } });
}

test("offline transport validates and saves live-shaped output unapproved with server provenance", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "veriqa-planner-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const store = new PlanStore(join(root, "data"));
  const result = await generatePlan({ requirements: "Synthetic login requirements", apiKey: key,
    model: "offline-requested", store, artifactRoot: join(root, "artifacts"), transport: async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.text.format.strict, true);
      assert.equal(body.store, false);
      assert.equal(JSON.stringify(body).includes(key), false);
      return response();
    } });
  assert.equal(result.plan.source, "live-ai");
  assert.equal(result.plan.provenance?.model, "offline-model");
  assert.equal(result.plan.provenance?.responseId, "resp_offline");
  assert.equal(store.inspect(result.plan.id).status, "unapproved");
  assert.throws(() => store.requireApproved(result.plan.id, result.revision), /human approval/);
  const record = JSON.parse(readFileSync(result.interactionArtifact, "utf8"));
  assert.equal(record.interaction, "offline-test-transport");
  assert.equal(JSON.stringify(record).includes(key), false);
});

for (const [name, transport] of [
  ["unsupported actions", async () => response({ ...draft, cases: [{ ...draft.cases[0], actions: [{ type: "evaluate" }] }] })],
  ["broken references", async () => response({ ...draft, cases: [{ ...draft.cases[0], requirementIds: ["unknown"] }] })],
  ["forged approval", async () => response({ ...draft, approved: true })],
  ["refusal", async () => response(draft, "completed", true)],
  ["incomplete output", async () => response(draft, "incomplete")],
  ["invalid JSON", async () => new Response("not-json")],
  ["HTTP auth error", async () => new Response("secret error body", { status: 401 })],
  ["rate limit", async () => new Response("quota", { status: 429 })],
  ["network error with credential", async () => { throw new Error(key); }],
  ["credential in output", async () => response({ ...draft, title: key })],
] as const) {
  test(`offline planner rejects ${name} without saving a plan or leaking credentials`, async (t) => {
    const root = mkdtempSync(join(tmpdir(), "veriqa-planner-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    await assert.rejects(generatePlan({ requirements: "Synthetic login", apiKey: key, model: "offline",
      store: new PlanStore(join(root, "data")), artifactRoot: join(root, "artifacts"), transport }),
    (error: Error) => !error.message.includes(key));
    assert.equal(existsSync(join(root, "data/plans")), false);
    const directory = readdirSync(join(root, "artifacts"))[0]!;
    const log = readFileSync(join(root, "artifacts", directory, "interaction.json"), "utf8");
    assert.equal(log.includes(key), false);
    assert.equal(JSON.parse(log).outcome, "generation-error");
  });
}

test("empty requirements and missing key fail locally before transport", async () => {
  const base = { requirements: "", apiKey: key, model: "offline", store: new PlanStore("unused"), artifactRoot: "unused" };
  await assert.rejects(generatePlan(base), /Requirements/);
  await assert.rejects(generatePlan({ ...base, requirements: "Login", apiKey: "" }), /OPENAI_API_KEY/);
});
