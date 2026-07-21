import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveApprovalActivityAction,
  selectRecentApprovalActivity,
} from "./approvalActivityAction";
import type { ApprovalProposal } from "./types";

function baseProposal(overrides: Partial<ApprovalProposal> = {}): ApprovalProposal {
  return {
    id: "apr-test-1",
    title: "Test proposal",
    summary: "Summary",
    recommendedAction: "Do the thing",
    riskNote: "Low risk",
    status: "approved",
    createdAt: "2026-07-18T00:00:00.000Z",
    decidedAt: "2026-07-19T00:00:00.000Z",
    ...overrides,
  };
}

test("deriveApprovalActivityAction: a handoff/repo-change proposal (routeTo set, real label) opens that exact build context", () => {
  const proposal = baseProposal({
    id: "repo-change-decision-reason",
    routeTo: "/knowledge",
    routeLabel: "feat/monitor/ui-client-safety",
  });
  const action = deriveApprovalActivityAction(proposal);
  assert.ok(action);
  assert.equal(action?.kind, "route");
  assert.equal(action?.href, "/knowledge");
  assert.equal(action?.label, "Open feat/monitor/ui-client-safety");
});

test("deriveApprovalActivityAction: a monitor-platform proposal (routeTo=/monitor) links to Monitor", () => {
  const proposal = baseProposal({
    id: "apr-repair-inc-1",
    routeTo: "/monitor",
  });
  const action = deriveApprovalActivityAction(proposal);
  assert.ok(action);
  assert.equal(action?.kind, "route");
  assert.equal(action?.href, "/monitor");
  assert.equal(action?.label, "Open Monitor");
});

test("deriveApprovalActivityAction: routeTo pointing at Today itself is not a real destination — falls back to Open in Chief", () => {
  const proposal = baseProposal({ id: "apr-alert-inbox-1", routeTo: "/" });
  const action = deriveApprovalActivityAction(proposal);
  assert.ok(action);
  assert.equal(action?.kind, "chief-focus");
  assert.equal(action?.label, "Open in Chief");
  assert.equal(action?.proposalId, "apr-alert-inbox-1");
});

test("deriveApprovalActivityAction: an agent-request proposal with no routeTo still gets a real, provable Open in Chief action", () => {
  const proposal = baseProposal({ id: "build-req-42", routeTo: undefined, routeLabel: undefined });
  const action = deriveApprovalActivityAction(proposal);
  assert.ok(action);
  assert.equal(action?.kind, "chief-focus");
  assert.equal(action?.proposalId, "build-req-42");
});

test("deriveApprovalActivityAction: no id and no routeTo means no exact source context — renders no action", () => {
  const action = deriveApprovalActivityAction({ id: "", routeTo: undefined, routeLabel: undefined });
  assert.equal(action, null);
});

test("selectRecentApprovalActivity: excludes pending proposals and proposals with no decision timestamp", () => {
  const proposals: ApprovalProposal[] = [
    baseProposal({ id: "a", status: "pending", decidedAt: undefined }),
    baseProposal({ id: "b", status: "approved", decidedAt: undefined }),
    baseProposal({ id: "c", status: "approved", decidedAt: "2026-07-19T00:00:00.000Z" }),
  ];
  const recent = selectRecentApprovalActivity(proposals);
  assert.deepEqual(
    recent.map((p) => p.id),
    ["c"],
  );
});

test("selectRecentApprovalActivity: sorts newest decision first and respects the limit", () => {
  const proposals: ApprovalProposal[] = [
    baseProposal({ id: "old", status: "approved", decidedAt: "2026-07-01T00:00:00.000Z" }),
    baseProposal({ id: "newest", status: "approved", decidedAt: "2026-07-19T00:00:00.000Z" }),
    baseProposal({ id: "mid", status: "rejected", decidedAt: "2026-07-10T00:00:00.000Z" }),
  ];
  const recent = selectRecentApprovalActivity(proposals, 2);
  assert.deepEqual(
    recent.map((p) => p.id),
    ["newest", "mid"],
  );
});
