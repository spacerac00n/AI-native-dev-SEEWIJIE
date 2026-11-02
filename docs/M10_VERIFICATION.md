# Milestone 10 — actual fresh-clone verification

The developer requested GPT-6 Luna with medium reasoning for verification. That subagent created a genuinely fresh, non-hardlinked local Git clone of committed implementation `b7819331997d13fb308a18476ed3e8484e66e502`. No development `node_modules`, `.env`, saved state or approval was copied outside the reviewed restoration package. Final documentation/verification records follow in a separate commit; this tested source SHA is retained rather than relabelled as a later commit.

Fresh checkout: `/private/tmp/veriqa-m10-fresh-20261102-2335`. Command evidence is retained locally under `artifacts/verification/m10/`; selected reviewed receipts and outputs are published under `evidence/interview/verification/` when verification is complete. The earliest setup receipts contain argv/cwd/exit/duration; later receipts additionally record timestamps/Git state where captured. No missing timing metadata is invented.

## Setup, restoration and fixed replay

| Command | Exit | Actual outcome |
| --- | --- | --- |
| `git clone --no-hardlinks --branch codex/m10-reproduction /Users/grassjelly/Desktop/Bytedance-AI-Native /private/tmp/veriqa-m10-fresh-20261102-2335` | 0 | Fresh clone; HEAD independently checked as `b7819331997d13fb308a18476ed3e8484e66e502`. |
| Initial sandboxed `npm ci --cache .cache/npm` | 1 | Environment failure: npm `Exit handler never called!`; retained. |
| Same `npm ci --cache .cache/npm` with network permission | 0 | 60 packages added, 65 audited; no vulnerabilities reported. |
| `npx playwright install chromium` | 0 | Installation command succeeded; required Chromium was already available in the OS browser cache. A clean-OS browser download was not exercised. |
| `npm run evidence:verify` | 0 | 88 payload hashes and historical relationships valid. |
| `npm run evidence:restore` | 0 | Restored 88 files with exact original approval. |
| Repeated `npm run evidence:restore` | 0 | Restored 0; reused 88 byte-identical files. |
| Initial sandboxed approved-plan replay | 1 | Environment failure before Playwright startup: tsx Unix socket `listen EPERM`. No product verdict. |
| Same `env -u OPENAI_API_KEY npm run execute -- vp1 d61ba281-a45b-47da-9ae2-5bf3f5747695` with process/loopback permission | 0 | New real Playwright run: 3 discovered/executed/passed, no failed/skipped cases. |

New fixed replay run: **`23b180b4-535f-4564-a1de-cc65d6fc9103`**, tested commit **`b7819331997d13fb308a18476ed3e8484e66e502`**, `worktreeDirty: false`, `real-playwright`, original approval `0d20cfb2-7e27-4693-adef-27287f2b8362`. All 88 restored files still matched that commit’s packaged hashes after execution. No model request or new approval was made.

## Dashboard, seeded reproduction and final suites

All suites run sequentially in the first clean fresh checkout; fixture approvals inside executor/dashboard regression checks are explicitly synthetic and separate from the original human approval.

| Command | Exit | Actual outcome |
| --- | --- | --- |
| `npm run test:unit` | 0 | 67 executed/passed; 0 failed/cancelled/skipped. Includes four restoration safety checks. |
| `npm run test:executor` | 0 | 7 harness checks passed. Deliberate wrong-expectation and unavailable-target scenarios remain preserved as expected negative checks, not application regressions. |
| `npm run test:dashboard` | 0 | 2 discovered/executed/passed, 0 failed/skipped, 11.7 seconds. Real fixture approval/execution, screenshots, logs, trace retrieval and comparison checked. |
| `npm test` | 0 | 24 discovered/executed/passed, 0 failed/skipped, 6.8 seconds. |
| `npm run typecheck` | 0 | Contracts, API, both frontends, runner/config/tests and restoration script types passed. |
| `npm run build` | 0 | Contracts, compiled API and both Vite frontends built. |

Original-history check: the restored original M8/M9 run IDs appear in the existing dashboard and the real comparison screenshot shows the unchanged expectations, 2/1 → 3/0 counts and actual unchecked → checked images. Root independently inspected the screenshot. Bespoke browser-check attempts encountered nested/hidden locator and relative-URL errors; their individual failures remain recorded. These are verification-script failures, not a claim of a product defect. Maintained dashboard checks passed without changing product code or expectations.

