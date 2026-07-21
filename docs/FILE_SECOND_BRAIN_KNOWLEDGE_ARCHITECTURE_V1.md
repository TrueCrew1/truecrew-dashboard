# True Crew Second Brain — Knowledge Architecture V1 (Final, Planning Source of Truth)

Scope: architecture spec for the Obsidian vault. No edits assumed. Reuse this document verbatim in creation prompts. Every convention below is marked [M] mandatory or [O] optional. Anything not marked is context, not a rule.  
Core mechanic driving the design: wikilinks resolve by filename, not path. Folder moves are cheap; note names are contracts. The only existing contract is [[True Crew Dashboard]] — that filename must not change.

## Global conventions (apply to everything)

[M] Naming: "True Crew" (with space) in all filenames and folder names. truecrew (lowercase, no space) only in tags. Never "TrueCrew" in a filename.  
Allowed exception: Second Brain - Hub.md omits "True Crew" because it lives at the /True Crew/ root — the path already provides the context. This is the only note allowed to rely on its path for naming context. Do not extend this exception to other notes.  
[M] Filename characters: ASCII only. Separator is space hyphen space (-). No em-dashes (—) in filenames — agents mistype them and wikilinks break silently. Em-dashes are fine inside note bodies.  
[M] Dates: ISO YYYY-MM-DD everywhere — filenames, frontmatter, month references.  
[M] One type per note. If content spans two types (e.g., architecture reference + operational steps), split into two notes. Never dual-type.  
[M] Frontmatter delimiters are --- (three hyphens), first line of the file. Nothing else is valid YAML frontmatter in Obsidian.  
[M] Flat until it hurts: no new subfolders until a folder exceeds ~20 notes. Date-prefixed filenames handle sorting until then.  
[M] Read-first sequence. Before creating or updating any note, an agent follows this order — no skipping steps: Second Brain - Hub.md → relevant index/hub → destination folder for similar notes → latest 1–2 related notes → then create/update.

## Part 1 — Folder Skeleton and Hub Notes

### Folder layout

```text
/True Crew/
  Second Brain - Hub.md            ← root hub, sits at tree root, not in a subfolder
  01-Glossary/                     ← one note per term; Glossary - Index.md lives here
  02-Truth Maps/                   ← current-state truth only: True Crew Dashboard.md,
                                      V1 Truth Map, integration status. REAL/STUB lives
                                      here and nowhere else.
  03-Architecture/                 ← existing; keep Infrastructure/ and Tooling/ as-is
  04-Runbooks/                     ← procedures + checklists; Runbooks - Index.md here
  05-Decisions/                    ← one note per decision, flat, date-prefixed
  06-Operations/
    Agent Logs/                    ← existing; slice logs, flat, date-prefixed
    Audits/                        ← flat, date-prefixed filenames (no monthly
                                      subfolders until >20 files)
/Daily Notes/                      ← vault root by design; lowest-structure zone
/Templates/                        ← vault root by design; Obsidian Templates plugin
                                      points here
```

/Daily Notes/ and /Templates/ intentionally live at vault root, outside /True Crew/. Do not move them under the tree.  
[M] Sub-hub naming pattern: `<Area> - Index.md` (Glossary - Index.md, Runbooks - Index.md). One root hub: Second Brain - Hub.md. The dashboard keeps its contract name True Crew Dashboard.md — it predates this pattern and existing links depend on it.  
[M] Implementation lock items (execute during creation — not optional prose):  
[M] Move VS Code Search Fix.md from 03-Architecture/ to 04-Runbooks/. Move inside Obsidian (not a manual file-system move) so links survive.  
[M] Vercel Preview Protection.md must be split per Global Convention 4 (one type per note): reference content stays in 03-Architecture/, operational steps become a runbook. Explicit human approval is required before this split is executed. No agent may perform the split unilaterally.

### Hub notes (type: hub)

[M] Hub rule for agents: hubs are read for navigation. Agents may edit only bullet/link lists inside existing hub sections — adding, removing, or reordering list items to keep links current. Agents may not rename headings, reorder sections, rewrite intro text, or append new sections without explicit human approval.  
Two hubs is deliberate: Dashboard = product truth. Second Brain hub = vault navigation. Do not merge.

#### 1. True Crew Dashboard.md — 02-Truth Maps/

Frontmatter includes aliases: `["True Crew Dashboard - Hub"]`.  
What this is — 2–3 lines: the truecrew-dashboard product, stack (Next.js / Vercel / Supabase), current phase  
Current truth — link to [[V1 Truth Map]] and the five-status taxonomy (REAL / STUB / MOCK / NOT STARTED / BLOCKED)  
Architecture — links into 03-Architecture/  
Active work — links to project notes  
Recent decisions — last 3–5 links into 05-Decisions/  
Recent activity — last 3–5 links into Agent Logs/ and Audits/

#### 2. Second Brain - Hub.md — /True Crew/ root

