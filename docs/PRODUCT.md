# Product definition

Status: Milestones 1–3 implement the workspace and demo authentication/home baseline. The QA workflow below remains planned.

## Target developer and problem

The primary user is a developer who has written requirements for a small web application and wants a quick, explainable check that the implemented behaviour matches those requirements. The interview reviewer must be able to reproduce both a detected defect and a successful retest.

Generating plausible test descriptions alone does not verify software. VeriQA connects proposed tests to supported executable actions, human-reviewed expectations, deterministic assertions, and preserved evidence.

## Inputs

- Plain-language application requirements, including expected outcomes.
- A known local demo target configured by the developer, not an arbitrary URL chosen by the AI.
- Either a live OpenAI-generated plan or a previously saved plan with explicit developer approval.
- Synthetic demo accounts and a mock OTP delivery interface.

Each proposed case must identify the requirement it covers, its preconditions, supported actions, and explicit expected results. Ambiguous requirements require developer clarification or plan edits before approval; the planner must not silently invent product policy.

## Outputs

- A versioned, Zod-validated plan that the developer can inspect and approve.
- A separate approval record tied to the exact plan revision. Editing a plan requires new validation and approval.
- A new execution record for every run, including live/replay selection, plan origin and revision, tested commit SHA, execution counts, timings, and deterministic outcomes.
- Evidence links to actual assertion failures, raw logs, screenshots, and selected Playwright traces when captured. Missing evidence must be reported honestly.
- Separate before-fix and after-fix records, with links between the defect and retest.

Reports distinguish product assertion failures, invalid test definitions, and environment/execution errors. Flaky behaviour is recorded only when differing outcomes have actually been observed across comparable runs; one failure or one passing rerun does not establish stability.

## Demo application requirements

Start with a working application before introducing defects:

1. A syntactically valid synthetic email ending exactly with `@e.ntu.edu.sg` creates an OTP challenge. Reject other domains, spoofed suffixes, and non-exact domain variants. Login is passwordless.
2. OTP delivery uses a clearly labelled mock interface, with no SMS/email provider.
3. The backend checks that an OTP belongs to the challenge, is correct, is unexpired, and has not already been consumed.
4. Successful verification creates a real local session and allows access to the home page.
5. Unauthenticated access to protected content is rejected by the backend, and logout invalidates access.
6. The home page welcomes the authenticated email and shows a tiny checklist. Changes update backend state and survive page refresh.

Implemented policy: generate six-digit OTPs with five-minute validity; use one-hour opaque server sessions in HTTP-only, SameSite=Strict cookies. Tasks persist per exact email in memory across refresh/re-login. Backend restart clears challenges, sessions, and tasks. Example account: `synthetic.student@e.ntu.edu.sg`; no real delivery or mailbox verification occurs. Exact setup/commands are in [README.md](../README.md).

Playwright resets all synthetic state before each demo case and advances a fixed test clock for exact expiry boundaries. These helpers exist only on an opted-in test server and never bypass authentication. Normal startup uses real time. Baseline tests must pass before Milestone 4 begins.

## QA workflow requirements

1. Enter requirements and request live generation, or load a saved approved plan for replay.
2. Validate every plan against the supported action schema, regardless of origin. Reject unsupported actions and malformed definitions before execution.
3. Inspect requirement coverage and expected outcomes; record explicit developer approval before a new or edited plan can run.
4. Execute approved tests against the real local demo through trusted Playwright adapters.
5. Inspect test counts, failures, and evidence; correct application code when a verified product defect is found.
6. Run a new execution against the fix and preserve both records.

Live generation and replay share the same validation, approval, execution, and reporting rules. A saved draft or cached AI response is not automatically approved. Replay reuses the reviewed definition, not browser responses or historical pass/fail results.

## MVP boundary

Included: one developer on one machine, one local demo, one run at a time, browser/API checks, a small supported action vocabulary, live generation, approved-plan replay, simple review controls, and evidence-backed reports. Development may use clearly labelled manually authored fixtures before live generation is available; the final replay demonstration must use a previously AI-generated and approved plan.

Excluded: arbitrary website crawling, generated JavaScript execution, real OTP delivery, production authentication infrastructure, databases, distributed queues, multi-agent orchestration, multi-tenant accounts, CI integrations, and elaborate dashboard design. Optional AI defect investigation is deferred until the core journey is reproducible; it cannot decide test outcomes.

## Completion evidence

The MVP is complete when a fresh clone can reproduce a passing baseline, detect explicitly seeded defects through real failed assertions, and show successful retests after separate fixes. The final walkthrough must identify plan provenance, approvals, tested commits, commands, exit codes, test counts, and retained artifacts. No confidential assessment PDF or copied assessment prompts belong in the repository.