### Independent seeded reproduction

Separate non-hardlinked clone `/private/tmp/veriqa-m10-seed-20261102-2350` checked out detached original seed `d2b776ba74431cbce08172d7f24a60195f03e646`, unchanged. `npm ci --cache .cache/npm` exited 0; the original approved plan/approval and historical evidence were restored from the fixed checkout without approval creation. Exact keyless replay exited **1** and produced new run **`96135467-a968-4092-8992-894e882ce22d`**: **3 discovered/executed, 2 passed / 1 assertion-failed / 0 skipped**, dirty false. Case1 still expected true and observed false; cases2/3 passed. This is the intended product persistence failure, not an environment failure.

The complete new seeded and fixed executor directories and identical run records were additionally copied, without replacement, into the original workspace’s ignored `artifacts/executor/<new-id>/` and `data/runs/<new-id>.json`. Full byte comparison against their fresh-checkout sources passed. Published new-run summaries preserve exact IDs, commits and approvals; raw new traces remain local because they contain synthetic session data. Historical evidence was not replaced.

### Corrected-package smoke test

Another genuinely fresh non-hardlinked checkout `/private/tmp/veriqa-m10-corrected-20261102-2352` used corrected package commit **`79781a5614bbfced8724562d7ae29a223ea7b829`**. Fresh `npm ci`, Chromium installation, evidence verification, restoration (88 restored) and post-restore verification all exited **0**. Exact keyless approved replay produced **`cf019bef-d414-4c66-9e2c-69b5cf0e7a98`**, **3 discovered/executed/passed**, exit **0**, dirty **false**, with the original approval. All 88 restored hashes remained valid. Its complete new run is also retained separately in the original ignored workspace.

Independent corrected-trace check: 182,302-byte ZIP passes CRC integrity; all **448** trace/network JSON lines parse; session/OTP/authorization candidate scan found no raw values. Root also verified unchanged member inventory, byte-identical trace images, changed members matching disclosure, and all 88 original local file hashes. Corrected checkout Git status is empty after restore/execution. Runtime source, schemas, approval logic and test expectations are identical to the full-suite-tested implementation, so those suites were not redundantly rerun for a trace-only correction.

Runtime and reproduction acceptance checks are complete. Publication is verified separately against the remote branch after the final documentation/evidence commit; the final handoff supplies the exact published SHA.

## Preservation and safety

Root-side preservation audit exited 0: all 1,366 earlier evidence fingerprints matched, both original run copies matched, seed/fix ancestry remained intact, and original case1 expected true / actual false → true was preserved. The legacy audit rewrites its summary timestamp: its new output was retained separately under `m10/root-preservation/`, and the original M9 summary was restored byte-for-byte from its matching packaged original. All 88 original source files then matched `originalSha256` again; no plan, approval or run was modified.

Published historical payload: **88 files, six original PNG screenshots, one sanitized failed trace ZIP**. ZIP integrity and bounded API-key/bearer/session-value scans passed. A first broad `sk-*` pattern falsely matched `task-persistence` path suffixes; inspected and corrected to a bounded key pattern. The ZIP has declared session-cookie/mock-OTP-text redactions and records original/published hashes; original images and structured records stay unchanged. Additional parsing found an invalid JSON event caused by the first literal OTP redaction. Packaging correction `79781a5` rebuilds from the untouched original with JSON-aware replacement; all 448 trace/network lines parse, every trace image is byte-identical, member inventory is preserved and changed members exactly match disclosure. Original local trace remains private. See [the inventory and exclusions](../evidence/interview/README.md).

Implementation checks before commit: evidence verification exited 0 (88 files), typecheck exited 0, restoration tests executed/passed 4/4 after correcting macOS `/var` ancestor handling. The initial 1 passed / 3 failed attempt and script property-name correction are described in [AI_WORKFLOW.md](AI_WORKFLOW.md#milestone-10--packaging-and-reproduction-november-2-2026). Documentation local-file link audit checked 35 links successfully; `git diff --check` exited 0.

## Publication direction

The developer explicitly approved the reviewed evidence payload for integration into local main and publication to `https://github.com/spacerac00n/AI-native-dev-SEEWIJIE.git` on main, following an automatic approval-review rejection of the earlier branch push. Existing main history is preserved by merging it into the milestone branch before fast-forwarding main. Remote publication is checked against the final commit in the handoff.
