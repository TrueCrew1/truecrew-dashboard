# Obsidian logging (v1)

Minimal local-first logging from True Crew into your live Obsidian vault. Obsidian stays the markdown knowledge layer; Supabase remains the app database.

**Authoritative vault architecture:** see [`docs/FILE_SECOND_BRAIN_KNOWLEDGE_ARCHITECTURE_V1.md`](FILE_SECOND_BRAIN_KNOWLEDGE_ARCHITECTURE_V1.md) for the full vault folder layout, frontmatter schema, and note conventions. This page describes how the logging script writes into that vault; the spec is the source of truth if the two ever disagree.

## Recommended repo files

| File | Role |
|------|------|
| `lib/obsidian/` | Shared utility module — paths, templates, vault writes |
| `scripts/obsidian-log.ts` | Thin CLI for manual / local automation |
| `docs/OBSIDIAN_LOGGING.md` | This plan |
| `docs/AGENT_WORKFLOW.md` | Agent ↔ approver roles and checklist |
| `scripts/setup-obsidian-vault.ts` | Seed vault workflow templates |

**Script + module (both).** The module holds path conventions and markdown rendering; the CLI is a small wrapper for local use. No API write routes in v1 — Vercel cannot reach a local vault.

## Vault note paths

| Log type | Vault path | Write mode |
|----------|------------|------------|
| **Build log** | `Operations/Logs/Build Log.md` | Append section |
| **PR log** | `Operations/Logs/PR Log.md` | Append section |
| **Decision log** | `True Crew/05-Decisions/{YYYY-MM-DD} - {slug}.md` | New note per decision |
| **Hot context** | `True Crew/Hot Context.md` | Overwrite (single living note) |

Decision filenames use a plain hyphen (`" - "`, space-hyphen-space) per Knowledge Architecture V1 — never an em-dash. The slug should be ≤ 6 words and state the decision, not just the topic (e.g. `2026-07-03 - Exclude preview from SSO wall.md`, not `...vercel-protection.md`).

> **Legacy (deprecated):** earlier versions of this script wrote decisions to `Decisions/{YYYY-MM-DD} — {title}.md` at the vault root, with an em-dash separator, inside the legacy iCloud vault. That convention is historical only — do not recreate it. See the Pre-Creation Lock List in the V1 spec for the reconciliation this superseded.

Build/PR rolling logs and Hot Context keep their existing paths — the V1 spec's `06-Operations/Agent Logs/` convention is for per-slice agent logs (one file per slice, written manually/by an agent), which is a separate concept from this script's rolling `Operations/Logs/Build Log.md` and `Operations/Logs/PR Log.md` files. This script does not currently write per-slice agent logs.

## Setup

1. Set your vault root locally (not in Vercel production):

```bash
# .env.local
OBSIDIAN_VAULT_PATH=/Users/truecrew/ObsidianVault
```

2. Log from the repo root:

```bash
npm run obsidian:log -- build --result success --branch main --commit abc1234 --notes "CI green"
npm run obsidian:log -- decision \
  --title "Keep seat-based starter tier" \
  --decision "Keep seat-based starter tier for Q3" \
  --summary "Q3 pricing stays seat-based rather than moving to usage-based." \
  --context "Reviewed usage data" \
  --tags truecrew,dashboard
npm run obsidian:log -- pr --number 42 --title "Obsidian logging slice" --status merged --url "https://github.com/..."
npm run obsidian:log -- hot-context --body "Current focus: ship Phase C read path. Blocker: none."
```

`--summary` is required for decisions (Knowledge Architecture V1 [M] frontmatter field — must be enough to triage the note from that line alone). `--tags` must be drawn from the controlled vocabulary (`truecrew, dashboard, infra, tooling, agents, ux, governance, daily`) — the script rejects anything else. Run `npm run obsidian:log -- decision --help`-equivalent (no args) to see the full flag list, including `--alternatives`, `--impact`, `--follow-ups`, `--related`, and `--status`.

Obsidian Sync (or git on the vault) propagates notes to your second brain.

## Smallest implementation plan

### Done in v1 (this slice)

- [x] `lib/obsidian/` — config, paths, templates, safe filesystem writes
- [x] `scripts/obsidian-log.ts` — four commands: `build`, `decision`, `pr`, `hot-context`
- [x] `OBSIDIAN_VAULT_PATH` in `.env.example`
- [x] `npm run obsidian:log` script

### Librarian artifacts (v1 slice)

- `POST /api/librarian/artifacts` — create indexed artifact for a task (`{ taskId, useAi? }`)
- `GET /api/tasks/:id/artifacts` — list artifacts linked to a task
- CLI: `npm run obsidian:log -- artifact --task-id task-001 [--use-ai]`
- Tier 0: deterministic title/summary/tags + Supabase `notes` upsert + optional local vault write
- Tier 1: set `LIBRARIAN_AI_ENABLED=true` with local Ollama; always falls back to deterministic

### Deferred (safe next steps)

| Step | Why later |
|------|-----------|
| `GET /api/obsidian/notes` read route | Needed for KnowledgePage live vault; separate from write logging |
| CI / deploy hooks calling `obsidian:log` | Requires vault access in CI or a sync agent |
| Task → `Logged` stage auto-write | Couples workflow to vault; needs prompt templates + Supabase index upsert |
| Supabase `notes` row upsert on write | **Done** — Librarian artifact slice |

## Manual vs automated (v1)

| Activity | v1 approach |
|----------|-------------|
| **When to log** | Manual — operator decides after builds, merges, decisions |
| **Build / PR entries** | Manual CLI (optional: local shell alias after `npm run build`) |
| **Decisions** | Manual CLI when a decision is made |
| **Hot context** | Manual CLI when focus/blockers change |
| **Vault path** | Manual env var on your machine |
| **Note discovery in app** | Unchanged — KnowledgePage still uses Supabase + future read API |
| **Supabase index** | Manual / unchanged — no auto-upsert in v1 |

## Safety constraints

- Writes refuse paths outside `OBSIDIAN_VAULT_PATH`
- No secrets in notes — env vars only point at the vault root
- No redesign of app UI or database schema
- Production API does not depend on Obsidian being reachable
