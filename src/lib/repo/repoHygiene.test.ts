import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRepoHygieneSummary,
  deriveDocTruthSignal,
  type DocFileReference,
} from "./repoHygiene";

const FIXTURE_REFERENCES: DocFileReference[] = [
  { docPath: "docs/a.md", referencedPath: "scripts/a.sh", description: "doc a references script a" },
  { docPath: "docs/b.md", referencedPath: "scripts/b.sh", description: "doc b references script b" },
];

test("deriveCheckSignal (via buildRepoHygieneSummary): pass -> healthy", () => {
  const summary = buildRepoHygieneSummary({ build: "pass" }, { fileExists: () => true });
  assert.equal(summary.build.status, "healthy");
  assert.match(summary.build.message, /passed/i);
});

test("deriveCheckSignal (via buildRepoHygieneSummary): fail -> warning", () => {
  const summary = buildRepoHygieneSummary({ tests: "fail" }, { fileExists: () => true });
  assert.equal(summary.tests.status, "warning");
  assert.match(summary.tests.message, /failed/i);
});

test("deriveCheckSignal (via buildRepoHygieneSummary): omitted -> unknown, never guessed as healthy", () => {
  const summary = buildRepoHygieneSummary({}, { fileExists: () => true });
  assert.equal(summary.build.status, "unknown");
  assert.equal(summary.tests.status, "unknown");
  assert.equal(summary.lint.status, "unknown");
});

test("deriveDocTruthSignal: all referenced files present -> healthy", () => {
  const signal = deriveDocTruthSignal(FIXTURE_REFERENCES, () => true);
  assert.equal(signal.status, "healthy");
  assert.match(signal.message, /2 tracked doc→file reference/);
});

test("deriveDocTruthSignal: a missing referenced file -> warning, names the doc and path", () => {
  const signal = deriveDocTruthSignal(FIXTURE_REFERENCES, (path) => path !== "scripts/b.sh");
  assert.equal(signal.status, "warning");
  assert.match(signal.message, /docs\/b\.md/);
  assert.match(signal.message, /scripts\/b\.sh/);
});

test("deriveDocTruthSignal: no references configured -> unknown, not a fabricated healthy", () => {
  const signal = deriveDocTruthSignal([], () => true);
  assert.equal(signal.status, "unknown");
});

test("buildRepoHygieneSummary: branchAudit and securityAudit are always not_wired — never faked from inputs", () => {
  const summary = buildRepoHygieneSummary(
    { build: "pass", tests: "pass", lint: "pass" },
    { fileExists: () => true },
  );
  assert.equal(summary.branchAudit.status, "not_wired");
  assert.equal(summary.securityAudit.status, "not_wired");
  assert.ok(summary.branchAudit.message.length > 0);
  assert.ok(summary.securityAudit.message.length > 0);
});

test("buildRepoHygieneSummary: default doc references point at a real, currently-uncommitted-script drift case", () => {
  // No fileExists override: exercises the real fs.existsSync-backed default,
  // against the module's own default reference list — not a fixture. This
  // asserts the shape/behavior is sound either way (doc/code drift is real
  // filesystem state, so this legitimately varies by environment), not a
  // specific status.
  const summary = buildRepoHygieneSummary({ build: "pass", tests: "pass", lint: "pass" });
  assert.ok(["healthy", "warning"].includes(summary.docTruth.status));
  assert.equal(typeof summary.docTruth.message, "string");
});

test("buildRepoHygieneSummary: returns all six required signal keys", () => {
  const summary = buildRepoHygieneSummary({}, { fileExists: () => true });
  assert.deepEqual(Object.keys(summary).sort(), [
    "branchAudit",
    "build",
    "docTruth",
    "lint",
    "securityAudit",
    "tests",
  ]);
});
