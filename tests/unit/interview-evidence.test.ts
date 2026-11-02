import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repository, restoreEvidence, verifyEvidence } from "../../scripts/interview-evidence.js";

const bundle = join(repository, "evidence/interview");
function isolated(work: (directory: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), "veriqa-evidence-"));
  try { work(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("historical restoration is repeatable and retains original approval and records", () => isolated((directory) => {
  const first = restoreEvidence(directory);
  assert.equal(first.restored, verifyEvidence().files.length);
  assert.equal(restoreEvidence(directory).restored, 0);
  const approval = "data/approvals/vp1/d61ba281-a45b-47da-9ae2-5bf3f5747695.json";
  assert.deepEqual(readFileSync(join(directory, approval)), readFileSync(join(bundle, "files", approval)));
}));

test("conflicts fail before writing any additional evidence", () => isolated((directory) => {
  restoreEvidence(directory);
  const pointer = join(directory, "data/plans/vp1/current.json");
  writeFileSync(pointer, '"another-local-revision"');
  const missing = join(directory, "data/runs/2338b3bc-f5f7-43b1-ab2c-eaf7f7940c77.json");
  rmSync(missing);
  assert.throws(() => restoreEvidence(directory), /Conflict/);
  assert.equal(existsSync(missing), false);
  assert.equal(readFileSync(pointer, "utf8"), '"another-local-revision"');
}));

test("tampered package is rejected before restoration", () => isolated((directory) => {
  const copy = join(directory, "bundle");
  cpSync(bundle, copy, { recursive: true });
  writeFileSync(join(copy, "files/data/plans/vp1/current.json"), '"tampered"');
  assert.throws(() => restoreEvidence(join(directory, "target"), copy), /Integrity mismatch/);
  assert.equal(existsSync(join(directory, "target")), false);
}));

test("restoration refuses a symlink destination", () => isolated((directory) => {
  symlinkSync(tmpdir(), join(directory, "data"));
  assert.throws(() => restoreEvidence(directory), /Symlink refused/);
}));
