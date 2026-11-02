# Interview walkthrough

The packaged historical demonstration is requirement → live AI proposal → actual human approval → real failed execution → separate code fix → successful retest. New replay uses real Playwright without an OpenAI key.

## Fresh clone and replay

Use Node **22.23.2**, npm **10.9.8**, and free loopback ports 3000, 5173 and 5174. Run commands sequentially; stop dev servers before executing suites or the managed executor.

```sh
git clone --branch codex/m10-reproduction https://github.com/spacerac00n/AI-native-dev-SEEWIJIE.git veriqa
cd veriqa
npm ci --cache .cache/npm
npx playwright install chromium
npm run evidence:verify
npm run evidence:restore
npm run evidence:restore
npm run dev:qa
```

1. Open <http://127.0.0.1:5174>. In **Plan & execute**, select **Approved · Passwordless login**. Expand the review/approval **Technical details** to inspect original requirements, live-AI provenance, exact revision/hash and actual human approval. Do not import/reapprove this historical revision.
2. Open **Compare runs**. Choose the failed run at **2 November 2026, 19:07:21 Singapore time** as Before, and passed run at **21:26:14** as After. Browser date formatting can vary; full IDs are in Technical details. Confirm **Same test expectations. Results are directly comparable.**
3. Expand the successful-login/checklist case. Expected checked stays **true**; observed changes **false → true**. Open screenshots and **Individual checks**. Cases 2/3 stay passed. In Run history, **Logs & traces** opens real observations and browser/API logs; **Technical details → Raw execution output** shows original commands/exit codes.
4. Download the failed trace. Its published copy has explicitly documented cookie/OTP-text redactions; original screenshots, actions, timing and assertion outcome are preserved. Successful runs have screenshots but no trace under retain-on-failure capture.
5. Stop `dev:qa` with Ctrl+C, then replay:

```sh
env -u OPENAI_API_KEY npm run execute -- vp1 d61ba281-a45b-47da-9ae2-5bf3f5747695
npm run evidence:verify
```

The executor does not load `.env` or call OpenAI. Expect a **new UUID**, 3 discovered/executed/passed cases, exit 0 and `execution: real-playwright`. It uses the restored original approval; historical runs stay unchanged. Restart `npm run dev:qa` to inspect the new run alongside them.

## Reproduce the original defect independently

From the fresh fixed checkout, with all servers stopped:

```sh
git clone --no-hardlinks . ../veriqa-seeded
git -C ../veriqa-seeded checkout --detach d2b776ba74431cbce08172d7f24a60195f03e646
npm run evidence:restore -- --target "$(cd ../veriqa-seeded && pwd)"
cd ../veriqa-seeded
npm ci --cache .cache/npm
npx playwright install chromium
env -u OPENAI_API_KEY npm run execute -- vp1 d61ba281-a45b-47da-9ae2-5bf3f5747695
```

The last command should exit **1** with **2 passed / 1 failed**, case1 `assertion-failed`, expected true / actual false. A new UUID is saved in this separate checkout. Read its `data/runs/<new-id>.json`: tested commit must be the exact seed SHA, dirty false, and no setup/connection error. Preserve this directory; it is new reproduction evidence, never the original M8 record. The restoration command runs from the fixed checkout because the historical seed predates the package/script. Do not run the fixed and seed servers together.

## Historical comparison

| | M8: seeded defect | M9: fixed retest |
| --- | --- | --- |
| Run | `395693c2-5ad9-4842-a203-2e077eb1cd2c` | `2338b3bc-f5f7-43b1-ab2c-eaf7f7940c77` |
| Tested commit | `d2b776ba74431cbce08172d7f24a60195f03e646` | `1965faeb53ae987c1f3943141ca1a0199b2a919b` |
| Dirty | false | false |
| Discovered / executed | 3 / 3 | 3 / 3 |
| Passed / failed / skipped | 2 / 1 / 0 | 3 / 0 / 0 |
| Exit | 1 | 0 |
| Persistence expected / actual | true / false | true / true |

Same plan `vp1`, revision `d61ba281-a45b-47da-9ae2-5bf3f5747695`, content SHA-256 `01d6a402710ee33142f5adbeb7e9c05e13318e314a77c464da81d8846d89e90f`. Approval `0d20cfb2-7e27-4693-adef-27287f2b8362`, See Wijie, `2026-11-02T08:34:02.309Z`. Original saved plan and approvals are under `evidence/interview/files/data/`; original execution copies are under `files/artifacts/executor/`.

<details><summary>Source and trace inspection</summary>

```sh
git show d2b776ba74431cbce08172d7f24a60195f03e646 -- apps/api/src/demo.ts
git show 1965faeb53ae987c1f3943141ca1a0199b2a919b -- apps/api/src/demo.ts
npx playwright show-trace artifacts/executor/395693c2-5ad9-4842-a203-2e077eb1cd2c/test-results/plan-case1-Successful-logi-77ae4-then-check-task-persistence-chromium/trace.zip
```

The seed mutates a cloned checklist response. PATCH reports true but the next home GET reads stored false. The fix mutates stored tasks. The reviewed case toggles the task then loads `/home` again; the same deterministic checked assertion detects the regression. See the preserved `artifacts/verification/m8/trace-network-review.json` after restoration.

</details>

## Interpret evidence and limitations

A product assertion failure means actions reached the reviewed check and actual behavior differed. An `execution-error` (occupied port, absent Chromium, refused connection, reset failure, timeout before assertion) does not establish the seeded defect. Invalid/unapproved definitions are rejected before browser execution. A rerun always gets a new run ID; never replace an earlier failure.

Only OTP delivery is mocked. Authentication/session/backend/checklist actions execute for real. Backend data is in memory; restarts reset synthetic users. Three reviewed cases demonstrate selected behavior, not complete QA coverage. AI review notes may be inaccurate and are retained as proposals. Historical external-server records identify Git state without independent build attestation; new managed execution starts fresh source servers. Sanitized trace limitations, exclusions and integrity boundaries are documented in the [package inventory](../evidence/interview/README.md). Actual fresh-clone commands, outcomes and corrective actions are recorded in [M10_VERIFICATION.md](M10_VERIFICATION.md).
