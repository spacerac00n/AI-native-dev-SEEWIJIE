# VeriQA

VeriQA is an AI-native automated QA testing MVP for a small web application. A developer supplies requirements, AI proposes a structured test plan, a developer reviews it, and Playwright executes real actions and deterministic assertions. Reports link outcomes to execution evidence.

**AI proposes. Code executes. Assertions verify. Humans decide when necessary.**

## Current status

Milestones 1–2 establish the project context and runnable workspace. Two minimal React + Vite apps, a Hono health API, shared TypeScript/Zod contracts, and three Playwright smoke tests are implemented and verified. Authentication, AI planning, approved-plan replay, and the QA reporter are still planned. See [the milestone plan](docs/PLAN.md).

The intended demonstration is:

Requirement → AI-generated test plan → Review → Real execution → Failed assertion → Evidence → Code fix → Successful retest.

## Stack and scope

- TypeScript and npm workspaces.
- React + Vite for the demo application and QA dashboard.
- Hono for demo authentication and QA APIs.
- OpenAI API for live test-plan generation; Zod for runtime validation.
- Playwright Test for real browser/API execution and deterministic assertions.
- Local JSON files and filesystem artifacts for persistence.

Currently each web app has a heading, a health-check button, and a status message. The button calls the real Hono API through Vite's development proxy and validates the response against the shared Zod schema. There are no mocked HTTP responses in the smoke tests.

Later milestones will add login, mock OTP delivery, authenticated home access, and logout. Only delivery will be mocked; authentication rules will execute against the real backend. Live AI planning will require a server-side OpenAI key. Approved-plan replay will perform new Playwright execution without an AI call. None of these later features is implemented yet.

## Setup

Verified on macOS arm64 with **Node.js 22.23.2** and **npm 10.9.8**. The Node version is specified in `.nvmrc`; `package.json` records the supported Node/npm ranges. Use these versions for reproduction.

From the repository root:

```sh
npm ci --cache .cache/npm
npx playwright install chromium
npm run dev
```

The cache flag keeps npm's cache inside the ignored `.cache/` directory; dependencies still come from the committed lockfile. No environment variables or API key are required. `.env.example` documents this, and there is no need to create a `.env` file at this milestone.

| Service | Local URL |
| --- | --- |
| Demo app | <http://127.0.0.1:5173> |
| QA dashboard | <http://127.0.0.1:5174> |
| API health | <http://127.0.0.1:3000/api/health> |

The health response is `{"status":"ok","service":"veriqa-api"}`. Both app buttons should show `API is healthy (veriqa-api).` after clicking. This confirms API connectivity, not a QA test verdict.

The dev command builds shared contracts, watches them for edits, and starts all three services. All services bind to loopback; ports are fixed and Vite will not silently switch ports. Stop with Ctrl+C before running tests because tests start their own servers on these ports.

## Verified commands

| Command | Behaviour |
| --- | --- |
| `npm run dev` | Starts both app shells, Hono, and the shared-contract watcher. |
| `npm run typecheck` | Checks all four workspaces, Vite configs, Playwright config, and smoke tests. |
| `npm run build` | Builds contracts, compiled Node API, and both web apps into their respective `dist/` directories. |
| `npm test -- --list` | Lists the three smoke tests without executing them. |
| `npm test` | Starts fresh services, runs three real Chromium/API smoke tests, then stops the services. |

The root commands build contracts before consumers, so they work after a clean install. `npm run build` creates artifacts; it does not start or deploy the built web apps. The documented UI/API workflow uses `npm run dev` and its Vite proxies.

Latest verification on November 1, 2026: type checks and builds exited 0; Playwright discovered 3 tests and executed 3, all passed in 4.0 seconds, with 0 failed, 0 skipped, and no retries. The dev command also served both app pages, direct health, and both health proxies with HTTP 200. See [the command and evidence record](docs/AI_WORKFLOW.md).

## Smoke-test evidence

Each test invocation prints a unique directory under `artifacts/smoke/<timestamp>-<id>/` containing `results.json` and an HTML report. Per-test artifacts are stored there when produced. Failed browser tests retain screenshots and traces when available; successful runs do not retain them. There are no automatic retries, and a new run does not overwrite an earlier directory.

The `--list` command also creates a separate discovery-only report: its tests have no execution results and must not be presented as passed executions. The verified execution report is `artifacts/smoke/2026-11-01T12-28-50.543Z-f71a4c74-030f-4bc5-b675-9112bc7ececa/results.json` on the development machine. Generated evidence is ignored by Git, so fresh clones create their own reports.

Future plans and QA run records will use JSON under `data/`; this persistence is not implemented yet. Never commit API keys, real credentials, or confidential assessment material. The ignore rules cover local configuration, generated outputs, and PDFs.

## Project documentation

- [Agent instructions](AGENTS.md): engineering rules and workflow.
- [Product](docs/PRODUCT.md): developer needs, inputs, outputs, and MVP boundary.
- [Architecture](docs/ARCHITECTURE.md): planned components, data flow, and execution lifecycle.
- [Plan](docs/PLAN.md): ten milestones and acceptance criteria.
- [Decisions](docs/DECISIONS.md): initial trade-offs and constraints.
- [AI workflow](docs/AI_WORKFLOW.md): assistance, human direction, and actual verification records.

The interview walkthrough, exact reproduction commands, and evidence references will be added to `docs/DEMO.md` after real execution exists. A passing retest must preserve the original failure and its tested commit SHA.
