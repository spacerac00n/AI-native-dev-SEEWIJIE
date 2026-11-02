import { z } from "zod";
import { contentHashSchema, planApprovalSchema, planIdSchema, revisionSchema, savedPlanSchema } from "./plans.js";
import { executionRecordSchema } from "./execution.js";

export const planInspectionSchema = savedPlanSchema.extend({
  status: z.enum(["unapproved", "approved", "superseded"]), approval: planApprovalSchema.nullable(),
});
export const planListSchema = z.object({ plans: z.array(planInspectionSchema), errors: z.array(z.string()) });
export const generateRequestSchema = z.object({ requirements: z.string().trim().min(1).max(20000) }).strict();
const selection = { planId: planIdSchema, revision: revisionSchema, contentHash: contentHashSchema };
export const approveRequestSchema = z.object({ ...selection,
  approvedBy: z.string().trim().min(1).max(100), confirm: z.literal(true),
}).strict();
export const executeRequestSchema = z.object({ ...selection, captureScreenshots: z.boolean() }).strict();
export const runSummarySchema = z.object({
  runId: revisionSchema,
  planId: z.string().nullable(), revision: z.string().nullable(), startedAt: z.string().nullable(),
  outcome: z.enum(["passed", "assertion-failed", "execution-error", "rejected", "running", "incomplete"]),
  counts: z.object({ discovered: z.number(), executed: z.number(), passed: z.number(), failed: z.number(), skipped: z.number() }).nullable(),
  testedCommit: z.string().nullable(), worktreeDirty: z.boolean().nullable(),
  planSource: z.string().nullable(), error: z.string().nullable(),
});
export const runDetailSchema = z.object({
  summary: runSummarySchema, record: executionRecordSchema.nullable(),
  artifacts: z.array(z.string()),
});
export const runListSchema = z.object({ runs: z.array(runSummarySchema) });
export const qaStatusSchema = z.object({ executionEnabled: z.boolean(), activeRunId: revisionSchema.nullable() });

export type PlanInspection = z.infer<typeof planInspectionSchema>;
export type RunSummary = z.infer<typeof runSummarySchema>;
export type RunDetail = z.infer<typeof runDetailSchema>;
