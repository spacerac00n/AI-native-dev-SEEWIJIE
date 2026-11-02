import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PlanStore } from "./plans.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const store = new PlanStore(resolve(repositoryRoot, process.env.VERIQA_DATA_DIR ?? "data"));
const [command, ...args] = process.argv.slice(2);
const usage = `Commands (run from the repository root):
  npm run plan -- import <fixture.json>
  npm run plan -- inspect <plan-id> [revision]
  npm run plan -- approve <plan-id> <revision> --by <your-name> --confirm
  npm run plan -- check <plan-id> <revision>
Import always creates an unapproved manual-fixture revision. Check validates approval only; it executes no tests.`;

try {
  let result: unknown;
  if (command === "import" && args.length === 1) {
    result = { ...store.save(JSON.parse(readFileSync(resolve(repositoryRoot, args[0]!), "utf8"))), status: "unapproved" };
  } else if (command === "inspect" && (args.length === 1 || args.length === 2)) {
    result = store.inspect(args[0]!, args[1]);
  } else if (command === "approve" && args.length === 5 && args[2] === "--by" && args[4] === "--confirm") {
    // Explicit operator action, separate from import/generation. No automatic approval path.
    result = store.approve(args[0]!, args[1]!, args[3]!);
  } else if (command === "check" && args.length === 2) {
    result = store.requireApproved(args[0]!, args[1]!);
  } else {
    throw new Error(usage);
  }
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Plan command failed");
  process.exitCode = 1;
}
