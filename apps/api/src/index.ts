import { serve } from "@hono/node-server";
import type { HealthResponse } from "@veriqa/contracts";
import { Hono } from "hono";
import { createDemoRoutes } from "./demo.js";
import { createQaRoutes } from "./qa.js";
import { repositoryRoot } from "./executor.js";
import { resolve } from "node:path";

const app = new Hono();

// This endpoint reports that the API is reachable; it does not run QA tests.
app.get("/api/health", (context) => context.json({
  status: "ok",
  service: "veriqa-api",
} satisfies HealthResponse));

app.route("/api/demo", createDemoRoutes(process.env.VERIQA_TEST_MODE === "1"));
app.route("/api/qa", createQaRoutes({ dataRoot: resolve(repositoryRoot, process.env.VERIQA_DATA_DIR ?? "data"),
  executionEnabled: process.env.VERIQA_TEST_MODE === "1" }));

const server = serve({
  fetch: app.fetch,
  hostname: "127.0.0.1",
  port: 3000,
}, () => {
  console.log("VeriQA API: http://127.0.0.1:3000/api/health");
});

// Let the dev command and Playwright release the port when they stop.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
}
