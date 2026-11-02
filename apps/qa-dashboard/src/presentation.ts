import type { CaseExecution, PlanInspection, RunSummary } from "@veriqa/contracts";
import { date } from "./api";

const names: Record<string, string> = {
  "review-requirements": "Review demo requirements", "run-baseline": "Run baseline tests",
  "welcome-heading": "Welcome message", "error-message": "Error message", "health-status": "API health",
  "email": "Email", "otp": "OTP", "request-otp": "Request OTP", "verify-otp": "Verify OTP", "logout": "Log out",
};
export const targetName = (target: string) => names[target] ?? target.replaceAll("-", " ");
// Labels are for display only. Selection and approval still use the original exact IDs.
export const runLabel = (run: RunSummary, index?: number) => `${index === undefined ? "Test run" : `Run ${index}`} · ${date(run.startedAt)}`;
export function expectation(definition: CaseExecution["assertions"][number]["definition"]) {
  switch (definition.type) {
    case "checked": return `${targetName(definition.target)} should be ${definition.expected ? "checked" : "unchecked"}.`;
    case "visible": return `${targetName(definition.target)} should be ${definition.expected ? "visible" : "hidden"}.`;
    case "text": return `${targetName(definition.target)} should say “${definition.expected}”.`;
    case "url": return `The page should be ${definition.path === "/home" ? "Home" : definition.path === "/login" ? "Login" : definition.path}.`;
    case "api": return `${definition.operation === "home" ? "Protected home" : "API health"} should return HTTP ${definition.expected.status}.`;
  }
}
export function observation(value: CaseExecution["assertions"][number]) {
  if (value.status === "execution-error") return "The check could not finish. Inspect the execution log.";
  switch (value.definition.type) {
    case "checked": return `The task was ${value.actual === true ? "checked" : value.actual === false ? "unchecked" : "not observed"}.`;
    case "visible": return `It was ${value.actual === true ? "visible" : value.actual === false ? "hidden" : "not observed"}.`;
    case "text": return `The page showed “${String(value.actual)}”.`;
    case "url": return `The browser opened ${String(value.actual).replace("http://127.0.0.1:5173", "")}.`;
    case "api": return `The server returned ${typeof value.actual === "object" && value.actual !== null && "status" in value.actual ? `HTTP ${String(value.actual.status)}` : "an unexpected response"}.`;
  }
}
export function caseExplanation(item: CaseExecution) {
  if (item.status === "execution-error") return "The test could not finish. Check the execution logs before judging application behavior.";
  if (item.status === "skipped") return "This test was not executed.";
  const failed = item.assertions.find((value) => value.status === "failed");
  return failed ? `${expectation(failed.definition)} ${observation(failed)}` : item.status === "passed" ? "All expected checks passed." : "An expected check failed. Open the evidence for details.";
}
export function actionDescription(action: PlanInspection["plan"]["cases"][number]["actions"][number]) {
  switch (action.type) {
    case "navigate": return `Open ${action.path === "/home" ? "Home" : action.path === "/login" ? "Login" : action.path}.`;
    case "fill": return `Enter ${typeof action.value === "string" ? `“${action.value}”` : "the mock OTP"} in ${targetName(action.input)}.`;
    case "click": return `Select ${targetName(action.target)}.`;
    case "read_mock_otp": return "Read the locally delivered mock OTP.";
  }
}
