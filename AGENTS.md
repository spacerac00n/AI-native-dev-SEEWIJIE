# VeriQA — Agent Instructions

## 1. Project Mission

VeriQA is an AI-native automated QA testing MVP built for a technical engineering assessment.

A developer provides application requirements. AI proposes executable test cases. Deterministic testing tools execute them against a real web application and produce evidence-backed reports.

**Engineering principle: AI proposes. Code executes. Assertions verify. Humans decide when necessary.**

Optimize for a working, reproducible, explainable simple demonstration rather than production-scale complexity.
Write simple and understandable code with inline remarks so that human can understand the code if they are reading.
Do not give too much weight to the UI of VeriQA, simple buttons and UI components will do

## 2. Technology Stack

- TypeScript across the project.
- React + Vite for the demo application and QA dashboard.
- Hono for lightweight backend APIs.
- OpenAI API for AI-generated test plans and optional defect investigation.
- Zod for validating structured AI output.
- Playwright Test for browser/API execution and assertions.
- JSON files and filesystem artifacts for MVP persistence.
- npm workspaces for managing the repository.

Avoid unnecessary infrastructure, databases, distributed queues, and multi-agent orchestration.

## 3. System Components

**Demo Web Application:** A small application containing login, mock OTP authentication, and a home page. It will be used to demonstrate explicitly seeded software defects.

**QA Dashboard:** Allows developers to enter requirements, generate or replay test plans, inspect tests, execute them, and view evidence-backed results.

**AI Planner:** Converts requirements into structured test cases using the OpenAI API.

**Validation Layer:** Uses Zod to validate generated test plans. A developer reviews important test expectations before execution.

**Test Executor:** Uses Playwright to execute real browser/API actions and deterministic assertions.

**Reporter:** Preserves execution results, assertion failures, raw logs, screenshots, and selected traces.

## 4. Non-Negotiable Engineering Rules

1. Read the relevant project documentation before implementing features.
2. Build the smallest working vertical slice before adding complexity.
3. Use AI to accelerate development, but never trust unverified AI claims.
4. AI must not independently declare whether a test passed or failed.
5. Do not allow unrestricted execution of AI-generated code. Use an approved, supported test-action schema.
6. Mock OTP delivery explicitly. Authentication rules and assertions must still execute for real against the demo backend.
7. Clearly distinguish real execution, mock services, cached AI outputs, and replay.
8. Preserve actual failures. Never overwrite or conceal failed execution evidence after a successful retest.
9. Do not fabricate logs, screenshots, test results, or claims of verification.
10. Do not commit API keys, credentials, or confidential assessment materials.

## 5. AI-Native Development Workflow

For each meaningful implementation task:

1. Read `AGENTS.md` and the relevant documents in `docs/`.
2. Identify the requirement, affected modules, and expected outcome.
3. Implement the smallest coherent change.
4. Run relevant tests and type checks.
5. Inspect failures and correct problems rather than reporting unsupported success.
6. Update documentation when architecture or behaviour changes.
7. Create a descriptive incremental Git commit.

Explain significant engineering trade-offs and record meaningful human corrections to AI-generated work in `docs/AI_WORKFLOW.md`.

### Reusable development skills

Read and use the relevant repository skill when its workflow applies:

- [test-planning](.agents/skills/test-planning/SKILL.md): when translating requirements into scenarios or reviewing plan coverage, supported actions/assertions, and expected results. Require human semantic review before approval; generated expectations are proposals.
- [failure-investigation](.agents/skills/failure-investigation/SKILL.md): when diagnosing actual automated failures or rejected runs, inspecting evidence, and verifying fixes while preserving the original failure. An execution error alone does not establish an environmental root cause.

These skills guide Codex during development; they are not runtime VeriQA testing features and do not replace Zod validation, human approval, or deterministic Playwright assertions. They were introduced after Milestones 1–9, not used to perform those milestones.

## 6. Verification Rules

A successful agent response is not verification.

Record actual commands, exit codes, discovered/executed test counts, and relevant result artifacts.

Distinguish:

- Product assertion failures.
- Invalid test definitions.
- Environment or execution failures.
- Flaky behaviour observed across runs.

A rerun passing must not erase the original failure.

## 7. Seeded Defect Demonstration

Start from a working application.

Introduce deliberate defects in an explicitly labelled commit using the `test(seed):` prefix.

Execute VeriQA against the defective version. Save real failing evidence and the tested commit SHA.

Only after capturing detection evidence, fix defects in a separate `fix:` commit and rerun the tests.

Preserve the before-fix and after-fix records separately.

## 8. Documentation and Context Engineering

Use the repository documentation as the shared source of truth:

- `README.md` — setup, commands, and reproduction.
- `docs/PRODUCT.md` — users, problem, requirements, MVP scope.
- `docs/ARCHITECTURE.md` — components, responsibilities, data and state flows.
- `docs/DECISIONS.md` — architectural alternatives and trade-offs.
- `docs/PLAN.md` — implementation checklist and progress.
- `docs/AI_WORKFLOW.md` — AI assistance, human interventions, and verification.
- `docs/DEMO.md` — interview demo and evidence references.

Keep documents short, accurate, and aligned with the implementation.

## 9. Scope and Completion

Prioritize this end-to-end journey:

**Requirement → AI-generated test plan → Review → Real execution → Failed assertion → Evidence → Code fix → Successful retest.**

Support both live AI generation and replay of a previously generated, approved test plan. Replay must still perform real Playwright execution.

No unnecessary features until the core journey works and can be reproduced from a fresh clone.

## 10. Git and Submission Discipline

Maintain truthful, chronological, incremental commits that show development and iteration.

Do not manufacture or rewrite history to appear AI-native.

Protect confidential information and preserve the original defect/fix sequence.

The submission deadline is November 2, 2026, at 23:59 Singapore time. Finish and push a verified submission before that cutoff.