The single entry point an agent reads first.  
How this vault works — 3–4 lines: folder map, note types, vault-root exceptions  
Note routing table — the table below, verbatim  
Frontmatter rules — link to (or inline) the Part 2 schema  
Hubs — links to [[True Crew Dashboard]], [[Glossary - Index]], [[Runbooks - Index]]  
Open loops — manual list of status: draft notes (Dataview later)

[M] Note routing table (an agent creating any note follows this; no improvising):

| Creating a… | type | Folder | Filename pattern |
|---|---|---|---|
| Decision | decision | 05-Decisions/ | YYYY-MM-DD - <slug>.md |
| Slice log | log | 06-Operations/Agent Logs/ | YYYY-MM-DD - <slice name>.md |
| Audit | audit | 06-Operations/Audits/ | YYYY-MM-DD - <scope> audit.md |
| Runbook | runbook | 04-Runbooks/ | <Verb-first name>.md |
| Glossary term | glossary | 01-Glossary/ | <Term>.md (filename = term) |
| Truth / status | reference | 02-Truth Maps/ | <Name>.md |
| Architecture ref | reference | 03-Architecture/... | <Name>.md |
| Project / phase | project | 02-Truth Maps/ | <Phase name>.md |
| Anything unclear | — | ask the human | — |

[M] Decision slug: ≤ 6 words, hyphen-spaced, states the decision (2026-07-20 - Flatten audits folder.md), not the topic (…audits.md).  
[M] Audit filenames state scope first, after the date: YYYY-MM-DD - Vault inventory audit.md, YYYY-MM-DD - Repo readiness audit.md. The word "audit" always closes the name; the scope tells an agent what was audited without opening the file.  
[M] Project/phase notes live in 02-Truth Maps/ because, at current scale, they describe current product reality — the same job as the truth maps around them. If project-note volume grows beyond a small threshold (~10 notes), a separate projects folder may be added only by explicit human decision, recorded as a decision note. Agents never create that folder on their own.

#### 3. Glossary - Index.md — 01-Glossary/

How to use — one term per note, filename = term, link terms on first use elsewhere  
Terms — alphabetical wikilink list; seed with: Slice, Lane, Mission, Chief, Truth Map, the five statuses  
Pending terms — plain-text list of terms in circulation but not yet defined

#### 4. Runbooks - Index.md — 04-Runbooks/

By area — grouped links: Infra, Tooling, Agents  
Checklist runbooks — verification and audit checklists  
Gaps — runbooks referenced in logs/decisions that don't exist yet

## Part 2 — Frontmatter Schema

| Field | Req | Values / format |
|---|---|---|
| type | [M] | project \| runbook \| decision \| log \| audit \| reference \| glossary \| hub |
| status | [M] | per-type matrix below |
| tags | [M] | YAML array, no #, controlled vocabulary only |
| created | [M] | YYYY-MM-DD |
| summary | [M] | one line, plain text — an agent must be able to triage the note from this alone |
| updated | [O] | YYYY-MM-DD; bump on meaningful edits only |
| slice | [O] | quoted string; logs and audits only |
| mission | [O] | quoted string; logs and project notes only |
| lane | [O] | build \| review \| content \| discovery \| planning; logs only |
| aliases | [O] | YAML array of quoted strings |
| related | [O] | array of quoted wikilinks, max 3 — triage links only; the body ## Links section is the complete set |

[M] YAML gotchas agents must follow: wikilinks in related and names in aliases must be double-quoted (`related: ["[[V1 Truth Map]]"]`) or Obsidian's YAML parser breaks. Tags never carry # in frontmatter.

[M] Status matrix — allowed values and defaults per type

| type | Allowed statuses | Created as | Notes |
|---|---|---|---|
| log, audit | done | done | Records. Never active, never edited after the day closes (re-runs excepted, see Template 2). |
| decision | active, deprecated | active | Never done. Superseded → deprecated + two-way link to successor. |
| runbook | draft, active, deprecated | draft | active only once a human has verified the steps. |
| project | draft, active, done | active |  |
| reference, glossary, hub | active, deprecated | active |  |

[M] Controlled tag vocabulary  
truecrew, dashboard, infra, tooling, agents, ux, governance, daily  
Adding a tag to this list is a human decision, recorded as a one-line edit to the Second Brain hub. Agents never invent tags.

### Frontmatter examples

Project note — Empty States and Table Usability Phase.md (in 02-Truth Maps/)

```yaml
***
type: project
status: done
tags: [truecrew, dashboard, ux]
created: 2026-06-28
updated: 2026-07-01
summary: Retro and outcomes for the empty-states and table usability phase of the dashboard.
related: ["[[True Crew Dashboard]]"]
***
```

Runbook note — Enable Vercel Preview Protection.md (the runbook half of the split)

```yaml
***
type: runbook
status: draft
tags: [truecrew, infra]
created: 2026-06-25
summary: Steps to enable, verify, or bypass Vercel preview protection on the dashboard.
related: ["[[True Crew Dashboard]]", "[[Runbooks - Index]]"]
***
```

