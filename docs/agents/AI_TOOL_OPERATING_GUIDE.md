# AI Tool Operating Guide

The explicit "how we use tools" policy for this repo's AI/agent stack. Read this before
reaching for any AI tool on a True Crew task — it says which tool is right for the job,
what it hands off to, and where the line to real repo changes actually is.

This guide governs *usage policy*. The machine-readable tool records live in
`docs/TOOL_CATALOG.md`; the reasoning behind each classification lives in
`docs/AGENT_RUNBOOK.md` §§ Tool Catalog / External Services Tool Catalog; fallback
chains live in `knowledge/reference/tool-fallbacks.md`. This doc doesn't restate those —
it sits on top of them as the orchestration/workflow layer.

**Verification note (read this first):** every tool below is either (a) verified —
named in `docs/TOOL_CATALOG.md`, `docs/AGENT_RUNBOOK.md`, `.env.example`,
`.coderabbit.yaml`, or `package.json`, or evidenced in repo history — or (b) explicitly
marked **not currently in the stack**. Nothing here is invented to fill out a roster.
See § J for the full reality check.

---

## A. Purpose

- Maximize output quality while using premium tools (Claude Code / Claude Pro,
  Perplexity Pro, Cursor Pro) efficiently — reserve them for leverage-heavy work:
  repo-scale implementation, high-stakes reasoning, live research that has to be
  current.
- Use free/local tools (Continue.dev + Ollama, free ChatGPT/Gemini/DeepSeek/Kimi) for
  ideation, second opinions, drafts, privacy-sensitive local experimentation, or
  overflow when a premium tool is rate-limited or low on credits — never as the
  system of record for a shipped change.
- This is an **orchestrated agent ecosystem**, not a pile of unrelated apps. Every
  tool below plays a defined role (§ B) and every output that isn't already
  implementation-grade has a defined handoff back into the governed path (§ F) before
  it can touch the repo.

## B. Ecosystem roles

One tool can hold more than one role. This is the role map this guide reasons from —
tool-by-tool detail is in § D.

| Role | Tool(s) | Verified? |
|---|---|---|
| **Governor / router** | Chief (approvals routing, in-repo agent + product feature) | Verified — `docs/AGENT_RUNBOOK.md` § Chief, `src/components/chief/*` |
| **Implementer** | Claude Code, running as this session's model (referred to in this workflow as **Claude Fable**) | Verified — `docs/TOOL_CATALOG.md` `claude-code` |
| **Reviewer / gate** | CodeRabbit (automated PR review) | Verified — `.coderabbit.yaml` |
| **Research agent** | Perplexity Pro (primary); free ChatGPT/Gemini (fallback) | Verified — `docs/TOOL_CATALOG.md` |
| **Long-context summarizer** | Kimi (free web chat) | Verified as a tool; "summarizer" is a usage pattern this guide assigns, not a repo-coded role |
| **Repo-triage agent** | DeepSeek (free web chat), used manually/script-driven with a repo-context prompt | Verified as a tool; "triage" is a usage pattern this guide assigns |
| **Small-transform specialist** | Reserved lane, template only — **not currently a wired tool** | **Not verified** — see § D, § J |
| **Local/private experiment agent** | Ollama (local) | Verified — `docs/TOOL_CATALOG.md` `ollama-local`, `.env.example` (`OLLAMA_HOST`, `OLLAMA_MODEL`) |
| **Voice/transcription agent** | Reserved lane, no current tool | **Not verified — nothing in this stack today** |
| **Free fallback ideation agents** | free ChatGPT, free Gemini, free DeepSeek, free Kimi | Verified — `docs/TOOL_CATALOG.md`, `knowledge/reference/tool-fallbacks.md` |

Secondary code-drafting sits with **Cursor Pro** (Build's PROPOSE-ONLY secondary
drafting tool, per `docs/AGENT_RUNBOOK.md` § External Services Tool Catalog) — real
and evidenced (`cursor/*` branches), but still gated the same as any other authorship
tool: it drafts, it never merges.

## C. Governance and ownership

- **Chief** is the governance / approvals / routing layer for this repo's own agent
  system. Chief's job, per `docs/AGENT_RUNBOOK.md` § Chief, is to turn every agent's
  approval request into an `ApprovalCard`, verify claims rather than trust them, and
  present David a clear Approve / Send back / Reject decision. **Chief routes
  decisions, not model calls** — there is no code in this repo that has Chief (or
  anything else) programmatically dispatch a task to GPT-5-mini, Kimi, DeepSeek, or
  any other model. "Routing" in this guide's tables (§ E) describes a policy humans
  and agents follow when picking a tool, not an automated dispatcher.
