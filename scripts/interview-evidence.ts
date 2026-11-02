import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, linkSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { executionRecordSchema, savedPlanSchema, planApprovalSchema } from "@veriqa/contracts";
import { hashPlan, PlanStore } from "../apps/api/src/plans.js";

export const repository = fileURLToPath(new URL("../", import.meta.url));
const revision = "d61ba281-a45b-47da-9ae2-5bf3f5747695";
const runs = [
  ["395693c2-5ad9-4842-a203-2e077eb1cd2c", "d2b776ba74431cbce08172d7f24a60195f03e646", 2, 1],
  ["2338b3bc-f5f7-43b1-ab2c-eaf7f7940c77", "1965faeb53ae987c1f3943141ca1a0199b2a919b", 3, 0],
] as const;
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const json = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
};
const pathSchema = z.string().regex(/^(data|artifacts)\/[A-Za-z0-9_./-]+$/)
  .refine((path) => path.split("/").every((part) => part && part !== "." && part !== ".."), "Unsafe evidence path");
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const manifestSchema = z.object({ schemaVersion: z.literal(1), files: z.array(z.object({
  path: pathSchema, sha256: hashSchema, originalSha256: hashSchema, bytes: z.number().int().nonnegative(),
})).min(1), redactions: z.array(z.object({ path: pathSchema, originalSha256: hashSchema,
  publishedSha256: hashSchema, reason: z.string().min(1), members: z.array(z.string()) })) });

// Reject symlinks in every existing path component, including the destination root (system ancestors such as macOS /var may be aliases).
function safePath(root: string, path: string) {
  const full = resolve(root, path);
  let current = full;
  while (true) {
    if (existsSync(current) || (() => { try { lstatSync(current); return true; } catch { return false; } })()) {
      assert(!lstatSync(current).isSymbolicLink(), `Symlink refused: ${current}`);
    }
    if (current === resolve(root)) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return full;
}

export function verifyEvidence(bundle = join(repository, "evidence/interview")) {
  const manifest = manifestSchema.parse(json(join(bundle, "manifest.json")));
  const names = new Set(manifest.files.map((file) => file.path));
  assert(names.size === manifest.files.length, "Duplicate manifest paths");
  const filesRoot = join(bundle, "files");
  function inventory(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = safePath(directory, entry.name);
      return entry.isDirectory() ? inventory(path) : [relative(filesRoot, path).split(sep).join("/")];
    });
  }
  assert(isDeepStrictEqual(inventory(filesRoot).sort(), [...names].sort()), "Manifest inventory differs from package");
  for (const file of manifest.files) {
    const bytes = readFileSync(safePath(filesRoot, file.path));
    assert(bytes.length === file.bytes && digest(bytes) === file.sha256, `Integrity mismatch: ${file.path}`);
    const redaction = manifest.redactions.find((item) => item.path === file.path);
    if (file.sha256 !== file.originalSha256) assert(redaction?.originalSha256 === file.originalSha256
      && redaction.publishedSha256 === file.sha256, `Undocumented redaction: ${file.path}`);
  }
  const saved = savedPlanSchema.parse(json(join(filesRoot, `data/plans/vp1/${revision}.json`)));
  const approval = planApprovalSchema.parse(json(join(filesRoot, `data/approvals/vp1/${revision}.json`)));
  assert(saved.revision === revision && saved.plan.id === "vp1" && saved.plan.source === "live-ai"
    && hashPlan(saved.plan) === saved.contentHash
    && saved.contentHash === "01d6a402710ee33142f5adbeb7e9c05e13318e314a77c464da81d8846d89e90f", "Historical plan mismatch");
  assert(json(join(filesRoot, "data/plans/vp1/current.json")) === revision, "Historical pointer mismatch");
  const inspected = new PlanStore(join(filesRoot, "data")).requireApproved("vp1", revision);
  assert(isDeepStrictEqual(inspected.approval, approval), "Historical approval mismatch");
  for (const [id, commit, passed, failed] of runs) {
    const record = executionRecordSchema.parse(json(join(filesRoot, `data/runs/${id}.json`)));
    const copy = json(join(filesRoot, `artifacts/executor/${id}/run.json`));
    assert(isDeepStrictEqual(record, copy) && isDeepStrictEqual(record.plan, saved)
      && isDeepStrictEqual(record.approval, approval), `Run snapshot mismatch: ${id}`);
    const m = record.metadata;
    assert(m.runId === id && m.testedCommit === commit && !m.worktreeDirty
      && m.planId === "vp1" && m.revision === revision && m.contentHash === saved.contentHash
      && m.approvalId === approval.approvalId && m.execution === "real-playwright" && m.mode === "replay"
      && m.exitCode === (failed ? 1 : 0) && m.outcome === (failed ? "assertion-failed" : "passed")
      && isDeepStrictEqual(m.counts, { discovered: 3, executed: 3, passed, failed, skipped: 0 }), `Run identity/outcome mismatch: ${id}`);
    for (const artifact of [...m.artifacts, ...record.cases.flatMap((item) => item.artifacts)]) {
      assert(names.has(`artifacts/executor/${id}/${artifact}`), `Missing indexed artifact: ${id}/${artifact}`);
    }
    const persistence = record.cases.find((item) => item.caseId === "case1")?.assertions
      .find((item) => item.definition.type === "checked");
    assert(persistence?.expected === true && persistence.actual === !failed, `Persistence observation mismatch: ${id}`);
  }
  return manifest;
}

export function restoreEvidence(target = repository, bundle = join(repository, "evidence/interview")) {
  const manifest = verifyEvidence(bundle);
  // Preflight the entire package before writing anything. Existing identical files are safe to reuse.
  for (const file of manifest.files) {
    const destination = safePath(target, file.path);
    if (existsSync(destination)) assert(digest(readFileSync(destination)) === file.sha256, `Conflict; nothing overwritten: ${file.path}`);
  }
  let restored = 0;
  for (const file of manifest.files) {
    const destination = safePath(target, file.path);
    if (existsSync(destination)) continue;
    mkdirSync(dirname(destination), { recursive: true });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, readFileSync(join(bundle, "files", file.path)), { flag: "wx" });
      linkSync(temporary, destination); // Exclusive publication never replaces a record, even during a race.
      restored++;
    } finally { rmSync(temporary, { force: true }); }
  }
  return { verified: manifest.files.length, restored, unchanged: manifest.files.length - restored };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, ...args] = process.argv.slice(2);
    assert((mode === "verify" || mode === "restore")
      && (args.length === 0 || (mode === "restore" && args.length === 2 && args[0] === "--target")),
    "Usage: interview-evidence.ts verify | restore [--target DIRECTORY]");
    console.log(JSON.stringify(mode === "restore" ? restoreEvidence(args[1] ? resolve(args[1]) : repository)
      : { verified: verifyEvidence().files.length }, null, 2));
  } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
