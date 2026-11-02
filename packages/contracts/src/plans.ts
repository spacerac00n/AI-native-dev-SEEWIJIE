import { z } from "zod";

export const planIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
export const revisionSchema = z.string().uuid();
export const contentHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().min(1).max(2000).refine((value) => value.trim().length > 0, "Must not be blank");
const taskTarget = z.enum(["review-requirements", "run-baseline"]);
const pagePath = z.enum(["/", "/login", "/home"]);
const mockOtpValue = z.object({ from: z.literal("mock-otp") }).strict();

// Names map to maintained demo adapters in a later milestone, never arbitrary selectors/code.
export const testActionSchema = z.union([
  z.object({ type: z.literal("navigate"), path: pagePath }).strict(),
  z.object({ type: z.literal("fill"), input: z.literal("email"), value: z.string().max(254) }).strict(),
  z.object({
    type: z.literal("fill"), input: z.literal("otp"),
    value: z.union([z.string().max(254), mockOtpValue]),
  }).strict(),
  z.object({
    type: z.literal("click"),
    target: z.enum(["request-otp", "verify-otp", "logout", "different-email", "check-health",
      "review-requirements", "run-baseline"]),
  }).strict(),
  z.object({ type: z.literal("read_mock_otp") }).strict(),
]);

// API assertions are fixed read-only checks, not a generic HTTP request primitive.
export const expectedAssertionSchema = z.union([
  z.object({ type: z.literal("url"), path: pagePath }).strict(),
  z.object({
    type: z.literal("visible"),
    target: z.enum(["login-heading", "otp-heading", "welcome-heading", "error-message", "mock-otp"]),
    expected: z.boolean(),
  }).strict(),
  z.object({
    type: z.literal("text"), target: z.enum(["welcome-heading", "error-message", "health-status"]),
    expected: text,
  }).strict(),
  z.object({ type: z.literal("checked"), target: taskTarget, expected: z.boolean() }).strict(),
  z.object({
    type: z.literal("api"), operation: z.literal("health"),
    expected: z.object({ status: z.literal(200), body: z.object({
      status: z.literal("ok"), service: z.literal("veriqa-api"),
    }).strict() }).strict(),
  }).strict(),
  z.object({
    type: z.literal("api"), operation: z.literal("home"),
    expected: z.union([
      z.object({ status: z.literal(200), email: z.string().email().max(254) }).strict(),
      z.object({ status: z.literal(401), error: z.literal("Authentication required.") }).strict(),
    ]),
  }).strict(),
]);

export const testCaseSchema = z.object({
  id: planIdSchema,
  title: text,
  requirementIds: z.array(planIdSchema).min(1).max(20),
  precondition: z.literal("fresh-demo-state"),
  actions: z.array(testActionSchema).min(1).max(50),
  assertions: z.array(expectedAssertionSchema).min(1).max(20),
}).strict().superRefine((testCase, context) => {
  let hasMockOtp = false;
  for (const [index, action] of testCase.actions.entries()) {
    if (action.type === "read_mock_otp") hasMockOtp = true;
    if (action.type === "fill" && typeof action.value === "object" && !hasMockOtp) {
      context.addIssue({ code: "custom", path: ["actions", index], message: "Read mock OTP before referencing it" });
    }
  }
  if (new Set(testCase.requirementIds).size !== testCase.requirementIds.length) {
    context.addIssue({ code: "custom", path: ["requirementIds"], message: "Duplicate requirement reference" });
  }
});

export const testPlanSchema = z.object({
  schemaVersion: z.literal(1),
  id: planIdSchema,
  title: text,
  source: z.literal("manual-fixture"),
  target: z.literal("demo-web"),
  requirements: z.array(z.object({ id: planIdSchema, text }).strict()).min(1).max(20),
  cases: z.array(testCaseSchema).min(1).max(20),
}).strict().superRefine((plan, context) => {
  const requirements = new Set(plan.requirements.map((item) => item.id));
  if (requirements.size !== plan.requirements.length) {
    context.addIssue({ code: "custom", path: ["requirements"], message: "Duplicate requirement ID" });
  }
  if (new Set(plan.cases.map((item) => item.id)).size !== plan.cases.length) {
    context.addIssue({ code: "custom", path: ["cases"], message: "Duplicate test case ID" });
  }
  for (const [index, testCase] of plan.cases.entries()) {
    if (testCase.requirementIds.some((id) => !requirements.has(id))) {
      context.addIssue({ code: "custom", path: ["cases", index, "requirementIds"], message: "Unknown requirement reference" });
    }
  }
});

export const savedPlanSchema = z.object({
  revision: revisionSchema,
  contentHash: contentHashSchema,
  createdAt: z.string().datetime(),
  plan: testPlanSchema,
}).strict();

export const approvedBySchema = z.string().trim().min(1).max(100);
export const planApprovalSchema = z.object({
  schemaVersion: z.literal(1),
  approvalId: z.string().uuid(),
  planId: planIdSchema,
  revision: revisionSchema,
  contentHash: contentHashSchema,
  approvedBy: approvedBySchema,
  approvedAt: z.string().datetime(),
  decision: z.literal("approved"),
}).strict();

const count = z.number().int().min(0);
const artifactPath = z.string().min(1).max(500).refine((value) =>
  !value.startsWith("/") && !value.includes("\\") && !value.split("/").some((part) => part === "..")
  && !value.includes(":"), "Use a relative artifact path without traversal");

// A future executor may emit these records. Milestone 4 does not create execution results.
export const runResultMetadataSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string().uuid(),
  planId: planIdSchema,
  revision: revisionSchema,
  contentHash: contentHashSchema,
  approvalId: z.string().uuid().nullable(),
  planSource: z.literal("manual-fixture"),
  mode: z.literal("replay"),
  execution: z.literal("real-playwright"),
  testedCommit: z.string().regex(/^[a-f0-9]{40}$/),
  worktreeDirty: z.boolean(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  command: text,
  exitCode: z.number().int(),
  outcome: z.enum(["passed", "assertion-failed", "invalid-definition", "execution-error"]),
  counts: z.object({ discovered: count, executed: count, passed: count, failed: count, skipped: count }).strict(),
  artifacts: z.array(artifactPath).max(100),
}).strict().superRefine((run, context) => {
  const counts = run.counts;
  const invalidCounts = counts.executed !== counts.passed + counts.failed
    || counts.discovered !== counts.executed + counts.skipped;
  const invalidPass = run.outcome === "passed" && (counts.executed === 0 || counts.failed > 0
    || counts.skipped > 0 || run.exitCode !== 0 || run.approvalId === null);
  const invalidFailure = run.outcome === "assertion-failed"
    && (counts.failed === 0 || run.exitCode === 0 || run.approvalId === null);
  const invalidError = (run.outcome === "invalid-definition" || run.outcome === "execution-error") && run.exitCode === 0;
  if (invalidCounts || invalidPass || invalidFailure || invalidError || Date.parse(run.finishedAt) < Date.parse(run.startedAt)) {
    context.addIssue({ code: "custom", message: "Inconsistent result counts, outcome, approval, or timing" });
  }
});

export type TestPlan = z.infer<typeof testPlanSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type TestAction = z.infer<typeof testActionSchema>;
export type ExpectedAssertion = z.infer<typeof expectedAssertionSchema>;
export type SavedPlan = z.infer<typeof savedPlanSchema>;
export type PlanApproval = z.infer<typeof planApprovalSchema>;
export type RunResultMetadata = z.infer<typeof runResultMetadataSchema>;
