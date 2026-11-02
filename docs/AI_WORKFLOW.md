# AI-assisted development record

Record meaningful AI assistance, developer corrections, trade-offs, and actual verification. Do not treat an agent's confidence or a generated report as evidence of execution.

## Milestone 1 — Context engineering (November 1, 2026)

Developer direction: read and preserve the agreed `AGENTS.md`, define the product and planned architecture, do not implement applications, make one documentation commit, and push to the specified GitHub repository. Additional constraints include mock OTP delivery, JSON/files, live generation plus approved-plan replay, and no confidential assessment PDF or copied assessment prompts.

AI assistance: inspected the initial folder and drafted the README, product definition, architecture, ten-milestone acceptance plan, and initial decisions. Kept the existing root `AGENTS.md` unchanged because it already contains the agreed instructions. Added this record to satisfy its workflow requirement.

Trade-offs: one Hono process and one active run keep the implementation small; an allowlisted action schema keeps AI output separate from assertion code; approval binds an exact plan revision; replay reuses definitions while executing the real application again. These choices are recorded in [DECISIONS.md](DECISIONS.md).

Initial inspection found only `AGENTS.md` and no Git repository. The first remote check failed with DNS resolution in the restricted sandbox (exit 128). A network-enabled `git ls-remote` completed with exit 0 and no advertised refs, indicating an empty remote at inspection time. No history was rewritten.

Documentation verification:

- An inline `python3` audit exited 0: seven Markdown files, eight valid local Markdown links, ten ordered milestones, and ten acceptance-criteria sections. It also checked final newlines, trailing whitespace, limited secret patterns, and the absence of application source/configuration files. This limited check is not a comprehensive secret audit.
- Manual consistency review confirmed the required stack, real authentication with mock delivery, approval tied to an exact revision, AI data interpreted by trusted assertion code, JSON/files, and separate failed/retest evidence. All setup commands and component paths are described as planned; implementation starts in Milestone 2.
- The initial `git init -b main` attempt exited 1 because the sandbox did not permit creating `.git`. The network/filesystem-enabled `git init -b main && git remote add origin https://github.com/spacerac00n/AI-native-dev-SEEWIJIE.git` exited 0.
- `git diff --cached --check` exited 0. `git diff --cached --stat`, `git status --short --branch`, and `git remote -v` also exited 0 and confirmed only the seven intended Markdown files were staged on `main`, with the requested origin URL.

Application tests discovered: 0; executed: 0. No application, test runner, or type-check configuration exists in this milestone, so there is no claim of runtime correctness. There are no runtime result artifacts; the deliverables are the documentation and Git commit. Commit/push verification will be reported after publication rather than predicted inside this record.

No further human correction has been recorded at this stage. Future entries must distinguish a developer correction from an AI-proposed change and include actual commands, exit codes, counts, and artifact references for implementation work.

## Milestone 2 — Workspace and smoke tests (November 1, 2026)

Developer direction: implement only npm workspace tooling, two simple React + Vite shells, a Hono API, shared contracts, and minimal Playwright smoke checks. Include environment/Node/ignore configuration; verify and document the commands; commit and push. Authentication, OpenAI integration, and seeded bugs were explicitly excluded and remain unimplemented.

