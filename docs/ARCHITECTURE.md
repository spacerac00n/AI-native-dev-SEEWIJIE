# Architecture

Status: Milestones 2–7 implement the workspace, demo flows, live planning, JSON revisions/approvals, and deterministic approved-plan execution with structured evidence. The unified dashboard connects generation, review, approval, execution, history and evidence comparison.

Milestone 8 intentionally breaks the checklist write described below: `PATCH /tasks/:taskId` mutates a cloned response rather than stored per-email tasks. Refresh therefore loses the change. This is a labelled application defect, with detection evidence in [AI_WORKFLOW.md](AI_WORKFLOW.md); the architecture and approved assertions are unchanged. Milestone 9 will restore the required persistence behavior.

## Implemented foundation

- The React + Vite demo runs at `http://127.0.0.1:5173` with email login, mock OTP delivery, home/checklist, and logout. The dashboard at `http://127.0.0.1:5174` is the unified QA workspace. Both use a same-origin `/api` development proxy.
- One Hono process listens at `http://127.0.0.1:3000`. `GET /api/health` returns `{"status":"ok","service":"veriqa-api"}`; `apps/api/src/demo.ts` owns `/api/demo` authentication and task routes.
- `packages/contracts/` exports Zod request/response schemas and inferred types for health, OTP challenges, errors, and home/tasks. It compiles to ESM JavaScript and declarations before consumers run; no source-path aliases or runtime TypeScript imports are needed by the compiled API.
- `packages/contracts/src/plans.ts` adds versioned plan/case/action/assertion, saved revision, approval, and run-result metadata schemas. `apps/api/src/plans.ts` stores/revalidates JSON; `plan-cli.ts` provides the human review commands without a new API or dashboard.
- Root npm scripts install/build/run the four workspaces. The dev command also watches shared contracts. Both web apps deliberately use plain browser styling.
- Three tests in `tests/smoke/` check connectivity; 21 in `tests/demo/` check authentication, email-domain rejection, and home/tasks. Playwright owns fresh servers, uses one Chromium worker with no retries, and writes reports to unique ignored `artifacts/playwright/` directories. Reports include actual source SHA/dirty status. This is developer baseline tooling, separate from the approved-plan executor and its reporter.
- Sixty-three Node unit/contract/planner/result/API tests in `tests/unit/` check contracts, storage, CLI rejection, and revision-bound approval. Playwright ignores that directory and continues to run only its 24 real browser/API baseline checks. The separate executor config runs saved cases; `npm run test:executor` verifies runner mechanics with explicitly synthetic approval fixtures.

Exact setup commands and local URLs are in [README.md](../README.md). Only live generation needs a server-side key from the root `.env`. Demo auth/task state lives only in process memory.

## Components and responsibilities

The following table describes component responsibilities. Execution and the dashboard endpoints/UI are implemented below.

| Component | Planned location | Responsibility |
| --- | --- | --- |
| Demo web app | `apps/demo-web/` | React + Vite login, mock OTP flow, and home page. |
| QA dashboard | `apps/qa-dashboard/` | React + Vite requirements input, plan review/approval, execution controls, and evidence display. |
| Backend | `apps/api/` | One Hono process with separate demo-auth and QA route groups; planner calls, approvals, run coordination, storage, and reporting. |
| Shared contracts | `packages/contracts/` | TypeScript types and Zod schemas for requirements, plans, approvals, and run records. |
| Plan store/CLI | `apps/api/src/plans.ts`, `plan-cli.ts` | Implemented local JSON revisions, inspection, explicit approval, and execution gate. |
| Trusted executor | `apps/api/src/executor.ts`, `tests/executor/` | CLI coordinator, separate Playwright config, maintained action/assertion adapters and case evidence. |
| Baseline checks | `tests/demo/` | Deterministic tests proving the demo works before defects are seeded. |
| Workspace smoke checks | `tests/smoke/` | Implemented connectivity and rendered-page checks. |
| Persistence | `data/`, `artifacts/` | Local JSON records and actual execution evidence. |
| Replay fixture | `fixtures/approved-plans/` | Sanitized approved plan and provenance for the final offline demonstration. |

