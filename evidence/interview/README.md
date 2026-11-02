# Interview evidence package

This package preserves the original saved AI plan, its actual human approval, and the complete M8/M9 execution records and indexed artifacts. `manifest.json` lists SHA-256, byte size and original SHA-256 for each published file. Payload paths under `files/` are relative to the repository root.

- **88 files**, including the exact `vp1` revision/current pointer and approval, both `data/runs` records, both complete executor directories, six real final screenshots, and one failed Playwright trace.
- The original successful OpenAI interaction and review notes are included, matching the plan's response/request IDs. Importing another definition never reuses this approval.
- Selected original M8/M9 verification commands, raw outputs, audits and trace-network review are included. M9's initial failing dashboard check is retained alongside its isolated passing retry.

## Authenticity and publication review

All payload files are byte-identical to their local originals **except the single failed trace ZIP**. That ZIP is a documented sanitized derivative at its original indexed path so the existing dashboard can open it. `manifest.json.redactions` records the original/published hashes and affected ZIP members. Synthetic session cookie values and mock OTP text are replaced. No actions, timestamps, assertion expectations/results, source code, screenshot images or verdicts are changed. Historical run/approval records remain byte-identical. The original unsanitized ZIP stays local and is not committed. A hash manifest establishes integrity against this checkout, not independent external attestation.

Real historical screencast frames may show the expired synthetic mock OTP. Sessions existed only in the stopped in-memory demo server. Fixture email addresses are synthetic. The reviewer name is the original intended approval attribution. Historical commands/reports retain the developer's local repository/runtime paths as provenance; no `.env`, API key, authorization bearer token, real user account, real delivery or confidential assessment prompt is included. OpenAI request/response identifiers are provenance, not credentials.

Excluded: unrelated local plans/runs, other planner calls, full development `data/` and `artifacts/`, process listings/fresh-server diagnostics containing irrelevant local environment details, and redundant native regression reports. Selected verification outputs reference additional artifacts which are not in this focused package; they are supporting historical records, not a claim that all development evidence is published. No successful trace exists under retain-on-failure capture. No missing run evidence was recreated.

## Restore safely

```sh
npm run evidence:verify
npm run evidence:restore
```

Both commands validate inventory, SHA-256 and exact plan/approval/run relationships. Restore preflights every destination, skips identical files, rejects conflicting files and symlinks, and publishes new files exclusively. A failed write may leave a partial set; rerunning fills missing identical records. It never imports, generates or approves a plan. Stop all development/execution processes during restore. A development checkout containing the original unsanitized trace intentionally reports a conflict; use a fresh clone rather than replacing that original.

See [the interview walkthrough](../../docs/DEMO.md) and [fresh-clone verification](../../docs/M10_VERIFICATION.md).
