# Initial architectural decisions

Status: accepted direction for the MVP. Milestones 2–3 implement workspace tooling, health checks, and demo authentication/home; AI QA capabilities remain planned. Update this record when evidence changes a decision.

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
