# Initial architectural decisions

Status: accepted direction for the MVP. Milestones 2–4 implement workspace tooling, demo authentication/home, and manual-plan contracts/storage/approval. Live AI generation is implemented in Milestone 5; deterministic execution and evidence collection are implemented in Milestone 6. Update this record when evidence changes a decision.

## D01 — A small TypeScript workspace

Use npm workspaces, React + Vite for both UIs, Hono for one backend process, and shared TypeScript/Zod contracts. Keep planner, storage, and reporting modules inside that backend initially.

This keeps the demo understandable and reduces setup. Separate services, a larger framework, and multi-agent orchestration add boundaries without helping the required journey. The trade-off is one local process boundary and limited scaling, which suit this single-developer MVP.

## D02 — AI proposes data; Playwright determines outcomes

Use the OpenAI API to propose structured test cases. Validate them with Zod, then map an allowlisted schema to trusted Playwright actions and assertions. Require developer approval of exact expectations before execution.

Reject arbitrary generated scripts. They offer more flexibility but make execution harder to constrain and explain. Zod validates structure and supported capabilities, not requirement correctness; developer review addresses that remaining gap. AI defect investigation is optional future work and cannot award pass/fail results.

## D03 — Mock delivery with real authentication behaviour

Use a local, labelled mock OTP store and synthetic emails. Following the developer's Milestone 3 clarification, login is passwordless and accepts only valid emails ending exactly with `@e.ntu.edu.sg`. Keep email checks, OTP challenge binding, expiry, single use, session creation, protected access, and logout in the actual Hono backend.

Real SMS/email delivery introduces credentials, costs, and external failures. Mocking the entire login result would fail to test authentication. The chosen boundary keeps delivery reproducible while exercising the behaviour under test. It is a local demo, not a production authentication design.

## D04 — JSON/files instead of a database or queue

Persist plan revisions, approvals, and run records as JSON, with filesystem evidence. Use generated IDs, atomic writes, finalized records that are not overwritten, and one run at a time. Temporary demo auth state can reset in memory on restart.

Files make evidence easy to inspect and copy. The trade-off is no concurrent writers, distributed scheduling, transactional database, or multi-user guarantees; these are outside the MVP boundary.

## D05 — Live generation and replay share one executor

Live mode requests an OpenAI plan, validates it, and requires review/approval. Replay loads a previously approved revision, revalidates compatibility and approval, and creates a new real execution without a planner call.

Store plan origin independently from selected run mode so an AI-generated plan remains recognisable during replay. A cached response is only a definition, never a new execution result. Keep a sanitized approved AI-generated fixture for interviews; clearly label any earlier manually authored development fixtures.

## D06 — Human approval is a separate artifact

Bind approval to an immutable revision or content hash and record it independently of AI output. A changed plan requires new validation and approval. The UI may provide simple controls; no identity service is needed for a single local developer.

This adds a deliberate review step because schema-valid assertions can still encode the wrong product policy. Approval records document developer intent, not a production audit/authentication system.

## D07 — Evidence and chronological defect/fix history

Prove a working baseline, seed defects in a `test(seed):` commit, capture failing evidence and tested SHA, then fix in a separate `fix:` commit and create a new retest record. Finalized run records remain separate and retain real logs and available artifacts.

Record test counts and distinguish invalid definitions, execution errors, product assertion failures, and observed flakiness. Disable automatic retries initially. This costs some storage but makes the demo's claims inspectable and prevents a successful rerun from concealing a failure. Store generated outputs locally by default; retain only reviewed sanitized demonstration evidence in Git.

## D08 — Minimal UI and staged delivery

Use simple forms, buttons, case lists, and evidence links. Establish a working auth baseline, then schema/approval, planner, executor/replay, dashboard/reporting, and finally the seeded defect/fix demonstration.

This delays visual polish and optional integrations so effort goes to the smallest reproducible vertical slice. Milestone 1 remains documentation only; runtime versions, exact schemas, endpoints, and commands become concrete at their implementation milestones.

## D09 — Compiled contracts and local development proxies

Build the shared contracts package to ESM JavaScript and TypeScript declarations before starting or checking consumers. Root scripts enforce this order; the dev command watches contracts for edits. This small build step avoids coupling the compiled Node API to TypeScript source exports or custom path aliases.

Both Vite servers proxy `/api` to the loopback Hono process. This lets the shells exercise the actual API without adding CORS setup. Production UI serving/proxying is outside Milestone 2; its verified interactive workflow uses the development servers.

## D10 — Minimal real smoke checks with separate invocation reports

Use three Playwright checks: direct health JSON, demo rendering plus API connectivity, and dashboard rendering plus API connectivity. Start fresh servers, reject port conflicts, use one Chromium worker, and disable retries. Unique report directories preserve each invocation; `--list` discovery reports remain separate from actual executions.

This verifies the workspace boundary without introducing the future AI-plan executor or persistence system. Reports and dependency/build caches stay ignored; the committed workflow record contains the actual commands, counts, exit codes, and local artifact references.

## D11 — In-memory email sessions and checklist baseline

Generate six-digit codes using Node crypto, valid for five minutes and one successful use. Validate the exact lowercase email suffix without trimming/case conversion. Store one-hour random opaque sessions on the server; use an HTTP-only, SameSite=Strict cookie on local HTTP. Deleting the server entry on logout ensures an old cookie cannot restore access.

