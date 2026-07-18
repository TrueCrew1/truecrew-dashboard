#!/usr/bin/env node
/**
 * Tests for lib/research/writeFinding — the real local write path.
 * Runs under tsx with node:test, same as the rest of the filing scaffold:
 *   npm run test:filing
 *
 * Every test writes into a throwaway temp directory (never the repo's own
 * knowledge/ tree) via writeFindingToKnowledge's repoRoot parameter.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  formatLogLine,
  resolveFindingDestination,
  type FindingDestination,
  type ResearchFindingPayload,
} from "../lib/research/researchFinding";
import { resolveKnowledgePath, writeFindingToKnowledge } from "../lib/research/writeFinding";

const base: ResearchFindingPayload = {
  date: "2026-07-10",
  finding: "Solo-maintained AI second brains fail from maintenance debt, not creation.",
  sources_checked: ["https://example.com/a", "internal note"],
  tier: "log",
};

async function makeRepoRoot(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "filing-write-test-"));
  await fs.mkdir(path.join(dir, "knowledge", "lessons"), { recursive: true });
  await fs.mkdir(path.join(dir, "knowledge", "inbox"), { recursive: true });
  await fs.writeFile(path.join(dir, "knowledge", "log.md"), "# Log\n\n", "utf8");
  return dir;
}

test("log tier: --write appends one line to knowledge/log.md", async () => {
  const repoRoot = await makeRepoRoot();
  const result = await writeFindingToKnowledge(base, resolveFindingDestination(base), repoRoot);

  assert.equal(result.mode, "append");
  assert.equal(result.created, false);
  assert.equal(result.path, "knowledge/log.md");

  const content = await fs.readFile(path.join(repoRoot, "knowledge/log.md"), "utf8");
  assert.ok(content.includes(formatLogLine(base)));
  assert.ok(content.startsWith("# Log\n\n"), "append must not clobber existing content");
});

test("log tier: a second --write appends a second line, not a duplicate-guard error", async () => {
  const repoRoot = await makeRepoRoot();
  const destination = resolveFindingDestination(base);
  await writeFindingToKnowledge(base, destination, repoRoot);
  await writeFindingToKnowledge(base, destination, repoRoot);

  const content = await fs.readFile(path.join(repoRoot, "knowledge/log.md"), "utf8");
  const occurrences = content.split(formatLogLine(base)).length - 1;
  assert.equal(occurrences, 2, "log tier is append-only by design — no dedupe guard expected");
});

test("lesson tier: --write creates a new file under knowledge/lessons/", async () => {
  const repoRoot = await makeRepoRoot();
  const payload: ResearchFindingPayload = {
    ...base,
    tier: "lesson",
    title: "Test Lesson Title",
    worked: "the approach held up",
    failed: "none",
    next_time: "none",
  };
  const destination = resolveFindingDestination(payload);
  const result = await writeFindingToKnowledge(payload, destination, repoRoot);

  assert.equal(result.mode, "create");
  assert.equal(result.created, true);
  assert.equal(result.path, "knowledge/lessons/test-lesson-title.md");

  const content = await fs.readFile(path.join(repoRoot, result.path), "utf8");
  assert.ok(content.startsWith("### Research Finding — Test Lesson Title"));
  assert.ok(content.includes("- Second-brain candidate: Tier 2 (lesson)"));
  assert.ok(content.includes("the approach held up / none / none"));
});

test("starter-pass-candidate tier: --write creates a new file under knowledge/inbox/", async () => {
  const repoRoot = await makeRepoRoot();
  const payload: ResearchFindingPayload = {
    ...base,
    tier: "starter-pass-candidate",
    title: "Vault Prune Cadence",
  };
  const destination = resolveFindingDestination(payload);
  const result = await writeFindingToKnowledge(payload, destination, repoRoot);

  assert.equal(result.mode, "flag");
  assert.equal(result.created, true);
  assert.equal(result.path, "knowledge/inbox/vault-prune-cadence.md");
  const content = await fs.readFile(path.join(repoRoot, result.path), "utf8");
  assert.ok(content.includes("- Second-brain candidate: Tier 3 (flag for Starter Pass)"));
});

test("lesson tier: refuses to overwrite an existing file", async () => {
  const repoRoot = await makeRepoRoot();
  const payload: ResearchFindingPayload = { ...base, tier: "lesson", title: "Duplicate Title" };
  const destination = resolveFindingDestination(payload);

  await writeFindingToKnowledge(payload, destination, repoRoot);
  await assert.rejects(
    () => writeFindingToKnowledge(payload, destination, repoRoot),
    /Refusing to overwrite existing file/,
  );

  const content = await fs.readFile(path.join(repoRoot, destination.path), "utf8");
  assert.ok(content.includes("Duplicate Title"), "original file must be untouched, not blanked");
});

test("refuses a destination path outside knowledge/", async () => {
  const repoRoot = await makeRepoRoot();
  const maliciousDestination: FindingDestination = {
    tier: "log",
    path: "../outside.md",
    fileName: "outside.md",
    mode: "append",
  };
  await assert.rejects(
    () => writeFindingToKnowledge(base, maliciousDestination, repoRoot),
    /Refusing to write outside knowledge\//,
  );
});

test("refuses a create-mode destination outside the lessons/inbox prefix", async () => {
  const repoRoot = await makeRepoRoot();
  const wrongPrefix: FindingDestination = {
    tier: "lesson",
    path: "knowledge/concepts/should-not-be-writable.md",
    fileName: "should-not-be-writable.md",
    mode: "create",
  };
  await assert.rejects(
    () => writeFindingToKnowledge(base, wrongPrefix, repoRoot),
    /Refusing create write outside knowledge\/lessons\//,
  );
});

test("refuses an append-mode destination that isn't knowledge/log.md", async () => {
  const repoRoot = await makeRepoRoot();
  const wrongAppendTarget: FindingDestination = {
    tier: "log",
    path: "knowledge/inbox/not-the-log.md",
    fileName: "not-the-log.md",
    mode: "append",
  };
  await assert.rejects(
    () => writeFindingToKnowledge(base, wrongAppendTarget, repoRoot),
    /Refusing append write outside knowledge\/log\.md/,
  );
});

test("resolveKnowledgePath rejects a path that doesn't start with knowledge/", async () => {
  const repoRoot = await makeRepoRoot();
  assert.throws(
    () => resolveKnowledgePath("docs/AGENT_RUNBOOK.md", repoRoot),
    /Refusing to write outside knowledge\//,
  );
});
