---
title: Re-verify real state immediately before acting
type: lesson
status: active
confidence: high
source_workflow: Dashboard Maintenance Pass / Daily Build Health Check
source_agent: Chief, Build
category: success-pattern
related_pages: [chief-approvals, dashboard-maintenance]
related_prs: [75, 76, 77]
last_reviewed: 2026-07-04
---

## Rule

Before merging, closing, or presenting a card about a PR/branch, re-check its real
state (`gh pr view`, `gh pr diff --name-only`) right then — don't rely on a check done
earlier at discovery time.

## Why

Facts about external state (open/mergeable/CI status) can drift between when they're
first discovered and when an action actually happens. Treating "verified at discovery"
and "verified right now" as the same fact is exactly where stale assumptions cause
real mistakes — merging something no longer mergeable, or presenting a card whose
facts have changed.

## Apply when

Any action (merge, close, present-for-decision) happens more than a few minutes after
the fact was first established, or after any other action was taken in between.

## Avoid when

The re-check itself would be expensive or risky (rare for read-only `gh` calls) — in
practice this is close to unconditionally worth doing, since the cost is one extra
command.

## Check first

Re-run the exact same read used at discovery (`gh pr view <n>`, `gh pr diff <n>
--name-only`) immediately before acting — not a summary of what it said earlier.

---

Validated repeatedly across real merges/cards this session (PRs #75/#76/#77 and
several `ApprovalCard` presentations) before this lesson was written down.