Keep planner, storage, and reporter modules inside the backend initially. Separate processes or packages are unnecessary unless the implementation demonstrates a concrete need. npm workspaces manage the application and contracts packages; root scripts coordinate development and verification.

## Planned QA data flow

```text
Developer requirements -> QA API -> OpenAI planner -> Zod validation
Saved plan -----------> QA API --------------------> Zod validation
                                                        |
                                                Review + approval
                                                        |
                                             Fixed Playwright runner
                                                        |
                                             Real demo UI + Hono auth
                                                        |
                                             Assertions + raw evidence
                                                        |
                                              Reporter -> Dashboard
```

The OpenAI key and model configuration stay in the backend environment. The browser never receives the API key. Replay bypasses the planner call and still enters validation, approval verification, and the same executor.

## Implemented plan contract and execution

A version-1 definition contains its ID/title, `source: manual-fixture` or `live-ai` (with provenance), fixed `demo-web` target, requirements, and cases. Each case has requirement references, `fresh-demo-state` precondition, ordered actions, and final assertions. Each import wraps it in an immutable revision UUID, canonical SHA-256 content digest, and creation timestamp. The committed fixture is in `fixtures/manual-demo-plan.json`; it is not approved or AI-generated.

| Vocabulary | Supported values |
| --- | --- |
| Navigation | `/`, `/login`, `/home`; no supplied origin or arbitrary URL. |
| Fill | Named `email` or `otp` input; bounded literal text, or an OTP reference after `read_mock_otp`. Negative input values are intentionally permitted for rejection tests. |
| Click | Known request/verify/logout/different-email/health buttons and the two checklist controls. |
| Mock delivery | Read the displayed mock OTP into one case-local value. |
| UI expectations | URL, visibility, nonblank exact text, and boolean checkbox state for known targets. |
| API expectations | Fixed GET health (200 plus exact body) and GET home (200 plus email, or 401 plus exact error). No generic request operation. |

Strict objects reject unknown keys/operations. Limits are 20 requirements/cases, 50 actions and 20 assertions per case, plus bounded text. IDs must be unique, requirement references must resolve, and a mock OTP must be read before use. Schemas validate capabilities and value types, not whether requirements or action order are logically correct. Review remains mandatory. Click adapters wait for the fixed endpoint response and pending form/task controls to settle before the next action.

AI output is data. The executor maps allowed action types to repository-maintained code and Playwright `expect` assertions. It never evaluates generated JavaScript, shell commands, arbitrary network requests, or dynamic assertion code. Targets, locators, and API operations are limited to supported demo capabilities. Schema-valid output can still have incorrect expectations, so human review remains necessary.

Validate at import and on every stored read. Approval is a separate developer action bound to both revision UUID and content hash; approval fields inside a definition are rejected. Every import creates a new unapproved revision, even when reverting older content. `PlanStore.requireApproved(id, revision)` verifies current revision, schema, digest, and approval binding and fails closed otherwise. `npm run plan -- check` exercises this gate only, without executing actions. The executor calls it and executes the returned immutable snapshot; the worker revalidates its schema/hash/approval binding before collecting cases.

Milestone 6 uses a CLI coordinator to start a fixed repository-owned Playwright runner with validated data and one active run. Each case uses a fresh browser context and resets synthetic state. Mock reset/retrieval helpers are local test facilities, not authentication substitutes. Milestone 7 adds thin dashboard routes around these same modules; it does not replace the runner. Replay does not load `.env` or call the planner.

## Authentication and mock boundary

The Hono demo route group owns exact email-domain validation, pending OTP challenges, expiry/consumption, sessions, protected data, and logout. The developer clarified passwordless email login in Milestone 3, replacing the original generic credential wording. The React app renders the flow; hiding a page in the browser is not authorization.

A labelled local mock-delivery store exposes the OTP for a specific challenge to the demo/test workflow. There is no external delivery provider. Tests still submit the OTP through the real verification endpoint and receive a real local session. Synthetic challenge/session records may live in process memory and reset on restart; durable plans, approvals, and evidence use JSON/files. This is a local demonstration, not a production authentication service.

Implemented routes (all under `/api/demo`):

