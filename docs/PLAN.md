# Implementation plan

Milestones are sequential acceptance gates, not claims of completed implementation. Keep changes small, document actual verification, and commit incrementally. Milestone 1 is documentation only; Milestones 2–10 remain pending.

## 1. Context engineering

Deliver the repository context and planned design.

Acceptance criteria:

- Root `AGENTS.md` captures the agreed mission, stack, workflow, verification rules, and defect/fix discipline.
- README, product, architecture, ten-milestone plan, and initial decisions agree on MVP scope and terminology.
- Planned commands and components are clearly distinguished from implemented behaviour.
- Documentation contains no confidential assessment materials, copied prompts, secrets, or fabricated verification.
- Record the documentation review, commit as `docs: define VeriQA MVP and agent workflow`, and push to the requested remote.

## 2. Workspace and development tooling

Establish the smallest runnable TypeScript workspace, without implementing authentication or the planner yet.

Acceptance criteria:

- npm workspaces contain two minimal React + Vite apps, one Hono API, and the shared contracts package, with a committed lockfile.
- Pin/document the supported Node.js version and provide a sanitized `.env.example` plus ignore rules for secrets and local generated outputs.
- `npm ci` installs from the lockfile; document the Playwright browser installation step.
- `npm run dev` starts the demo UI, QA UI, and API at documented local URLs; the API exposes a health check.
- Root `npm run typecheck` and `npm run build` pass for all workspaces.
- `npm test` executes a minimal Playwright smoke check that visits both app shells and checks the real API health endpoint; record exit code and discovered/executed counts.
- README lists only commands and setup steps verified on the workspace. No runtime OpenAI key is needed for this milestone.

## 3. Working demo authentication baseline

Build a correct, reproducible login → mock OTP → home → logout application.

Acceptance criteria:

- Real Hono endpoints enforce credentials, challenge-bound OTP validation, expiry, single use, sessions, protected access, and logout.
- Mock delivery is explicitly labelled and uses synthetic data; no external OTP service is required.
- Record authentication policies, fixture accounts, and deterministic test setup, including expiry checks without fragile timing assumptions.
- Playwright checks cover valid login, invalid credentials/OTP, expired and reused OTP, protected access, and logout, with isolated state.
- Record the actual passing baseline command, counts, and tested commit before any deliberate defect is introduced.

## 4. Supported test contract, storage, and approval

Define the safe executable vocabulary and review boundary.

Acceptance criteria:

- Shared Zod schemas cover versioned plans, requirement references, supported actions/assertions, approvals, and run records.
- Reject malformed definitions, unknown actions, and unsupported target/locator/API values without executing generated code.
- Save/load immutable plan revisions and approval records using JSON files and atomic writes.
- Approval binds the exact plan revision/hash; edits invalidate it, and unapproved plans cannot run.
- Contract/storage tests exercise accepted plans, rejection paths, and approval invalidation. Development fixtures are labelled manually authored until live AI output exists.

## 5. Live AI planning

Convert requirements into a validated reviewable plan through the OpenAI API.

Acceptance criteria:

- A backend endpoint sends requirements and supported capabilities to a configured OpenAI model using structured output, then validates the response with Zod.
- Keys stay server-side and out of stored artifacts. Persist requirements, plan revision, and available generation provenance.
- Planner errors, refusals, invalid output, and ambiguous expectations produce reviewable errors/drafts; none grants approval or a passing result.
- Record one actual live generation using non-confidential requirements, followed by explicit developer review and approval.
- Offline planner checks use labelled fixtures; report them separately from the actual live call.

## 6. Deterministic executor and approved-plan replay

Execute reviewed plans against the real demo through trusted Playwright adapters.

Acceptance criteria:

- Interpret only the supported schema with repository-owned actions and deterministic assertions; validate and check approval before running.
- Execute one run at a time with isolated state and a configured local target.
- A saved AI-generated approved plan replays without an OpenAI key or planner call and performs new browser/API actions.
- Store run ID, selected mode, plan source/revision, approval, tested SHA/dirty status, actual command, exit code, counts, and raw output.
- Executor checks demonstrate a pass, an actual failed assertion using a labelled runner-check fixture, invalid-plan rejection, and an unavailable-target error, without classifying every failure as a product defect.

## 7. Dashboard, reporting, and complete baseline journey

Connect the workflow with simple UI controls and inspectable evidence.

Acceptance criteria:

- A developer can enter requirements, generate/load and inspect cases, approve a revision, execute, and view individual results and artifacts.
- Live generation, replay, mock OTP delivery, and actual execution are clearly labelled.
- Real failures retain assertion details, raw logs, screenshots when available, and selected traces; capture errors are visible.
- Interrupted/partial runs and zero-execution runs cannot appear as fully passed. Reruns create separate records.
- Demonstrate the complete passing baseline through the dashboard with an approved AI plan; preserve commands, counts, and evidence.

## 8. Seeded defects and detection evidence

Demonstrate detection against deliberately defective committed code.

Acceptance criteria:

- Select and document a small set of explicit defects covered by already reviewed baseline expectations; do not seed before the baseline passes.
- Introduce defects in a clearly labelled `test(seed):` commit.
- Execute that clean committed version and preserve actual failed assertions, tested SHA, command/exit code, counts, and evidence under a unique run ID.
- Confirm failures correspond to the intended defects, rather than invalid expectations or an environment problem.
- Capture and reference detection evidence before fixing the application.

## 9. Fixes and preserved retests

Correct the detected defects without losing the failing record.

Acceptance criteria:

- Fix application behaviour in a separate `fix:` commit after detection evidence exists.
- Rerun the same approved plan against the clean fixed commit, using a new run ID.
- Preserve before/after SHAs, results, and artifacts with explicit cross-references; never replace or relabel the original failure.
- Run relevant regression tests and type checks, record actual outcomes, and document any observed flakiness or human correction in `AI_WORKFLOW.md`.

## 10. Fresh-clone reproduction and interview handoff

Make the complete journey easy to inspect and reproduce.

Acceptance criteria:

- From a fresh clone, follow documented installation and startup commands, execute approved replay without an API key, and verify the fixed baseline.
- Document how to reproduce the seeded version in a separate checkout and compare retained before/after evidence without rewriting history.
- Add `docs/DEMO.md` with a short walkthrough, exact commands, tested SHAs, run IDs, counts, artifact references, and known limitations.
- Review documentation against final behaviour; inspect tracked files for secrets and confidential material. Keep only sanitized demonstration artifacts.
- Run the final relevant tests, type checks, and build; record commands/exit codes and confirm remote push before November 2, 2026, 23:59 Singapore time.
