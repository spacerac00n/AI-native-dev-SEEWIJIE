# VeriQA

VeriQA is an AI-native automated QA testing MVP for a small web application. A developer supplies requirements, AI proposes a structured test plan, a developer reviews it, and Playwright executes real actions and deterministic assertions. Reports link outcomes to execution evidence.

**AI proposes. Code executes. Assertions verify. Humans decide when necessary.**

## Current status

Milestones 1–7 provide the workspace, a working demo, live AI planning, revision-bound human approval, and deterministic Playwright replay with evidence collection, and a unified QA dashboard. The demo includes email login, local mock OTP delivery, server-recognised sessions, a protected home page, a checklist saved in backend memory (using `Map`), and logout. Verification includes 63 unit/API/contract tests, 24 Playwright baseline tests, 7 executor checks and 2 dashboard browser checks. The approved live-AI plan has executed with all three cases passing. The dashboard connects generation, review, explicit approval, execution, history and evidence comparison. See [the milestone plan](docs/PLAN.md).

The intended demonstration is:

Requirement → AI-generated test plan → Review → Real execution → Failed assertion → Evidence → Code fix → Successful retest.

## Stack and scope

- TypeScript and npm workspaces.
- React + Vite for the demo application and QA dashboard.
- Hono for demo authentication and QA APIs.
- OpenAI API for live test-plan generation; Zod for runtime validation.
- Playwright Test for real browser/API execution and deterministic assertions.
- Local JSON files and filesystem artifacts for persistence.

The demo uses simple native forms, buttons, and checkboxes. The QA dashboard provides a complete review and execution workspace. Both apps can call the real Hono health API through Vite's development proxy and validate its response with Zod. The tests do not mock HTTP responses.

Only OTP delivery is mocked; email validation, OTP verification, session enforcement, task updates, and logout execute on the backend. Live AI planning requires a server-side OpenAI key; approved-plan replay performs new Playwright execution without an AI call or key. No intentional application defects have been introduced.

## Setup

Verified on macOS arm64 with **Node.js 22.23.2** and **npm 10.9.8**. The Node version is specified in `.nvmrc`; `package.json` records the supported Node/npm ranges. Use these versions for reproduction.

From the repository root:

```sh
npm ci --cache .cache/npm
npx playwright install chromium
npm run dev
```

The cache flag keeps npm's cache inside the ignored `.cache/` directory; dependencies still come from the committed lockfile. The demo, offline plan inspection/import, and tests require no API key. Live generation alone loads `OPENAI_API_KEY` and optional `OPENAI_MODEL` from the ignored root `.env`; `.env.example` shows safe configuration.

| Service | Local URL |
| --- | --- |
| Demo app | <http://127.0.0.1:5173> |
| QA dashboard | <http://127.0.0.1:5174> |
| API health | <http://127.0.0.1:3000/api/health> |

The health response is `{"status":"ok","service":"veriqa-api"}`. Both app buttons should show `API is healthy (veriqa-api).` after clicking. This confirms API connectivity, not a QA test verdict.

The dev command builds shared contracts, watches them for edits, and starts all three services. All services bind to loopback; ports are fixed and Vite will not silently switch ports. Stop with Ctrl+C before verification: root commands rebuild contracts, and browser tests start their own servers on these ports.

## Verified commands

| Command | Behaviour |
| --- | --- |
| `npm run dev` | Starts demo, dashboard, Hono, and contracts watcher; synthetic reset controls stay disabled. |
| `npm run dev:qa` | Starts the same workspace with synthetic reset controls enabled, allowing dashboard execution. |
| `npm run typecheck` | Checks all four workspaces, Vite/Playwright configs, and unit/browser tests. |
| `npm run build` | Builds contracts, compiled Node API, and both web apps into their respective `dist/` directories. |
| `npm test -- --list` | Lists all 24 tests without executing them. |
| `npm test` | Starts fresh services, runs all 24 real Chromium/API tests, then stops the services. |
| `npm test -- tests/demo` | Runs the 21 demo authentication/home tests. |
| `npm test -- tests/smoke` | Runs the 3 workspace connectivity tests. |
| `npm run test:unit` | Runs the 63 contract/storage/CLI/planner/result/API tests using Node's test runner; no browser/server required. |
| `npm run test:dashboard` | Runs two real browser workflow checks against isolated manual fixtures, with explicitly synthetic approvals and preserved real evidence. |
| `npm run test:executor` | Checks approval/validation/locking, all adapters, real assertion failure evidence, and unavailable-target handling using explicitly synthetic runner-check approvals. |
| `npm run execute -- <plan-id> <revision>` | Replays an exact saved human-approved revision through real Chromium/API actions; starts/stops fresh API/demo servers. |
| `npm run plan -- import fixtures/manual-demo-plan.json` | Validates and stores a new **unapproved**, manually authored revision. |
| `npm run plan -- inspect manual-demo-baseline` | Prints the current plan, revision UUID, SHA-256 digest, and approval status. |
| `npm run start --workspace @veriqa/api` | Starts only the compiled API after `npm run build`; stop other API processes first. |

