import { createHash, randomUUID } from "node:crypto";
import { existsSync, linkSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  approvedBySchema, planApprovalSchema, planIdSchema, revisionSchema, savedPlanSchema, testPlanSchema,
  type PlanApproval, type SavedPlan, type TestPlan,
} from "@veriqa/contracts";

// Object key order does not change a plan's content digest; array/action order does.
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value)!;
}

export function hashPlan(plan: TestPlan): string {
  return createHash("sha256").update(canonicalJson(testPlanSchema.parse(plan))).digest("hex");
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path: string, value: unknown, replace = false) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    // Hard-link publication refuses to replace immutable records; rename updates only the pointer.
    if (replace) renameSync(temporary, path);
    else linkSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

// Small synchronous files and a single local writer are sufficient for this MVP.
export class PlanStore {
  constructor(private readonly root: string) {}

  private planDirectory(id: string) {
    return join(this.root, "plans", planIdSchema.parse(id));
  }

  private currentRevision(id: string) {
    const pointer = readJson(join(this.planDirectory(id), "current.json"));
    return revisionSchema.parse(pointer);
  }

  save(input: unknown): SavedPlan {
    const plan = testPlanSchema.parse(input);
    const saved = savedPlanSchema.parse({
      plan, revision: randomUUID(), contentHash: hashPlan(plan), createdAt: new Date().toISOString(),
    });
    const directory = this.planDirectory(plan.id);
    writeJson(join(directory, `${saved.revision}.json`), saved);
    // Every import creates a new, unapproved revision, even when reverting to older content.
    writeJson(join(directory, "current.json"), saved.revision, true);
    return saved;
  }

  load(id: string, revision = this.currentRevision(id)): SavedPlan {
    revisionSchema.parse(revision);
    const saved = savedPlanSchema.parse(readJson(join(this.planDirectory(id), `${revision}.json`)));
    if (saved.plan.id !== id || saved.revision !== revision || hashPlan(saved.plan) !== saved.contentHash) {
      throw new Error("Stored plan identity or content hash does not match");
    }
    return saved;
  }

  private approvalPath(id: string, revision: string) {
    return join(this.root, "approvals", planIdSchema.parse(id), `${revisionSchema.parse(revision)}.json`);
  }

  inspect(id: string, revision?: string) {
    const saved = this.load(id, revision);
    const path = this.approvalPath(id, saved.revision);
    const approval = existsSync(path) ? planApprovalSchema.parse(readJson(path)) : null;
    if (approval && (approval.planId !== id || approval.revision !== saved.revision
      || approval.contentHash !== saved.contentHash)) {
      throw new Error("Approval does not match this exact plan revision and content hash");
    }
    const status = saved.revision !== this.currentRevision(id) ? "superseded" : approval ? "approved" : "unapproved";
    return { ...saved, status, approval };
  }

  approve(id: string, revision: string, approvedBy: string): PlanApproval {
    const saved = this.load(id, revision);
    if (this.currentRevision(id) !== revision) throw new Error("Only the current revision can be approved");
    const approval = planApprovalSchema.parse({
      schemaVersion: 1, approvalId: randomUUID(), planId: id, revision, contentHash: saved.contentHash,
      approvedBy: approvedBySchema.parse(approvedBy), approvedAt: new Date().toISOString(), decision: "approved",
    });
    writeJson(this.approvalPath(id, revision), approval);
    return approval;
  }

  // Execution uses this gate, not an approval field supplied inside a plan.
  requireApproved(id: string, revision: string) {
    revisionSchema.parse(revision); // Never silently fall back to the current revision at execution time.
    const inspected = this.inspect(id, revision);
    if (inspected.status !== "approved" || !inspected.approval) {
      throw new Error("Current plan revision requires explicit human approval");
    }
    return { ...inspected, approval: inspected.approval };
  }
}
