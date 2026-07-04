---
title: Second Brain Workflow (vault governance)
type: concept
status: established
created: 2026-07-04
updated: 2026-07-04
related_pages: [chief-approvals, approval-load, second-brain-setup]
related_prs: [80]
related_cards: []
---

# Second Brain Workflow (vault governance)

## Summary

The Second Brain Starter Pass is how `knowledge/` gets maintained — Chief coordinates
Research and Content to turn real work artifacts into durable pages, with Build as a
source-only provider. For its first month, the workflow runs under explicit caps and a
priority filter designed to keep the vault small and high-signal rather than let it
sprawl into an unmaintained wiki. Full rules live in `docs/AGENT_RUNBOOK.md` §
**Second Brain Starter Pass** and § **Knowledge Maintenance** — this page is a
pointer/summary, not a restatement of the full text.

## Established facts

- **Hard caps (first month):** concepts ≤10, projects ≤5, decisions ≤15, sources ≤50.
  A candidate page that would exceed its cap gets logged as a deferred idea in
  `knowledge/log.md` instead of created.
- **Priority order for what earns a page**, highest first: active projects/live
  systems (dashboard, Chief → Approvals, the Agent Runbook) → durable rules/patterns
  (Approval Load, bundling, correlation passes, this workflow itself) → significant
  ongoing decisions (auth rotation, tool-catalog classifications, Vercel/Supabase
  gating) → ephemeral details (lowest — default is no page).
- **The 3–6 month test:** a page only gets created if the honest answer to "will I
  care about this 3–6 months from now?" is yes.
- **Run triggers (first month):** notable dashboard/governance work, or an explicit
  ask from David — never a timer. Between passes, agents read the vault freely;
  writes happen only inside a pass.
- **Three named safeguards:** no orphaned pages (everything reachable from
  `index.md`); no duplicate topics (merge, or log the alternative framing instead of
  creating a near-duplicate); no uncontrolled renaming (titles are stable; a rename
  is logged explicitly).
- **Page quality:** short and structured (1–2 paragraphs + a few bullets + links out);
  point to `sources/` notes rather than duplicating their text; established facts,
  assumptions, and open questions kept visibly separate.

## Open questions / inference

- These are first-month rules by design — whether the caps (10/5/15/50) are the right
  long-term numbers, or need revisiting once the vault has real usage history, is
  explicitly not decided yet.
- No case has yet arisen where a genuinely high-priority topic was blocked purely by a
  cap (all caps have wide headroom as of this pass) — the deferral mechanic is
  documented but not yet stress-tested in practice.

## Related

- Pages: [chief-approvals](chief-approvals.md), [approval-load](approval-load.md), [second-brain-setup](../projects/second-brain-setup.md)
- PRs: #80
- Decisions: none — this is a rule set, not a one-time decision