AI assistance: read the required agent, architecture, and milestone documents, then implemented the four TypeScript workspaces. Each UI has only a heading, description, health button, and status. The shared health schema is validated by both apps; their requests reach the real API through Vite proxies. Read the official [Vite setup](https://vite.dev/guide/), [Hono Node adapter](https://hono.dev/docs/getting-started/nodejs), and [Playwright web-server configuration](https://playwright.dev/docs/test-webserver) documentation and queried npm for compatible versions before installing.

Trade-offs: build shared contracts before consumers instead of adding source aliases; use Vite proxies instead of CORS setup; run only Chromium with one worker and no retries; retain a unique report directory per invocation. See decisions D09–D10. Node 22.23.2 and npm 10.9.8 match the development environment; direct dependency versions and the lockfile are pinned. Helpful comments explain runtime validation, proxying, shutdown, and evidence preservation.

No additional human correction was needed during implementation. Smoke tests are deterministic developer-authored checks, not AI-generated QA plans. The checked source was the Milestone 2 working tree based on commit `9e1ffa0d1d3829f778c1b34619ffc2983b14aecb`, with the new implementation still uncommitted during execution; the implementation commit follows verification. No defective product version was seeded.

### Actual commands and results

| Command | Exit code | Observed result |
| --- | --- | --- |
| `node --version` / `npm --version` | 0 / 0 | Node `v22.23.2`; npm `10.9.8`. |
| `npm install --cache .cache/npm` | 0 | Created the workspace lockfile; installed dependencies; npm reported 0 vulnerabilities. |
| `npm install --package-lock-only --offline --cache .cache/npm` | 0 | Updated the lockfile after pinning the resolved Node 22 type definitions to `22.20.5`. |
| `npm ci --cache .cache/npm` | 0 | Reinstalled from the lockfile: 60 packages added, 65 audited, 0 vulnerabilities reported. |
| `npx playwright install chromium` | 0 | Installed Chromium/headless shell revision `1248` (Chrome for Testing `156.0.8078.4`) and FFmpeg. |
| `npm run typecheck` | 0 | All four workspaces, Vite configs, Playwright config, and smoke tests checked successfully. |
| `npm run build` | 0 | Built shared ESM/declarations, compiled Node API, and both Vite apps. |
| `npm run dev` | 0 after intentional Ctrl+C | Started all three services plus the contracts watcher; checked responses before stopping it for tests. |
| `npm test -- --list` | 0 | Discovered 3 tests in 1 file; executed 0. Its separate discovery report has no test execution results. |
| `npm test` | 0 | Executed all 3 discovered tests using 1 Chromium worker: 3 passed, 0 failed, 0 skipped; 4.0 seconds total. |

The dev-command HTTP check used an inline Node `fetch` script and exited 0. Both shell pages returned HTTP 200 with their expected HTML titles. The direct health endpoint and both Vite `/api/health` proxies returned HTTP 200 with `{"status":"ok","service":"veriqa-api"}`. After the test run, a separate inline Node check exited 0 and confirmed ports 3000, 5173, and 5174 were released (`ECONNREFUSED`), rather than leaving stale services running.

### Actual Playwright execution

| Test | Result | Duration |
| --- | --- | --- |
| Hono health endpoint returns the expected JSON | passed | 20 ms |
| VeriQA Demo renders and checks the real API | passed | 485 ms |
| VeriQA Dashboard renders and checks the real API | passed | 481 ms |

Both browser tests render React, assert the title and heading, click the health button, and assert the resulting status. No API mocking was used. JSON results record 0 unexpected tests, 0 skipped, 0 reported flaky tests, no runner errors, and retry index 0 for each test. One passing execution does not establish long-term stability.

Local retained artifacts (ignored by Git):

- Discovery only: `artifacts/smoke/2026-11-01T12-28-49.885Z-4374d935-d83d-448b-90a4-2252025ccb9c/results.json`. Playwright's discovery report marks 3 cases skipped and has empty execution-result arrays; these are not passed executions.
- Real execution: `artifacts/smoke/2026-11-01T12-28-50.543Z-f71a4c74-030f-4bc5-b675-9112bc7ececa/results.json` and its sibling `html/index.html` report. All three execution-result arrays contain an actual `passed` result.
- No screenshots/traces were retained because all tests passed; the configuration retains them for failed browser tests when available. No failure evidence was removed or overwritten.

Local development required network-enabled dependency/browser installation and permission to bind loopback ports in the agent sandbox. Commands and tests succeeded. Node emitted a harmless `NO_COLOR`/`FORCE_COLOR` environment warning during Playwright execution. There were no product assertion failures, invalid test definitions, or environment/runner failures in the smoke execution.

Final static review: `git diff --check` exited 0. An inline Python audit exited 0, checking all seven Markdown files and eleven local links, retaining ten milestones, and confirming all five package manifests match the lockfile with exact direct dependency versions. Reviewed the file inventory to exclude dependency caches, build outputs, local reports, secrets, and confidential material from the commit.

Human actions for reproduction: use the specified Node/npm versions, install dependencies and Chromium using the README commands, then run `npm run dev` to view the shells or `npm test` with those ports free. No `.env`, API key, authentication setup, or external service is required. Verification servers were stopped after the checks. Commit/push confirmation is reported after publication.

## Milestone 3 — Working demo authentication and home (November 2, 2026)

Human clarification: the developer specified passwordless login using valid emails ending exactly with `@e.ntu.edu.sg`, replacing the original generic credential wording. They also required a welcome message and small backend-backed checklist, in-memory demo state, and current root README commands. Product, architecture, plan, and decisions were updated to reflect this direction. No real accounts, email service, AI planner, dashboard workflow, or intentional defects were added.

AI assistance: read the required context documents; implemented Hono routes, shared Zod contracts, React login/OTP/home forms, and 21 demo tests alongside the existing 3 smoke tests. Consulted the official [Hono cookie helper](https://hono.dev/docs/helpers/cookie), [Hono routing](https://hono.dev/docs/api/routing), [Zod schemas](https://zod.dev/api), and [Playwright API request context](https://playwright.dev/docs/api/class-apirequestcontext) documentation. No dependencies changed.

Implemented rules: exact lowercase domain suffix without trimming; random six-digit OTPs bound to a challenge, expiring after five minutes and consumed once; one-hour opaque sessions stored by the server in an HTTP-only, SameSite=Strict cookie. Both home reads and task writes enforce session validity. Logout deletes the server entry, so replaying its old cookie fails. Tasks persist per email across refresh and re-login until backend restart. The labelled mock inbox reveals only a known challenge's code and sends no email.

Test isolation: Playwright alone sets `VERIQA_TEST_MODE=1`, resets all in-memory maps before each demo case, and advances a fixed server clock for exact expiry checks. These helpers do not create authenticated sessions; all login tests use the real OTP endpoint. Normal startup uses real time and does not register the helpers. Decisions D11–D12 explain the local-demo trade-offs.

### Development failures and corrections

1. Initial `npm run typecheck && npm run build` exited **1**: root Playwright types lacked DOM globals for `page.evaluate(() => document.cookie)` (`TS2584`, test line 58). Workspace checks passed, but the build was not reached. Added DOM types only to the root test configuration; subsequent type checks and builds exited 0. This was a test/tooling configuration failure, not a product assertion.
2. First `npm test` exited **1** before executing any tests: port 3000 was already occupied. The separate discovery command had listed 24 cases. Inspected listener command lines and working directories, confirmed the existing launcher belonged to this repository, and stopped that launcher with SIGTERM for isolated tests. Kept fresh-server enforcement enabled. This was an environment/startup failure, not an application test failure.
3. The next `npm test` executed **24** cases: **23 passed, 1 failed**, exit **1**, 6.7 seconds. `locator.check()` failed because the controlled checkbox briefly reverted while waiting for PATCH completion. Inspected its screenshot and error context; the later snapshot showed the saved state. Corrected the UI to reflect the click immediately, use the backend result, and roll back on error. Updated the persistence test to wait until the control is enabled again before checking server state or refreshing. Kept actual backend and refresh assertions. This was a development UI/action-timing failure, not a deliberately seeded defect.
4. After correction, type checks and builds passed, then the full baseline executed **24/24 passed**, exit **0**, 6.6 seconds. No automatic retries, skipped cases, runner errors, or reported flaky cases. The changed-source retest does not establish long-term stability or conceal the original failure.

No further human correction was needed. The agent corrected its own missing test types and asynchronous checkbox behaviour based on actual failures.

### Actual commands and results

| Command/check | Exit code | Observed result |
| --- | --- | --- |
| `node --version` / `npm --version` | 0 / 0 | `v22.23.2` / `10.9.8`. |
| Initial `npm run typecheck && npm run build` | 1 | Missing DOM test types; build not executed. |
| `npm run typecheck && npm run build` after test-type correction | 0 | All four workspaces, test/config types, and builds passed. |
| `npm test -- --list` | 0 | 24 discovered in 2 files, 0 executed. |
| First `npm test` | 1 | Occupied API port; 0 executed, 1 startup error. |
| Second `npm test` | 1 | 24 executed; 23 passed, 1 checkbox interaction failure. |
| `npm run typecheck && npm run build` after checkbox correction | 0 | Type checks and builds passed again. |
| Third `npm test` | 0 | 24 executed; 24 passed, 0 failed/skipped, 6.6 seconds. |
| `npm run start --workspace @veriqa/api` | Started successfully | Served the compiled API; after successful checks, deliberate Ctrl+C ended the terminal session with exit 1. |
| Inline `node --input-type=module` compiled-API check | 0 | Normal-mode reset/clock routes returned 404; real-clock OTP, HTTP-only cookie, home, task save/read, logout, and old-cookie rejection all passed. |
| `npm test -- tests/demo --list` / `npm test -- tests/smoke --list` | 0 / 0 | Verified focused test selection: 21 demo and 3 smoke cases listed; discovery only, 0 executed. |
| Final `npm run typecheck && npm run build` | 0 | All workspace/test/config types and builds passed, including disabled form inputs while requests are pending. |

The passing worktree run's JSON records source commit `2d5feff3aa08a471aad634239732171e8dfbc6ee`, `worktreeDirty: true`, and one actual worker. This is the parent revision plus the uncommitted Milestone 3 implementation, not a claim that the older commit contained these features. New reports capture actual SHA/dirty status automatically. Publication and a clean-commit baseline confirmation are reported after the feature commit exists.

### Retained execution evidence

All paths below are local and ignored by Git; none overwrites another run. Each directory contains `results.json` and `html/index.html`.

| Invocation | Directory under `artifacts/playwright/` | Actual execution |
| --- | --- | --- |
| Discovery | `2026-11-02T05-20-08.224Z-496bcc4a-b66d-4037-90f1-df497f7a4d7c` | 0 executed; 24 discovery-only cases, not passed tests. |
| Occupied-port failure | `2026-11-02T05-20-08.851Z-69dd781b-c52d-4e53-8921-562a95cc7663` | 0 executed; startup error retained in JSON. |
| Failed checkbox run | `2026-11-02T05-21-47.915Z-99c04f75-2b43-424e-858f-d49ec662f966` | 23 passed, 1 failed; screenshot, trace, and error context preserved. |
| Passing worktree baseline | `2026-11-02T05-23-44.301Z-eea9537c-25b2-4fbd-955e-1bd086f32de4` | 24 executed/passed, 0 failed/skipped, no retries. |

The failed screenshot and `trace.zip` are under that run's `test-results/demo-auth-task-changes-rea-d1cfa-d-survive-a-browser-refresh-chromium/`. They remain available after the successful retest. The DOM compiler error is recorded above; it did not produce Playwright artifacts. No fabricated screenshots, logs, or execution outcomes were added.

Baseline coverage: valid browser login and HTTP-only cookie; nine rejected email/domain variants plus a UI rejection; wrong OTP and valid retry; unknown challenge; expiry exactly at five minutes; consumed-code reuse; unauthenticated/forged home and task requests; checkbox save/refresh in both directions; logout and old-cookie replay; per-email task isolation and re-login persistence; one-hour session expiry; malformed payloads; and the three workspace smoke checks.

Root README now includes installation/start commands, all/focused test commands, type checking, builds, compiled API startup, report/trace viewers, policies, and a manual walkthrough. No manual verification blocks this baseline; an optional human walkthrough uses the labelled mock code and synthetic account. Stop normal dev servers before tests. No API key, `.env`, real email delivery, or external service is required.

Final documentation/static review: `git diff --check` exited 0; an inline Python audit exited 0 for seven Markdown files, twelve local links, and ten milestone/acceptance sections. Reviewed the staged scope for generated outputs and secrets before publication. Earlier failed and passing execution directories remain separate.
