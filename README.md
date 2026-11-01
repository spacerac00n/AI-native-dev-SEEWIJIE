# VeriQA

VeriQA is an AI-native automated QA testing MVP for a small web application. A developer supplies requirements, AI proposes a structured test plan, a developer reviews it, and Playwright executes real actions and deterministic assertions. Reports link outcomes to execution evidence.

**AI proposes. Code executes. Assertions verify. Humans decide when necessary.**

## Current status

Milestone 1 defines the project context and implementation plan. This repository contains documentation only: the applications, package scripts, test runner, and reports have not been implemented or verified. See [the milestone plan](docs/PLAN.md).

The intended demonstration is:

Requirement → AI-generated test plan → Review → Real execution → Failed assertion → Evidence → Code fix → Successful retest.

## Planned stack and scope

- TypeScript and npm workspaces.
- React + Vite for the demo application and QA dashboard.
- Hono for demo authentication and QA APIs.
- OpenAI API for live test-plan generation; Zod for runtime validation.
- Playwright Test for real browser/API execution and deterministic assertions.
- Local JSON files and filesystem artifacts for persistence.

The demo covers login, mock OTP delivery, authenticated home access, and logout. OTP delivery is mocked; credential checks, OTP validation, session handling, and protected access run against the real local backend. The dashboard uses simple controls and prioritizes inspectable tests and evidence over visual polish.

Live generation requires an OpenAI API key. Replay loads a saved, approved plan and performs a new Playwright execution without an AI call. It never reuses an old run's outcome as a new result.

## Planned setup

The following is the target workflow, **not an available setup procedure yet**:

1. Install the Node.js LTS version selected and recorded in Milestone 2, plus npm.
2. Clone this repository and install workspace dependencies with `npm ci` once a lockfile exists.
3. Copy the future `.env.example` to a local, ignored environment file. Configure the OpenAI key and model on the server for live generation. Replay must work without the key.
4. Install the Playwright browser required by the demo and start both Vite apps and the Hono API.
5. Check the baseline demo, then generate or load a plan, review it, approve it, and start a run.

Milestone 2 will introduce and verify the root commands `npm run dev`, `npm run typecheck`, `npm run build`, and `npm test`. Exact URLs, browser installation commands, and environment variables will be documented when implemented. Do not assume these commands work at Milestone 1.

Generated plans and run records will live under `data/`; screenshots, logs, and selected traces under `artifacts/<run-id>/`. A small sanitized approved plan and before/after evidence set will be retained for the final interview demonstration. Never commit API keys, real credentials, or confidential assessment material.

## Project documentation

- [Agent instructions](AGENTS.md): engineering rules and workflow.
- [Product](docs/PRODUCT.md): developer needs, inputs, outputs, and MVP boundary.
- [Architecture](docs/ARCHITECTURE.md): planned components, data flow, and execution lifecycle.
- [Plan](docs/PLAN.md): ten milestones and acceptance criteria.
- [Decisions](docs/DECISIONS.md): initial trade-offs and constraints.
- [AI workflow](docs/AI_WORKFLOW.md): assistance, human direction, and actual verification records.

The interview walkthrough, exact reproduction commands, and evidence references will be added to `docs/DEMO.md` after real execution exists. A passing retest must preserve the original failure and its tested commit SHA.
