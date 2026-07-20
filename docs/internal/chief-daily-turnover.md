# Chief daily turnover panel (V1)

**Route:** `POST /api/chief/daily-turnover` (alias `GET` also supported)  
**UI:** `ChiefDailyTurnoverPanel` on Today → Chief home panel

## What it is

The V1 operator surface for manual daily turnover reporting. Operators can:

- see whether turnover is available (live API mode required)
- trigger turnover generation
- inspect the latest summary/message
- review recent session-only history

## Behavior

| State | UI |
|-------|-----|
| Demo mode | `Unavailable` — no trigger, honest note |
| Live mode | `Available` — manual **Generate daily turnover** button |
| Slack unset | Summary still returns; Slack status shows not configured (no fake success) |
| API error | Error line shown; trigger remains available |
| History empty | “No turnover history recorded yet.” |

## History

Session history is stored in `sessionStorage` only (`chief-daily-turnover-history-v1`, max 5 entries). There is **no server-side turnover history** in V1.

## Sources

- `lib/chief/dailyTurnover.ts` + `collectDailyTurnoverSnapshot.ts`
- `lib/governedLoopSlack.ts` for optional Slack delivery
- Approval activity, Supabase decisions, mission stores for counts
