# Unified VeriQA dashboard

Run `npm run dev:qa`, then open `http://127.0.0.1:5174`. All services stay on loopback. Normal `npm run dev` keeps synthetic reset controls disabled, so inspection/generation/approval work but execution is disabled. Do not run separate baseline tests or managed executor servers on these ports at the same time.

The compact overview keeps detailed requirements, cases, provenance, logs and comparison evidence collapsed by default. Expand a row to review it. Workflow status, run metadata and comparison summaries use tables; approval and execution controls remain visible.

## Workflow

1. Enter natural-language requirements and choose **Generate test plan**. This makes a real server-side OpenAI request; root `.env` is read only for generation. The API saves an immutable, Zod-validated, unapproved revision under a fresh `plan-<UUID>` ID. Existing approved plans are not superseded.
2. Inspect cases, requirement references, supported actions and expected results. Expand provenance/review notes to see the actual model, request/response IDs, prompt version, original requirements and token usage. Model notes may be inaccurate; validation establishes executable structure, not correct product expectations.
3. Enter a reviewer name and explicitly confirm review, then approve the exact revision. The request includes its content hash. Saved approvals cannot be overwritten; superseded/changed revisions cannot execute. Automated verification uses labelled synthetic reviewers only in isolated fixture storage.
4. Choose **Execute approved plan**. This replays the saved definition through real Playwright UI/API execution without another model call. Each case resets synthetic backend state and uses a new browser context. The optional screenshot checkbox records genuine browser output for successful cases as well as failures.
5. Inspect the finalized run: UUID, SHA/dirty state, plan revision/hash, approval/provenance, exit code, counts, individual cases, attempted expected/actual assertions, browser/API logs, raw output, screenshots and trace downloads. Nonexecuted assertions are labelled. Color codes are removed only from display previews; originals are untouched.
6. Select two runs in history or in **Compare runs**. Matching case IDs appear side by side, with screenshots and expected/actual/definition/status differences. Equal plan ID/revision/hash establishes unchanged test definitions. Different or incomplete records are explicitly flagged. Missing old screenshots remain missing; no substitutes are generated.

A new live proposal still needs human review even if the previous plan was approved. A passing replay proves only the executed reviewed cases, not complete requirement coverage. Milestone 8 preserved actual seeded application failure `395693c2-5ad9-4842-a203-2e077eb1cd2c` alongside the original clean baseline `86b3c3f5-5ffd-4a9e-9001-bc6d0437927d`. Milestone 9 verified **Before** `395693c2` and **After** `2338b3bc-f5f7-43b1-ab2c-eaf7f7940c77`: unchanged plan/revision/hash and human approval, both clean SHAs, case1 assertion-failed → passed, expected true unchanged and actual false → true. See [DEMO.md](DEMO.md) for exact inspection steps.

## Minimal HTTP interface

All routes are under `/api/qa`. Shared schemas are in `packages/contracts/src/dashboard.ts`.

| Method / route | Purpose |
| --- | --- |
| `GET /status` | Synthetic execution availability and currently HTTP-launched run ID. |
| `GET /plans` | Validated saved revisions, approval state and readable-record errors. |
| `GET /plans/:id/:revision` | Inspect one exact revision and its approval. |
| `POST /plans/generate` | `{ requirements }`; reuse live planner, return unapproved inspected plan. |
| `POST /plans/approve` | `{ planId, revision, contentHash, approvedBy, confirm: true }`; immutable explicit approval. |
| `POST /runs` | `{ planId, revision, contentHash, captureScreenshots }`; require approval and test mode, return 202 with allocated `runId`. |
| `GET /runs` | Finalized, active, incomplete, rejected and invalid-record history. |
| `GET /runs/:id` | Summary, validated final record when available, indexed artifact paths. |
| `GET /runs/:id/artifacts?path=...` | Read one indexed, contained artifact; PNG previews, text/JSON output and ZIP trace downloads. |

Mutations require `Content-Type: application/json` and `X-VeriQA-Action: dashboard`; browser origin and host must be the documented local dashboard/API. Request bodies are bounded to 100000 bytes. The OpenAI key never enters dashboard responses or frontend bundles. This reuses the local file-owner/reviewer-label trust assumption; it does not introduce multi-user authentication.

Artifact requests validate UUIDs and relative path schemas, require membership in the selected run's evidence index, then check real filesystem containment to reject symlink escapes. Incomplete attempts expose only fixed diagnostic filenames. No arbitrary file browser or unrestricted HTTP proxy is added. Missing/invalid completion can never produce a green run. HTTP job state is in memory; restart leaves partial attempts visible as incomplete, with manual stale-lock recovery described in EXECUTION.md.

## Verification and evidence

`npm run test:dashboard` starts fresh local servers with an isolated data root. It tests actual UI approval of explicitly synthetic manual fixtures, real executor pass/failure, case assertions, PNG/trace retrieval, raw logs, comparison warnings and responsive layout. `npm run test:unit` checks API approval/hash gates, generation via a labelled offline transport, request boundaries, invalid/incomplete history, traversal and symlink containment. These tests do not fabricate human approval of a live plan or substitute offline output for live generation evidence.

The development machine's actual human-approved `vp1` revision and earlier records remain usable. See AI_WORKFLOW.md for the separate real dashboard replay and live generation, actual run IDs, counts, SHAs and artifact paths. Preserve complete run directories plus saved revisions/approvals. Generated files stay ignored until a reviewed evidence bundle is deliberately retained.
