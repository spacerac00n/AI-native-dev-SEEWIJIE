import { z } from "zod";
import { artifactPathSchema, expectedAssertionSchema, planApprovalSchema, planIdSchema, runResultMetadataSchema, savedPlanSchema } from "./plans.js";

export const caseExecutionSchema = z.object({
  caseId: planIdSchema,
  title: z.string(),
  requirementIds: z.array(planIdSchema),
  status: z.enum(["passed", "assertion-failed", "execution-error", "skipped"]),
  durationMs: z.number().nonnegative(),
  phase: z.enum(["reset", "actions", "assertions", "complete"]),
  assertions: z.array(z.object({
    index: z.number().int().nonnegative(),
    definition: expectedAssertionSchema,
    expected: z.unknown(),
    actual: z.unknown(),
    status: z.enum(["passed", "failed", "execution-error"]),
  }).strict()),
  errors: z.array(z.string()),
  // All paths are relative to this run's artifact directory, including nested evidence.
  artifacts: z.array(artifactPathSchema),
}).strict();

// Dashboard readers need only these files, not Playwright's internal JSON format.
export const executionRecordSchema = z.object({
  schemaVersion: z.literal(1),
  metadata: runResultMetadataSchema,
  durationMs: z.number().nonnegative(),
  target: z.literal("local-demo"),
  serverMode: z.enum(["managed", "external"]),
  plan: savedPlanSchema,
  approval: planApprovalSchema,
  cases: z.array(caseExecutionSchema),
  errors: z.array(z.string()),
}).strict().superRefine((record, context) => {
  const { metadata, plan, approval, cases } = record;
  const passed = cases.filter((item) => item.status === "passed").length;
  const failed = cases.filter((item) => item.status === "assertion-failed" || item.status === "execution-error").length;
  if (metadata.planId !== plan.plan.id || metadata.revision !== plan.revision
    || metadata.contentHash !== plan.contentHash || metadata.approvalId !== approval.approvalId
    || approval.planId !== plan.plan.id || approval.revision !== plan.revision || approval.contentHash !== plan.contentHash
    || metadata.planSource !== plan.plan.source || metadata.counts.discovered !== cases.length
    || metadata.counts.passed !== passed || metadata.counts.failed !== failed
    || cases.length !== plan.plan.cases.length
    || cases.some((item, index) => item.caseId !== plan.plan.cases[index]?.id)
    || cases.some((item, index) => item.status === "passed" && (item.phase !== "complete" || item.errors.length > 0
      || item.assertions.length !== plan.plan.cases[index]?.assertions.length
      || item.assertions.some((assertion) => assertion.status !== "passed")))
    || (metadata.outcome === "passed" && (record.errors.length > 0 || cases.some((item) => item.phase !== "complete")))
    || (metadata.outcome === "assertion-failed" && !cases.some((item) => item.status === "assertion-failed"))) {
    context.addIssue({ code: "custom", message: "Execution identity, approval, cases or counts do not match" });
  }
});

export type CaseExecution = z.infer<typeof caseExecutionSchema>;
export type ExecutionRecord = z.infer<typeof executionRecordSchema>;
