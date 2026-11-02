import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { approveRequestSchema, executeRequestSchema, generateRequestSchema, revisionSchema } from "@veriqa/contracts";
import { executeApprovedPlan, repositoryRoot } from "./executor.js";
import { generatePlan } from "./planner.js";
import { PlanStore } from "./plans.js";
import { RunStore } from "./run-store.js";

type Options = { dataRoot: string; artifactRoot?: string; executionEnabled: boolean;
  generate?: typeof generatePlan; execute?: typeof executeApprovedPlan;
  credentials?: () => { apiKey: string; model: string } };

export function createQaRoutes(options: Options) {
  const qa = new Hono();
  const plans = new PlanStore(options.dataRoot);
  const running = new Set<string>();
  const artifacts = options.artifactRoot ?? join(repositoryRoot, "artifacts/executor");
  const runs = new RunStore(options.dataRoot, artifacts, running);
  let generating = false;
  qa.use("*", bodyLimit({ maxSize: 100_000 }));
  qa.use("*", async (context, next) => {
    context.header("Cache-Control", "no-store");
    const hostname = new URL(context.req.url).hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") return context.json({ error: "Local dashboard only" }, 403);
    if (context.req.method !== "GET") {
      const origin = context.req.header("Origin");
      const allowed = ["http://127.0.0.1:5174", "http://localhost:5174", "http://127.0.0.1:3000", "http://localhost:3000"];
      if ((origin && !allowed.includes(origin)) || context.req.header("X-VeriQA-Action") !== "dashboard"
        || !context.req.header("Content-Type")?.startsWith("application/json")) {
        return context.json({ error: "Dashboard JSON action header and local origin required" }, 403);
      }
    }
    await next();
  });
  qa.onError((error, context) => {
    if (error instanceof HTTPException && error.status === 413) return context.json({ error: "Request body exceeds 100000 bytes" }, 413);
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return context.json({ error: "Saved record not found" }, 404);
    if (error.name === "ZodError" || error instanceof SyntaxError) return context.json({ error: "Invalid or unsupported request/record" }, 400);
    // Planner and store errors are already bounded/sanitized. Never expose environment values.
    return context.json({ error: error.message }, 409);
  });
  qa.get("/status", (context) => context.json({ executionEnabled: options.executionEnabled,
    activeRunId: [...running][0] ?? null }));
  qa.get("/plans", (context) => context.json(plans.list()));
  qa.get("/plans/:id/:revision", (context) => context.json(plans.inspect(context.req.param("id"), context.req.param("revision"))));
  qa.post("/plans/generate", async (context) => {
    const input = generateRequestSchema.parse(await context.req.json());
    if (generating) return context.json({ error: "Another plan generation is in progress" }, 409);
    generating = true;
    try {
      let credentials;
      if (options.credentials) credentials = options.credentials();
      else {
        // Only a live generation action loads server-side configuration.
        const envFile = resolve(repositoryRoot, ".env");
        if (existsSync(envFile)) loadEnvFile(envFile);
        credentials = { apiKey: process.env.OPENAI_API_KEY ?? "", model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini" };
      }
      const saved = await (options.generate ?? generatePlan)({ ...input, ...credentials, store: plans,
        artifactRoot: join(repositoryRoot, "artifacts/planner"), planId: `plan-${randomUUID()}` });
      return context.json(plans.inspect(saved.plan.id, saved.revision), 201);
    } finally { generating = false; }
  });
  qa.post("/plans/approve", async (context) => {
    const input = approveRequestSchema.parse(await context.req.json());
    const selected = plans.load(input.planId, input.revision);
    if (selected.contentHash !== input.contentHash) return context.json({ error: "Plan hash changed; inspect it again" }, 409);
    if (running.size) return context.json({ error: "Wait for the active execution before changing approvals" }, 409);
    plans.approve(input.planId, input.revision, input.approvedBy);
    return context.json(plans.inspect(input.planId, input.revision), 201);
  });
  qa.post("/runs", async (context) => {
    const input = executeRequestSchema.parse(await context.req.json());
    const selected = plans.requireApproved(input.planId, input.revision);
    if (selected.contentHash !== input.contentHash) return context.json({ error: "Plan hash does not match approval" }, 409);
    if (!options.executionEnabled) return context.json({ error: "Start npm run dev:qa to enable isolated synthetic execution" }, 409);
    if (running.size || existsSync(join(artifacts, ".active-run"))) return context.json({ error: "An executor run is already active" }, 409);
    const runId = randomUUID();
    running.add(runId);
    // The existing executor owns evidence and verdicts; this set only tracks a live HTTP-launched job.
    void (options.execute ?? executeApprovedPlan)({ planId: input.planId, revision: input.revision,
      dataRoot: options.dataRoot, externalTarget: true, runId, captureSuccessScreenshots: input.captureScreenshots })
      .catch((error: unknown) => console.error(`QA run ${runId}: ${error instanceof Error ? error.message : "execution error"}`))
      .finally(() => running.delete(runId));
    return context.json({ runId }, 202);
  });
  qa.get("/runs", (context) => context.json({ runs: runs.list() }));
  qa.get("/runs/:id", (context) => context.json(runs.detail(context.req.param("id"))));
  qa.get("/runs/:id/artifacts", (context) => {
    const path = context.req.query("path") ?? "";
    const file = runs.artifact(revisionSchema.parse(context.req.param("id")), path);
    const mime: Record<string, string> = { ".png": "image/png", ".zip": "application/zip",
      ".json": "application/json", ".log": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8" };
    context.header("Content-Type", mime[extname(file)] ?? "application/octet-stream");
    context.header("X-Content-Type-Options", "nosniff");
    context.header("Content-Security-Policy", "sandbox; default-src 'none'");
    if (extname(file) === ".zip") context.header("Content-Disposition", 'attachment; filename="trace.zip"');
    else if (!mime[extname(file)]) context.header("Content-Disposition", "attachment");
    return context.body(new Uint8Array(readFileSync(file)));
  });
  return qa;
}
