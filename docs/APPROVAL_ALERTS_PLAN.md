# APPROVAL_ALERTS_PLAN.md
# Slice: Approval Alerts — Read-Only Panel on /monitor

_Last updated: 2026-07-03_

**Status (2026-07-05): Shipped, merged to `origin/main`.** Confirmed via `git log`/
`git show origin/main` that `src/components/chief/ApprovalAlertsPanel.tsx`,
`useApprovalAlerts.ts`, and the `MonitorPage.tsx` wiring all exist on `main` today — this
isn't inferred from the plan being written, it's verified against the actual merged
history. The checklists below reflect the original plan and were never checked off after
merge; this pass corrects that but does **not** re-verify each item live (e.g. mobile
layout, individual badge colors) — treat unchecked-but-plausible items as "not
re-confirmed this pass," not as "not done."

This is a different, already-shipped feature from the Phase 4 urgency/escalation work —
see `APPROVAL_ALERTS_INSPECTION.md`'s 2026-07-05 status update for that one, which is
implemented locally but **not yet merged**. Don't conflate the two.

---

## 1. Inspection Findings

What exists in the repo today that this slice builds on:

**Types (`src/components/chief/types.ts`)**
- `ApprovalProposal` — full shape: `id`, `title`, `summary`, `status: ApprovalStatus`,
  `createdAt`, `decidedAt?`, `decidedBy?`, `specialist?`, `category?`
- `ApprovalStatus` — `"pending" | "approved" | "rejected" | "sent_back"`
- `ApprovalAction`, `ApprovalDecision` — already defined, no changes needed

**API client (`src/lib/api/client.ts`)**
- `fetchChiefApprovalDecisions()` — hits `/api/chief/approvals` GET,
  returns `ChiefApprovalDecisionPayload[]`
  (`proposalId`, `status`, `decidedAt`, `actor`)
- `ChiefApprovalDecisionPayload` — the live DB shape from `chief_approval_decisions` table
- `recordChiefApprovalDecision()` — POST, not used by this slice (read-only)

**Display logic (`src/components/chief/chiefApproval.ts`)**
- `APPROVAL_STATUS_LABEL` — human labels for all four statuses
- `APPROVAL_STATUS_BADGE` — CSS badge class per status
  (`badge-yellow` / `badge-green` / `badge-red` / `badge-blue`)

**Filter/summary logic (`src/components/chief/approvalStatus.ts`)**
- `summarizeApprovalStatus()` — counts pending/approved/returned/recent
- `filterApprovalsByStatus()` — filters by `ApprovalStatusFilter`
- `APPROVAL_RECENT_DECISION_HOURS = 24` — recency window already defined

**Existing components (`src/components/chief/`)**
- `ApprovalBoard.tsx` — full interactive board (approve/reject actions). Lives inside
  ChiefPanel. Not used by this slice — this slice is read-only display only.
- `ApprovalStatusDashboard.tsx` — summary counts strip, already built.
- `ApprovalAuditTimeline.tsx` — audit log timeline, already built.

**Pages**
- `MonitorPage.tsx` — target host page. Currently shows Service catalog + Open incidents
  panels. Uses `useData()` from `DataContext`. No approval data today.

**Router (`src/routes/index.tsx`)**
- `/monitor` route exists, bound to `MonitorPage`. No new route needed.

**DataContext (`src/context/DataContext.tsx`)**
- Does NOT currently expose approval decisions. Approval data is fetched
  separately in `ChiefPanel` via `fetchChiefApprovalDecisions()`.
  This slice fetches its own data with a local hook — no DataContext changes.

---

## 2. What "Approval Alerts" Means in This Context

**Definition:** A read-only panel on `/monitor` that shows pending and recently-decided
approval proposals pulled from the `chief_approval_decisions` Supabase table via the
existing `/api/chief/approvals` endpoint.

- **Pending** = proposals with `status === "pending"` — these are waiting for the
  founder's decision on the Chief board.
- **Recent** = proposals decided within the last 24 hours (`APPROVAL_RECENT_DECISION_HOURS`).
- **Display only.** No approve/reject/send-back actions. No notifications. No reminders.
  No new DB writes. Supervisor sees the queue; acts on it from `/knowledge` (Chief tab).
- **Source of truth:** `chief_approval_decisions` table via `GET /api/chief/approvals`,
  same endpoint `ChiefPanel` already uses.

The panel answers one question for a supervisor scanning Monitor:
> "Are there approvals waiting on me right now?"

---

## 3. Scope

### Ships in this slice
- New hook: `src/components/chief/useApprovalAlerts.ts`
  — fetches decisions, derives `pending` + `recent` counts, surfaces a sorted list
- New component: `src/components/chief/ApprovalAlertsPanel.tsx`
  — read-only list panel: pending items on top (badge-yellow), recent decisions below
    (badge-green / badge-red / badge-blue). Links to `/knowledge` for action.
- Edit: `src/pages/MonitorPage.tsx`
  — add `<ApprovalAlertsPanel />` as a third panel below the existing two.

### Explicitly deferred
- No new `/approvals` route
- No approve/reject actions in this panel (that stays in ChiefPanel)
- No push notifications, polling intervals, or real-time subscriptions
- No changes to DataContext, AppShell, or nav
- No new Supabase migrations (table already exists)
- No changes to `/api/chief/approvals` serverless function

---

## 4. Implementation Steps

**Step 1 — Create `useApprovalAlerts.ts`**

File: `src/components/chief/useApprovalAlerts.ts`

