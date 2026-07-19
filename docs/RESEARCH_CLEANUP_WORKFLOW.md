# Research + cleanup workflow (pilot)

Let bots clean intake files and grow the Obsidian second brain — without deleting
things on their own or touching production systems.

## What you get

1. A fixed folder tree (`TrueCrew/…`) locally and in Google Drive
2. A triage command that scans the inbox, classifies, moves, and logs
3. Obsidian notes in `Sources/`, `Topics/`, and `Synthesis/`
4. Hard bot permissions (especially: no permanent deletes outside Delete-Candidates)

## Folder structure

Same names everywhere (local disk + Google Drive):

```
TrueCrew/
  00-Inbox-Downloads/     ← drop new files here
  01-Needs-Review/        ← unclear; human decides
  02-Research-Queue/      ← research-shaped docs
  03-Second-Brain/        ← note-shaped files + Triage-Log.csv
  04-Archive/             ← keep, but cold
  05-Delete-Candidates/   ← junk parked for YOU to delete
  BOT_PERMISSIONS.md
  GOOGLE_DRIVE.md
```

## Where logs are stored

| Log | Location |
|-----|----------|
| **Obsidian triage log** | Vault: `Operations/Logs/Triage Log.md` |
| **Google Sheets–ready CSV** | `TrueCrew/03-Second-Brain/Triage-Log.csv` |
| **Bot permissions** | `TrueCrew/BOT_PERMISSIONS.md` (also `lib/workspace/permissions.ts`) |

Import the CSV into Google Sheets: Drive → New → File upload, or Sheets → File → Import.

## Bot permissions (short version)

**MAY:** read, classify, move between approved folders, rename on collision, create
Obsidian notes, append triage logs / Sheets CSV.

**MAY NOT:** permanently delete outside `05-Delete-Candidates`, empty that folder
without you, send email, touch production SaaS (deploys, Stripe live, secrets).

Full list: `lib/workspace/permissions.ts`.

## How to start a triage run

### One-time setup

```bash
# 1) Create the folder tree (prefer a Google Drive for Desktop path)
npm run workspace:setup
# or:
npm run workspace:setup -- --path "/path/to/TrueCrew"

# 2) Put this in .env.local
TRUECREW_WORKSPACE_PATH="/path/to/TrueCrew"
OBSIDIAN_VAULT_PATH="/path/to/TrueCrew Second Brain"

# 3) Seed Obsidian templates (Sources / Topics / Synthesis / Triage Log)
npm run obsidian:setup-vault
```

### Every run

```bash
# Preview first (recommended)
npm run workspace:triage -- --dry-run

# Do it
npm run workspace:triage

# Small batch
npm run workspace:triage -- --limit 10
```

## What triage does

1. Scans `00-Inbox-Downloads`
2. Classifies each file with simple rules (junk → delete-candidates, PDFs → research,
   notes → second-brain, unclear → needs-review)
3. Moves the file into the matching folder
4. Appends a structured log entry (Obsidian + CSV)
5. For research / second-brain files, creates a `Sources/` note
6. When multiple sources share a theme, upserts a `Topics/` note
7. When a theme has ≥2 sources in the run, drafts a `Synthesis/` note

## Code map

| Piece | Path |
|-------|------|
| Folder names | `lib/workspace/folders.ts` |
| Permissions | `lib/workspace/permissions.ts` |
| Classifier | `lib/workspace/classify.ts` |
| Safe moves | `lib/workspace/move.ts` |
| Logs | `lib/workspace/log.ts` |
| Obsidian notes | `lib/workspace/second-brain.ts` |
| Orchestration | `lib/workspace/triage.ts` |
| Setup CLI | `scripts/setup-truecrew-workspace.ts` |
| Triage CLI | `scripts/triage-inbox.ts` |

## Founder control loop

1. Drop files in inbox (or let downloads land there)
2. Run triage (or ask an agent to run it)
3. Skim `01-Needs-Review` and `05-Delete-Candidates`
4. You empty Delete-Candidates — bots do not
5. Read new `Sources/` notes; edit Topics / Synthesis when useful

## Out of scope for this pilot

- Live Google Drive API calls (use Drive Desktop sync instead)
- Auto-emptying Delete-Candidates
- Email, Slack, or any outbound messaging
- Production deploys / Stripe / secrets