Log note — 2026-07-03 - Slice 2 Review.md

```yaml
***
type: log
status: done
tags: [truecrew, agents]
created: 2026-07-03
slice: "Slice 2"
lane: review
summary: Review pass of Slice 2 — results, issues, and follow-ups.
related: ["[[True Crew Dashboard]]"]
***
```

Daily note retrofit — 2026-06-30.md (minimal version)

```yaml
***
type: log
status: done
tags: [daily]
created: 2026-06-30
summary: <one line>
***
```

## Part 3 — Templates

Both live in /Templates/ for the core Templates plugin or agent copy-paste.

### Template 1 — Decision note

Filename: YYYY-MM-DD - <slug>.md → 05-Decisions/

```markdown
***
type: decision
status: active
tags: [truecrew]
created: YYYY-MM-DD
summary: <One line: what was decided.>
related: []
***

# <Decision summary>

## Context
<What forced a decision. 2–4 lines. Link the project or truth-map note that framed it.>

## Decision
<What was chosen. One clear statement. State conditions or scope limits here.>

## Alternatives considered
- **<Alternative A>** — <why rejected>
- **<Alternative B>** — <why rejected>

## Impact / risk
<What this changes, what could go wrong, what it constrains.>

## Follow-ups
- [ ] <Next step, with owner if relevant>

## Links
- Runbooks: [[<runbook affected or created>]]
- Logs: [[<slice log where this came up>]]
- Audits: [[<audit that triggered or validates this>]]
```

[M] Agent rules — decisions:  
One note per decision. Never append a new decision to an existing note. Supersede: create the new note, set the old to status: deprecated, link both ways.  
Before creating, search 05-Decisions/ for the same question. If a live decision exists, link it — don't duplicate.  
Every decision note must be linked from at least one hub or log in the same session. No orphans.

### Template 2 — Agent Slice Log

Filename: YYYY-MM-DD - <slice name>.md → 06-Operations/Agent Logs/

```markdown
***
type: log
status: done
tags: [truecrew, agents]
created: YYYY-MM-DD
slice: "<slice name/number>"
lane: <build | review | content | discovery | planning>
summary: <One line: what was run and the overall result.>
related: []
***

# <Slice name>

## Slice description
<What this slice covers and why it ran. 1–3 lines. Link the mission or project note.>

## What was run / checked
- <Command, check, or review performed>

## Results
**Overall: PASS | PARTIAL | FAIL**

| Check | Result | Notes |
|---|---|---|
| <check> | PASS | <detail> |

## Issues / blockers
- <Issue with enough detail to reproduce. "None" if clean.>

## Decisions made
- [[YYYY-MM-DD - <slug>]] — <one line> (or "None")

## Follow-ups / missions
- [ ] <Concrete next action>

## Links
- Runbooks used: [[<runbook>]]
- Decisions: [[<decision note>]]
- Audits: [[<related audit>]]
```

[M] Agent rules — slice logs:  
Before writing, read the most recent 1–2 logs for the same slice or lane so open issues carry forward.  
One log per slice per day. Second run same day → append ## Re-run (HH:MM) to the existing note; never a second file.  
Decisions made mid-slice: create the decision note first (Template 1), then link it. Logs reference decisions; they never contain them.

## Pre-Creation Lock List (human confirmation required before any notes are created)

Verify the dashboard link contract. Confirm existing links are exactly [[True Crew Dashboard]] (no Truecrew, no trailing space variants) before creating the hub. One grep in the vault settles it.  
Approve the Vercel Preview Protection split — which content goes to 03-Architecture/ vs the new runbook, and the runbook's verb-first name.  
Confirm existing folder names. The spec assumes 03-Architecture/Infrastructure/ and Tooling/ exist as written. If actual names differ (numbering, casing), the routing table must match reality, not this doc.  
Daily notes retrofit scope. Decide whether old daily notes get the minimal frontmatter retrofit or are left untouched. Retrofit cost is per-note; leaving them is fine if they're excluded from agent triage.  
mission identifier scheme. The field exists but no ID format is defined. Either define one (e.g., M-###) before logs start using it, or leave it free-text and accept inconsistency.  
Open-loops list ownership. Manual list on the hub will go stale. Acceptable now; decide who/what refreshes it (end-of-slice agent step vs Dataview later).  
This doc vs FILE_SECOND_BRAIN_ENV_GOVERNANCE_V1.md. If that governance doc defines path rules for the same vault, reconcile before creation — two sources of truth for paths is exactly the failure mode this spec exists to prevent.

## Next action

First creation prompt, in order: folder skeleton → Second Brain - Hub.md (with routing table) → True Crew Dashboard.md. That resolves the broken [[True Crew Dashboard]] links immediately and gives every later note a hub to link from. Frontmatter retrofits, sub-hub indexes, and templates follow in a second pass.