The root commands build contracts before consumers, so they work after a clean install. `npm run build` creates artifacts; it does not start or deploy the built web apps. The documented UI/API workflow uses `npm run dev` and its Vite proxies.

Milestone 3 verification on November 2, 2026: type checks and builds exited 0; Playwright discovered and executed 24 tests, all passed in 6.6 seconds, with 0 failed, 0 skipped, and no retries. A separate compiled-API check verified normal-clock login, task persistence, logout, and absent test-control routes. Earlier failures and their evidence remain in [the command and evidence record](docs/AI_WORKFLOW.md).

Milestone 4 verification on November 2, 2026: 37/37 unit tests and 24/24 existing browser/API tests passed; type checks and builds exited 0. The CLI accepted the manual fixture, rejected an unsupported action, and blocked its unapproved revision. These checks do not execute the structured fixture.

## Use the unified dashboard

```sh
npm run dev:qa
```

Open <http://127.0.0.1:5174>. The dashboard loads saved plans and existing history. On this machine it selects the current human-approved `vp1` revision by default. Inspect its actions, expected results and provenance, then choose **Execute approved plan**. A new run appears with real assertions, Git state, logs and optional screenshots for successful cases. No key or model call is needed for saved-plan replay.

To propose new tests, enter natural-language requirements and choose **Generate test plan**. The existing server-side planner loads the root `.env` only for that action. Each proposal receives a fresh plan ID and remains unapproved. Inspect all cases and review notes, enter your reviewer name, check the explicit review confirmation, then choose **Approve exact revision**. Approval binds both revision and content hash. New generation never changes the existing approved walkthrough plan.

Use **Run history** to inspect individual cases, raw output, failure screenshots and trace downloads. **Compare runs** shows two selected records, matching case IDs and assertion differences; it warns when revisions or hashes differ. Old runs without screenshots show that absence. Rejected, corrupt, incomplete, and active attempts cannot appear passed. Run `npm run dev:qa` only with synthetic demo data: each case resets backend state. Stop it before running the standalone Playwright suites or managed CLI executor.

See [dashboard operation and API boundaries](docs/DASHBOARD.md) and the [baseline walkthrough](docs/DEMO.md). The newly generated Milestone 7 proposal is intentionally unapproved and needs an actual human review; existing `vp1` approval remains valid.

## Generate a live AI test plan

Set `OPENAI_API_KEY` in the root `.env` (already configured on this development machine). Never use a `VITE_` key. The CLI runs server-side, uses the fixed OpenAI Responses endpoint and defaults to `gpt-4.1-mini`; `OPENAI_MODEL` can override it. Requests have a 90-second timeout, 6000-token output cap and no automatic retry.

```sh
npm run plan -- generate fixtures/demo-requirements.txt
```

**See:** a Zod-validated JSON plan with `source: live-ai`, actual model/request/response IDs, token usage, original requirements, review notes, revision/digest, and `status: unapproved`. No browser tests are executed by this command. Invalid output, refusal, incomplete responses or API errors produce an error and retain safe interaction evidence under `artifacts/planner/<id>/interaction.json`.

The latest recorded live proposal is `vp1` (three cases). Review it with:

```sh
npm run plan -- inspect vp1
```

Human review focuses on actions and expected results; model review notes can themselves be inaccurate. These three proposed cases are a subset of the 24-test baseline, not proof of full coverage. Only after review, use the existing `approve` command with the exact revision and your reviewer name. Generation never approves a plan.

