---
title: Repair Playbook
type: reference
status: active
confidence: medium
last_reviewed: 2026-07-04
related_pages: [tool-catalog, vercel-status-checks, chief-approvals]
related_prs: [57, 58, 78]
---

# Repair Playbook

Compact, reusable memory of real degraded/blocked conditions — what broke, what was
tried, what actually worked, and when to trust the primary again. One entry per
condition worth remembering; not an event log (see Build Log / `knowledge/log.md`
for that) and not a narrative — see `docs/AGENT_RUNBOOK.md` § Reliability Agent for
health states, transition rules, and the event format that feeds this file.

**Schema, one block per entry:**
- `title`, `status` (active/tentative/deprecated), `system_or_tool`, `symptoms`,
  `detection_signal`, `likely_causes`, `failed_attempts`,
  `successful_fix_or_workaround`, `fallback_used`, `when_to_use_fallback`,
  `when_to_retry_primary`, `confidence`, `related_pages`, `related_prs`.

---

## Vercel Preview missing INTERNAL_API_SECRET

- **title:** Vercel Preview missing `INTERNAL_API_SECRET` — production/preview env mismatch
- **status:** deprecated (decision made — this is now expected, documented behavior, not an active condition to watch for)
- **system_or_tool:** Vercel Preview deployments — `/api/*` routes requiring
  `requireInternalAuth`
- **symptoms:** ~43 runtime errors on Preview deployments specifically; Production
  unaffected.
- **detection_signal:** `mcp__claude_ai_Vercel__get_runtime_errors` (read-only)
  surfaced the error count; root cause confirmed by checking Vercel env var scope —
  `INTERNAL_API_SECRET` set for Production only, not Preview.
- **likely_causes:** secret was added to Production scope when the internal-auth
  requirement shipped, and never back-filled to Preview.
- **failed_attempts:** none — this was caught by a read-only check, not by trying
  and failing to fix it first.
- **successful_fix_or_workaround:** decided via issue #89: Preview stays
  unauthenticated; these 401s are known noise, not incidents. No code change —
  documentation only. See `decisions/vercel-preview-secret-scope.md`.
- **fallback_used:** none — every browser verification this session ran in mock-data
  mode, never against a live Preview deployment, so the gap hasn't blocked real work.
- **when_to_use_fallback:** if a live-API Preview verification is ever needed, verify
  against Production instead (mock mode is also a valid fallback for anything that
  doesn't specifically need live-API behavior).
- **when_to_retry_primary:** n/a — this is accepted, permanent behavior, not a
  condition to "retry primary" out of. Re-open only if Preview genuinely needs
  live-API auth in the future (would require re-deciding, not just re-checking).
- **confidence:** high (root cause confirmed, not guessed; decision ratified in #89)
- **related_pages:** [decisions/vercel-preview-secret-scope](../decisions/vercel-preview-secret-scope.md), [concepts/vercel-status-checks](../concepts/vercel-status-checks.md)
- **related_prs:** #78

## Internal API 401s — blocked on secret-rotation confirmation

- **title:** `lib/auth.ts` internal API 401s — fix ready, deploy blocked on secret rotation
- **status:** active (condition still present)
- **system_or_tool:** Internal API auth (`requireInternalAuth`, `lib/auth.ts`) —
  affects multiple `/api/*` routes
- **symptoms:** 401 responses on internal API calls in production, traced to
  untrimmed secret/header comparison.
- **detection_signal:** two independent PRs (#57, #58) opened 8 minutes apart with
  byte-for-byte identical fixes — a strong signal the underlying bug was real and
  independently discovered twice.
- **likely_causes:** `INTERNAL_API_SECRET` / `x-internal-key` header carrying
  incidental whitespace not stripped before a timing-safe comparison.
- **failed_attempts:** none recorded — the fix itself (trimming both sides before
  comparing) is understood and ready; the blocker is procedural, not technical.
- **successful_fix_or_workaround:** PR #58's trim fix, code-reviewed and ready to
  merge — but merging is explicitly gated on David confirming Production secret
  rotation is complete (the trim only fixes the bug if the *currently stored*
  secret is already the clean, rotated value).
- **fallback_used:** none — no workaround exists for this path; it's a direct fix,
  not something with an alternate route.
- **when_to_use_fallback:** n/a.
- **when_to_retry_primary:** once David confirms the rotation checklist (Vercel env
  value has no trailing newline, `VITE_INTERNAL_KEY` matches, a redeploy happened,
  `/api/health` returns 200) — then merge PR #58, close PR #57 (already closed
  independently as of this entry).
- **confidence:** high
- **related_pages:** [decisions/auth-fix-secret-rotation](../decisions/auth-fix-secret-rotation.md), [chief-approvals](../concepts/chief-approvals.md)
- **related_prs:** #57 (closed), #58 (open)

## Capability present in code but not actually wired in

- **title:** `chiefApprovalUrgency.ts` — real code, reserved, not actually active
- **status:** active (still true as of this entry — reconfirmed by grep, not assumed)
- **system_or_tool:** `src/components/chief/chiefApprovalUrgency.ts` (urgency-bucket
  logic for Chief Approvals Roadmap Phase 4)
- **symptoms:** none — this isn't a failure, it's a category Reliability should
  watch for: a tool/module that *looks* available (it compiles, it's imported
  nowhere flagged as broken) but has zero real callers, so trusting it as "working"
  would be checking the wrong thing.
- **detection_signal:** repo-wide `grep` for `getUrgency()` / `DUE_SOON_HOURS` /
  `OVERDUE_HOURS` / `formatApprovalPendingSummary()` — zero real call sites.
- **likely_causes:** built ahead of the phase that needs it (Phase 4 — Alerts &
  Escalation), deliberately reserved rather than wired in early.
- **failed_attempts:** n/a.
- **successful_fix_or_workaround:** decision made to keep the file, mark it reserved
  with a header comment, not delete it as dead code — it matches a real, documented
  future phase.
- **fallback_used:** the simpler single-threshold "stale" badge shipped instead, for
  the narrower need that existed at the time.
- **when_to_use_fallback:** n/a — this is the current, intentional state, not an
  incident.
- **when_to_retry_primary:** when Phase 4 is actually scheduled, decide whether to
  build on this file as-is or reconcile it with the shipped stale badge (different
  thresholds: 24h/48h two-tier here vs. a single 24h in the shipped slice).
- **confidence:** high
- **related_pages:** [chief-approvals](../concepts/chief-approvals.md)
- **related_prs:** #63

## Related

- Runbook: `docs/AGENT_RUNBOOK.md` § Reliability Agent (health states, transition
  rules, event format)
- Reference: [tool-access](tool-access.md)
