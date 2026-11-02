# Implementation plan

Milestones are sequential acceptance gates, not claims of completed implementation. Keep changes small, document actual verification, and commit incrementally. Milestones 1–9 are implemented and verified, including detection of a seeded regression and a separate clean fix/retest using the unchanged approved plan through the dashboard. Milestone 10 implementation and independent fresh-clone verification are complete; actual results and publication tracking are in [M10_VERIFICATION.md](M10_VERIFICATION.md). See [AI_WORKFLOW.md](AI_WORKFLOW.md) for actual results and retained development failures. Root README commands must stay current as each milestone ships.

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

Verification: all four workspaces type-check and build; `npm ci` succeeds; the dev command serves the documented URLs; all three Playwright smoke tests pass with real browser/API execution. Authentication, OpenAI integration, and seeded defects are not included.

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

Verification: 21 demo tests plus 3 workspace smoke tests pass (24 total); type checks and builds pass. Normal compiled API checks confirm real-clock auth/task behaviour and unavailable test controls. One checklist interaction failure was corrected and its original screenshot/trace preserved. The developer clarified passwordless exact-domain email login and a backend-backed checklist for this milestone.

Acceptance criteria:

- Real Hono endpoints enforce valid emails ending exactly with `@e.ntu.edu.sg`, challenge-bound OTP validation, expiry, single use, sessions, protected access, and logout.
- Mock delivery is explicitly labelled and uses synthetic data; no external OTP service is required.
- The authenticated home page welcomes the email and has a tiny checklist whose backend state survives refresh.
- Record authentication policies, synthetic fixture emails, and deterministic test setup, including expiry checks without fragile timing assumptions.
- Playwright checks cover valid login, rejected/spoofed email domains, wrong/expired/reused OTPs, protected access, task toggle/refresh, and logout, with isolated state.
- Record the actual passing baseline command, counts, and tested commit before any deliberate defect is introduced.

## 4. Supported test contract, storage, and approval

Define the safe executable vocabulary and review boundary.

Verification: 37 unit/contract/storage/CLI tests and all 24 existing Playwright baseline tests pass; type checks/builds pass. The root CLI imports and inspects the manually authored fixture, rejects invalid definitions, and blocks an unapproved revision. Actual human review/approval is still pending for the local fixture. No AI generation or structured-plan execution is implemented.

Acceptance criteria:

- Shared Zod schemas cover versioned plans, requirement references, supported actions/assertions, approvals, and run records.
- Reject malformed definitions, unknown actions, and unsupported target/locator/API values without executing generated code.
- Save/load immutable plan revisions and approval records using JSON files and atomic writes.
- Approval binds the exact plan revision/hash; edits invalidate it, and unapproved plans cannot run.
- Contract/storage tests exercise accepted plans, rejection paths, and approval invalidation. Development fixtures are labelled manually authored until live AI output exists.

## 5. Live AI planning

Convert requirements into a validated reviewable plan through the OpenAI API.

Implemented CLI generation and executed two real API calls (HTTP 200). Saved unapproved live-origin revisions with actual provenance; 49 offline unit tests cover success/error paths. The developer has verified the expectations and run the named approval command for live plan vp1, revision d61ba281-a45b-47da-9ae2-5bf3f5747695; the existing approval record was independently verified. See AI_WORKFLOW.md for the confirmation. The CLI substitutes for the originally planned endpoint, as explicitly permitted by the Milestone 5 request.

Acceptance criteria:

- A server-side CLI sends requirements and supported capabilities to a configured OpenAI model using structured output, then validates the response with Zod.
- Keys stay server-side and out of stored artifacts. Persist requirements, plan revision, and available generation provenance.
- Planner errors, refusals, invalid output, and ambiguous expectations produce reviewable errors/drafts; none grants approval or a passing result.
- Record one actual live generation using non-confidential requirements, followed by explicit developer review and approval.
- Offline planner checks use labelled fixtures; report them separately from the actual live call.

## 6. Deterministic executor and approved-plan replay

Execute reviewed plans against the real demo through trusted Playwright adapters.

Implemented through `npm run execute -- <plan-id> <revision>`: exact approval/hash checks, fixed adapters, per-case reset/context isolation, one-run lock, and immutable dashboard-ready JSON/evidence. The existing approved live plan replayed without an OpenAI key: 3/3 passed. Separate synthetic runner checks cover all adapters, rejection paths, a real failed assertion, and a refused target connection. No dashboard change or application defect was introduced. Evidence contract and comparison fields are documented in [EXECUTION.md](EXECUTION.md).

Acceptance criteria:

- Interpret only the supported schema with repository-owned actions and deterministic assertions; validate and check approval before running.
- Execute one run at a time with isolated state and a configured local target.
- A saved AI-generated approved plan replays without an OpenAI key or planner call and performs new browser/API actions.
- Store run ID, selected mode, plan source/revision, approval, tested SHA/dirty status, actual command, exit code, counts, and raw output.
- Executor checks demonstrate a pass, an actual failed assertion using a labelled runner-check fixture, invalid-plan rejection, and an unavailable-target error, without classifying every failure as a product defect.