Store tasks per exact email in memory. Persist them across refresh and re-login, but clear them on API restart. This meets the developer's demo-state requirement without introducing JSON storage for temporary auth/tasks; future plans/reports will still use files. The mock inbox intentionally reveals a known challenge's code and does not demonstrate real mailbox ownership. No production authentication claim is made.

## D12 — Opted-in test clock and state reset

Mount reset and server-time-advance routes only with `VERIQA_TEST_MODE=1`, which Playwright sets on its own API process. Reset all maps and the clock before every demo test; advance exactly to expiry boundaries without sleeps. The helpers do not issue sessions or skip validation. Check the normal compiled API separately to confirm the helpers return 404 and real time is used.

The developer controls remain outside the UI and normal startup. One serial worker prevents one test's reset from invalidating another's session. These trusted fixtures are development tooling, not AI-generated actions or the future test executor.

## D13 — A CLI and strict named demo operations

Implement manual-plan import, full inspection, explicit `--by`/`--confirm` approval, and an approval-only check in a small root CLI. Keep storage in the backend module and schemas in shared contracts; add no dashboard, database, network API, or executor. Source version 1 permits only `manual-fixture`, so manually authored definitions cannot claim live AI provenance.

Use named routes/controls and typed UI expectations plus two fixed read-only API checks. Reject generic URLs/selectors/methods/code. Allow negative literal input values to test application rejection. Structural validation cannot establish correct product policy or a valid action sequence, so approval still requires a human review of expectations.

## D14 — Immutable revisions, canonical digest, current pointer

Every import creates a UUID revision, even if its canonical plan content matches an older revision. Bind approval to both UUID and SHA-256 digest, and accept only the current revision at the future execution gate. This prevents an edit or rollback from reviving an older approval while preserving historical evidence. The CLI never automatically approves an imported plan; synthetic approvals in tests use isolated temporary storage.

Store approvals under plan ID/revision for direct lookup, refining the earlier proposed flat approval-ID layout. Publish immutable JSON via a temporary file and exclusive hard link; rename only the current pointer. Prefer a single local writer over locking or transaction infrastructure. Revalidate schemas, identity, and digests on reads. The local file owner remains trusted; this is not a tamper-proof identity/audit service.

## D15 — Unit contracts separate from real browser baseline

Use the existing `tsx` dependency with Node's test runner for contract/store/CLI tests. Exclude `tests/unit/` from Playwright discovery. Preserve unit stdout/stderr/exit metadata and CLI rejection evidence separately from real Playwright reports. Synthetic run-metadata examples validate the schema only and never count as executed product cases. Future execution must use the approval gate; Milestone 4 deliberately supplies no runner.

## D16 — Live structured planning through the existing CLI

Use native Node fetch and Responses strict JSON Schema, generated from Zod, then validate every response locally including semantic reference constraints. No new dependency or endpoint is needed. Only the generate command loads root `.env`; keys never enter Vite code. Defaults: gpt-4.1-mini, 90-second timeout, 6000 output-token cap, store:false, no automatic retry.

Preserve manual version-1 compatibility; extend source with live-ai and required actual provenance, which the model cannot author. Keep immutable unapproved plans and safe interaction artifacts on both success and failure. Copy the real live definition into a clearly unapproved offline fixture for reproduction. Human approval remains a separate operator action. Model notes can be wrong even with schema-valid cases, so preserve the original and iterate the prompt rather than silently rewriting generated provenance.

## D17 — CLI coordinator and separate Playwright evidence contract

Keep the next vertical slice in a CLI rather than adding dashboard routes ahead of Milestone 7. The coordinator loads an exact approved revision, saves a snapshot, starts a fixed Playwright config with managed local API/demo servers, and publishes immutable run JSON. A single-worker runner with backend reset plus new context per case prevents shared auth/checklist state. An exclusive directory lock rejects concurrent executor runs. No new dependency is needed.

Use native Playwright JSON/statuses, maintained adapters and explicit expected/actual observations. Final run records embed full plan/provenance/approval and expose relative evidence paths independent of native reporter internals. Comparison identity is `(planId, revision, contentHash, caseId)` across distinct run IDs/SHAs. Run mode and plan origin remain separate. Partial/setup/runner failures cannot pass. Raw logs are appended during execution; interrupted coordinators can leave incomplete attempts and a stale lock, documented for a future dashboard. No automatic recovery worker or artifact server is added.

Runner verification uses isolated, visibly synthetic approvals and one deliberately wrong expectation, separate from the existing genuine human approval of the live plan. This produces actual failure screenshots/traces without seeding an application defect or misrepresenting a human decision.

## D18 — Thin local dashboard API and preserved evidence reads

Reuse the planner, PlanStore and executor through a small Hono route group. HTTP launch allocates a UUID and returns 202 while the existing runner works; store no database/queue state. RunStore unions finalized JSON with preserved attempts, treating corrupt/missing completion as errors/incomplete. Require indexed artifact paths and real-path containment, including symlinks, before serving bytes. A custom JSON action header plus local origin/host checks protects the single-operator mutation boundary.

Use explicit `dev:qa` opt-in for synthetic resets and the executor's existing external-target mode. Starting a second API on the dashboard's own port would conflict; enabling reset helpers for every normal dev session would erase the established boundary. The trade-off is one documented QA startup command. New dashboard AI proposals get fresh IDs to preserve the current approved plan. Optional real success screenshots reuse native Playwright capture and immutable indexes. No re-created executor, speculative defect evidence or generated screenshot assets.
