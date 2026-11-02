import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, linkSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { JSONReport, JSONReportSpec, JSONReportSuite } from "@playwright/test/reporter";
import { caseExecutionSchema, executionRecordSchema, revisionSchema, type CaseExecution, type ExecutionRecord } from "@veriqa/contracts";
import { PlanStore } from "./plans.js";

export const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);
const json = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
function write(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    linkSync(temporary, path); // Publish the complete record without replacing previous evidence.
  } finally { rmSync(temporary, { force: true }); }
}

function files(directory: string, base = directory): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path, base) : [relative(base, path).split("\\").join("/")];
  });
}

function specs(suites: JSONReportSuite[]): JSONReportSpec[] {
  return suites.flatMap((suite) => [...suite.specs, ...specs(suite.suites ?? [])]);
}

export async function executeApprovedPlan(options: {
  planId: string; revision: string; dataRoot: string; externalTarget?: boolean;
  runId?: string; captureSuccessScreenshots?: boolean;
}): Promise<ExecutionRecord> {
  const started = Date.now();
  const runId = revisionSchema.parse(options.runId ?? randomUUID());
  const artifactRoot = join(repositoryRoot, "artifacts/executor");
  mkdirSync(artifactRoot, { recursive: true });
  const directory = join(artifactRoot, runId);
  mkdirSync(directory); // Never reuse a run directory, including rejected attempts.
  const testedCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  const worktreeDirty = execFileSync("git", ["status", "--porcelain"], { cwd: repositoryRoot, encoding: "utf8" }).trim().length > 0;
  const commandArgs = [require.resolve("@playwright/test/cli"), "test", "--config", "playwright.executor.config.ts"];
  const command = [process.execPath, ...commandArgs].map((value) => JSON.stringify(value)).join(" ");
  const attempt = { runId, planId: options.planId, revision: options.revision, testedCommit, worktreeDirty,
    startedAt: new Date(started).toISOString(), captureSuccessScreenshots: options.captureSuccessScreenshots ?? false,
    invocation: ["execute", options.planId, options.revision,
      ...(options.externalTarget ? ["--external-target"] : [])] };
  write(join(directory, "attempt.json"), attempt);
  console.log(`Executor artifacts: ${relative(repositoryRoot, directory)}`);
  const lock = join(artifactRoot, ".active-run");
  let locked = false;
  let launched = false;
  try {
    // Fail closed before starting a server or browser. No approval creation is available here.
    const approved = new PlanStore(options.dataRoot).requireApproved(options.planId, options.revision);
    mkdirSync(lock);
    locked = true;
    write(join(lock, "owner.json"), { runId, pid: process.pid });
    const { status: _status, approval, ...saved } = approved;
    void _status;
    write(join(directory, "input.json"), { saved, approval });
    const env = { ...process.env, VERIQA_EXECUTION_DIR: directory,
      VERIQA_EXTERNAL_TARGET: options.externalTarget ? "1" : "0",
      VERIQA_SUCCESS_SCREENSHOTS: options.captureSuccessScreenshots ? "1" : "0" };
    // Replay does not load .env or import the planner, and browser/server children receive no OpenAI settings.
    for (const key of Object.keys(env)) if (key.startsWith("OPENAI_")) delete (env as NodeJS.ProcessEnv)[key];
    const stdoutPath = join(directory, "stdout.log");
    const stderrPath = join(directory, "stderr.log");
    writeFileSync(stdoutPath, "", { flag: "wx" });
    writeFileSync(stderrPath, "", { flag: "wx" });
    launched = true;
    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn(process.execPath, commandArgs, { cwd: repositoryRoot, env, stdio: ["ignore", "pipe", "pipe"] });
      // Append as output arrives so partial logs survive an interrupted coordinator.
      child.stdout.on("data", (chunk: Buffer) => { appendFileSync(stdoutPath, chunk); process.stdout.write(chunk); });
      child.stderr.on("data", (chunk: Buffer) => { appendFileSync(stderrPath, chunk); process.stderr.write(chunk); });
      child.on("error", (error) => { appendFileSync(stderrPath, `${error.message}\n`); });
      child.on("close", (code, signal) => {
        write(join(directory, "command.json"), { command, argv: [process.execPath, ...commandArgs], exitCode: code, signal });
        resolve(code ?? 1);
      });
    });
    const errors: string[] = [];
    let report: JSONReport | undefined;
    try { report = json(join(directory, "playwright.json")) as JSONReport; }
    catch { errors.push("Playwright report unavailable; execution cannot be marked passed"); }
    errors.push(...(report?.errors ?? []).map((error) => error.message ?? JSON.stringify(error)));
    const allSpecs = specs(report?.suites ?? []);
    const cases: CaseExecution[] = saved.plan.cases.map((definition) => {
      const path = join(directory, "cases", definition.id, "observation.json");
      const actualTest = allSpecs.find((spec) => spec.title === `${definition.id}: ${definition.title}`)?.tests[0];
      const result = actualTest?.results[0];
      let observation: CaseExecution = { caseId: definition.id, title: definition.title,
        requirementIds: definition.requirementIds, status: "skipped", durationMs: 0, phase: "reset",
        assertions: [], errors: [], artifacts: [] };
      if (existsSync(path)) observation = caseExecutionSchema.parse(json(path));
      // Playwright is authoritative even when fixture teardown, a timeout, or a crash interrupts our observation.
      if (result && result.status !== "skipped") {
        observation.durationMs = result.duration;
        if (result.status === "passed" && observation.status !== "passed") {
          observation.status = "execution-error";
          observation.errors.push("Playwright passed without a complete case observation");
        } else if (result.status !== "passed") {
          if (observation.status !== "assertion-failed") observation.status = "execution-error";
          observation.errors.push(...(result.errors ?? []).map((error) => error.message ?? JSON.stringify(error)));
        }
      } else {
        observation.status = "skipped";
        observation.errors.push("Case did not complete Playwright execution");
      }
      return observation;
    });
    // Associate native screenshots, traces and error context using Playwright's attachment paths.
    for (const item of cases) {
      const spec = allSpecs.find((spec) => spec.title === `${item.caseId}: ${item.title}`);
      const attachments = spec?.tests[0]?.results[0]?.attachments ?? [];
      item.artifacts = [...new Set([
        ...files(directory).filter((path) => path.startsWith(`cases/${item.caseId}/`)),
        ...attachments.flatMap((attachment) => attachment.path && existsSync(attachment.path)
          ? [relative(directory, attachment.path).split("\\").join("/")] : []),
      ])];
      const detailPath = join(directory, "cases", item.caseId);
      mkdirSync(detailPath, { recursive: true });
      item.artifacts.push(`cases/${item.caseId}/result.json`);
      write(join(detailPath, "result.json"), item);
    }
    const passed = cases.filter((item) => item.status === "passed").length;
    const failed = cases.filter((item) => item.status === "assertion-failed" || item.status === "execution-error").length;
    const skipped = cases.filter((item) => item.status === "skipped").length;
    const outcome = errors.length || skipped || cases.some((item) => item.status === "execution-error")
      || (exitCode !== 0 && failed === 0) ? "execution-error" : failed ? "assertion-failed" : "passed";
    const finished = Date.now();
    const record = executionRecordSchema.parse({ schemaVersion: 1,
      metadata: { schemaVersion: 1, runId, planId: saved.plan.id, revision: saved.revision,
        contentHash: saved.contentHash, approvalId: approval.approvalId, planSource: saved.plan.source,
        mode: "replay", execution: "real-playwright", testedCommit, worktreeDirty,
        startedAt: new Date(started).toISOString(), finishedAt: new Date(finished).toISOString(), command,
        exitCode, outcome,
        counts: { discovered: cases.length, executed: passed + failed, passed, failed, skipped },
        artifacts: [...files(directory), "run.json"] },
      durationMs: finished - started, target: "local-demo", serverMode: options.externalTarget ? "external" : "managed",
      plan: saved, approval, cases, errors });
    write(join(directory, "run.json"), record);
    const recordPath = join(options.dataRoot, "runs", `${runId}.json`);
    mkdirSync(dirname(recordPath), { recursive: true });
    // Publish an immutable copy for future run-history readers, with evidence paths relative to this run.
    write(recordPath, record);
    return record;
  } catch (error) {
    write(join(directory, "rejection.json"), { ...attempt, finishedAt: new Date().toISOString(),
      outcome: launched ? "execution-error" : "rejected", exitCode: 1,
      error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    if (locked) rmSync(lock, { recursive: true });
  }
}
