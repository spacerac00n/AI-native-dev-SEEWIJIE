# Checklist defect and fixed retest walkthrough

Milestones 8–9 demonstrate an actual failed persistence assertion and its successful retest using the same human-approved AI-generated plan. The seed and fix are separate commits on `codex/m8-checklist-regression`; both complete evidence sets remain local and unchanged. Milestone 10 is pending.

| | Before: Milestone 8 | After: Milestone 9 |
| --- | --- | --- |
| Run ID | `395693c2-5ad9-4842-a203-2e077eb1cd2c` | `2338b3bc-f5f7-43b1-ab2c-eaf7f7940c77` |
| Tested Git SHA | `d2b776ba74431cbce08172d7f24a60195f03e646` | `1965faeb53ae987c1f3943141ca1a0199b2a919b` |
| Commit | `test(seed): introduce checklist persistence regression` | `fix: restore checklist persistence` |
| worktreeDirty | false | false |
| Discovered / executed | 3 / 3 | 3 / 3 |
| Passed / failed / skipped | 2 / 1 / 0 | 3 / 0 / 0 |
| Actual exit code | 1 | 0 |
| case1 status | assertion-failed | passed |
| Checkbox expected / actual | true / false | true / true |

Both records embed identical plan/provenance and human approval snapshots:

- Plan `vp1`, exact revision `d61ba281-a45b-47da-9ae2-5bf3f5747695`.
- Content hash `01d6a402710ee33142f5adbeb7e9c05e13318e314a77c464da81d8846d89e90f`.
- Approval `0d20cfb2-7e27-4693-adef-27287f2b8362`, See Wijie, `2026-11-02T08:34:02.309Z`.
- Source `live-ai`, mode `replay`, execution `real-playwright`. No new OpenAI request, plan edit or approval occurred for the retest.

## Inspect the existing dashboard comparison

1. Open `http://127.0.0.1:5174` (5173 is the demo). Fresh fixed-code services were left running for inspection. If stopped, run `npm run dev:qa` from the repository root. Keep these ports free before starting; run regression suites separately from dev servers/builds.
2. In **Plan & execute**, load `vp1 · d61ba281 · approved · live-ai`. Expand **Revision & content hash** and **Approval reference**; confirm the exact values above. Existing evidence inspection needs no generation, import or reapproval.
3. Open **Compare runs**. Select **Before run** `395693c2 · vp1 · assertion-failed` and **After run** `2338b3bc · vp1 · passed`. Confirm “Same plan, revision and content hash. Case expectations are directly comparable.” Verify both Git entries say clean, at seed `d2b776ba` and fix `1965faeb`.
4. Expand **case1**. Confirm assertion-failed → passed. Check row **4 · checked**: expected true on both sides, actual false → true, “Actual changed”. The unchanged actions click the task then navigate to `/home`, so this tests persistence across a fresh page load. Open the real screenshots: unchecked before, checked after. Cases2/3 remain passed.
5. In **Run history**, select each full run's short ID. Expand **Approval, provenance & command** to compare the same approval/hash and actual exit 1 → 0. Expand case1 to inspect assertions, **browser-api.log.json**, **result.json**, screenshot and **Raw execution output**. The full SHA, `worktreeDirty`, counts and exact command are also in each `data/runs/<run-id>.json` record.
6. Download the original failed case1 **Playwright trace** or open it directly:

   ```sh
   npx playwright show-trace artifacts/executor/395693c2-5ad9-4842-a203-2e077eb1cd2c/test-results/plan-case1-Successful-logi-77ae4-then-check-task-persistence-chromium/trace.zip
   ```

   In the failed trace, Action 7's PATCH returns completed true, Action 8's fresh home GET returns false, and assertion 4 fails. The fixed run has three genuine final screenshots; successful traces are absent under the unchanged retain-on-failure setting.
7. Inspect the separate source commits:

   ```sh
   git show d2b776ba74431cbce08172d7f24a60195f03e646 -- apps/api/src/demo.ts
   git show 1965faeb53ae987c1f3943141ca1a0199b2a919b -- apps/api/src/demo.ts
   git merge-base --is-ancestor d2b776ba74431cbce08172d7f24a60195f03e646 1965faeb53ae987c1f3943141ca1a0199b2a919b
   ```

   The fix changes PATCH from mutating a cloned response to mutating the actual stored tasks. The last command exits 0; history retains the seed followed by evidence documentation and the separate fix.

For another real replay on this configured machine, keep the same saved approved revision and **Capture successful-case screenshots** checked, then click **Execute approved plan**. This creates a separate UUID against the then-current Git SHA; a later documentation commit must not be reported as the original fixed SHA. Preserve the existing before/after pair. Fresh clones do not contain ignored local approvals/runs; fresh-clone setup and evidence packaging remain Milestone 10.

## Evidence to retain

Keep complete directories, not selected screenshots alone:

- `artifacts/executor/395693c2-5ad9-4842-a203-2e077eb1cd2c/` and `data/runs/395693c2-5ad9-4842-a203-2e077eb1cd2c.json`.
- `artifacts/executor/2338b3bc-f5f7-43b1-ab2c-eaf7f7940c77/` and `data/runs/2338b3bc-f5f7-43b1-ab2c-eaf7f7940c77.json`.
- Original `data/plans/vp1/` and `data/approvals/vp1/`, plus earlier failures and clean baseline `86b3c3f5-5ffd-4a9e-9001-bc6d0437927d` at `b82a8caafce3fb75d921d8a4f33ecfae80a014f0`.
- `artifacts/verification/m9/`: preservation manifests, actual command/exit logs, fresh-server checks, `audit.json`, `dashboard-fixed.jpg`, `dashboard-comparison.jpg`, and `dashboard-comparison.txt`.

The audit verifies all 1,366 earlier files unchanged, identical plan/approval snapshots, both immutable result copies, all indexed artifacts, three screenshots per run, original trace integrity and separate seed/fix ancestry. Baseline 24/24, unit 63/63, executor 7/7, isolated dashboard 2/2, typecheck and build passed. An initial dashboard failure caused by overlapping build/server restart remains recorded separately. See [AI_WORKFLOW.md](AI_WORKFLOW.md#milestone-9--checklist-persistence-fix-and-preserved-retest-november-2-2026) for exact commands, timings and report paths. Evidence stays local/ignored; source and documentation are pushed. No merge into main or Milestone 10 work was performed.
