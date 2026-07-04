# Approval Alerts & Escalation - Implementation Inspection

## 1. Current Approval-Related Surfaces

### Primary Components
| File | Purpose |
|------|---------|
| `src/components/chief/ApprovalStatusDashboard.tsx` | Status summary with filterable metrics (pending, approved, returned, recent) |
| `src/components/chief/ApprovalBoard.tsx` | Full approval board with cards, filtering, and audit log |
| `src/components/chief/ChiefBoard.tsx` | Operations board with 4 lanes: at_risk, blocked, missing_context, approval |
| `src/components/chief/ChiefPanel.tsx` | Main container with 4 tabs: Command, Board, Approvals, History |
| `src/components/chief/ChiefSituationBrief.tsx` | Top-level metrics strip (pending approvals, blocked, at risk, alerts) |
| `src/components/chief/ChiefApprovalActions.tsx` | Approve/Send back/Reject buttons for pending proposals |

### Supporting Files
| File | Purpose |
|------|---------|
| `src/components/chief/approvalStatus.ts` | Status filtering and summarization logic |
| `src/components/chief/chiefApproval.ts` | Badge/label mappings, action state management |
| `src/components/chief/chiefLiveContext.ts` | Derives approval candidates from live data |
| `src/components/chief/types.ts` | `ApprovalProposal`, `ApprovalStatus`, `ApprovalCategory` types |
| `lib/task-warnings.ts` | Task warning system (blocked, past due, gates open, etc.) |

## 2. Available Signals/Data

### ✅ **Pending Approval** - FULLY SUPPORTED
- `ApprovalStatus = "pending" | "approved" | "rejected" | "sent_back"`
- `ApprovalStatusDashboard` shows pending count with `badge-yellow` styling
- `ChiefBoard` shows pending approval count in "Needs approval" lane
- `ChiefPanel` tab badge shows pending count
- `deriveApprovalCandidates()` generates pending proposals from:
  - Blocked build tasks (gate_override)
  - Incidents without repair (incident_repair)
  - Blocked deploys (deploy_release)
  - Waiting customers (onboarding)
  - Tasks missing customer link (customer_link)
  - Tasks missing workflow link (workflow_link)
  - Focus queue items (focus_escalation)
  - Overdue tasks (overdue_review)
  - Alert items (alert_action)

### ✅ **Blocked State** - FULLY SUPPORTED
- `Task.blocker` field (string)
- `Task.gates` array with `required` and `passed` flags
- `getBlockingGates()` function in `lib/stage-change.ts`
- `ChiefBoard` "Blocked gates" lane with `warn`/`critical` tone
- `TaskWarningSummary` shows "blocked" count

### ✅ **Overdue State** - FULLY SUPPORTED
- `Task.dueAt` field (ISO timestamp)
- `isPastDue()` function in `lib/task-warnings.ts`
- `TaskWarningKind.time_gate` = "past due"
- `ChiefBoard` "At-risk work" lane shows overdue tasks with `critical` tone
- `TaskWarningSummary` shows "past due" count

### ⚠️ **Aging/Stale State** - PARTIALLY SUPPORTED
- `Task.updatedAt` exists but not used for aging alerts
- `FocusItem` has `dueAt` but no "stale" detection
- No explicit aging threshold logic (e.g., "pending > X hours")

### ⚠️ **Warning State** - PARTIALLY SUPPORTED
- `TaskWarningKind` has: `external_dependency`, `time_gate`, `gate_open`, `missing_data`, `waiting`, `readiness`
- `TaskWarningSummary` component shows warning pills
- No explicit "warning" state for approvals (only pending/approved/rejected/sent_back)

## 3. Smallest Alert Surface Location

### Best Candidate: **ChiefSituationBrief**
- Already shows pending approvals as a metric
- Already has `critical` tone when count > 0
- Already has click handler to open Approvals tab
- **No changes needed** - this is the alert surface

### Alternative: **ApprovalStatusDashboard**
- Shows pending count in the status grid
- Uses `critical` tone styling when pending > 0
- Already has filter interaction

## 4. Smallest Production Slice Recommendation

### Exact UI Surface
**Add aging indicator to `ApprovalStatusDashboard` pending metric**

### Exact Alert Rules
- If a pending approval is older than 24 hours, show an additional "stale" indicator
- Use existing `APPROVAL_RECENT_DECISION_HOURS` constant (24) as threshold
- Add a small badge or icon next to the pending count

### Probable Files to Change
1. `src/components/chief/approvalStatus.ts` - Add aging calculation
2. `src/components/chief/ApprovalStatusDashboard.tsx` - Display aging indicator
3. `src/components/chief/types.ts` - Extend `ApprovalStatusSummary` if needed

### Implementation Details
```typescript
// In approvalStatus.ts - add function:
export function countStaleApprovals(
  proposals: ApprovalProposal[],
  staleThresholdMs: number = 24 * 60 * 60 * 1000,
): number {
  const now = Date.now();
  return proposals.filter(p =>
    p.status === "pending" &&
    p.createdAt &&
    now - new Date(p.createdAt).getTime() > staleThresholdMs
  ).length;
}
```

## 5. Out-of-Scope Items (DO NOT BUILD YET)

- ❌ **Escalation workflows** - No multi-level approval chains
- ❌ **Email/SMS notifications** - No notification infrastructure
- ❌ **Auto-escalation** - No background jobs or scheduled tasks
- ❌ **Approval deadlines** - No `dueAt` field on `ApprovalProposal`
- ❌ **Reminder system** - No snooze or reminder UI
- ❌ **Approval history aging** - No "stale decision" detection
- ❌ **External integration alerts** - No webhook or API alert sources
- ❌ **Real-time alerts** - No WebSocket or polling mechanism
- ❌ **Alert severity levels** - Only `critical`/`warn`/`neutral` tones exist
- ❌ **Bulk approval actions** - No multi-select or batch operations

## Summary

The codebase has a **fully functional approval system** with:
- Pending/approved/rejected states
- Blocked task detection
- Overdue task detection
- Warning system for tasks

The **smallest shippable alert** would be adding an aging indicator to the existing `ApprovalStatusDashboard` pending metric, leveraging the already-computed `proposals` array and the existing 24-hour threshold constant.

**Recommended next step:** Add stale approval count to `ApprovalStatusSummary` and display it as a secondary indicator on the pending metric in `ApprovalStatusDashboard`.
