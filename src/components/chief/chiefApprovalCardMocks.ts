import type { ApprovalCard } from "./types";

/**
 * Demo data only — proves the "PR approval card" pattern (checklist,
 * recommendedDecision, source) end-to-end through the existing Approvals
 * pipeline. Not live GitHub data.
 *
 * Extension point: replace this array with a real fetch (e.g. a GitHub PRs
 * API client under `src/lib/api/`) once that integration exists. Each real
 * PR would map to one ApprovalCard the same way these two do — same shape,
 * same Approve / Send back / Reject flow, no UI changes required.
 */
export const MOCK_PR_APPROVAL_CARDS: ApprovalCard[] = [
  {
    id: "apr-pr-63",
    title: "PR #63 – Mark chiefApprovalUrgency.ts reserved for Phase 4",
    summary:
      "Comment-only clarification on an existing, currently-unused helper file. No behavior change.",
    recommendedAction: "Approve and merge — lowest possible risk, verified no side effects.",
    riskNote: "None — comment-only change, qa/build clean, no imports or exports touched.",
    status: "pending",
    createdAt: "2026-07-04T06:44:57.000Z",
    source: "pr",
    recommendedDecision: "approve",
    checklist: [
      { label: "Comment-only, no behavior change", status: "pass" },
      { label: "Still unused helper, now clearly marked as reserved", status: "pass" },
      { label: "qa/build passed", status: "pass" },
      { label: "Roadmap/logs consistent with this decision", status: "pass" },
    ],
    routeTo: "/knowledge",
    routeLabel: "PR #63",
  },
  {
    id: "apr-pr-62",
    title: "PR #62 – Approval Alerts – stale indicator slice",
    summary:
      "Adds a small \"N stale\" badge next to the pending-approvals metric when a proposal sits pending more than 24 hours. Read-only, display-only.",
    recommendedAction: "Approved and merged — CI and Vercel preview checks passed.",
    riskNote: "No test framework in this repo; verified via npm run qa plus a headless-browser pass.",
    status: "approved",
    createdAt: "2026-07-03T23:20:00.000Z",
    decidedAt: "2026-07-04T06:38:29.000Z",
    decidedBy: "founder",
    source: "pr",
    recommendedDecision: "approve",
    checklist: [
      { label: "npm run qa (lint + tsc + build)", status: "pass" },
      { label: "Browser QA: badge renders, footnote correct", status: "pass" },
      { label: "Click-to-filter toggle unaffected", status: "pass" },
      { label: "Zero console errors", status: "pass" },
    ],
    routeTo: "/knowledge",
    routeLabel: "PR #62",
  },
];
