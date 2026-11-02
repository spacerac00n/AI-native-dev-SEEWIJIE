# Independent verification supplement

These are actual Milestone 10 command receipts, raw stdout/stderr, focused safety audits, new run records and a real historical-comparison screenshot. Failed environment and temporary browser-check attempts remain alongside subsequent checks; an exit 1 is not silently reclassified as a passing attempt. See [the command/outcome record](../../../docs/M10_VERIFICATION.md) for interpretation and tested commits.

The 88-file historical package is verified separately by `npm run evidence:verify`. Verify this supplement from the repository root with:

```sh
shasum -a 256 -c evidence/interview/verification/SHA256SUMS
```

New run JSON records retain their actual UUIDs, tested commits, timestamps, approvals, expected/observed values and artifact indexes. They are supporting records, not replacements for the historical M8/M9 pair. Their full executor directories are retained in the original development workspace's ignored `artifacts/executor/<new-id>/` and `data/runs/<new-id>.json`, as well as the verification checkouts. Additional native new-run artifacts referenced by those records are intentionally not all published here; raw new traces contain synthetic session values. The complete original M8/M9 payload remains under `../files/`, including the explicitly sanitized historical failed trace.

This verifies fresh Git checkouts on the available macOS/Node/Chromium host, not a clean operating-system image or additional browser platforms. Chromium installation was invoked successfully against an existing OS cache. No live OpenAI call, new human approval or changed assertion expectation was used for approved-plan replay.