A real, unapproved API-generated definition is committed for offline inspection/import without another paid request:

```sh
npm run plan -- import fixtures/live-ai-demo-plan.json
```

This creates a new unapproved revision while preserving its original `live-ai` provenance. Offline import is not a new generation or an execution. Original live interaction records and revisions remain on the development machine. Importing again supersedes the current revision, so use the existing approved revision for replay on this machine.

## Replay an approved saved plan

Stop existing dev servers. On this development machine, the developer already approved this exact live-AI revision:

```sh
env -u OPENAI_API_KEY npm run execute -- vp1 d61ba281-a45b-47da-9ae2-5bf3f5747695
```

No `.env` is loaded, no planner is imported, and no model call is made. Playwright starts fresh local API/demo servers in test mode, resets synthetic backend state before each case, and uses a new browser context per case. No dashboard server is needed. An unapproved, superseded, tampered, or unsupported plan is rejected before a server/browser starts. A concurrent executor is rejected. Retries are disabled.

Each invocation prints its unique `artifacts/executor/<run-id>/` path. Completed executions also save `data/runs/<run-id>.json`. Exit 0 means every case passed; exit 1 indicates rejection, an assertion failure, or an execution error. Inspect the structured outcome to distinguish them. The optional `--external-target` flag uses the same fixed loopback addresses without starting servers; it requires an already running API with `VERIQA_TEST_MODE=1` and resets its synthetic state.

A fresh clone has the live definition but no local saved revisions or approvals. Import it, inspect the returned revision, have a human approve its expectations with the documented `approve` command, then execute that new revision. Never copy an old approval onto a new revision. See [execution records and human checks](docs/EXECUTION.md) for the dashboard contract and evidence layout.

## Create, inspect, and approve a manual plan

The committed [manual fixture](fixtures/manual-demo-plan.json) defines three cases covering login/task persistence, invalid email domain, and protected home access. Its source is `manual-fixture`, **not AI-generated**. Create and review a local revision:

```sh
npm run plan -- import fixtures/manual-demo-plan.json
npm run plan -- inspect manual-demo-baseline
```

Read the full actions and assertions. Copy the exact `revision` UUID from the output. Only after a human review, replace `REVISION_FROM_INSPECT` and `Your name` below:

```sh
npm run plan -- approve manual-demo-baseline REVISION_FROM_INSPECT --by "Your name" --confirm
npm run plan -- check manual-demo-baseline REVISION_FROM_INSPECT
```

`approve` is an explicit local operator decision. `check` only verifies the approval gate and prints the definition; it performs **no Playwright execution**. An unapproved, superseded, or mismatched revision exits 1. The development fixture is currently unapproved; synthetic approvals in isolated unit tests are not human approvals.

To edit, change the source JSON and run `import` again. Every import creates a new revision requiring new approval, including when reverting to identical older content. Old definitions and approvals remain inspectable with `npm run plan -- inspect manual-demo-baseline REVISION_FROM_OLDER_IMPORT`; older revisions cannot pass the current-revision gate. Keep one writer/operator at a time.

Storage defaults to `data/plans/<plan-id>/<revision>.json`, a `current.json` pointer, and `data/approvals/<plan-id>/<revision>.json`. Plans and approvals are immutable through the tool; reads revalidate schemas and digests. `VERIQA_DATA_DIR` can select an isolated local storage root (used by unit tests); relative overrides resolve from the repository root. Local file ownership is trusted; the reviewer name is an audit label, not an identity service.

The supported vocabulary uses known demo paths, inputs, buttons/checkboxes, mock OTP reads, and typed UI assertions or fixed read-only health/home API checks. No supplied origins, raw selectors, arbitrary methods, scripts, or generated code are accepted. Schema validity does not prove that an expected result is correct; human review is still needed. Live AI origin requires server-supplied provenance.

## Try the demo

1. Run `npm run dev` and open <http://127.0.0.1:5173>.
2. Enter `synthetic.student@e.ntu.edu.sg` and select **Request OTP**. Use synthetic accounts only.
3. Copy the six-digit code from **Local mock OTP delivery** into the OTP field and select **Verify OTP**. No email is sent.
4. Check an item, wait for the controls to become enabled again (save complete), and refresh. The server returns the saved state.
5. Select **Logout**, then visit <http://127.0.0.1:5173/home>. The UI returns to login and the backend rejects protected requests.

