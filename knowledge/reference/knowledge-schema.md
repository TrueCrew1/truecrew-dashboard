# Knowledge note schema (typed notes in existing folders)

Canonical frontmatter for **structured note kinds** filed inside the existing
governed vault — primarily `sources/` (capture) and `decisions/` (outcomes).
Older vault pages may still use legacy fields (`confidence`, `related_pages`, …) —
do **not** bulk-migrate them.

There is **no** parallel `discovery/` tree. Typed notes stay Chief-visible and under
the same precedence / Second Brain rules as the rest of `knowledge/`.

Machine-friendly YAML frontmatter. Fill every required field; use empty lists /
`none` rather than omitting keys.

## Required fields

| Field | Type | Allowed values / notes |
|-------|------|------------------------|
| `id` | string | Stable slug id, e.g. `finding-2026-07-20-pm-overdue` (do not rename casually) |
| `type` | string | See **Types** below |
| `status` | string | Capture notes: `draft` \| `active` \| `validated` \| `deprecated`. Decisions keep outcome: `pending` \| `approved` \| `declined` |
| `truth_level` | string | `observed` \| `reported` \| `hypothesis` \| `validated` \| `rejected` |
| `scope` | string | Short product scope, e.g. `discovery`, `ops-workflow`, `compliance`, `competitor`, `platform` |
| `sensitivity` | string | `public` \| `internal` \| `restricted` \| `regulated` |
| `regs` | string[] | Regulatory tags — see **Regs**. Use `[]` if none |
| `data_type` | string | `interview` \| `field_note` \| `desk_research` \| `synthetic` \| `decision` \| `mixed` |
| `created_by` | string | Person or agent role, e.g. `david`, `research`, `chief` |
| `created_at` | date | `YYYY-MM-DD` |
| `updated_at` | date | `YYYY-MM-DD` |
| `links` | string[] | Paths or urls to related notes/PRs (repo-relative preferred) |
| `tags` | string[] | Freeform lowercase tags |

## Recommended optional fields

| Field | Notes |
|-------|-------|
| `title` | Human title (also used as H1) |
| `icp` | ICP / persona slug if known |
| `workflow` | Workflow slug if known (e.g. `pm-overdue`, `work-order-handoff`) |
| `evidence_strength` | `low` \| `medium` \| `high` |
| `related_prs` | Legacy-compatible list |
| `related_cards` | Legacy-compatible list |
| `confidence` | Legacy `high`/`medium`/`low` — optional on capture notes |

## Types → existing folders

| `type` | File under |
|--------|------------|
| `interview` | `sources/` |
| `finding` | `sources/` |
| `workflow_observation` | `sources/` |
| `competitor_profile` | `sources/` |
| `assumption` | `sources/` |
| `question` | `sources/` |
| `decision` | `decisions/` |

Suggested filename: `YYYY-MM-DD-short-slug.md` (same dating habit as existing sources).

Copy templates from `../templates/` (`interview-template.md`, `finding-template.md`,
`workflow-observation-template.md`, `competitor-profile-template.md`,
`assumption-template.md`, `question-template.md`, `decision-template.md`).

## Regs (extensible)

Use uppercase agency codes. Include only regs that **apply** to the note content.

**Core (use now):** `MSHA`, `OSHA`, `DOT`

**Extensible later (allowed values, not required):** `EPA`, `FRA`, `PHMSA`,
`STATE` (or `STATE-<XX>` e.g. `STATE-WV`), `OTHER`

If content is regulated or compliance-sensitive, set `sensitivity: regulated` **and**
populate `regs`. See [regulated-content.md](regulated-content.md).

## Minimal example

```yaml
---
id: finding-2026-07-20-pm-overdue-signal
title: Overdue PM is the first signal supervisors check
type: finding
status: active
truth_level: reported
scope: discovery
sensitivity: internal
regs: []
data_type: interview
created_by: research
created_at: 2026-07-20
updated_at: 2026-07-20
links:
  - sources/2026-07-20-supervisor-a-interview.md
tags: [pm, supervisor, today-view]
icp: field-supervisor
workflow: pm-overdue
evidence_strength: medium
---
```

## Related

- [regulated-content.md](regulated-content.md)
- [sources/README.md](../sources/README.md)
- Templates under [../templates/](../templates/)
