import { z } from "zod";

// Both web apps validate the real API response at the network boundary.
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("veriqa-api"),
}).strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;