## 7. Dashboard, reporting, and complete baseline journey

Connect the workflow with simple UI controls and inspectable evidence.

Implemented a single React workspace with requirement entry/live planning, case/provenance review, exact-revision approval, execution, history, case evidence and two-run comparison. Hono routes reuse the existing planner/store/executor and serve only indexed, contained artifacts. Real baseline replay of approved `vp1` through the dashboard passed 3/3; a new real live proposal was generated and left unapproved. Automated UI approval tests use clearly labelled synthetic fixture reviewers. No seeded product defect/fix evidence is claimed before Milestones 8–9. See DASHBOARD.md, DEMO.md and AI_WORKFLOW.md.

Acceptance criteria:

- A developer can enter requirements, generate/load and inspect cases, approve a revision, execute, and view individual results and artifacts.
- Live generation, replay, mock OTP delivery, and actual execution are clearly labelled.
- Real failures retain assertion details, raw logs, screenshots when available, and selected traces; capture errors are visible.
- Interrupted/partial runs and zero-execution runs cannot appear as fully passed. Reruns create separate records.
- Demonstrate the complete passing baseline through the dashboard with an approved AI plan; preserve commands, counts, and evidence.

## 8. Seeded defects and detection evidence

Demonstrate detection against deliberately defective committed code.

Verified: commit `d2b776ba74431cbce08172d7f24a60195f03e646` updates a checklist response copy without saving the change. Dashboard replay `395693c2-5ad9-4842-a203-2e077eb1cd2c` of the unchanged approved `vp1` revision executed all three cases: two passed, case1 failed its persistence assertion, exit 1, dirty false. Original baseline `86b3c3f5-5ffd-4a9e-9001-bc6d0437927d` remains unchanged and selectable alongside this failure in comparison. Screenshot, trace, HTTP evidence and limitations are recorded in AI_WORKFLOW.md. The later fix is recorded separately in Milestone 9.

Acceptance criteria:

- Select and document a small set of explicit defects covered by already reviewed baseline expectations; do not seed before the baseline passes.
- Introduce defects in a clearly labelled `test(seed):` commit.
- Execute that clean committed version and preserve actual failed assertions, tested SHA, command/exit code, counts, and evidence under a unique run ID.
- Confirm failures correspond to the intended defects, rather than invalid expectations or an environment problem.
- Capture and reference detection evidence before fixing the application.

## 9. Fixes and preserved retests

Correct the detected defects without losing the failing record.

Verified: `1965faeb53ae987c1f3943141ca1a0199b2a919b` (`fix: restore checklist persistence`) updates stored tasks directly. After restarting all three servers, dashboard replay `2338b3bc-f5f7-43b1-ab2c-eaf7f7940c77` of the exact existing approved `vp1` revision passed 3/3, exit 0, dirty false, with three genuine screenshots. Comparison confirms the same plan/revision/hash/approval and case1 assertion-failed → passed, expected true unchanged, actual false → true. All 1,366 preexisting data/artifact files remain unchanged. Baseline 24/24, unit 63/63, executor 7/7, isolated dashboard 2/2, typecheck and build passed. An initial dashboard environment failure is retained and explained in AI_WORKFLOW.md. Milestone 10 and merging remain out of scope.

Acceptance criteria:

- Fix application behaviour in a separate `fix:` commit after detection evidence exists.
- Rerun the same approved plan against the clean fixed commit, using a new run ID.
- Preserve before/after SHAs, results, and artifacts with explicit cross-references; never replace or relabel the original failure.
- Run relevant regression tests and type checks, record actual outcomes, and document any observed flakiness or human correction in `AI_WORKFLOW.md`.

## 10. Fresh-clone reproduction and interview handoff

Make the complete journey easy to inspect and reproduce.

Verified: 88 authentic historical payload files with declared trace redaction and integrity manifest; original approval and dashboard comparison restored in fresh clones. Clean fixed replays passed 3/3 without a key. A separate unchanged seed checkout executed 3 cases, 2 passed / 1 persistence assertion failed. Baseline 24/24, unit 67/67, executor 7/7, dashboard 2/2, typecheck and build passed. The corrected trace package passed another fresh restore/replay and 448-line trace parse check. README and DEMO.md provide explicit reproduction commands. Final publication confirmation follows the evidence commit.

Acceptance criteria:

- From a fresh clone, follow documented installation and startup commands, execute approved replay without an API key, and verify the fixed baseline.
- Document how to reproduce the seeded version in a separate checkout and compare retained before/after evidence without rewriting history.
- Add `docs/DEMO.md` with a short walkthrough, exact commands, tested SHAs, run IDs, counts, artifact references, and known limitations.
- Review documentation against final behaviour; inspect tracked files for secrets and confidential material. Keep only sanitized demonstration artifacts.
- Run the final relevant tests, type checks, and build; record commands/exit codes and confirm remote push before November 2, 2026, 23:59 Singapore time.