| Method/path | Behaviour |
| --- | --- |
| `POST /auth/request-otp` | Validate email syntax and exact lowercase `@e.ntu.edu.sg` suffix; store a random six-digit challenge valid for five minutes. |
| `GET /mock-otp/:challengeId` | Expose that challenge's explicitly mocked local delivery. |
| `POST /auth/verify-otp` | Reject malformed/unknown, wrong, expired, or consumed challenges; consume a valid challenge and issue an opaque server session. |
| `GET /home` | Require an unexpired server session; return its email and per-email checklist. |
| `PATCH /tasks/:taskId` | Require a session and boolean `completed`; update only that email's checklist. |
| `POST /auth/logout` | Delete the server session and clear its cookie. |

All demo responses use `Cache-Control: no-store`. Sessions expire after one hour on the backend and use HTTP-only, SameSite=Strict, host-only cookies on local HTTP. Challenge consumption and session creation have no intervening await, preventing duplicate consumption in this single process. Tasks survive browser refresh/re-login but clear with all other state on restart. The UI reflects a checkbox change immediately, disables writes while pending, accepts the server's response, and rolls back on failure.

Vite serves a generic SPA shell at `/home`; personalised home data and task state are returned only by the session-protected Hono endpoints. Loading the shell does not grant access to that data.

Playwright alone opts into `VERIQA_TEST_MODE=1`. Then `POST /__test/reset` clears all maps and sets a fixed clock; `POST /__test/advance-time` advances it for expiry tests. Both are relative to `/api/demo`, never create sessions, and are absent in normal mode. Tests run serially with fresh browser contexts. Normal startup uses `Date.now()` and real expiry; the compiled API was checked separately with the helpers returning 404.

## Persistence and evidence

- `data/plans/<plan-id>/<revision>.json`: implemented immutable saved definition with revision UUID, canonical digest, and creation timestamp. Version 1 supports `manual-fixture` and `live-ai`; only live origin requires provenance.
- `data/plans/<plan-id>/current.json`: implemented pointer to the latest revision UUID.
- `data/approvals/<plan-id>/<revision>.json`: implemented immutable approval ID, exact revision/hash, reviewer label, decision, and timestamp. Historical approvals remain inspectable but cannot approve a newer/current definition.
- `data/runs/<run-id>.json`: finalized immutable execution record with exact saved plan/provenance and approval snapshot, real-Playwright replay label, commit/dirty status, timestamps/duration, actual command/exit code, counts/outcome, per-case assertions/errors, and relative artifact paths. Zero-execution/unapproved passes and inconsistent results are rejected. Full dashboard contract and comparison identities are in [EXECUTION.md](EXECUTION.md).
- `artifacts/executor/<run-id>/`: actual Playwright output/JSON, case observations and browser/API logs, failure screenshots/traces, and the same `run.json`. Rejections retain `attempt.json`/`rejection.json`; interrupted attempts without a finalized record must never appear passed. Static baseline reports keep their existing `artifacts/playwright/` layout.

The default store root is repository `data/`, optionally overridden by `VERIQA_DATA_DIR` for isolated tests. Validate path IDs before filesystem access. Write JSON to a temporary sibling, publish immutable records using an exclusive hard link, and atomically rename only the current pointer. This assumes a local filesystem and one writer; it is not a multi-file database transaction. Local file ownership is trusted, and reviewer names are audit labels rather than authenticated identities.

Run records finalize without overwrite, and each rerun gets a new UUID. An exclusive local directory lock allows one executor at a time; stale lock recovery is manual after confirming no runner remains. Capture provenance at run start; interview defect/fix runs must test clean committed versions. Never copy keys or session secrets into reports or committed evidence.

Local working outputs stay ignored by default once tooling exists. Explicitly retain a small reviewed, sanitized demonstration set with its original provenance. A cached plan, developer approval, mock delivery event, and real execution result must remain visibly distinct.

## Lifecycle and failure handling