Email addresses must be syntactically valid and end **exactly** with lowercase `@e.ntu.edu.sg`. Other domains, extra domain suffixes, subdomains, whitespace, and uppercase domain variants are rejected. There is no password or real mailbox ownership check in this local mock demo.

OTPs are random six-digit codes, tied to a challenge, valid for five minutes, and consumed once. An incorrect code does not consume the challenge. Sessions last one hour, are stored on the server, and use an opaque HTTP-only, SameSite=Strict cookie on loopback HTTP. Logout deletes the server session as well as the cookie. Home data and task writes both require a valid session.

Tasks are stored per exact email in backend memory, surviving refresh and re-login until the API restarts. Restarting the API clears OTPs, sessions, and tasks. The local mock inbox is intentionally accessible for a known challenge; this is a demonstration, not deployed authentication.

## Deterministic test setup

`npm test` automatically starts the API with `VERIQA_TEST_MODE=1`. Tests reset state before each demo case and advance a fixed server clock to check expiry without sleeping. The helpers cannot issue sessions or skip OTP validation. They are absent (HTTP 404) during normal `npm run dev` or compiled API startup; no manual test-mode configuration is needed.

Use Ctrl+C to stop an existing dev launcher before testing. Playwright rejects occupied ports instead of reusing an unknown server. Run tests serially; reset helpers deliberately clear all synthetic state in the test process.

## Test evidence

Each test invocation prints a unique directory under `artifacts/playwright/<timestamp>-<id>/` containing `results.json` and an HTML report. Results include the tested Git SHA and whether the worktree was dirty. Failed browser tests retain screenshots and traces when available; successful runs do not retain them. There are no automatic retries, and a new run does not overwrite an earlier directory. Milestone 2's older `artifacts/smoke/` reports are also preserved.

The `--list` command also creates a separate discovery-only report: its tests have no execution results and must not be presented as passed executions. The recorded passing Milestone 3 worktree report is `artifacts/playwright/2026-11-02T05-23-44.301Z-eea9537c-25b2-4fbd-955e-1bd086f32de4/results.json`. The earlier failed checkbox report, screenshot, and trace remain separate. Generated evidence is ignored by Git, so fresh clones create their own reports.

To inspect a run, replace `<run-id>` with the directory printed by the test command:

```sh
npx playwright show-report artifacts/playwright/<run-id>/html
```

For a retained failure trace, use `npx playwright show-trace <path-to-trace.zip>` with the path printed in the failure output. These viewer commands open existing evidence; they do not execute tests.

Unit-test evidence is retained under `artifacts/unit/<run-id>/` (stdout, stderr, command/exit-code metadata); CLI validation evidence is under `artifacts/cli/<run-id>/`. See [AI_WORKFLOW.md](docs/AI_WORKFLOW.md) for the actual paths and counts.

Approved-plan executions use a separate `artifacts/executor/<run-id>/` directory with `run.json`, `input.json`, `command.json`, raw stdout/stderr, native Playwright JSON, per-case result and browser/API logs, and real failure screenshots/traces when available. `data/runs/<run-id>.json` contains the same finalized record. All listed evidence paths are relative to that run's artifact directory. Rejections retain `attempt.json` and `rejection.json`; they are not executed tests. Preserve whole directories and their saved plans/approvals, including earlier failures. See [the record specification](docs/EXECUTION.md). Never commit keys, real credentials, confidential material, or unreviewed generated artifacts.

## Project documentation

- [Agent instructions](AGENTS.md): engineering rules and workflow.
- [Product](docs/PRODUCT.md): developer needs, inputs, outputs, and MVP boundary.
- [Architecture](docs/ARCHITECTURE.md): planned components, data flow, and execution lifecycle.
- [Plan](docs/PLAN.md): ten milestones and acceptance criteria.
- [Decisions](docs/DECISIONS.md): initial trade-offs and constraints.
- [AI workflow](docs/AI_WORKFLOW.md): assistance, human direction, and actual verification records.

The interview walkthrough, exact reproduction commands, and evidence references will be added to `docs/DEMO.md` after real execution exists. A passing retest must preserve the original failure and its tested commit SHA.
