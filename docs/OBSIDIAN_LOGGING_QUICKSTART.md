# Obsidian logging — quickstart

Copy-paste guide for your first local verification and daily use.

## 1. First-time setup (once)

From the True Crew repo root:

```bash
npm install
```

Create `.env.local` with your **Obsidian vault root** — the folder Obsidian opens as a vault (not a single note, not the `.obsidian` folder inside it):

```bash
# .env.local
OBSIDIAN_VAULT_PATH=/Users/you/Documents/MyVault
```

**Path format rules:**

| Rule | Good | Bad |
|------|------|-----|
| Absolute path | `/Users/you/Documents/MyVault` | `~/Documents/MyVault` (use full path) |
| Vault root folder | folder that contains `.obsidian/` | `.../MyVault/Some Note.md` |
| No trailing slash required | `/Users/you/MyVault` | — |
| Quotes optional | `OBSIDIAN_VAULT_PATH=/path/with spaces/vault` | — |

Find your vault root in Obsidian: **Settings → Files and links → Vault folder** (or the folder you chose when creating the vault).

## 2. First verification (one command)

```bash
npm run obsidian:verify
```

**Success looks like:**

```
✓ Vault path: /Users/you/Documents/MyVault
✓ build log → Operations/Logs/Build Log.md
✓ decision log → Decisions/2026-06-29 — VERIFY first decision entry.md
✓ PR log → Operations/Logs/PR Log.md
✓ hot context → True Crew/Hot Context.md
```

Then open Obsidian and confirm those four notes exist. Entries prefixed with `VERIFY` are safe to delete after confirmation.

## 3. Daily commands (copy-paste)

Run from the repo root. `.env.local` is loaded automatically — no `export` needed.

### Build log

```bash
npm run obsidian:log -- build --result success --branch main --commit abc1234 --notes "CI green, preview deployed"
```

**Creates or appends:** `Operations/Logs/Build Log.md`

### Decision log

```bash
npm run obsidian:log -- decision --title "Keep seat-based starter pricing" --context "Reviewed Q2 usage" --decision "Defer usage-based pricing to Q3"
```

**Creates:** `Decisions/2026-06-29 — Keep seat-based starter pricing.md` (date is today)

### PR log

```bash
npm run obsidian:log -- pr --number 40 --title "Obsidian logging slice" --status merged --url "https://github.com/TrueCrew1/truecrew-dashboard/pull/40"
```

**Creates or appends:** `Operations/Logs/PR Log.md`

### Hot context

```bash
npm run obsidian:log -- hot-context --body "Focus: ship customer onboarding. Blocker: waiting on API keys. Next: review PR #41."
```

**Overwrites:** `True Crew/Hot Context.md` (one living note — previous body is replaced)

## 4. What appears in the vault

| Command | Vault file | What happens |
|---------|------------|--------------|
| `build` | `Operations/Logs/Build Log.md` | New section appended at bottom |
| `decision` | `Decisions/{today} — {title}.md` | New note file |
| `pr` | `Operations/Logs/PR Log.md` | New section appended at bottom |
| `hot-context` | `True Crew/Hot Context.md` | Entire file replaced |

Folders (`Operations/Logs/`, `Decisions/`, `True Crew/`) are created automatically if missing.

## 5. Beginner mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Pointing at a note file | `must be a folder, not a file` | Set path to vault **root** folder |
| Using `~` in `.env.local` | `Vault folder does not exist` | Use full path: `/Users/you/...` |
| Forgetting `--` before flags | npm eats your flags | Always: `npm run obsidian:log -- build ...` |
| Quoting multi-word `--body` wrong | partial or missing text | Wrap in single quotes: `--body 'Focus: x. Blocker: y.'` |
| Expecting hot context to append | old context disappears | By design — hot context is one current snapshot |
| Running from wrong directory | `.env.local` not found | `cd` to True Crew repo root first |
| Same decision title twice same day | second write overwrites first | Use a more specific title |
| Setting var only in terminal | works once, then fails | Put `OBSIDIAN_VAULT_PATH` in `.env.local` |

## Help

```bash
npm run obsidian:log -- --help
```

More context: [OBSIDIAN_LOGGING.md](./OBSIDIAN_LOGGING.md)
