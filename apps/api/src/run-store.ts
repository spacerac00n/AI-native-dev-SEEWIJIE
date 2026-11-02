import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { artifactPathSchema, executionRecordSchema, revisionSchema, type RunDetail, type RunSummary } from "@veriqa/contracts";

function read(path: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid JSON record");
  return value as Record<string, unknown>;
}
const string = (value: unknown) => typeof value === "string" ? value : null;

// Reads both finalized records and older/incomplete attempts. It never infers a pass from a log or filename.
export class RunStore {
  constructor(private readonly dataRoot: string, readonly artifactRoot: string, private readonly running: Set<string>) {}

  list(): RunSummary[] {
    const ids = new Set<string>();
    for (const root of [this.artifactRoot, join(this.dataRoot, "runs")]) {
      if (existsSync(root)) for (const entry of readdirSync(root)) {
        const id = entry.replace(/\.json$/, "");
        if (revisionSchema.safeParse(id).success) ids.add(id);
      }
    }
    return [...ids].map((id) => this.detail(id).summary)
      .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
  }

  detail(runId: string): RunDetail {
    revisionSchema.parse(runId);
    const directory = join(this.artifactRoot, runId);
    const localRecord = join(directory, "run.json");
    const recordPath = existsSync(localRecord) ? localRecord : join(this.dataRoot, "runs", `${runId}.json`);
    const summary: RunSummary = { runId, planId: null, revision: null, startedAt: null,
      outcome: this.running.has(runId) ? "running" : "incomplete", counts: null,
      testedCommit: null, worktreeDirty: null, planSource: null, error: null };
    try {
      if (existsSync(recordPath)) {
        const record = executionRecordSchema.parse(read(recordPath));
        if (record.metadata.runId !== runId) throw new Error("Run identity mismatch");
        const metadata = record.metadata;
        return { summary: { runId, planId: metadata.planId, revision: metadata.revision,
          startedAt: metadata.startedAt, outcome: metadata.outcome === "invalid-definition" ? "rejected" : metadata.outcome,
          counts: metadata.counts, testedCommit: metadata.testedCommit, worktreeDirty: metadata.worktreeDirty,
          planSource: metadata.planSource, error: record.errors.join("\n") || null },
        record, artifacts: metadata.artifacts };
      }
      if (!existsSync(directory)) throw Object.assign(new Error("Run not found"), { code: "ENOENT" });
      const attemptPath = join(directory, "attempt.json");
      if (existsSync(attemptPath)) {
        const attempt = read(attemptPath);
        summary.planId = string(attempt.planId);
        summary.revision = string(attempt.revision);
        summary.startedAt = string(attempt.startedAt);
        summary.testedCommit = string(attempt.testedCommit);
        summary.worktreeDirty = typeof attempt.worktreeDirty === "boolean" ? attempt.worktreeDirty : null;
      }
      const rejectionPath = join(directory, "rejection.json");
      if (existsSync(rejectionPath)) {
        const rejection = read(rejectionPath);
        summary.outcome = rejection.outcome === "rejected" ? "rejected" : "execution-error";
        summary.error = string(rejection.error);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw error;
      summary.outcome = "execution-error";
      summary.error = "Stored run record is invalid or unreadable; no passing result can be verified.";
    }
    const artifacts = ["attempt.json", "rejection.json", "stdout.log", "stderr.log", "command.json", "playwright.json"]
      .filter((file) => existsSync(join(directory, file)));
    return { summary, record: null, artifacts };
  }

  artifact(runId: string, path: string) {
    artifactPathSchema.parse(path);
    const detail = this.detail(runId);
    if (!detail.artifacts.includes(path)) throw new Error("Artifact is not indexed for this run");
    const root = realpathSync(this.artifactRoot);
    const directory = realpathSync(join(root, revisionSchema.parse(runId)));
    const file = realpathSync(resolve(directory, path));
    // Resolve symlinks as well as ../ traversal before reading any bytes.
    if (directory !== join(root, runId) || !file.startsWith(`${directory}${sep}`) || !statSync(file).isFile()) {
      throw new Error("Artifact path is outside this run");
    }
    return file;
  }
}
