import { relative, resolve } from "node:path";
import { executeApprovedPlan, repositoryRoot } from "./executor.js";

const [planId, revision, ...flags] = process.argv.slice(2);
try {
  if (!planId || !revision || flags.length > 1 || (flags.length === 1 && flags[0] !== "--external-target")) {
    throw new Error("Usage: npm run execute -- <plan-id> <exact-revision> [--external-target]");
  }
  const dataRoot = resolve(repositoryRoot, process.env.VERIQA_DATA_DIR ?? "data");
  const record = await executeApprovedPlan({ planId, revision, dataRoot, externalTarget: flags.length === 1 });
  console.log(JSON.stringify({ runId: record.metadata.runId, outcome: record.metadata.outcome, counts: record.metadata.counts,
    record: relative(repositoryRoot, resolve(dataRoot, "runs", `${record.metadata.runId}.json`)),
    artifacts: `artifacts/executor/${record.metadata.runId}` }, null, 2));
  process.exitCode = record.metadata.exitCode;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Execution failed");
  process.exitCode = 1;
}
