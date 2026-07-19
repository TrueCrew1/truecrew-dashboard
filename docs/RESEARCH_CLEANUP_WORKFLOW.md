# Research + cleanup + second-brain workflow

Google Drive is the **only** source of truth for organized files and the Obsidian vault.
Obsidian is just the app that opens the vault folder inside Drive.

## Plain-English picture

1. You drop messy files into `TrueCrew/00-Inbox-Downloads` (in Google Drive).
2. You run one triage command.
3. Bots classify, move, and log each file.
4. Research-worthy files also get notes in the Obsidian vault.
5. You still decide what gets permanently deleted and nothing sends email.

## Paths (Mac)

| What | Path |
|------|------|
| Workspace | `/Users/truecrew/Google Drive/TrueCrew` |
| Obsidian vault | `/Users/truecrew/Google Drive/TrueCrew/Obsidian Vaults/TrueCrew Second Brain` |

These are written into `.env.local` by `npm run workspace:setup` (path keys only — secrets untouched).

## Folder layout (Google Drive)

```
TrueCrew/
  00-Inbox-Downloads/      ← drop messy files here
  01-Needs-Review/         ← unclear; you decide
  02-Research-Queue/       ← research docs
  03-Second-Brain/         ← reference files + Triage-Log.csv
  04-Archive/              ← keep, cold storage
  05-Delete-Candidates/    ← junk parked for YOU to delete
  BOT_PERMISSIONS.md
  Obsidian Vaults/
    TrueCrew Second Brain/
      Sources/
      Topics/
      Synthesis/
      Questions/
      Ops/
      Operations/Logs/
```

## Where logs live

| Log | Location |
|-----|----------|
| Markdown triage log | Vault → `Operations/Logs/Triage Log.md` |
| Spreadsheet log | `TrueCrew/03-Second-Brain/Triage-Log.csv` (import to Google Sheets) |
| Permissions | `TrueCrew/BOT_PERMISSIONS.md` |

Each log row includes: timestamp, file path, classification, destination, confidence, notes.

## Bot permissions (short)

**MAY:** read, classify, move/rename inside TrueCrew folders, create Obsidian notes, update logs.

**MAY NOT:** permanently delete outside `05-Delete-Candidates`, send email, touch production SaaS.

Enforced in code: `lib/workspace/permissions.ts`.

## Step-by-step (copy one line at a time)

Open Terminal on your Mac. Paste **one line**, press Return, wait for it to finish, then the next.

```bash
cd ~/truecrew-dashboard
```

```bash
npm install
```

(Skip `npm install` later if you already ran it and nothing broke.)

```bash
npm run workspace:setup
```

Creates the Google Drive folders + upserts the two path lines in `.env.local`.

```bash
npm run obsidian:setup-vault
```

Seeds Sources / Topics / Synthesis / Questions / Ops / Operations/Logs.

```bash
npm run workspace:triage -- --dry-run
```

**Preview only** — prints what would happen. Does **not** move files or change notes.

```bash
npm run workspace:triage
```

**Real run** — moves files, writes logs, creates notes.

Useful extras:

- `clear` — clean the Terminal screen
- `pwd` — show where you are
- `ls` — list files in the current folder
- `Ctrl+C` — stop a command that is stuck

## What you should see afterward

### In Google Drive → `TrueCrew/`

- Files leave `00-Inbox-Downloads`
- They appear in `01`–`05` folders by type
- `03-Second-Brain/Triage-Log.csv` grows a new row per file
- `BOT_PERMISSIONS.md` spells out the rules

### In Obsidian → vault **TrueCrew Second Brain**

Open that folder as a vault (Obsidian → Open folder as vault).

- `Sources/` — one note per research-worthy file (title, original path, summary, key points, tags)
- `Topics/` — theme notes when several sources share a theme
- `Synthesis/` — draft write-ups when enough sources exist
- `Operations/Logs/Triage Log.md` — append-only history of triage actions

## Code map

| Piece | Path |
|-------|------|
| Drive paths | `lib/workspace/paths.ts` |
| Permissions | `lib/workspace/permissions.ts` |
| Classifier | `lib/workspace/classify.ts` |
| Moves | `lib/workspace/move.ts` |
| Triage run | `lib/workspace/triage.ts` |
| Obsidian notes | `lib/workspace/second-brain.ts` |
| Logs | `lib/workspace/log.ts` |
| Setup CLI | `scripts/setup-truecrew-workspace.ts` |
| Vault CLI | `scripts/setup-obsidian-vault.ts` |
| Triage CLI | `scripts/triage-inbox.ts` |

## Safety reminders

- Junk is only **moved** to `05-Delete-Candidates` — you delete it in Finder/Drive.
- `--dry-run` is always safe to re-run.
- OneDrive / iCloud are not part of this workflow.
