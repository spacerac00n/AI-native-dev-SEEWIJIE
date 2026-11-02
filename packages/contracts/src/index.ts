import { z } from "zod";

export * from "./plans.js";

// Both web apps validate the real API response at the network boundary.
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("veriqa-api"),
}).strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// The exact permitted email domain is checked by the backend login route.
export const emailLoginRequestSchema = z.object({
  email: z.string().email().max(254),
}).strict();

export const otpChallengeSchema = z.object({
  challengeId: z.string().uuid(),
  expiresAt: z.number().int(),
}).strict();

export const mockOtpSchema = otpChallengeSchema.extend({
  otp: z.string().regex(/^\d{6}$/),
}).strict();

export const verifyOtpRequestSchema = z.object({
  challengeId: z.string().uuid(),
  otp: z.string().regex(/^\d{6}$/),
}).strict();

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
}).strict();

export const updateTaskRequestSchema = z.object({ completed: z.boolean() }).strict();

export const homeResponseSchema = z.object({
  email: z.string().email(),
  tasks: z.array(taskSchema),
}).strict();

export const errorResponseSchema = z.object({ error: z.string() }).strict();

export type OtpChallenge = z.infer<typeof otpChallengeSchema>;
export type MockOtp = z.infer<typeof mockOtpSchema>;
export type DemoTask = z.infer<typeof taskSchema>;
export type DemoHome = z.infer<typeof homeResponseSchema>;
