# Architecture

Status: Milestone 2 implements the workspace foundation. Authentication, planning, approval, replay, and QA reporting below remain the target design.

## Implemented foundation

- Two React + Vite app shells run at `http://127.0.0.1:5173` and `http://127.0.0.1:5174`. Each can check API health through a same-origin `/api` development proxy.
- One Hono process listens at `http://127.0.0.1:3000`, with only `GET /api/health` implemented. It returns `{"status":"ok","service":"veriqa-api"}`.
- `packages/contracts/` exports a Zod health schema and its inferred TypeScript type. It compiles to ESM JavaScript and declarations before consumers run; no source-path aliases or runtime TypeScript imports are needed by the compiled API.
- Root npm scripts install/build/run the four workspaces. The dev command also watches shared contracts. Both web apps deliberately use plain browser styling.
- Three tests in `tests/smoke/` check the real API and both rendered apps, including their health buttons. Playwright owns fresh servers, uses one Chromium worker with no retries, and writes each invocation's reports to a unique ignored `artifacts/smoke/` directory. This is developer smoke tooling, not the future AI-plan executor or QA reporter.

Exact setup commands and local URLs are in [README.md](../README.md). No OpenAI key, environment file, auth state, or application persistence is needed yet.

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
| Workspace smoke checks | `tests/smoke/` | Implemented connectivity and rendered-shell checks, before authentication exists. |
| Persistence | `data/`, `artifacts/` | Local JSON records and actual execution evidence. |
| Replay fixture | `fixtures/approved-plans/` | Sanitized approved plan and provenance for the final offline demonstration. |

Keep planner, storage, and reporter modules inside the backend initially. Separate processes or packages are unnecessary unless the implementation demonstrates a concrete need. npm workspaces manage the application and contracts packages; root scripts coordinate development and verification.

## Data flow

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

The Hono demo route group owns credential checks, pending OTP challenges, expiry/consumption, sessions, protected data, and logout. The React app renders the flow; hiding a page in the browser is not authorization.

A labelled local mock-delivery store exposes the OTP for a specific challenge to the demo/test workflow. There is no external delivery provider. Tests still submit the OTP through the real verification endpoint and receive a real local session. Synthetic challenge/session records may live in process memory and reset on restart; durable plans, approvals, and evidence use JSON/files. This is a local demonstration, not a production authentication service.

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