- **Claude Fable** (this session's Claude Code identity) is the only agent in this
  workflow allowed to author or propose real repo edits — code, config, migrations,
  or these docs themselves. Every other tool's output is advisory, draft, or
  research material until Claude Fable brings it into a PR.
- **CodeRabbit** is the PR review / gate layer — configured in `.coderabbit.yaml`
  with path-specific review instructions for this repo (mapper taxonomy boundaries,
  fail-open/hard-fail contracts, etc.), auto-review on non-draft PRs, and chat
  auto-reply. It reviews; it does not implement and does not merge.
- **External/manual models** (Claude Pro, Perplexity Pro, free ChatGPT/Gemini/
  DeepSeek/Kimi, Ollama) are advisory, summarization, triage, draft, or experimental
  tools only. None of them has an agent-callable API wired into this repo today —
  per `docs/AGENT_RUNBOOK.md` § External Services Tool Catalog, these are consumer
  chat subscriptions David relays by hand. Their output only reaches the product
  through Claude Fable authoring a change and CodeRabbit + David reviewing the PR.

## D. Explicit tool inventory

Legend — **Lane**: premium / free / local / manual / fallback-routed. **Verified**:
confirmed in repo config/docs/history, vs. manual/external only, vs. not present.

### Claude Pro
- **Best for:** ad-hoc high-stakes reasoning/drafting outside repo-scale work — the
  kind of synthesis you'd want a second, unhurried pass on.
- **Not for:** repo edits, anything that needs to land in a PR directly, anything
  time-sensitive (it's a manual copy/paste relay, not an API call).
- **Lane:** premium / manual.
- **Verified:** yes — `docs/TOOL_CATALOG.md` `claude-pro`, `docs/AGENT_RUNBOOK.md` §
  External Services Tool Catalog.
- **Role:** advisory input to Research/Content; never an implementer.

### Claude Fable (this agent)
- **Best for:** everything that becomes a real repo change — implementation, tests,
  refactors, migrations, and canonical docs like this one.
- **Not for:** throwaway brainstorming, disposable phrasing comparisons, or anything
  cheaper tools can do just as well — that's what free tools and Ollama are for (§ G).
- **Lane:** premium (Claude Code / Claude Sonnet & Opus family).
- **Verified:** yes — `docs/TOOL_CATALOG.md` `claude-code` (`status: fully-wired`).
  "Claude Fable" specifically names this session's model identity running inside
  that same Claude Code lane, not a separate tool.
- **Role:** implementer — the only lane that commits production-quality change (§ I).

### Cursor Pro
- **Best for:** secondary code drafting alongside Claude Code — real, evidenced use
  in this repo's own history (`cursor/*` PR branches).
- **Not for:** bypassing Build's merge gate. A Cursor-authored diff still goes
  through the same PR review as anything else.
- **Lane:** premium.
- **Verified:** yes — `docs/TOOL_CATALOG.md` `cursor`, `docs/AGENT_RUNBOOK.md` §
  External Services Tool Catalog ("Cursor Pro / VS Cursor").
- **Role:** implementer (secondary, PROPOSE-ONLY) — owned by Build.

### Perplexity Pro
- **Best for:** live web / current-events research — pricing changes, API rate
  limits, competitor info, anything that needs to be *current*, not just plausible.
- **Not for:** repo-local questions answerable by reading the code or docs — that's
  wasted premium research capacity (§ G).
- **Lane:** premium / manual.
- **Verified:** yes — `docs/TOOL_CATALOG.md` `perplexity-pro`.
- **Role:** research agent, owned by Research.

### GPT-5-mini
- **Best for:** small, narrow, single-file transforms — *if and when this lane is
  actually wired*.
- **Not for:** anything today. **Not verified** — no reference to GPT-5-mini exists
  in this repo's `.env.example`, `package.json`, `docs/TOOL_CATALOG.md`, or
  `docs/AGENT_RUNBOOK.md`. Treat this entry as a **reserved template**, not an
  active tool. The closest thing this repo actually has in the "quick external
  second opinion" category is **free ChatGPT** (manual, launch-only,
  `docs/TOOL_CATALOG.md` `chatgpt-free`).
- **Lane:** would be premium/API-routed *if* wired — currently **not present**.
- **Verified:** **no**.
- **Role:** would be a small-transform specialist. See `docs/prompts/gpt5mini-quick-edit.md`
  for the prompt template to use the day this lane is provisioned.

### Kimi 2.6
- **Best for (as actually available):** long-context document/ADR digestion and
  second-opinion overflow chat, via the free web chat at kimi.com.
- **Not for:** code edits, anything you need an audit trail on, or anything
  time-sensitive — it's a manual relay, not an API.
- **Lane:** free / manual.
- **Verified — with a correction:** the repo verifies **"free Kimi"** (Moonshot AI,
  `kimi.com`, `docs/TOOL_CATALOG.md` `kimi-free`) as a manual overflow chat tool. No
  version number ("2.6" or otherwise) is pinned or confirmed anywhere in this repo —
  don't repeat "Kimi 2.6" as if it's a confirmed model tier. Refer to it as **Kimi
  (free web chat)**.
- **Role:** long-context summarizer, per this guide's usage pattern (§ B). See
  `docs/prompts/kimi-doc-summarizer.md`.

### DeepSeek V Pro
- **Best for (as actually available):** repo-scale duplicate/stranded-code triage
  prompts, run manually against the free web chat at chat.deepseek.com.
- **Not for:** anything you'd call "Pro" today — see correction below.
- **Lane:** free / manual.
- **Verified — with a correction:** the repo verifies **"free DeepSeek"**
  (`docs/TOOL_CATALOG.md` `deepseek-free`) and explicitly researched (2026-07-04)
  that **no paid Plus/Pro tier exists for individuals** on `chat.deepseek.com` — the
  flagship model is free with daily-reset quotas. "DeepSeek V Pro" is not a real
  tier in this stack; don't use that name going forward. Refer to it as **DeepSeek
  (free web chat)**.
- **Role:** repo-triage agent, per this guide's usage pattern (§ B). See
  `docs/prompts/deepseek-triage.md`.

### Ollama
- **Best for:** local, private, zero-cost experimentation and drafts you don't want
  to spend premium credits or send off-machine.
- **Not for:** anything that needs to land in the repo directly, or any task
  requiring quality above a local 7B–14B coding model.
- **Lane:** local / free.
- **Verified:** yes — `docs/TOOL_CATALOG.md` `ollama-local`, `.env.example`
  (`OLLAMA_HOST`, `OLLAMA_MODEL`, gated by `LIBRARIAN_AI_ENABLED`).
- **Role:** local/private experiment agent. See `docs/prompts/ollama-experiment.md`.

### Editor/autocomplete role for Ollama
- **What it is:** Continue.dev (VS Code extension) uses local Ollama
  (`qwen2.5-coder:7b` autocomplete, `qwen2.5-coder:14b` chat/edit, `nomic-embed-text`
  embeddings) for inline autocomplete and cheap/routine in-editor chat.
- **Verified:** yes — `docs/TOOL_CATALOG.md` `continue-dev`, `docs/AGENT_RUNBOOK.md`
  § External Services Tool Catalog, `CLAUDE.md` § Tool routing (personal editor
  stack: "Claude Code + Continue.dev on local Ollama, two tools only").
- **Distinct from the Librarian-agent Ollama use** in `.env.example`
  (`LIBRARIAN_AI_ENABLED`, optional Tier-1 refinement) — same local Ollama install,
  two separate, already-documented roles. Don't conflate them.
- **Not wired to Planner/Build/Research/Content/Chief workflow** — `docs/TOOL_CATALOG.md`
  is explicit on this.

### Whisper
- **Best for:** nothing today.
- **Not for:** anything, in this repo, right now.
- **Lane:** n/a.
- **Verified:** **no — Whisper is not referenced anywhere in this repo** (no env
  var, dependency, doc, or code path). There is no voice/transcription workflow in
  this stack. Do not describe a Whisper-based voice-to-backlog pipeline as existing;
  § H's voice-capture playbook is written as a **future playbook**, not a live one.
- **Role:** none currently. If a voice-capture tool is ever adopted, add it to
  `docs/TOOL_CATALOG.md` first (per that file's own append-only convention), then
  update this entry.

### Free ChatGPT
- **Best for:** quick second opinion, short manual overflow chat when Claude
  credits are low.
- **Not for:** sustained drafting (free-tier quota is roughly 10 messages / 5-hour
  window on the flagship model) or anything needing an audit trail.
- **Lane:** free / manual.
- **Verified:** yes — `docs/TOOL_CATALOG.md` `chatgpt-free`.
- **Role:** free fallback ideation agent.

### Free Gemini
- **Best for:** large-context or multimodal tasks, second opinion.
- **Not for:** repo edits, sustained agentic workflows on the free tier.
- **Lane:** free / manual.
- **Verified:** yes — `docs/TOOL_CATALOG.md` `gemini-free`.
- **Role:** free fallback ideation agent.

### Free Grok
- **Best for:** nothing today.
- **Verified:** **no — Grok/xAI is not referenced anywhere in this repo.** Not part
  of the current free-tier overflow chain (which is ChatGPT → Gemini → DeepSeek →
  Kimi per `knowledge/reference/tool-fallbacks.md`). Don't add it to any routing
  table without first adding a real entry to `docs/TOOL_CATALOG.md`, per that file's
  own convention.
- **Role:** none currently.

### Free DeepSeek
- See **DeepSeek V Pro** correction above — this is the actual, verified tool
  (`docs/TOOL_CATALOG.md` `deepseek-free`). Manual overflow chat / repo-triage
  prompts only.

### Free Kimi
- See **Kimi 2.6** correction above — this is the actual, verified tool
  (`docs/TOOL_CATALOG.md` `kimi-free`). Manual overflow chat / long-context
  summarization prompts only.

## E. Routing / filtering matrix

**Verified** rows describe an actual tool in the stack, used per this guide's policy.
**Reserved** rows describe a lane this guide defines for the day the tool is actually
wired — treat them as a template, not a current capability.

| Task type | Primary | Fallback | Handoff destination | Output grade | Status |
|---|---|---|---|---|---|
| Current-web research | Perplexity Pro | free ChatGPT → free Gemini | Chief brief → Claude Fable | Advisory | Verified |
| Long-context doc/ADR digestion | Kimi (free web chat) | free Gemini | Chief decision → Claude Fable | Advisory | Verified |
| Repo-wide duplicate/stranded-code triage | DeepSeek (free web chat) | manual code review | Claude Fable validation → PR | Advisory | Verified |
| Real implementation / tests / refactors / production edits | Claude Fable (Claude Code) | Cursor Pro (secondary draft only) | — (this *is* the implementation lane) | Implementation-grade | Verified |
| Small, safe, narrow transforms (one file/snippet) | *Reserved — no wired tool* | free ChatGPT (manual, closest available) | Claude Fable review → PR | Advisory only, today | **Reserved** |
| Private/offline experiments | Ollama (local) | — | Claude Fable review → approved path | Advisory (scratch only) | Verified |
| Voice notes / spoken bug reports / founder memos | *Reserved — no wired tool* | David types the note manually | Chief prioritization → Claude Fable | Advisory | **Reserved** |
| Disposable ideation / alternate phrasing / quick comparison | Free ChatGPT / Gemini / DeepSeek / Kimi (whichever's available) | any other free tool | — (disposable, no handoff required) | Advisory / disposable | Verified |

## F. Handoff workflows

Each chain ends the same way: **Claude Fable turns advisory input into a real change,
CodeRabbit + David review the PR.** No chain skips that step.

- **Perplexity Pro → Chief brief → Claude Fable implementation → CodeRabbit review**
  Research produces findings; Chief turns anything decision-worthy into context for
  an `ApprovalCard` or a brief; Claude Fable implements; CodeRabbit reviews the PR
  per its path-specific instructions in `.coderabbit.yaml`; David approves/merges.
- **Kimi summary → Chief decision → Claude Fable doc rewrite**
  Kimi digests a long doc/ADR set (manual, copy-pasted in); Chief (or David directly)
  decides what changes; Claude Fable rewrites the doc; normal PR review.
- **DeepSeek triage → Claude Fable validation → PR**
  DeepSeek's triage output (stranded code, coverage gaps, config risk) is a list of
  *claims*, not fact — Claude Fable verifies each one against the actual code before
  acting, then opens the PR for whatever's real.
- **Voice memo → GPT-5-mini cleanup → Chief prioritization → Claude Fable execution**
  **Reserved chain — no voice-capture tool or GPT-5-mini lane exists today.**
  Documented as the intended shape for when both are wired; until then, David types
  notes directly and hands them to Chief/Claude Fable like any other request.
- **Ollama experiment → Claude Fable review → approved implementation path**
  A local Ollama experiment (scratch output only — see
  `docs/prompts/ollama-experiment.md`) never touches production files directly.
  Claude Fable reviews it, decides if the idea is worth a real implementation, and
  builds it fresh in the governed path if so — it does not copy the local output in
  verbatim.

## G. Premium-efficiency policy

- Don't spend Perplexity Pro research capacity on questions answerable by reading
  this repo's own code or docs.
- Don't spend Claude Pro / Claude Fable cycles on throwaway brainstorming or
  disposable phrasing comparisons — use a free tool first.
- Use Perplexity Pro only when external current truth actually matters (pricing,
  API limits, competitor behavior, anything that changes over time).
- Use Kimi (free) only when long context is genuinely the bottleneck — a long doc
  or ADR set that's tedious to read manually.
- Use DeepSeek (free) when the question is repo-scale triage (duplication, coverage
  gaps, config risk) — not for a single-file question Claude Fable can answer directly.
- Use Ollama first when privacy, local testing, or zero-cost experimentation is
  enough — don't default to a premium tool for a throwaway local check.
- Use free tools (ChatGPT/Gemini/DeepSeek/Kimi) for breadth, second opinions, and
  disposable drafts — never as the tool of record for something that ships.
- If/when a narrow-transform lane (GPT-5-mini or equivalent) is actually wired, its
  entire purpose is to keep tiny, low-risk edits off premium Claude Fable cycles —
  don't reach for it before it's real; use free ChatGPT manually in the meantime if
  a quick second opinion on a small edit is genuinely useful.

## H. Workflow playbooks

Each playbook names which tool starts it, which refines it, which produces the
implementation brief, which owns final implementation, and which gate reviews the
result. All of them end in a Claude Fable PR reviewed by CodeRabbit + David — see
`docs/PR_SUMMARY_TEMPLATE.md` and `docs/AGENT_WORKFLOW.md` for the mechanics of that
last step, which this guide doesn't restate.

### 1. Feature delivery
1. **Starts:** David or Planner states the feature ask.
2. **Refines:** Perplexity Pro if external research is needed (e.g. a pattern from
   another product); otherwise skip straight to brief.
3. **Implementation brief:** Chief/Planner frame it against existing docs
   (`knowledge/`, `docs/AGENT_RUNBOOK.md`) so Claude Fable isn't re-deriving context.
4. **Final implementation:** Claude Fable — code, tests, PR per
   `docs/PR_SUMMARY_TEMPLATE.md`.
5. **Gate:** CodeRabbit auto-review + David approval.

### 2. Bug triage
1. **Starts:** a failing test, a reported bug, or a DeepSeek triage pass flags
   something.
2. **Refines:** Claude Fable reproduces and root-causes directly — bug triage on a
   known repo is squarely Claude Fable's job, not an external tool's.
3. **Implementation brief:** the root cause itself, stated in the PR's "Why".
4. **Final implementation:** Claude Fable.
5. **Gate:** CodeRabbit + David, same as any PR. If ambiguity exists on intended
   behavior, escalate to Chief per `docs/AGENT_RUNBOOK.md` § Incidents, Pauses, and
   Escalation before guessing.

### 3. Documentation / ADR cleanup
1. **Starts:** a doc or ADR set that's grown stale or too long to review quickly.
2. **Refines:** Kimi (free) digests it if genuinely long — summary, key decisions,
   stale statements, a clarify/update checklist (see
   `docs/prompts/kimi-doc-summarizer.md`).
3. **Implementation brief:** Chief/David decide what actually needs to change from
   that checklist — Kimi's output is a summary, not a decision.
4. **Final implementation:** Claude Fable rewrites the doc.
5. **Gate:** normal PR review; docs affecting external-facing copy still need
   Content's gate per `docs/AGENT_RUNBOOK.md`.

### 4. Branch / PR review
1. **Starts:** a PR opens (any authoring tool — Claude Fable, Cursor Pro).
2. **Refines:** CodeRabbit auto-reviews per its path-specific instructions.
3. **Implementation brief:** review comments themselves are the brief for any fix.
4. **Final implementation:** Claude Fable applies fixes (regardless of which tool
   authored the original diff — merge/close always goes through the same gate).
5. **Gate:** CodeRabbit re-review + David approval.

### 5. Low-cost experimentation
1. **Starts:** a "what if" question that doesn't warrant a premium cycle yet.
2. **Refines:** Ollama (local) or a free tool, whichever fits — see
   `docs/prompts/ollama-experiment.md`.
3. **Implementation brief:** none yet — this stage produces a scratch artifact, not
   a brief.
4. **Final implementation:** only happens if Claude Fable reviews the experiment and
   decides it's worth building for real, from scratch, in the governed path.
5. **Gate:** n/a until step 4 turns it into an actual PR — then normal gates apply.

### 6. Voice-to-backlog capture using Whisper
**Reserved playbook — no voice-capture or transcription tool exists in this repo
today.** Documented as the intended shape for when one is added:
1. **Starts:** a spoken bug report or founder memo (tool TBD — not Whisper today).
2. **Refines:** a cleanup pass on the raw transcript (tool TBD).
3. **Implementation brief:** Chief prioritizes the cleaned note against current work.
4. **Final implementation:** Claude Fable.
5. **Gate:** normal PR review.
Do not treat this as an active workflow until a real transcription tool is added to
`docs/TOOL_CATALOG.md` first.

### 7. Multi-agent orchestration for a complex feature request
1. **Starts:** David or Planner states a feature that spans research + long-doc
   context + implementation.
2. **Refines:** Perplexity Pro (external facts) and/or Kimi (existing long docs) run
   in parallel, manually, each producing a short summary.
3. **Implementation brief:** Chief consolidates both into one brief, checked against
   `knowledge/decisions/` and `knowledge/concepts/` so nothing already-decided gets
   re-litigated.
4. **Final implementation:** Claude Fable — the only lane that touches the repo.
5. **Gate:** CodeRabbit + David; anything state-changing or hard-to-revert also
   needs a Chief `ApprovalCard` per `docs/AGENT_RUNBOOK.md`'s existing gates.

## I. Safety / anti-chaos rules

- No large speculative refactors without an explicit GO from David.
- No deleting branches or PRs just because they appear superseded — verify the
  feature was actually ported first.
- No merge path that bypasses Chief/PR review, regardless of which tool authored
  the change.
- No external model output (Claude Pro, Perplexity, ChatGPT, Gemini, DeepSeek,
  Kimi, Ollama) goes straight to production without Claude Fable authoring it into a
  reviewed PR first.
- **One canonical implementation lane owns final edits: Claude Fable.** Multiple
  tools may advise; only this lane commits production-quality change.
- If a tool's `health_state` in `docs/TOOL_CATALOG.md` is `DEGRADED`/`BLOCKED`, use
  the documented fallback in `knowledge/reference/tool-fallbacks.md` or disclose the
  degradation — don't silently proceed on a known-bad tool.

## J. Reality checks / no-fake-integrations

Some tools/models in this guide are documented because they're referenced in
`.env.example`, `docs/TOOL_CATALOG.md`, config, or established manual workflow. That
does **not** mean all of them are wired into any editor integration or app UI.
Verified vs. advisory/manual/absent, explicitly:

| Status | Tools |
|---|---|
| **Fully wired** (agent uses it directly, as part of normal operation) | Claude Code (Claude Fable), GitHub, Obsidian Build Log |
| **Partially wired** (real access, but scoped) | Cursor Pro (PROPOSE-ONLY), Vercel (read-only), Supabase (read-only / propose-only migrations), Obsidian roadmap docs |
| **Launch-only / manual** (real tool, no agent-callable API) | Claude Pro, Perplexity Pro, free ChatGPT, free Gemini, free DeepSeek, free Kimi, Ollama (local), Continue.dev |
| **Future-integration** (named, not yet connected) | Sentry |
| **Not present in this repo at all — no fabricated claim should describe these as wired** | GPT-5-mini, "Kimi 2.6" (as a version), "DeepSeek V Pro" (as a tier), Whisper, Grok |
| **Removed, not future work** | Cline, Cline Nightly, GitHub Copilot Chat — don't re-propose these; see `docs/TOOL_CATALOG.md` |

This repo's own convention (`knowledge/reference/tool-fallbacks.md` § Gaps) already
sets the precedent this guide follows: don't pre-build governance for a tool that
isn't actually in use — note the gap, add a real entry to `docs/TOOL_CATALOG.md`
first if/when the tool is adopted, then update this guide.
