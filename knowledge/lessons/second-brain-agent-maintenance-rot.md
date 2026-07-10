### Research Finding Intake — AI-agent second brains fail from maintenance debt, not creation
- ID: 2026-07-09-second-brain-agent-maintenance-rot
- Date: 2026-07-09
- Agent: Research
- Source(s) checked: First-person LLM-wiki build write-ups (Theo James ×2; Mayank
  Bohra/Towards AI; The AI Operator); skeptic/analysis pieces on LLM-wiki scale
  problems (Proudfrog "Second Brain Graveyard"; Tianpan "Provenance Debt"; Inside AI
  Agents "Knowledge Problem Nobody Solved"); one trust-oriented build guide
  (myKG + Obsidian); cross-cutting refs (APQC/Glasp on tool-hopping, a 2025 MIT Media
  Lab EEG study on cognitive offloading). All secondary/commentary-grade web sources,
  mid-2026; no primary founder interviews.
- Finding: The dominant reported failure mode for solo-maintained AI-agent second
  brains isn't building the wiki, it's keeping it alive — append-only ingest rots at
  50–100 sources because stale and current claims coexist, same-model self-linting
  can't catch its own hallucinated cross-references, and unlabeled AI-written pages
  re-enter the corpus and outrank primary sources at retrieval (provenance debt).
  This validates hard caps, "will I care in 3–6 months?" gating, and human-gated
  promotion as the correct defense against rot, not overhead. (Related, lower-confidence
  lessons from the same pass: AI-written pages need provenance labels + human-in-the-loop
  since self-review can't catch contamination; prefer rewrite/reconcile over append and
  keep source-traceability — neither yet independently validated.)
- Worked: Sources converged fast and independently on the maintenance/rot theme,
  giving high confidence in the core finding despite all sources being secondary.
- Failed: No primary/founder-interview data — all findings are commentary-grade, not
  controlled studies (except the cited MIT EEG study, which is tangential support, not
  direct evidence). Also: the research pass's own source-check assumed
  `docs/RESEARCH_SECOND_BRAIN_WORKFLOW.md` didn't exist and that governance lived only
  under `knowledge/concepts/second-brain-workflow.md` and
  `knowledge/sources/second-brain-governance-rules.md` — that assumption is *currently
  correct* for this checkout: neither `RESEARCH_SECOND_BRAIN_WORKFLOW.md` nor
  `OBSIDIAN_RESEARCH_INTAKE.md` nor any `knowledge/` directory exists on `main` or the
  branch this session has checked out (`test/maintenance-runtime-edge-cases`) — both
  docs exist only on the unmerged PR #113 branch
  (`claude/research-second-brain-spec-49iz7u`), and `knowledge/` exists only on the
  unmerged `docs/second-brain-starter-vault` branch. This payload is built against
  those unmerged branches' rules, not against what's live on `main` today.
- Next time: Track whether this finding (or a prune/Memory Review pass informed by it)
  gets independently cited in a future build session — that's the cheapest path to a
  legitimate Starter-Pass-candidate promotion. If provenance labeling is ever
  prototyped in `knowledge/`, re-evaluate the second related lesson above.
- Tier: Lesson
- Dedupe check: Checked `knowledge/index.md` and `knowledge/lessons/*.md` on the
  `docs/second-brain-starter-vault` branch (5 lessons filed, cap 20 — no cap
  pressure). No existing lesson covers agent-maintenance-rot, provenance debt, or
  append-vs-reconcile. Closest related page is
  `knowledge/concepts/second-brain-workflow.md` (the governance rules this finding
  *validates*, not duplicates) — no sharpen-in-place candidate found; this would be a
  new file. Also checked `knowledge/log.md` tail for a pending deferred-candidate line
  on the same topic — none found.
- Destination: knowledge/lessons/second-brain-agent-maintenance-rot.md
- Related approval request: none
- Related PR: none
