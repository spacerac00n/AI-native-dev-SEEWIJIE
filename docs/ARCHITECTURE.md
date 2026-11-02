# Architecture

Status: Milestones 2–4 implement the workspace, demo flows, and structured manual plans with JSON storage and an approval CLI. AI generation, structured-plan execution, replay, and QA reporting remain the target design.

## Implemented foundation

- The React + Vite demo runs at `http://127.0.0.1:5173` with email login, mock OTP delivery, home/checklist, and logout. The dashboard at `http://127.0.0.1:5174` remains a shell. Both use a same-origin `/api` development proxy.
- One Hono process listens at `http://127.0.0.1:3000`. `GET /api/health` returns `{"status":"ok","service":"veriqa-api"}`; `apps/api/src/demo.ts` owns `/api/demo` authentication and task routes.
- `packages/contracts/` exports Zod request/response schemas and inferred types for health, OTP challenges, errors, and home/tasks. It compiles to ESM JavaScript and declarations before consumers run; no source-path aliases or runtime TypeScript imports are needed by the compiled API.
- `packages/contracts/src/plans.ts` adds versioned plan/case/action/assertion, saved revision, approval, and future run-result metadata schemas. `apps/api/src/plans.ts` stores/revalidates JSON; `plan-cli.ts` provides the human review commands without a new API or dashboard.
- Root npm scripts install/build/run the four workspaces. The dev command also watches shared contracts. Both web apps deliberately use plain browser styling.
- Three tests in `tests/smoke/` check connectivity; 21 in `tests/demo/` check authentication, email-domain rejection, and home/tasks. Playwright owns fresh servers, uses one Chromium worker with no retries, and writes reports to unique ignored `artifacts/playwright/` directories. Reports include actual source SHA/dirty status. This is developer baseline tooling, not the future AI-plan executor or QA reporter.
- Thirty-seven Node unit/contract tests in `tests/unit/` check contracts, storage, CLI rejection, and revision-bound approval. Playwright ignores that directory and continues to run only its 24 real browser/API baseline checks.

Exact setup commands and local URLs are in [README.md](../README.md). No OpenAI key or environment file is needed. Demo auth/task state lives only in process memory.

## Components and responsibilities

The following table describes the target responsibilities; the current implementation is limited to the foundation above.

| Component | Planned location | Responsibility |
| --- | --- | --- |
| Demo web app | `apps/demo-web/` | React + Vite login, mock OTP flow, and home page. |
| QA dashboard | `apps/qa-dashboard/` | React + Vite requirements input, plan review/approval, execution controls, and evidence display. |
| Backend | `apps/api/` | One Hono process with separate demo-auth and QA route groups; planner calls, approvals, run coordination, storage, and reporting. |
| Shared contracts | `packages/contracts/` | TypeScript types and Zod schemas for requirements, plans, approvals, and run records. |
| Plan store/CLI | `apps/api/src/plans.ts`, `plan-cli.ts` | Implemented local JSON revisions, inspection, explicit approval, and a future execution gate. |
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

## Implemented plan contract; planned execution

A version-1 definition contains its ID/title, `source: manual-fixture`, fixed `demo-web` target, requirements, and cases. Each case has requirement references, `fresh-demo-state` precondition, ordered actions, and final assertions. Each import wraps it in an immutable revision UUID, canonical SHA-256 content digest, and creation timestamp. The committed fixture is in `fixtures/manual-demo-plan.json`; it is not approved or AI-generated.

| Vocabulary | Supported values |
| --- | --- |
| Navigation | `/`, `/login`, `/home`; no supplied origin or arbitrary URL. |
| Fill | Named `email` or `otp` input; bounded literal text, or an OTP reference after `read_mock_otp`. Negative input values are intentionally permitted for rejection tests. |
| Click | Known request/verify/logout/different-email/health buttons and the two checklist controls. |
| Mock delivery | Read the displayed mock OTP into one case-local value. |
| UI expectations | URL, visibility, nonblank exact text, and boolean checkbox state for known targets. |
| API expectations | Fixed GET health (200 plus exact body) and GET home (200 plus email, or 401 plus exact error). No generic request operation. |

Strict objects reject unknown keys/operations. Limits are 20 requirements/cases, 50 actions and 20 assertions per case, plus bounded text. IDs must be unique, requirement references must resolve, and a mock OTP must be read before use. Schemas validate capabilities and value types, not whether requirements or action order are logically correct. Review remains mandatory. Future click adapters must wait for each pending form/task write before the next action; no dynamic adapter is implemented here.

AI output is data. The executor maps allowed action types to repository-maintained code and Playwright `expect` assertions. It never evaluates generated JavaScript, shell commands, arbitrary network requests, or dynamic assertion code. Targets, locators, and API operations are limited to supported demo capabilities. Schema-valid output can still have incorrect expectations, so human review remains necessary.

Validate at import and on every stored read. Approval is a separate developer action bound to both revision UUID and content hash; approval fields inside a definition are rejected. Every import creates a new unapproved revision, even when reverting older content. `PlanStore.requireApproved(id, revision)` verifies current revision, schema, digest, and approval binding and fails closed otherwise. `npm run plan -- check` exercises this gate only, without executing actions. A future executor must call it and execute the returned immutable snapshot; compatible schema/approval checks also apply to replay.

In Milestone 6, the QA API will start a fixed, repository-owned Playwright runner with validated data and one active run. Each case will use fresh browser context and reset synthetic state. Mock reset/retrieval helpers are local test facilities, not authentication substitutes. No execution route or interpreter exists in Milestone 4.

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

- `data/plans/<plan-id>/<revision>.json`: implemented immutable saved definition with revision UUID, canonical digest, and creation timestamp. Version 1 supports only `manual-fixture`; live AI provenance comes later.
- `data/plans/<plan-id>/current.json`: implemented pointer to the latest revision UUID.
- `data/approvals/<plan-id>/<revision>.json`: implemented immutable approval ID, exact revision/hash, reviewer label, decision, and timestamp. Historical approvals remain inspectable but cannot approve a newer/current definition.
- `data/runs/<run-id>.json`: planned persistence only. The current run-result metadata schema supports manual-fixture replay, exact plan/approval references, real-Playwright label, commit/dirty status, times, command/exit code, consistent counts/outcome, and relative artifact paths. Zero-execution/unapproved passes and inconsistent results are rejected. These schemas do not produce execution evidence.
- `artifacts/<run-id>/`: actual Playwright output, logs, screenshots, and selected traces. Preserve assertion details even if a screenshot or trace cannot be captured.

The default store root is repository `data/`, optionally overridden by `VERIQA_DATA_DIR` for isolated tests. Validate path IDs before filesystem access. Write JSON to a temporary sibling, publish immutable records using an exclusive hard link, and atomically rename only the current pointer. This assumes a local filesystem and one writer; it is not a multi-file database transaction. Local file ownership is trusted, and reviewer names are audit labels rather than authenticated identities.

Future run records will finalize without overwrite, and each rerun will get a new ID. Capture provenance at run start; interview defect/fix runs must test clean committed versions. Never copy keys or session secrets into reports or committed evidence.

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
