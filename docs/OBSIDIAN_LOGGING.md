# Obsidian logging (v1)

Minimal local-first logging from True Crew into your live Obsidian vault. Obsidian stays the markdown knowledge layer; Supabase remains the app database.

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
| **Triage log** | `Operations/Logs/Triage Log.md` | Append section (intake pilot) |
| **Decision log** | `Decisions/{YYYY-MM-DD} — {title}.md` | New note per decision |
| **Hot context** | `True Crew/Hot Context.md` | Overwrite (single living note) |

Intake / second-brain notes from triage also write under `Sources/`, `Topics/`, and
`Synthesis/`. See [RESEARCH_CLEANUP_WORKFLOW.md](RESEARCH_CLEANUP_WORKFLOW.md).

These align with existing seed/mock conventions (`Decisions/…`, `Operations/…`) and keep rolling logs separate from one-off deploy/runbook notes.

## Setup

1. Set your vault root locally (not in Vercel production):

```bash
# .env.local
OBSIDIAN_VAULT_PATH=/absolute/path/to/your/vault
```

2. Log from the repo root:

```bash
npm run obsidian:log -- build --result success --branch main --commit abc1234 --notes "CI green"
npm run obsidian:log -- decision --title "Q3 pricing" --decision "Keep seat-based starter tier" --context "Reviewed usage data"
npm run obsidian:log -- pr --number 42 --title "Obsidian logging slice" --status merged --url "https://github.com/..."
npm run obsidian:log -- hot-context --body "Current focus: ship Phase C read path. Blocker: none."
```

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
