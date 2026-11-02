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

## Milestone 4 — Validated plans and human approval (November 2, 2026)

Developer direction: implement strict structured contracts, local JSON plans/approvals, revision-bound human review, a labelled manual fixture, and contract/approval tests. Do not implement OpenAI integration or dynamic Playwright execution. Read AGENTS, PRODUCT, ARCHITECTURE, DECISIONS, and PLAN first. Preserved the preexisting README clarification that demo memory uses `Map` while updating the root command reference.

AI assistance: authored the static manual fixture, Zod contracts, backend storage module, small CLI, and Node unit tests. This fixture is development-authored source data (`manual-fixture`), not output from a live AI planner; no model call or AI provenance was fabricated. Consulted [Zod's schema documentation](https://zod.dev/api) and [Node filesystem documentation](https://nodejs.org/docs/latest-v22.x/api/fs.html). Reused existing dependencies; added no database, framework, API endpoint, or dashboard functionality.

Trade-offs: fixed named demo operations rather than arbitrary selectors/URLs/code; canonical content digest plus a fresh UUID per import; immutable JSON revisions and approvals with only a current pointer updated; synchronous local files and one writer instead of database transactions. Approval binds revision and digest, so editing or reverting content cannot revive an older approval. A future executor must call `requireApproved`; the CLI `check` exercises only that gate. Decisions D13–D15 record the boundaries and local-file trust assumptions.

The 37 unit tests cover a valid three-case fixture; malformed plans; unknown/generated-code actions; external navigation; raw selectors; unsupported inputs/API operations/methods; invalid expected outcomes; missing assertions; injected approval; unsupported AI origin; duplicate/broken references; OTP-read ordering; digest stability; persistence; explicit approval; edit/revert invalidation; historical evidence; tamper/hash rejection; storage traversal; CLI confirmation; and consistent future run metadata. Synthetic approval/run examples exist only in isolated unit-test fixtures and never count as human approval or actual product execution.

### Actual commands and outcomes

| Command | Exit code | Observed outcome |
| --- | --- | --- |
| `npm run typecheck && npm run build` | 0 | All four workspaces, configs, and unit/browser test types passed; both frontends, contracts, and API built. |
| `npm run test:unit` | 0 | Node runner discovered/executed 37 tests: 37 passed, 0 failed/cancelled/skipped, 1.276 seconds. Actual stdout/stderr and command metadata retained by an inline Node capture wrapper. |
| Existing `npm run dev` stopped with Ctrl+C | 0 | Stopped the agent-owned launcher before baseline execution; no stale server was reused. |
| `npm test -- --list` | 0 | 24 cases discovered in 2 files, 0 executed; unit tests correctly excluded. |
| `npm test` | 0 | 24 existing real Playwright browser/API cases executed/passed, 0 failed/skipped, no retries, 6.7 seconds. The structured manual fixture was not executed. |
| `npm run plan -- import fixtures/manual-demo-plan.json` | 0 | Validated and persisted a new unapproved revision labelled `manual-fixture`. |
| `npm run plan -- inspect manual-demo-baseline 6b3fce76-f62f-49fc-b5be-ad4a333c984d` | 0 | Printed the full saved definition, digest, current revision status, and `approval: null`. |
| `npm run plan -- check manual-demo-baseline 6b3fce76-f62f-49fc-b5be-ad4a333c984d` | 1 (expected) | Rejected the unapproved revision with an explicit human-approval requirement; no execution occurred. |
| `npm run plan -- import artifacts/cli/2026-11-02T06-56-36.339Z-2bed14da-0746-4fc5-b829-698a934e52dd/invalid-plan.json` | 1 (expected) | Rejected an unsupported `evaluate` action before saving; the valid current pointer stayed unchanged. |
| Final `npm run typecheck && npm run build` | 0 | Passed after making relative storage-root resolution independent of npm's workspace working directory. |
| Final `npm run test:unit` | 0 | All 37 tests passed, 0 failed/skipped, 1.085 seconds; CLI test now also checks a relative data root from the API workspace directory. |

All new automated tests passed on their first run. Expected CLI rejections are validation evidence, not failed product assertions. No invalid definition was executed or turned into a successful run. No new product/runner failures or unchanged-source flakiness were observed in these suites. During development, the existing long-running Vite watcher emitted React duplicate-`createRoot` warnings while contracts rebuilt, then scheduled full-page reloads. The fresh-server baseline passed; no UI change was made for this development-only observation. Earlier Milestone 3 failure evidence remains untouched.

Final code-review correction: resolve a relative `VERIQA_DATA_DIR` from the repository root rather than inheriting npm's API-workspace cwd. This was found during review, not presented as an observed failing test. Strengthened the existing isolated CLI test and reran relevant checks. No additional human correction was needed.

### Retained artifacts and source provenance

The worktree verification used parent commit `3044ea989c4718a9e4301436e8fd184002ff6546` with uncommitted Milestone 4 changes (`worktreeDirty: true`), not a claim that the older commit contained the new contracts. Unit and Playwright evidence record the actual source state; clean-commit confirmation is reported after publication.

- Unit evidence: `artifacts/unit/2026-11-02T06-53-36.682Z-24c0b7c5-04b1-40b7-93be-59cc7c220c1f/` contains `stdout.log`, `stderr.log`, and `command.json` with actual command/exit/source metadata.
- Final unit evidence after the path-resolution correction: `artifacts/unit/2026-11-02T07-05-43.255Z-c9337a5a-c275-431e-a4f3-10e72b04aac1/`, with the same raw-output and command metadata files. The earlier passing record remains separate.
- Discovery only: `artifacts/playwright/2026-11-02T06-55-16.121Z-41ff2c46-d77f-4689-bb9c-21660693ca0a/`; no executed cases.
- Real baseline: `artifacts/playwright/2026-11-02T06-55-16.740Z-b792fb8a-2686-4131-a95a-b1e89f440932/` contains JSON/HTML results for 24 passed static tests. No failure screenshots/traces were produced because all passed.
- CLI evidence: `artifacts/cli/2026-11-02T06-56-36.339Z-2bed14da-0746-4fc5-b829-698a934e52dd/` contains actual stdout/stderr, expected/actual exit codes, invalid input, and verification metadata for import/inspect/approval blocking/invalid-plan rejection.
- Manual source: `fixtures/manual-demo-plan.json` is committed and visibly labelled. The local immutable record is `data/plans/manual-demo-baseline/6b3fce76-f62f-49fc-b5be-ad4a333c984d.json`, with digest `d837270152490da272a90135f361ba1f43be72ba8732270d27b1ff8b8e6d3379`.

Human action: inspect the fixture and its exact revision, then use the README approval command with your reviewer name and `--confirm` if the expectations are correct. The local fixture remains **unapproved**; the agent did not record a human approval on the developer's behalf. Unit-test approvals used an explicit synthetic actor and temporary storage. Approval alone does not run tests at this milestone.

Worth retaining for the interview: the manual fixture, immutable saved revision/digest, eventual actual human approval, CLI rejection evidence, contract-test logs, real baseline JSON/HTML, and the earlier development-failure evidence. Generated outputs remain ignored pending sanitization/review. A later approved AI-generated plan and real replay evidence are still needed for the final AI-native journey; the manual fixture does not replace them.

Static/documentation review: `git diff --check` exited 0; an inline Python audit exited 0 for seven Markdown files, fourteen local links, ten milestone/acceptance sections, and unchanged lockfile dependencies across all five package manifests. The README retains the preexisting `Map` clarification and adds all new operator/verification commands.

## Milestone 5 — Real OpenAI test planning (November 2, 2026)

Read project instructions/product/architecture/decisions/plan before implementation. Applied OpenAI Docs skill and consulted official structured-output and GPT-4.1-mini documentation: https://developers.openai.com/api/docs/guides/structured-outputs and https://developers.openai.com/api/docs/models/gpt-4.1-mini. Implemented a server-side CLI using native fetch rather than adding an SDK or endpoint. Only generate loads the ignored root .env with Node loadEnvFile. Preserved configuration intent from the preexisting .env.example placeholder while replacing it with a safe blank key example. No secret was printed or committed.

Version-1 manual definitions remain compatible. Live origin requires server-stamped provenance; manual origin cannot claim it. The model emits a strict-schema definition only; local Zod adds reference/ordering validation before PlanStore saves an immutable unapproved revision. New provenance covers original requirements, model, response/request IDs, prompt version, time and token counts. The same approval gate applies; no generated plan was approved or executed. Saved JSON is reusable offline. Exported the real second proposal as fixtures/live-ai-demo-plan.json, retaining its actual provenance and unapproved status.

Actual live calls via `npm run plan -- generate fixtures/demo-requirements.txt` (both exit 0, HTTP 200):

| Prompt | Response ID | Request ID | Returned model | Input/output/total tokens | Saved revision |
| --- | --- | --- | --- | --- | --- |
| v1 | resp_031abb3e03b0169c016ae84039123887d297e8afb40616a1de | req_71f6eae297a94d3e87c351e81b3ff33e | gpt-4.1-mini-2025-04-14 | 1084 / 727 / 1811 | 23b7d0c4-5fd9-4656-bf73-3e3242ff06af |
| v2 | resp_05c98ef2c0c46630016ae840d68db487d2966ec16261b0b2e7 | req_79887de0ec074210811e35ba33a82fae | gpt-4.1-mini-2025-04-14 | 1179 / 753 / 1932 | d61ba281-a45b-47da-9ae2-5bf3f5747695 |

Both returned plan ID vp1 with three case definitions. Requested model was gpt-4.1-mini. First digest: 1a0f18153f293b631e4d3860d62b726dfd52b60bf4431a19ea868d6940aba23a. Latest digest: 01d6a402710ee33142f5adbeb7e9c05e13318e314a77c464da81d8846d89e90f. Latest source remains live-ai, current and unapproved. Old revision and interaction are retained independently.

Meaningful AI correction: first response passed structure validation but incorrectly claimed logout was unsupported, repeated an assertion, and overstated a case title's coverage. The coding agent inspected the output, preserved it unchanged, clarified the allowed controls/case allocation in prompt v2, and made a second real request. V2 includes logout and task-refresh cases but its reviewNotes still make inaccurate claims about wrong-OTP and second-checkbox support, and no explicit spoofed-suffix case is proposed. These are model quality/coverage issues, not product test verdicts. Recorded coding-agent observations in separate review.md files, not as human approval or edits to model provenance. Human review must assess the actual cases; model notes are not authoritative. No requirement to manually manufacture invalid fixtures was passed to the user.

Actual verification commands and outcomes:

| Command | Exit | Actual result |
| --- | --- | --- |
| npm run typecheck && npm run build | 0 | Passed initially and after final prompt/provenance updates; final logs typecheck.log and build.log retained. |
| npm run test:unit (first offline run) | 0 | 49 discovered/executed/passed, 0 failed/skipped; first-unit.log. |
| npm run test:unit (restricted sandbox launch) | 1 | tsx IPC socket listen EPERM before any tests executed; final-unit.log preserved. Environment failure, not product assertion. |
| npm run test:unit (network/IPC-enabled rerun) | 0 | 49/49 passed, 0 failed/skipped, 1.098 seconds; unit-v2.log. |
| npm test | 0 | 24 static Playwright baseline tests executed/passed, 0 failed/skipped, 6.7 seconds. Not execution of the generated three-case plan. |
| git check-ignore .env / git ls-files .env | 0 / 0 | Root .env is ignored and not tracked (second command produced no file). |

Offline tests explicitly use a fake transport and synthetic credentials. They cover valid output/provenance/unapproved storage, unsupported actions, broken references, injected approval, refusal, incomplete response, malformed response, HTTP 401/429, network failures and secret redaction, plus local missing-key/empty-requirements rejection. No live key or paid call is needed for unit or browser tests. Future result metadata accepts both manual and live-AI plan origins without adding an executor.

Artifacts already on disk:

- artifacts/planner/1b325382-9409-4daa-920d-9b018c64b304/interaction.json and review.md: original live attempt and separate coding-agent observations.
- artifacts/planner/4a288450-e81b-4b70-b066-6b21171bb629/interaction.json and review.md: revised live attempt, actual usage/IDs/output and review observations.
- data/plans/vp1/<revision>.json: both immutable revisions; current.json points to v2. No human approval record was created.
- artifacts/verification/m5/: actual CLI logs, first successful unit log, failed sandbox launch log, final unit/typecheck/build logs, Playwright console log, source.json. Source during these interactions was parent commit 515dc040d46659981a6f3962c7e5921fdb3c188f plus uncommitted Milestone 5 changes; it is not claimed as a clean execution of the older source.
- artifacts/playwright/2026-11-02T07-48-49.098Z-7bcf7748-5faf-4da0-81fc-095be2893e17/: real baseline JSON/HTML, source metadata. Cleanup printed npm SIGTERM code 143 messages; Playwright itself exited 0 with 24 passed.

Requests use a fixed official endpoint, store:false, strict JSON schema, 90-second timeout and 6000-token output cap, with no automatic retries. Interaction records omit authorization/raw error bodies and redact credential-like output. API errors never grant approval. Local storage/reviewer labels retain the documented single-operator trust assumptions. Model-generated content has not been verified against the app until Milestone 6 execution.

At initial publication, human action was outstanding: `npm run plan -- inspect vp1`, review cases/expectations/coverage, then explicitly approve the exact current revision with reviewer name and --confirm if appropriate. Human approval is an acceptance step still pending; the coding agent does not substitute its own review for it. No key setup is needed on this machine. CLI import of fixtures/live-ai-demo-plan.json works offline but creates a fresh unapproved revision. All mechanical verification is automated.

Pre-publication checks: git diff --cached --check exited 0. A server-side exact-key scan exited 0 over all 14 staged files and both built frontend asset directories; no key values were printed. Root .env remained ignored/untracked. The safe blank .env.example is committed.

### Human review and approval confirmed — November 2, 2026

The developer confirmed that they verified and agreed with the generated test expectations and ran the approval command after replacing the reviewer-name placeholder with their own name:

```sh
npm run plan -- approve vp1 d61ba281-a45b-47da-9ae2-5bf3f5747695 --by "<developer name>" --confirm
```

The coding agent independently checked the existing local record through `PlanStore.requireApproved` without creating or changing an approval. The gate returned `approved` for revision `d61ba281-a45b-47da-9ae2-5bf3f5747695`, approval ID `0d20cfb2-7e27-4693-adef-27287f2b8362`, recorded at `2026-11-02T08:34:02.309Z` (16:34:02 Singapore time). The record is saved at `data/approvals/vp1/d61ba281-a45b-47da-9ae2-5bf3f5747695.json`.

Milestone 5 human review/approval is complete for this exact revision. This approves the proposed expectations; it does not claim that the generated cases have executed or passed. Dynamic execution remains Milestone 6. Documentation updated at the developer's request; no commit or push was made for this update.

## Milestone 6 — Deterministic Playwright executor and evidence (November 2, 2026)

Read AGENTS, PLAN, ARCHITECTURE, AI_WORKFLOW, README, DECISIONS, contracts, plan store/CLI, demo UI/backend and existing tests first. Preserved the developer's uncommitted Milestone 5 approval-confirmation documentation and included it with this milestone. Independently called `PlanStore.requireApproved` for live plan `vp1`, revision `d61ba281-a45b-47da-9ae2-5bf3f5747695`: existing approval `0d20cfb2-7e27-4693-adef-27287f2b8362` and content hash `01d6a402710ee33142f5adbeb7e9c05e13318e314a77c464da81d8846d89e90f` matched. No real approval was created or changed by the coding agent.

AI assistance implemented a small CLI coordinator, a separate Playwright config, maintained adapters for the complete existing Zod vocabulary, case observations, immutable result publication and shared result validation. Consulted official [Playwright reporters](https://playwright.dev/docs/test-reporters), [reporter lifecycle](https://playwright.dev/docs/api/class-reporter), and [failure trace options](https://playwright.dev/docs/test-use-options). No new dependencies, dashboard changes, application defects, database, execution API or model calls. Human direction kept the next dashboard out of scope while requiring its stable evidence contract; this is documented in EXECUTION.md and decision D17.

The coordinator requires exact ID/revision/current approval and hash before server/browser startup, stores the approved snapshot, and launches a fixed argv without a shell. Workers revalidate the snapshot. Plans never provide JavaScript, selectors, origins or HTTP methods. Browser contexts and case-local OTP values are fresh; backend synthetic state/clock is reset before each case. A directory lock and one Chromium worker serialize execution; no retries. Clicks wait for actual endpoint responses and settled controls. API home assertions use the real browser cookie session. Replay does not load `.env` or import the planner, and strips OpenAI environment settings from child processes.

Result files embed plan/provenance/approval, exact Git state, timing, command/exit status, counts, case identities/statuses, actual expected/observed assertions, raw output and relative artifact indexes. Native Playwright status is authoritative; setup failures, missing observations and incomplete runs cannot pass. Comparison identity is `(planId, revision, contentHash, caseId)` across distinct run IDs/SHAs. Files are published without overwrite. Raw logs append during execution; abruptly terminated coordinators can leave an incomplete attempt and stale lock, which a future dashboard must not show as passed. Local recovery is documented rather than adding a worker framework.

### Actual verification commands and outcomes

All worktree runs below record actual parent SHA `8dd1056a2276297cdfef00f8afc8c198db6e0b22` and `worktreeDirty: true`. This identifies the parent plus uncommitted Milestone 6 implementation, not a clean test of the older commit. Successful clean-commit confirmation is recorded after the implementation commit exists.

| Command | Exit | Actual outcome |
| --- | --- | --- |
| Initial `npm run typecheck` | 1 | API compiler identified a possibly-null approval after the gate. Corrected the return type through explicit narrowing; no product tests ran. |
| Subsequent `npm run typecheck` | 0 | All workspaces/configs/tests passed. Final captured run also exited 0. |
| First `npm run test:executor`, sandbox restricted | 1 | Node reported 6 tests including parent: 3 passed, 3 failed. Approval/unsupported checks passed; managed servers failed at tsx IPC `EPERM` before product cases; external Chromium setup failed under sandbox. No successful product execution claimed. |
| Second `npm run test:executor`, local-process permissions | 1 | 6 Node tests: 3 passed, 3 failed. Existing repository dev launcher occupied ports; managed tests executed 0 product cases. External server lacked reset controls (HTTP 404), correctly recorded as execution errors. |
| `ps`/`lsof` inspection, then `kill -TERM 24579` | 0 | Confirmed existing repository `npm run dev`/concurrently launcher and stopped it so tests could own fresh servers. No source/evidence removed. |
| Third `npm run test:executor` | 0 | 6/6 Node tests passed (parent + 5 checks). Inner Playwright: 8 adapter cases passed; 1 deliberately wrong expectation failed; 8 unavailable-target cases failed during reset with actual `ECONNREFUSED`. |
| `env -u OPENAI_API_KEY npm run execute -- vp1 d61ba281-a45b-47da-9ae2-5bf3f5747695` | 0 | Real replay of existing human-approved live-AI plan: 3 discovered/executed/passed, 0 failed/skipped, Playwright 2.9 seconds. Run `e762bf06-8de9-4fc1-a7fc-b9aca414d917`; total recorded duration 3260 ms. No key/model call. |
| `npm run test:unit` | 0 | 57 discovered/executed/passed, 0 failed/cancelled/skipped, 1.107 seconds. Includes 8 new result-contract checks. |
| `npm test` | 0 | All 24 existing Playwright browser/API tests discovered/executed/passed, 0 failed/skipped, no retries, 6.6 seconds. Dynamic/integration tests excluded from baseline discovery. |
| Final `npm run typecheck` / `npm run build` | 0 / 0 | All four workspaces, runner/config/unit/integration types and both frontend builds passed. |
| Final `npm run test:executor` | 0 | 7/7 Node tests passed (parent + 6 checks), 15.392 seconds. Added lock rejection; repeated real 8-case pass, 1 assertion failure with evidence, and 8 reset-phase connection refusals. |
| Screenshot inspection and Python ZIP integrity check | 0 | Real failed-run screenshot shows the unchanged login page and actual health text. Trace archive integrity passed, with 20 entries. |

Each captured command has its own `stdout.log`, `stderr.log`, and `command.json` with actual argv, exit code, timestamps and source state under `artifacts/verification/m6/`. The capture wrapper is local verification tooling, not product logic. Captured directories:

- Initial sandbox failure: `runner-checks-4f0467b1-36cc-45f3-beb0-10ebdcde2706/`.
- Occupied-port/reset-unavailable failure: `runner-checks-0791e5a2-a4ef-458f-9b8d-cbe7b1c12657/`.
- First successful runner verification: `runner-checks-e6530700-a5ef-4878-b81a-5d94b4599a80/`.
- Approved live replay: `live-replay-c0aa76ac-b262-4b7c-8d7f-336d16e1ac80/`.
- Unit: `unit-7794496e-ee2b-4d90-a7e5-00882f066f96/`.
- Existing baseline: `static-playwright-6fd61b8c-1409-4189-8748-39e7b2f7074c/`.
- Typecheck/build: `typecheck-8331c7ed-e5a6-4664-bcf3-74e44905a3f3/`, `build-a7a3d85a-79f5-4bf3-855c-c5879ad170e9/`.
- Final runner verification: `runner-checks-final-bc30e0ed-3196-4a9a-9ef3-0500e315dd75/`.

Coding-agent corrections: narrowed the approval return type after a real compiler error; strengthened the unavailable-target check to require actual connection refusal rather than accepting any reset failure; made final JSON publication atomic/exclusive and raw output incremental; increased bounded artifact capacity to cover the full 20-case vocabulary limit. The HTTP-404 external attempt remains retained and is not relabelled as a refused connection. No additional human correction was needed. No unexplained unchanged-source flakiness was observed; the deliberate assertion mismatch is a labelled runner check, not a seeded product defect.

### Preserved evidence and human checks

All prior milestone artifacts remain untouched. Keep entire run directories (including `input.json`, `run.json`, native JSON, stdout/stderr, case logs and failure attachments), plus original plan/approval files. New generated outputs remain local and ignored by Git; they are not included in the source push.

| Evidence | Location |
| --- | --- |
| Actual human-approved live replay | `data/runs/e762bf06-8de9-4fc1-a7fc-b9aca414d917.json` and `artifacts/executor/e762bf06-8de9-4fc1-a7fc-b9aca414d917/` |
| Final synthetic all-adapter pass | `artifacts/executor/95b7f9f8-7ff8-4342-af8f-5813aa80f50a/` (8/8 passed) |
| Final real assertion failure | `artifacts/executor/cfae1a84-cbaa-4623-b143-64bd6d5e6ac1/` (0 passed, 1 failed, exit 1) |
| Final refused-target run | `artifacts/executor/8eb28ea3-32ea-48df-a0cc-5ef275aa71da/` (0 passed, 8 execution errors, exit 1) |
| Rejected unapproved / unsupported / concurrent attempts | `artifacts/executor/98b59b15-2a6b-4858-8be0-0d1529955c6a/`, `bf023962-d85b-4bc4-be31-b558d9feba24/`, `96aaec85-9050-4dbc-9822-17cf2f432b5d/` respectively; attempt/rejection only, no runner command |
| Synthetic fixture records and summary | `artifacts/runner-checks/73eabf41-faf1-4222-adaf-7f5b818d7ea0/` |
| Existing baseline JSON/HTML | `artifacts/playwright/2026-11-02T09-46-52.523Z-29c36443-ff07-4d97-888d-9779c971ecb5/` |

The final assertion-failure directory has `cases/login-and-task/result.json` with expected `Deliberately wrong runner-check expectation` versus actual `API health has not been checked.` Its real screenshot and trace are at `test-results/plan-login-and-task-Log-in-and-preserve-a-checklist-change-chromium/test-failed-1.png` and `trace.zip` within that directory. Synthetic approvals are explicitly labelled and stored under the separate runner-check data root; they never authorize the live plan.

Human verification: follow [EXECUTION.md](EXECUTION.md)'s checklist to inspect plan/approval/provenance, replay without a key, inspect individual assertions/logs, open the real failure screenshot/trace, inspect unavailable-target classification and preserve the full evidence sets. Before/fix comparisons will require the same approved revision and clean seed/fix SHAs in Milestones 8–9. No deliberate defects or fabricated evidence were introduced here.

Final review additionally made `requireApproved` reject an omitted revision instead of inheriting the storage reader's current-revision default, strengthened its existing unit check, and corrected CLI record paths for `VERIQA_DATA_DIR` overrides. Rechecked all 57 unit tests (57 passed, exit 0, 1.212 seconds), types and builds (both exit 0). Captures: `unit-final-08bdb313-cc81-4a6b-a39d-102cb06a2070/`, `typecheck-final-6ba7f7be-52d3-4e5b-9d4c-9883d1d169d0/`, and `build-final-47e31584-460c-482e-acad-b08646964048/` under `artifacts/verification/m6/`. A Python audit checked seven Markdown documents, nineteen local links and all indexed artifact paths in four retained records; exits/case artifacts matched the actual command records and no active execution lock remained. `git diff --check` exited 0.

### Clean implementation-commit confirmation

Implementation commit: `b1ab51d0d17e52c989b3fa51218fe485ec7e501b` — `feat: execute approved test plans with Playwright`.

After committing, ran `env -u OPENAI_API_KEY npm run execute -- vp1 d61ba281-a45b-47da-9ae2-5bf3f5747695` again (exit 0). Run `66a116f4-8fcd-4f58-9756-3abda827281d` records that exact SHA and `worktreeDirty: false`: 3 discovered/executed/passed, 0 failed/skipped, Playwright 3.1 seconds, total 3451 ms. Saved identical result JSON at `data/runs/66a116f4-8fcd-4f58-9756-3abda827281d.json` and `artifacts/executor/66a116f4-8fcd-4f58-9756-3abda827281d/run.json`; preserve the full artifact directory. Raw outer command capture is `artifacts/verification/m6/clean-live-replay-f9c8be9c-e95f-462d-a88b-d03c2df40600/`. Earlier worktree and failed records remain separate.

The initial broad credential-pattern audit flagged two `sk-` substrings inside long `task-...` evidence directory names. Reviewed as false positives, then ran an exact configured-key scan plus token-boundary credential scan across all 22 changed files and both built frontend asset directories: exit 0, no keys or credential tokens found. `.env` remains ignored/untracked; generated data/evidence are not staged. The implementation commit contains source/tests/docs only. Clean replay confirms runtime code; this follow-up commit records its evidence without rewriting history.

## Milestone 7 — Unified VeriQA dashboard (November 2, 2026)

Read AGENTS, PLAN, EXECUTION, architecture/workflow history and the current planner, plan/approval store, executor, contracts, UI/backend and tests first. Implemented the dashboard in the existing React/Vite app and a thin `/api/qa` Hono route group, reusing the existing OpenAI planner, exact-revision approval gate and deterministic executor. No database, new dependency, generated executable code, or replacement runner was introduced. Consulted official [Hono context](https://hono.dev/docs/api/context), [request](https://hono.dev/docs/api/request) and [body-limit](https://hono.dev/docs/middleware/builtin/body-limit) documentation and [Playwright capture options](https://playwright.dev/docs/test-use-options).

The UI has separate AI generation, Zod validation, human approval and real execution stages; requirement entry; complete case/action/expectation and provenance/review-note inspection; exact-hash approval; optional real successful-case screenshots; immutable history; individual assertion/log/screenshot/trace inspection; and two-run comparison. Comparison matches case IDs and flags changed plan/revision/hash, expected values, definitions, actual values and statuses. It never labels an arbitrary green result as a code fix. Screenshot absence in older runs remains visible. The selected run is shown above a bounded, scrollable history list.

Trade-offs and boundaries: dashboard runs use the existing executor's external-target mode against the same running local API/demo. `npm run dev:qa` explicitly enables synthetic resets; normal dev remains reset-disabled. The API allocates a run UUID and holds only active HTTP-launched IDs in memory; restart leaves incomplete attempts visible. New dashboard proposals get a server-allocated fresh plan ID to avoid superseding the approved walkthrough revision. Existing CLI generation behavior is retained. Indexed artifact reads validate relative paths and real-path containment including symlinks. Mutation requests require bounded JSON, a custom action header and local origin/host. Local file-owner/reviewer-label trust remains unchanged. D18 and DASHBOARD.md record these choices.

### Real dashboard baseline and live generation

Started `npm run dev:qa`, then used CUA against the actual dashboard at `http://127.0.0.1:5174`. The UI selected the existing genuinely human-approved live-AI `vp1` revision `d61ba281-a45b-47da-9ae2-5bf3f5747695`, with unchanged approval `0d20cfb2-7e27-4693-adef-27287f2b8362`. Clicked **Execute approved plan** with successful-case screenshot capture enabled. The UI first showed Running/Not finalized, then displayed the actual completed result:

- Run `f8ee6b89-c9f8-4200-b17d-01f4b1636d84`: 3 discovered/executed/passed, 0 failed/skipped, exit 0, Playwright 2.5 seconds, total recorded duration 2820 ms.
- Source `24542ec41eef809f44f59a5c0786cfacb6c344f1`, `worktreeDirty: true`, identifying the parent plus uncommitted Milestone 7 work rather than a clean test of the older commit.
- `data/runs/f8ee6b89-c9f8-4200-b17d-01f4b1636d84.json` and `artifacts/executor/f8ee6b89-c9f8-4200-b17d-01f4b1636d84/` preserve original plan/provenance/approval, actual command/output/assertions and three genuine successful-case PNGs.
- Compared this run to retained clean Milestone 6 run `66a116f4-8fcd-4f58-9756-3abda827281d`. The dashboard visibly confirmed “Same plan, revision and content hash. Case expectations are directly comparable.” Both passed; this is a baseline/replay comparison, not defect/fix evidence.

Through the same UI, clicked **Generate test plan** once with the non-confidential synthetic requirements displayed in the dashboard. Real OpenAI HTTP 200 produced three cases and saved:

| Field | Actual value |
| --- | --- |
| Saved plan / revision | `plan-9ccc54db-aa21-443e-9e79-50a7ade756a1` / `fe049ac7-ce24-48f8-bc28-de1131ba9451` |
| Content hash | `4fb8600a4dd65930fdaa7cf8d03561d5458efb85407dab63a0b1445e0909f695` |
| Returned model | `gpt-4.1-mini-2025-04-14` |
| Response / request ID | `resp_01ac1698ca5b847c016ae866f3313887d2bbb460b4f69c34a0` / `req_1bdccf5900454f0a9488e8985f7f23f3` |
| Input / output / total tokens | 1128 / 759 / 1887 |
| Generated UTC time | `2026-11-02T10:33:29.632Z` |
| Actual state | Validated, unapproved, unexecuted; reviewer blank, review confirmation unchecked, execution disabled. |

Live interaction: `artifacts/planner/75783153-0277-4d03-8e13-8bef8cadc632/interaction.json`; saved revision under `data/plans/<new-plan-id>/<revision>.json`. Separate coding-agent observations in that interaction's `review.md` note that c3's title overstates before/after-logout coverage: final-only assertions establish post-logout rejection. The original model content was not silently rewritten. A human still needs to assess the actual new cases/notes and explicitly approve; no new genuine approval was created by the coding agent. Existing `vp1` remains current and approved. `artifacts/verification/m7/ui-verification.json` references the actual replay, screenshots, live interaction and observed compatible comparison.

### Automated verification and retained failures

Every captured invocation writes actual stdout/stderr and command/exit/time/source metadata under its own `artifacts/verification/m7/<label>-<UUID>/` directory. Worktree checks used parent `24542ec41eef809f44f59a5c0786cfacb6c344f1`, dirty true.

| Command | Exit | Actual outcome |
| --- | --- | --- |
| `npm run typecheck` during implementation | 0 | All workspace/config/test types passed. |
| Initial `npm run test:unit` | 1 | 63 executed: 62 passed, 1 failed. Oversized request was rejected, but generic HTTP error handling incorrectly returned 409 instead of 413. Original output retained. |
| `npm run test:unit` after correcting 413 handling | 0 | 63/63 passed, 0 failed/cancelled/skipped, 1.055 seconds. Six new tests cover approval/hash/confirmation, unavailable reset mode, request origin/header/body boundaries, existing-planner delegation with an explicitly offline transport, partial/invalid history and artifact traversal/symlinks. |
| Initial `npm run test:dashboard` | 0 | 2/2 real browser workflow tests passed, 12.1 seconds. Inner executor: three-case manual fixture passed; one deliberately wrong expectation failed with actual evidence. |
| `npm test` | 0 | All 24 existing real browser/API baseline cases executed/passed, 0 failed/skipped, 6.5 seconds. |
| `npm run test:executor` | 0 | All 7 verification tests passed, 14.844 seconds; inner real Playwright runs: 8 adapter cases passed, 1 intentional assertion mismatch, 8 refused-target setup errors. |
| `npm run test:dashboard` after evidence-preview/mobile refinements | 0 | 2/2 passed, 11.8 seconds, real pass/failure evidence retained separately. |
| `npm run test:dashboard` after moving run inspection above history | 0 | 2/2 passed, 12.7 seconds, additional genuine screenshots retained. |
| `npm run typecheck` / `npm run build` after separating the React entry point | 0 / 0 | All workspaces/configs/tests and compiled API/frontends passed. |

Captured verification folders under `artifacts/verification/m7/`:

- `unit-4ab25b0a-b344-4208-a600-a91b4c1f0d7e/`: original failed unit check, never replaced.
- `unit-final-697866c5-06dc-475e-9a29-d5542ad8bc64/`: 63 passing checks.
- `baseline-d05c9070-15e0-4d91-ad8c-18bf1abc03e2/`: 24 passing static Playwright checks.
- `executor-16ef2640-f3f6-40b5-ba81-23b707b9adcd/`: 7 passing executor checks.
- `dashboard-367e7405-b3d1-4462-acf7-a8746970325e/`, `dashboard-final-03b4d1b4-5d96-4792-aa97-9e2730ec427f/`, `dashboard-layout-4b29cf13-04b8-4136-8fa9-6704e4cedb0b/`: separately retained passing browser runs.
- `typecheck-876d8d8d-6844-4bc8-ad23-d5e6d53b2672/`, `build-7f408ef2-489a-4d5b-b83a-899ac113a203/`, `typecheck-final-80ba7f07-8b12-4b72-948d-28f1a1e848b4/`, `build-final-dde06cd2-a3a9-4710-b6e4-3215c3197ce2/`: successful types/builds.

The initial dashboard suite preserves HTML/JSON and desktop/comparison/mobile PNGs under `artifacts/dashboard/2026-11-02T10-27-44.981Z-c49fc2b9-3415-464f-8e7d-fcf5cc7326aa/`. Subsequent directories `2026-11-02T10-30-42.682Z-f7281b1d-48fe-4470-be7f-11936dcb7752/` and `2026-11-02T10-38-30.022Z-041c3842-0c17-4fca-9b8f-e0dbe01c0a3a/` remain separate. The latter's real execution runs are `7fd66f02-f7c3-4e22-a547-af2c5b292e0a` (3/3 passed) and `566f0f4d-dc94-4754-85cc-32c0c69b3027` (1 actual assertion failed, exit 1), under `artifacts/executor/`. Automated reviewer labels explicitly say SYNTHETIC and live only in isolated dashboard fixture data roots. They are not actual human review of an AI proposal.

Existing baseline report: `artifacts/playwright/2026-11-02T10-28-30.790Z-4d743e83-c5d3-4ba8-9aea-1cea77d99440/`. Executor verification summary/data: `artifacts/runner-checks/0fe707cd-27a0-478c-8e16-d6afc51c3884/`; its pass/failure/unavailable runs are `924e46f4-90a5-408d-831e-7eb490109d2c`, `650a926b-5cb0-4fe6-b6f2-a0b841505ba3`, and `090bed44-4638-475a-bc7b-a41eed9898e2` respectively. Older Milestone 3–6 reports remain untouched.

Coding-agent corrections and review: preserved the discovered HTTP-status failure and corrected its handler; stripped ANSI only in display previews; prevented stale asynchronous log responses from replacing a newly selected log; distinguished unknown worktree state from clean; fixed same-run reselection retaining its current result; and separated React component/bootstrap modules after development hot edits emitted duplicate-createRoot warnings. The last warning occurred during editing, followed by Vite full reload; fresh-server browser suites passed. No human correction beyond the requested scope/design constraints was needed. No unexplained same-source flakiness was observed. Model quality/coverage observations remain separate from product verdicts and human approval.

Human walkthrough and local startup are in DEMO.md and DASHBOARD.md. Real defect/fix evidence remains unfinished Milestones 8–9, while the comparison UI already operates on actual existing runs. Preserve whole selected executor directories, actual plans/approvals, live interaction and dashboard test reports. Generated files remain ignored and are not part of the source push.

Final review verification: `npm run test:dashboard` also passed 2/2 after separating React bootstrap and adding the same-run reselection check (12.4 seconds), and again after the compact screenshot adjustment (12.3 seconds). Captures: `dashboard-entry-db4a7e12-4a75-4c7a-92f9-1d426a29e5fd/` and `dashboard-preview-9c125592-c44a-479b-91db-ea8866104e13/`. Final release `npm run typecheck` and `npm run build` both exited 0; captures `typecheck-release-3d7b4839-8665-4156-9476-923c7afec046/` and `build-release-6fc92e2c-c874-4f7e-a952-89dc829e7ad3/`. A Python audit verified nine Markdown documents, twenty-three local links and all indexed files/exit codes in three selected run records. It also confirmed the original approved `vp1` revision is unchanged and the new live proposal has no approval file. `git diff --check` exited 0.

The focused final overview capture used `npm run test:dashboard -- --grep "exact approval"`: exit 0, 1 selected/discovered/executed/passed browser check, 6.1 seconds, with three real passing inner executor cases. It saved an actual viewport screenshot of the workflow's unapproved synthetic fixture, not a placeholder or AI image, under `artifacts/dashboard/2026-11-02T10-45-12.047Z-7b4421ec-951e-4661-8061-8b4fdccdf69e/test-results/dashboard-dashboard-exact--02a93-rtions-screenshots-and-logs-chromium/dashboard-workflow.png`. Command capture: `artifacts/verification/m7/dashboard-workflow-preview-1ecbe366-f714-47c2-97b1-2751cae69062/`. Pre-commit audit exited 0 over all 27 staged source/test/doc files and 3 built browser assets: no configured key or credential token found, `.env` untracked, no generated evidence staged, and no dependency changes in any workspace manifest. Staged whitespace check exited 0.

### Clean dashboard implementation-commit confirmation

Implementation commit: `b82a8caafce3fb75d921d8a4f33ecfae80a014f0` — `feat: build unified VeriQA dashboard`.

Started the committed code with `npm run dev:qa`, reloaded the actual dashboard and clicked **Execute approved plan** for existing approved `vp1`. CUA observed Running/Not finalized first, then the completed real result. Run `86b3c3f5-5ffd-4a9e-9001-bc6d0437927d` records the exact implementation SHA, `worktreeDirty: false`, 3 discovered/executed/passed, 0 failed/skipped, exit 0, Playwright 2.1 seconds and total duration 2445 ms. The existing actual human approval is unchanged. Three genuine successful-case screenshots were captured. No new model call or approval occurred.

Preserve `data/runs/86b3c3f5-5ffd-4a9e-9001-bc6d0437927d.json` and the whole `artifacts/executor/86b3c3f5-5ffd-4a9e-9001-bc6d0437927d/` directory. A Python audit confirmed identical record copies, all indexed files present, counts/exit correct, three PNGs and no remaining execution lock. Read-only verification reference: `artifacts/verification/m7/clean-ui-verification-86b3c3f5-5ffd-4a9e-9001-bc6d0437927d.json`. Earlier passing/failing attempts remain separate. This follow-up documentation records the clean SHA without rewriting the implementation commit. The local dashboard/target launcher remains running for human inspection.

## UI refinement — compact information (November 2, 2026)

Human correction: the dashboard had too many headers, repeated explanations and spacious boxes. Reduced the default view to saved-plan selection, workflow status, approval/execution controls and a compact case list. Requirements entry, proposed cases, result cases (including failures), comparison cases, provenance and raw output now start collapsed. Replaced workflow status, run metadata and comparison summaries with tables; shortened repeated labels, tightened spacing and placed plan review directly below selection to avoid a stretched empty panel. Detailed evidence and explicit approval remain accessible on expansion; no executor or backend semantics changed.

Read AGENTS.md, dashboard documentation and relevant source/tests before editing. Updated the existing browser checks to assert collapsed defaults and explicitly open case/log/comparison details before verifying real assertions, PNGs and traces. Synthetic reviewer fixtures remain isolated; no real approval or live model call was created.

Actual worktree verification used parent `d8e7ee57857ba29eedb1b313d19d3825787fa159`, dirty true:

- `npm run test:dashboard`: exit 0, 2 discovered/executed/passed, 0 failed/skipped, 12.2 seconds. Capture: `artifacts/verification/m7/compact-dashboard-8e3f8f73-85e3-4d65-9371-7a30edd5d463/`.
- After removing the empty stretched layout, `npm run test:dashboard`: exit 0, 2/2 passed, 11.7 seconds. Capture: `artifacts/verification/m7/compact-layout-d173f79a-09be-45df-8447-e73345178771/`. Actual JSON/HTML, desktop and mobile screenshots: `artifacts/dashboard/2026-11-02T10-57-29.696Z-d20accab-ef95-4bb3-85c3-daaa5c360361/`. Inner execution again produced three genuine passing fixture cases and one deliberate assertion failure; these remain runner checks, not product defect/fix evidence.
- `npm run typecheck` and `npm run build`: both exit 0 initially and after the final layout change. Final captures: `artifacts/verification/m7/compact-release-typecheck-40d591aa-08ce-4d39-b8b2-221aa7d99eb1/` and `compact-release-build-de76f41c-f6e6-4e58-95a7-257bb43a08b1/`.

Inspected the actual compact workflow screenshot. Retained earlier reports and all new unique directories. Fixed trailing whitespace found by final diff review. This is a presentation refinement; existing failed evidence, plan hashes and approvals remain unchanged.