1. Store requirements and generate or load a draft; label its source accurately.
2. Validate structure and supported actions. Reject invalid definitions with useful errors.
3. Review expectations, edit if needed, revalidate, and approve the exact revision.
4. Verify approval and target readiness, allocate a run ID, and record commit/configuration provenance.
5. Execute trusted actions and assertions through Playwright; collect actual output and evidence.
6. Finalize the report, including discovered/executed/passed/failed/skipped counts and errors. Do not infer a pass from a zero exit code if no required tests executed.
7. For a fix or investigation, create a separate run and compare it to the preserved earlier record.

Playwright assertion failures are product-failure candidates subject to review of the expected result. Malformed/unsupported definitions are invalid tests. A stopped server, missing browser, planner failure, or runner crash is an environment/execution error. A crash or partial run must never become an all-passed report. Automatic retries are disabled initially so they cannot conceal first-run failures; observed variability is documented across retained runs.

## Defect demonstration

Prove the working baseline first. Seed deliberate defects in a `test(seed):` commit, execute that committed version, and preserve failed assertions plus its SHA. Only then make a separate `fix:` commit and execute a new run. Keep both evidence sets and link them in the eventual `docs/DEMO.md`.

## Implemented live planner (Milestone 5)

`npm run plan -- generate <requirements-file>` loads the root `.env` only in the CLI, then calls `planner.ts`. Native Node fetch sends a strict JSON-schema Responses request to the fixed OpenAI endpoint; no SDK/dependency or browser key is added. Zod exports the wire schema, while local validation also enforces cross-reference and OTP ordering refinements that JSON Schema cannot encode. Model output contains only ID/title, requirements, cases and review notes. The server stamps `source: live-ai` plus provider, API, prompt version, requested/returned model, response/request IDs, time, original requirements and usage. A live source without provenance, or a manual fixture claiming provenance, is rejected. Existing manual definitions/hashes remain compatible.

After validation, the existing store saves an immutable unapproved revision. Safe interaction records use fresh artifact IDs and retain unsuccessful attempts. Authorization headers and raw transport errors are never logged; credential-like output is rejected/redacted. HTTP errors, network/timeout failures, refusal, incomplete and invalid output cannot grant approval. Requirements are untrusted input and must not contain secrets or confidential materials. No automatic retries or test verdicts. `store: false` requests no provider-side response storage.

The CLI is the intentionally chosen entry point instead of an additional Hono endpoint. Import/inspect/check of an existing AI plan does not load `.env` or make an API call. Unit tests use explicitly labelled isolated offline transports; only real interactions are marked `live-openai`.

## Unified dashboard (Milestone 7)

The React dashboard uses `/api/qa` Hono routes for saved plans, live generation, explicit approval, asynchronous run launch/history and artifact reads. Shared Zod schemas validate request and response boundaries. Requirements go to the existing planner, which assigns a server-allocated fresh dashboard plan ID before saving; CLI generation retains its prior ID behavior. This prevents unrelated new proposals from superseding the approved walkthrough revision. Actual model output and server-allocated identity remain visible in interaction/saved records. No generation grants approval.

`npm run dev:qa` opts the existing API into reset-enabled test mode. Dashboard executions use the existing executor's external-target mode against the running local demo, avoiding a second API process on port 3000. Normal `npm run dev` keeps reset controls absent and the dashboard explains why execution is disabled. The executor accepts an allocated run UUID and optional success-screenshot flag; all actions, approval checks, isolation, verdicts and evidence publication remain in the existing runner. The API holds only active run IDs in memory; disk attempts remain visible as incomplete after restart.

`RunStore` reads finalized records plus earlier attempt/rejection directories, preserving all old evidence. Invalid records fail closed as execution errors. Artifact access requires a validated run UUID, an indexed relative path, and a real path contained within that run (including symlink checks). Responses have fixed MIME types, no sniffing and a restrictive content policy; traces download as ZIP. The local-only mutation guard requires a JSON action header and checks browser origin/host. This is the existing single-operator localhost trust model, not an identity service.

Comparison matches case IDs and shows expected/actual values, definitions/status changes, screenshots and traces. Only equal plan ID/revision/hash is described as directly comparable. The dashboard never labels arbitrary pairs as a seeded defect and fix. Downloaded raw logs are unchanged; display previews strip ANSI colors and are size-bounded. Endpoint and operation details are in [DASHBOARD.md](DASHBOARD.md).
