#!/usr/bin/env node
/**
 * Deterministic unit tests for the Content README API-docs signal.
 *   npx tsx --test src/components/chief/contentApiDocsProposal.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTENT_API_DOCS_PROPOSAL_ID,
  buildContentApiDocsRequest,
  proposeContentApiDocsFix,
} from "./contentApiDocsProposal";
import type { ApprovalProposal } from "./types";

const CREATED_AT = "2026-07-10T00:00:00.000Z";

test("mock mode (liveApi false) → no_signal, no card", () => {
  const result = proposeContentApiDocsFix(false, []);
  assert.deepEqual(result, { outcome: "no_signal" });
});

test("live API mode → queued card routed as content_agent", () => {
  const result = proposeContentApiDocsFix(true, []);
  assert.equal(result.outcome, "queued");
  if (result.outcome !== "queued") return;
  assert.equal(result.card.id, CONTENT_API_DOCS_PROPOSAL_ID);
  assert.equal(result.card.source, "content_agent");
  assert.equal(result.card.status, "pending");
  assert.match(result.card.title, /Content: External-facing copy/);
  assert.match(result.card.summary, /\/api\/chief\/approvals/);
});

test("dedupes while a proposal is already pending", () => {
  const pending: ApprovalProposal[] = [
    {
      id: CONTENT_API_DOCS_PROPOSAL_ID,
      title: "existing",
      summary: "",
      recommendedAction: "",
      riskNote: "",
      status: "pending",
      createdAt: CREATED_AT,
    },
  ];
  const result = proposeContentApiDocsFix(true, pending);
  assert.deepEqual(result, { outcome: "blocked", reason: "already_pending" });
});

test("does not dedupe against a decided (non-pending) proposal", () => {
  const decided: ApprovalProposal[] = [
    {
      id: CONTENT_API_DOCS_PROPOSAL_ID,
      title: "existing",
      summary: "",
      recommendedAction: "",
      riskNote: "",
      status: "approved",
      createdAt: CREATED_AT,
    },
  ];
  const result = proposeContentApiDocsFix(true, decided);
  assert.equal(result.outcome, "queued");
});

test("request is deterministic and names the real gap", () => {
  const first = buildContentApiDocsRequest(CREATED_AT);
  const second = buildContentApiDocsRequest(CREATED_AT);
  assert.deepEqual(first, second);
  assert.equal(first.audience, "public");
  assert.equal(first.riskLevel, "low");
  assert.match(first.summary, /README\.md/);
  assert.match(first.summary, /\/api\/chief\/approvals/);
});
