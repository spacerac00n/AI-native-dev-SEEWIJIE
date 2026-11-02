# Deterministic execution and evidence

Use `npm run execute -- <plan-id> <exact-revision>` from the repository root. The CLI calls `PlanStore.requireApproved` and runs only the returned revision snapshot. Schema, digest, current revision and existing human approval must agree. It never creates approvals. A fresh clone must import, review and explicitly approve a new local revision first. Replay neither loads `.env` nor imports/calls the planner; OpenAI settings are removed from runner/server child environments.

The maintained `tests/executor/adapters.ts` maps every supported Zod action/assertion to fixed routes and semantic locators. Plans cannot supply code, selectors, origins or request methods. UI matchers use Playwright's retrying assertions; API matchers compare actual status/body data using Playwright `expect`. API home checks share the browser's real cookie session. Click adapters wait for the appropriate response and pending control update before continuing. Mock OTP reads use the visibly labelled local delivery, with no authentication shortcut.

Default execution owns fresh API/demo servers on ports 3000/5173 and rejects occupied ports. The API opts into test mode. Each case resets backend maps/clock, gets a new browser context, and has case-local OTP values. One worker and an exclusive `artifacts/executor/.active-run/` lock prevent overlapping resets. Retries are disabled. External mode uses these same fixed addresses and requires test controls; it is intended for local runner checks. Do not run independent baseline tests against these ports concurrently.

## Stable JSON contract

`executionRecordSchema` in `packages/contracts/src/execution.ts` validates these records. Completed executions publish identical, immutable JSON at `data/runs/<UUID>.json` and `artifacts/executor/<UUID>/run.json`. JSON publication uses an exclusive hard link from a completed temporary file. The dashboard can enumerate `data/runs`, sort by `metadata.startedAt`, and read individual records without interpreting native Playwright reports.

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Version of the dashboard record (currently 1). |
| `metadata.runId` | Unique UUID for this execution; never reused. |
| `metadata.planId`, `revision`, `contentHash` | Exact saved identity and canonical SHA-256 definition hash. |
| `metadata.planSource`, `mode`, `execution` | Origin (`live-ai` or manual fixture), selected `replay` mode, and `real-playwright` execution. |
| `plan` | Complete immutable saved revision, including original AI provenance, requirements, cases and generation review notes when present. |
| `approval`, `metadata.approvalId` | Existing approval ID, exact revision/hash, reviewer label, decision and timestamp. Original reference: `data/approvals/<plan-id>/<revision>.json`. |
| `metadata.testedCommit`, `worktreeDirty` | Actual repository SHA and dirty flag captured before server startup. Dirty runs do not prove behaviour of the clean parent commit. |
| `metadata.startedAt`, `finishedAt`, `durationMs` | UTC execution timestamps and wall-clock duration in milliseconds. Cases have separate durations. |
| `metadata.command`, `exitCode` | Actual fixed Playwright child command and exit status. `command.json` also preserves argv and raw close code/signal; signalled children make the executor exit 1. |
| `metadata.outcome`, `counts` | Overall outcome plus discovered/executed/passed/failed/skipped. Discovered is the validated selected-plan case count (even if server startup prevents Playwright collection). Executed includes Playwright tests that fail during setup; failed includes both assertion and execution errors, distinguishable per case. |
| `cases[]` | Stable case ID, name, requirement references, status, phase, duration, attempted assertion definitions, expected/actual observations, errors and evidence paths. Assertions after the first failure are not executed. |
| `errors` | Runner/report/startup errors; never interpreted as a product verdict. |
| `metadata.artifacts`, `cases[].artifacts` | Relative paths rooted at `artifacts/executor/<run-id>/`. No absolute paths or traversal in this dashboard index. |

No positive result can come from an LLM or cached output. The coordinator combines actual Playwright statuses with trusted case observations; missing/incomplete tests cannot pass. Case statuses are `passed`, `assertion-failed`, `execution-error`, or `skipped`. Run outcomes are `passed`, `assertion-failed`, or `execution-error`. A failed assertion is a candidate for human review of product behaviour versus expectation, not an automatic claim of a product defect.