```ts
import { useEffect, useState } from "react";
import {
  fetchChiefApprovalDecisions,
  isLiveApiEnabled,
  type ChiefApprovalDecisionPayload,
} from "@/lib/api/client";

export type AlertPhase = "idle" | "loading" | "ready" | "error";

export interface ApprovalAlertsState {
  phase: AlertPhase;
  pending: ChiefApprovalDecisionPayload[];
  recent: ChiefApprovalDecisionPayload[];
  error: string | null;
}

const RECENT_MS = 24 * 60 * 60 * 1000;

export function useApprovalAlerts(): ApprovalAlertsState {
  const [state, setState] = useState<ApprovalAlertsState>({
    phase: "idle",
    pending: [],
    recent: [],
    error: null,
  });

  useEffect(() => {
    if (!isLiveApiEnabled()) {
      setState({ phase: "ready", pending: [], recent: [], error: null });
      return;
    }

    setState((s) => ({ ...s, phase: "loading" }));

    fetchChiefApprovalDecisions()
      .then((decisions) => {
        const now = Date.now();

        const pending = decisions.filter((d) => d.status === "pending");

        const recent = decisions.filter((d) => {
          if (d.status === "pending") return false;
          const decidedMs = new Date(d.decidedAt).getTime();
          if (Number.isNaN(decidedMs)) return false;
          const age = now - decidedMs;
          return age >= 0 && age <= RECENT_MS;
        });

        recent.sort(
          (a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()
        );

        setState({ phase: "ready", pending, recent, error: null });
      })
      .catch((err: unknown) => {
        setState({
          phase: "error",
          pending: [],
          recent: [],
          error: err instanceof Error ? err.message : "Failed to load approvals",
        });
      });
  }, []);

  return state;
}
```

**Step 2 — Create `ApprovalAlertsPanel.tsx`**

File: `src/components/chief/ApprovalAlertsPanel.tsx`

- Import `Link` from `react-router-dom`
- Import `Panel`, `PanelEmpty`, `StatusBadge` from `@/components/ui`
- Import `APPROVAL_STATUS_LABEL`, `APPROVAL_STATUS_BADGE` from `./chiefApproval`
- Import `useApprovalAlerts` from `./useApprovalAlerts`

Behavior:
- `loading` → render simple placeholder rows
- `error` → inline error message inside panel
- `ready + no pending + no recent` → `PanelEmpty`
- `ready + has items` → grouped sections:
  - `Pending approvals`
  - `Recent decisions`

Each row should show:
- `proposalId` as the current identifier
- human status label
- decided time for recent items
- a `Review` link to `/knowledge`

Important note:
`fetchChiefApprovalDecisions()` returns decision records only, not the full `ApprovalProposal`
shape, so this slice should **not** try to show title/summary/risk text. That is deferred.
Use the `proposalId` as the display label for now.

Suggested row shape:

```tsx
<div className="approval-alert-row" key={item.proposalId}>
  <div className="approval-alert-copy">
    <p className="approval-alert-title">{item.proposalId}</p>
    <p className="approval-alert-meta">
      {item.status === "pending"
        ? "Waiting for decision"
        : `Updated ${new Date(item.decidedAt).toLocaleString()}`}
    </p>
  </div>
  <div className="approval-alert-actions">
    <span className={`badge ${APPROVAL_STATUS_BADGE[item.status]}`}>
      {APPROVAL_STATUS_LABEL[item.status]}
    </span>
    <Link to="/knowledge" className="empty-state-link">
      Review
    </Link>
  </div>
</div>
```

**Step 3 — Edit `MonitorPage.tsx`**

Add import:

```tsx
import { ApprovalAlertsPanel } from "@/components/chief/ApprovalAlertsPanel";
```

Add panel inside the existing `page-stack`, after the incidents panel:

```tsx
<ApprovalAlertsPanel />
```

No route changes. No nav changes.

---

## 5. Edge Cases

| Case | Behavior |
|---|---|
| `VITE_USE_LIVE_API` is not `"true"` | Hook returns empty ready state; panel shows empty state, no error |
| `/api/chief/approvals` fails | Panel shows inline error, page still loads |
| API returns empty array | Panel shows "No pending approvals" |
| `decidedAt` is invalid | Exclude record from recent section |
| Decision row has no title/summary | Use `proposalId` only |
| Both pending and recent exist | Pending section first, recent section second |
| Slow network | Loading skeleton/placeholder rows |
| Mobile width | Row wraps cleanly, review link remains tappable |

---

## 6. Acceptance Checklist

### Gate #3 — Merge
- [ ] `src/components/chief/useApprovalAlerts.ts` created
- [ ] `src/components/chief/ApprovalAlertsPanel.tsx` created
- [ ] `src/pages/MonitorPage.tsx` updated only to import and render panel
- [ ] No route changes in `src/routes/index.tsx`
- [ ] No edits to `DataContext.tsx`
- [ ] No edits to `/api/chief/approvals`
- [ ] No new dependencies added
- [ ] TypeScript passes
- [ ] ESLint passes
- [ ] Mock mode shows empty state without console errors

### Gate #4 — Deploy
- [ ] `/monitor` loads successfully in deployed app
- [ ] Approval panel appears below incidents
- [ ] Pending items show yellow badge
- [ ] Approved items show green badge
- [ ] Rejected items show red badge
- [ ] Sent back items show blue badge
- [ ] Review link routes to `/knowledge`
- [ ] Empty state works when no records exist
- [ ] Error state does not break Monitor page
- [ ] Mobile layout is readable and usable

---

## 7. Files to Change

| File | Action | Purpose |
|---|---|---|
| `src/components/chief/useApprovalAlerts.ts` | Create | Fetch and derive pending/recent approval alerts |
| `src/components/chief/ApprovalAlertsPanel.tsx` | Create | Render read-only approval alerts UI on Monitor |
| `src/pages/MonitorPage.tsx` | Edit | Mount the approval alerts panel on `/monitor` |

No other files should change in this slice.
