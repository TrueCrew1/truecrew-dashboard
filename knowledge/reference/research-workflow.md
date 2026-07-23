---
title: Research Workflow (v1)
type: reference
status: active
confidence: high
last_reviewed: 2026-07-18
created: 2026-07-18
related_pages: [second-brain-workflow, tool-catalog, chief-approvals]
related_prs: []
---

# Research Workflow (v1)

How Research runs a single, well-defined investigation and files results into
`knowledge/`. This is the minimal v1 lane — repo-internal only, no Obsidian or
cloud-storage automation yet.

## When to use

- Prior-art or vendor/pattern research needed before a decision.
- Chief routes a question that requires comparing options.
- Builder or Planner needs context before proposing a change.

## The iterative loop

Research runs this loop (from `docs/AGENT_RUNBOOK.md` § Research Agent):

1. **Plan** — What's actually being asked? One clear research question.
2. **Gather** — Real sources, not memory. Check actual docs, repos, vendor pages.
3. **Critique** — Poke holes in the first pass. What's weak, unverified, one-sided?
4. **Gap-fill** — Chase down what critique surfaced.
5. **Synthesize** — One clear answer, not a raw dump. Use the research template.
6. **Verify** — Check the synthesis against sources one more time before handing off.

Single-pass is allowed only for trivial lookups. If it's worth filing, it's worth
the full loop.

## Output format

Create a file in `knowledge/sources/` using `templates/research-template.md`:

```
knowledge/sources/{topic}-research.md
```

Required sections:
- Research question
- Context (why it matters now)
- Options considered (at least two)
- Comparison table
- Recommendation (advisory, not deciding)
- Sources checked (with verification checkboxes)
- Open questions
- Next action

## Filing rules

- **Check caps first:** Sources cap is 50. Check `index.md` count before creating.
- **3–6 month test:** Will this research matter in 3–6 months? If not, log it in
  `knowledge/log.md` instead of creating a file.
- **No duplicates:** Search existing sources before creating. Extend if similar.
- **Link correctly:** Add to `related_pages` in frontmatter; update `index.md`.
- **Log the creation:** Append a line to `knowledge/log.md`.

## Chief ↔ Research handoff

**Chief routes to Research when:**
- A decision needs prior-art or vendor/pattern comparison.
- Builder or Planner is blocked on context Research can provide.
- An existing tool/pattern needs reevaluation.

**Research hands back:**
- A structured `knowledge/sources/{topic}-research.md` file.
- A summary for Chief to include in a situation brief or card.
- Recommendation flagged as advisory, not a decision.

**Chief escalates to founder when:**
- Research recommends adoption or removal of a major tool/vendor.
- Research suggests a stack change affecting Build or production.
- The recommendation triggers a `ResearchApprovalRequest` per the runbook.

## What Research does NOT do

- Adopt or deprecate anything unilaterally.
- File into Obsidian or cloud drives (v1 is repo-only).
- Create concept/decision pages directly (that's the Second Brain pass).
- Present recommendations directly to the founder (always via Chief).

## Running a Research pass (manual v1 process)

1. Receive question from Chief (or identify need during other work).
2. Create `knowledge/sources/{topic}-research.md` from template.
3. Run the iterative loop, filling in sections.
4. Update `status: draft` → `status: raw` when complete.
5. Update `confidence: low` → `medium` or `high` based on source quality.
6. Append creation line to `knowledge/log.md`.
7. Update `knowledge/index.md` Sources section.
8. Hand summary back to Chief for routing.

## Verification checklist

Before handing off:
- [ ] At least two options compared
- [ ] Sources actually checked (not from memory)
- [ ] Claims cite specific docs/pages
- [ ] Recommendation is advisory, not deciding
- [ ] File renders correctly (frontmatter valid, links work)
- [ ] `knowledge/log.md` updated
- [ ] `knowledge/index.md` updated
- [ ] No cap violation
