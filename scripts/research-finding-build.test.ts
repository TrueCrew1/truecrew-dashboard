#!/usr/bin/env node
/**
 * Deterministic unit tests for lib/research/buildFindingPayload.
 *   npm run test:filing
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAndValidateFinding,
  buildFindingPayload,
  type BuildFindingInput,
} from "../lib/research/buildFindingPayload";
import { previewResearchFinding } from "../lib/research/researchFinding";

const base: BuildFindingInput = {
  date: "2026-07-10",
  question: "Why do AI second brains fail?",
  sources: ["https://example.com/study", "internal memory review"],
  evidence: "They fail from maintenance debt, not creation difficulty.",
  tier: "lesson",
  category: "governance",
};

test("builds a valid, deterministic payload", () => {
  const first = buildFindingPayload(base);
  const second = buildFindingPayload(base);
  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    date: "2026-07-10",
    finding: "They fail from maintenance debt, not creation difficulty.",
    sources_checked: ["https://example.com/study", "internal memory review"],
    tier: "lesson",
    title: "Why do AI second brains fail?",
    category: "governance",
  });
});

test("maps question → title and evidence → finding", () => {
  const payload = buildFindingPayload(base);
  assert.equal(payload.title, base.question);
  assert.equal(payload.finding, base.evidence);
});

test("collapses whitespace and drops empty sources", () => {
  const payload = buildFindingPayload({
    ...base,
    evidence: "  multi   space   evidence  ",
    sources: ["  keep  ", "", "   "],
  });
  assert.equal(payload.finding, "multi space evidence");
  assert.deepEqual(payload.sources_checked, ["keep"]);
});

test("omits optional fields when blank", () => {
  const payload = buildFindingPayload({
    date: "2026-07-10",
    question: "Q",
    sources: ["s"],
    evidence: "e",
    tier: "log",
    category: "   ",
  });
  assert.equal("category" in payload, false);
  assert.equal("worked" in payload, false);
});

test("output is accepted by the Filing scaffold", () => {
  const { payload, validation } = buildAndValidateFinding(base);
  assert.equal(validation.ok, true);
  const preview = previewResearchFinding(payload);
  assert.equal(preview.ok, true);
  assert.equal(preview.destination?.path, "knowledge/lessons/why-do-ai-second-brains-fail.md");
});

test("invalid input surfaces validation errors", () => {
  const { validation } = buildAndValidateFinding({
    ...base,
    tier: "lesson",
    question: "",
    sources: [],
  });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((e) => e.includes("sources_checked")));
  assert.ok(validation.errors.some((e) => e.includes("title is required")));
});
