#!/usr/bin/env node
/**
 * Deterministic unit tests for lib/research/researchFinding.
 * Runs under tsx with the built-in node:test runner (no new dependency):
 *   npm run test:filing
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLogLine,
  previewResearchFinding,
  resolveFindingDestination,
  slugify,
  validateResearchFinding,
  type ResearchFindingPayload,
} from "../lib/research/researchFinding";

const base: ResearchFindingPayload = {
  date: "2026-07-10",
  finding: "Solo-maintained AI second brains fail from maintenance debt, not creation.",
  sources_checked: ["https://example.com/a", "internal note"],
  tier: "log",
};

test("slugify is deterministic and safe", () => {
  assert.equal(slugify("Second Brain: Maintenance Rot!"), "second-brain-maintenance-rot");
  assert.equal(slugify("  --Weird__Title--  "), "weird-title");
  assert.equal(slugify("!!!"), "");
});

test("valid log-tier payload passes", () => {
  assert.deepEqual(validateResearchFinding(base), { ok: true, errors: [] });
});

test("missing required fields are all reported", () => {
  const result = validateResearchFinding({
    date: "",
    finding: "",
    sources_checked: [],
    tier: "log",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("date is required")));
  assert.ok(result.errors.some((e) => e.includes("finding is required")));
  assert.ok(result.errors.some((e) => e.includes("sources_checked")));
});

test("bad date format is rejected", () => {
  const result = validateResearchFinding({ ...base, date: "July 10 2026" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("ISO format")));
});

test("lesson tier requires a title", () => {
  const result = validateResearchFinding({ ...base, tier: "lesson" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("title is required")));
});

test("bad tier is rejected", () => {
  const result = validateResearchFinding({
    ...base,
    tier: "concept" as unknown as ResearchFindingPayload["tier"],
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("tier must be one of")));
});

test("destination map matches the intake-doc tiers", () => {
  assert.deepEqual(resolveFindingDestination(base), {
    tier: "log",
    path: "knowledge/log.md",
    fileName: "log.md",
    mode: "append",
  });
  assert.deepEqual(
    resolveFindingDestination({ ...base, tier: "lesson", title: "Reverify State Before Acting" }),
    {
      tier: "lesson",
      path: "knowledge/lessons/reverify-state-before-acting.md",
      fileName: "reverify-state-before-acting.md",
      mode: "create",
    },
  );
  assert.deepEqual(
    resolveFindingDestination({
      ...base,
      tier: "starter-pass-candidate",
      title: "Vault Prune Cadence",
    }),
    {
      tier: "starter-pass-candidate",
      path: "knowledge/inbox/vault-prune-cadence.md",
      fileName: "vault-prune-cadence.md",
      mode: "flag",
    },
  );
});

test("log line is deterministic", () => {
  assert.equal(
    formatLogLine({ ...base, related_approval: "Weekly Research Scan #3" }),
    '- 2026-07-10 — [research] Solo-maintained AI second brains fail from maintenance debt, not creation. (tier: log) [approval: Weekly Research Scan #3]',
  );
});

test("previewResearchFinding returns nulls when invalid", () => {
  const preview = previewResearchFinding({ ...base, tier: "lesson" });
  assert.equal(preview.ok, false);
  assert.equal(preview.destination, null);
  assert.equal(preview.logLine, null);
});

test("previewResearchFinding resolves when valid", () => {
  const preview = previewResearchFinding(base);
  assert.equal(preview.ok, true);
  assert.equal(preview.destination?.path, "knowledge/log.md");
  assert.ok(preview.logLine?.startsWith("- 2026-07-10 — [research]"));
});