Before/after comparison requires only two run IDs plus matching `(planId, revision, contentHash, caseId)` values. Display each run's SHA/dirty flag, times, approval ID, status and assertion observations side by side; retain both evidence roots. Match by case ID rather than title or position. If revision/hash differs, show an explicit changed-plan comparison; matching case IDs alone do not establish unchanged expectations. Requirement IDs provide coverage links. No mutable “before”/“after” label is needed in the source records.

## Artifact layout and failure handling

Each unique run directory retains:

- `attempt.json`: selected IDs, invocation, start time and Git state, even for rejected attempts.
- `input.json`: exact approved saved plan and approval snapshot.
- `command.json`, `stdout.log`, `stderr.log`, `playwright.json`: actual process information and raw Playwright evidence.
- `cases/<case-id>/observation.json`, `result.json`, `browser-api.log.json`: trusted observations, final case result and available browser console/page/request/HTTP errors plus API assertion responses.
- `test-results/...`: native Playwright screenshot, trace, error context and attachments when produced. Capture/startup failures may prevent screenshots; never create substitutes.
- `run.json`: finalized dashboard record. Rejected attempts instead have `rejection.json` and no executed-case claim.

Raw Playwright reports/traces can contain absolute local source paths and synthetic session/OTP data. The dashboard must use validated relative index paths for artifact access and serve them only from the chosen run directory. Treat all plan/log text as display data. The Milestone 7 dashboard implements these reads through `/api/qa` with indexed-path and real-path containment checks; see [DASHBOARD.md](DASHBOARD.md).

Raw stdout/stderr are appended during execution so partial output survives interruption. An abruptly killed coordinator may leave an attempt without `run.json` and a stale lock. Show this as incomplete, never passed. Inspect `.active-run/owner.json` and confirm that coordinator/runner are stopped before manually removing a stale lock; do not remove its run evidence. Normal failures release the lock. This local single-operator MVP does not add a recovery worker or database.

## Human verification checklist

1. Inspect the saved plan's exact revision/hash and actual approval; verify AI source/model/request IDs separately from execution mode.
2. Replay with `OPENAI_API_KEY` absent. Confirm new run ID, all expected case IDs, actual counts, exit code and `real-playwright` label.
3. Inspect a case's expected/actual assertions and browser/API logs. Confirm login/logout and checklist persistence match the reviewed requirements.
4. Open the labelled runner-check failed screenshot and `npx playwright show-trace <trace-path>`; compare the real rendered value with the deliberately wrong expectation. This is executor verification, not a seeded app defect.
5. Inspect unavailable-target evidence: `execution-error`, connection refusal, no passing cases. Check rejected attempts contain no browser launch/result claim.
6. Preserve the complete approved-plan run, plan revision/approval, runner-check failure, unavailable-target run, and earlier reports. For later defect/fix demonstration, run the same revision against separate clean seed/fix commits and retain both runs.

## Dashboard launch and optional successful screenshots

`npm run dev:qa` starts the API/demo/dashboard with synthetic reset controls enabled. The dashboard launches the same executor in external-target mode, allocating a run UUID before returning HTTP 202. A pending response is never a passing result. The runner still rechecks exact revision/approval/hash, resets each case, and determines outcomes through Playwright.

The dashboard's optional successful-case screenshot control enables Playwright's `screenshot: on` mode for that run. Default CLI behavior remains failure-only capture. This records genuine final browser output for both passing and failing cases, with no placeholders or retroactive screenshots added to old runs. The selected setting is preserved in `attempt.json`, and native PNG attachment paths enter the existing run/case artifact indexes. Failed traces remain retained; successful traces are not added.

History includes finalized records and rejected/incomplete artifact attempts, including earlier Milestone 6 evidence. The active in-memory set identifies currently HTTP-launched runs; an interrupted process leaves incomplete evidence until inspected. Comparison supports current records before actual defect/fix runs exist, but explicitly distinguishes changed plan/revision/hash and absent screenshots. It does not imply a code fix from a green result alone.
