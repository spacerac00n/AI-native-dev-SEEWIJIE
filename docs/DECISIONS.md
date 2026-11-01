# Initial architectural decisions

Status: accepted direction for the MVP, not implemented capabilities. Update this record when evidence changes a decision.

## D01 — A small TypeScript workspace

Use npm workspaces, React + Vite for both UIs, Hono for one backend process, and shared TypeScript/Zod contracts. Keep planner, storage, and reporting modules inside that backend initially.

This keeps the demo understandable and reduces setup. Separate services, a larger framework, and multi-agent orchestration add boundaries without helping the required journey. The trade-off is one local process boundary and limited scaling, which suit this single-developer MVP.

## D02 — AI proposes data; Playwright determines outcomes

Use the OpenAI API to propose structured test cases. Validate them with Zod, then map an allowlisted schema to trusted Playwright actions and assertions. Require developer approval of exact expectations before execution.

Reject arbitrary generated scripts. They offer more flexibility but make execution harder to constrain and explain. Zod validates structure and supported capabilities, not requirement correctness; developer review addresses that remaining gap. AI defect investigation is optional future work and cannot award pass/fail results.

## D03 — Mock delivery with real authentication behaviour

Use a local, labelled mock OTP store and synthetic credentials. Keep credential checking, OTP challenge binding, expiry, single use, session creation, protected access, and logout in the actual Hono backend.

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
