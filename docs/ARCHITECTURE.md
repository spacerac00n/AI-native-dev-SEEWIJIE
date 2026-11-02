# Architecture

Status: Milestones 2–3 implement the workspace and real demo authentication/home flows. AI planning, approval, replay, and QA reporting below remain the target design.

## Implemented foundation

- The React + Vite demo runs at `http://127.0.0.1:5173` with email login, mock OTP delivery, home/checklist, and logout. The dashboard at `http://127.0.0.1:5174` remains a shell. Both use a same-origin `/api` development proxy.
- One Hono process listens at `http://127.0.0.1:3000`. `GET /api/health` returns `{"status":"ok","service":"veriqa-api"}`; `apps/api/src/demo.ts` owns `/api/demo` authentication and task routes.
- `packages/contracts/` exports Zod request/response schemas and inferred types for health, OTP challenges, errors, and home/tasks. It compiles to ESM JavaScript and declarations before consumers run; no source-path aliases or runtime TypeScript imports are needed by the compiled API.
- Root npm scripts install/build/run the four workspaces. The dev command also watches shared contracts. Both web apps deliberately use plain browser styling.
- Three tests in `tests/smoke/` check connectivity; 21 in `tests/demo/` check authentication, email-domain rejection, and home/tasks. Playwright owns fresh servers, uses one Chromium worker with no retries, and writes reports to unique ignored `artifacts/playwright/` directories. Reports include actual source SHA/dirty status. This is developer baseline tooling, not the future AI-plan executor or QA reporter.

Exact setup commands and local URLs are in [README.md](../README.md). No OpenAI key or environment file is needed. Demo auth/task state lives only in process memory.

## Components and responsibilities

The following table describes the target responsibilities; the current implementation is limited to the foundation above.

| Component | Planned location | Responsibility |
| --- | --- | --- |
| Demo web app | `apps/demo-web/` | React + Vite login, mock OTP flow, and home page. |
| QA dashboard | `apps/qa-dashboard/` | React + Vite requirements input, plan review/approval, execution controls, and evidence display. |
| Backend | `apps/api/` | One Hono process with separate demo-auth and QA route groups; planner calls, approvals, run coordination, storage, and reporting. |
| Shared contracts | `packages/contracts/` | TypeScript types and Zod schemas for requirements, plans, approvals, and run records. |
| Trusted executor | `tests/executor/` | Playwright Test configuration and maintained adapters that interpret approved actions and execute assertions. |
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

## Plan and execution contract

A plan contains a schema version, immutable revision identifier, source requirements, generation provenance, and cases. Each case contains an ID, requirement reference, preconditions, ordered actions, and explicit assertions. Initial candidate actions are navigation to known demo routes, filling known controls, clicking known controls, and reading a challenge's mock OTP; initial assertions check URL, visibility, text, and supported API outcomes. Milestone 4 will define the exact discriminated Zod union and limits.

AI output is data. The executor maps allowed action types to repository-maintained code and Playwright `expect` assertions. It never evaluates generated JavaScript, shell commands, arbitrary network requests, or dynamic assertion code. Targets, locators, and API operations are limited to supported demo capabilities. Schema-valid output can still have incorrect expectations, so human review remains necessary.

Validate at generation/import and again before execution. Approval is a separate developer action bound to an exact plan revision or content hash; AI-supplied approval fields are not trusted. Edits create a new revision and invalidate approval. Replay requires a matching approval and compatible schema; a changed schema requires validation and renewed review as needed.

The QA API starts a fixed, repository-owned Playwright runner with validated data. It accepts one active run and rejects a second request as busy. Use one worker initially and a fresh browser context plus reset synthetic state for each case. Mock reset/retrieval helpers are local test facilities, not successful-authentication substitutes.

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

- `data/plans/<plan-id>/<revision>.json`: requirements, cases, schema version, origin (`live-ai` or `manual-fixture`), and available model/generation metadata.
- `data/approvals/<approval-id>.json`: approved plan revision/hash, developer approval event, and timestamp.
- `data/runs/<run-id>.json`: plan/approval references, selected mode (`live` or `replay`), start/end time, tested Git SHA, dirty-worktree indicator, configuration without secrets, command/exit code, counts, outcomes, and artifact references.
- `artifacts/<run-id>/`: actual Playwright output, logs, screenshots, and selected traces. Preserve assertion details even if a screenshot or trace cannot be captured.

Use generated identifiers, fixed storage roots, and atomic JSON writes. A run's pending record may become final; once finalized it is not overwritten by a rerun. Each rerun gets a new ID and can refer to its predecessor. Capture provenance at run start; the interview defect/fix runs must test clean committed versions. Never copy API keys or session secrets into reports or committed evidence.

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
