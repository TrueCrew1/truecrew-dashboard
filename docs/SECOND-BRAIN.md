# Second Brain (Obsidian)

One-page map of how True Crew keeps its Obsidian vault ("TRUE CREW-SECOND
BRAIN") as a clean, high-signal knowledge layer, and how a nightly/agent sync
now wires the existing scripts together. This page indexes the detailed docs
below rather than restating them — on any conflict, the linked doc wins.

**Precedence note:** this vault (like the repo-internal `knowledge/` vault) sits
at tier 4 of the Authoritative Knowledge Hierarchy — durable memory for
continuity, not permanent truth. Anything it records about current code, config,
tool wiring, or deploy state must be re-checked against repo source, runtime
evidence, or the runbooks before being restated as still true. See
`docs/AGENT_RUNBOOK.md` § Knowledge Precedence & Task-Time Retrieval.

## What each script does

**`scripts/obsidian-log.ts`** (`npm run obsidian:log`)
Thin CLI over `lib/obsidian/log.ts`. Four commands, each a manual/scripted
write to the live vault:

- `build` — appends a section to the rolling Build Log
- `decision` — writes a new one-off decision note
- `pr` — appends a section to the rolling PR Log
- `hot-context` — overwrites the single "current focus" note
- `artifact` — indexes a task artifact (Librarian; `lib/librarian/create.ts`)

Full CLI reference, flags, and the vault-path table:
[docs/OBSIDIAN_LOGGING.md](OBSIDIAN_LOGGING.md).

**`scripts/setup-obsidian-vault.ts`** (`npm run obsidian:setup-vault`)
Seeds the vault with the workflow templates in `docs/vault-templates/`.
Skips any file that already exists unless `--force` is passed — safe to
re-run, never overwrites a note you've since edited. The file-walk/write
logic now lives in `lib/obsidian/seed.ts` (`seedVaultTemplates()`) so both
the CLI and the sync wrapper below call the same code path.

## Where notes live

| Log type | Vault path | Write mode |
|----------|------------|------------|
| Build log | `Operations/Logs/Build Log.md` | Append section |
| PR log | `Operations/Logs/PR Log.md` | Append section |
| Decision log | `Decisions/{YYYY-MM-DD} — {title}.md` | New note per decision |
| Hot context | `True Crew/Hot Context.md` | Overwrite (single note) |
| Workflow templates | `docs/vault-templates/**` → same relative path in vault | Seed once, skip if present |

Naming/structure conventions and the full rationale: [docs/OBSIDIAN_LOGGING.md § Vault note paths](OBSIDIAN_LOGGING.md#vault-note-paths).
Agent-role expectations around the vault (who may write what, when):
[docs/AGENT_RUNBOOK.md § Librarian](AGENT_RUNBOOK.md), specifically the
"never invents vault structure" and "repo wins on conflict" rules.

## Second Brain Sync

`scripts/second-brain-sync.ts` (`npm run second-brain:sync`) wraps the two
scripts above into one step: seed any missing vault templates, then append
one Build Log entry summarizing the run — unless the run is an exact repeat
of the last one (see Dedupe guard below). It's a thin CLI over
`runSecondBrainSync()` in `lib/obsidian/sync.ts`; all the actual logic
(seeding, logging, dedupe) lives in `lib/obsidian/`, not the script.

```bash
npm run second-brain:sync -- --result success --branch main --commit abc1234 --notes "nightly qa"
```

If `OBSIDIAN_VAULT_PATH` isn't configured (true for CI and any deployed
Vercel function — the vault is a local-only path), the script prints a
skip reason and exits `0` rather than failing its caller.

### The summary contract

`runSecondBrainSync()` returns a `SecondBrainSyncSummary` — a discriminated
union on `status`, so a caller narrows once and gets the right fields typed
without guessing at optionality:

| `status` | Meaning | `buildLogEntry` |
|----------|---------|-----------------|
| `"not-configured"` | `OBSIDIAN_VAULT_PATH` isn't reachable | `null` |
| `"deduped"` | Same (vault, result, branch, commit, notes) as the last run — skipped, no new information | `null` |
| `"synced"` | Fresh run — templates seeded (if any were missing) and a Build Log entry written | the written entry |

Every variant also reports `vaultConfigured`, `vaultPath`, `notesUpdated`
(vault notes actually written this run), and `newSectionsCreated` (vault
templates that didn't exist before this run). `skippedReason` is set on
`"not-configured"` and `"deduped"`, explaining why nothing (or nothing
further) was written.

### Dedupe guard (no note spam)

`scripts/nightly-qa.sh` runs on a fixed interval against whatever commit is
currently checked out — with no dedupe, every iteration would append a
near-identical Build Log entry even when nothing changed, or double-log if
the loop is restarted mid-cycle. `runSecondBrainSync()` guards against this:
it caches the last run's `(vaultPath, result, branch, commit, notes)`
signature in `.qa/second-brain-sync-last-run.json` (gitignored, local only)
and skips the Build Log append when the next call repeats it exactly. Vault
template seeding is unaffected — it's already idempotent on its own. The
moment any of those fields changes (e.g. the same commit starts failing),
the next call logs again.

### Calling it from code (Research, Chief, or any agent lane)

`runSecondBrainSync()` is a plain async function — no `child_process`, no
shell — so it can be imported and awaited directly wherever Node/TypeScript
already runs, with no extra shell privileges:

```ts
import { runSecondBrainSync } from "../lib/obsidian/sync.js";

const summary = await runSecondBrainSync({
  result: "success",
  notes: "Chief: nightly recap",
});

if (summary.status === "synced") {
  console.log(summary.buildLogEntry.obsidianPath); // typed, no null-check needed
}
```

It returns a summary rather than throwing on an unconfigured vault, so a
caller like Chief can check `summary.status`/`summary.vaultConfigured` and
just skip the step instead of failing whatever workflow triggered it.

### Nightly QA wiring

`scripts/nightly-qa.sh` (`npm run qa:nightly`) calls `second-brain:sync`
once per loop iteration, after the QA/build run, tagged with the run's
pass/fail result. Combined with the dedupe guard above, this stays a single
high-signal entry per *change* in outcome — not a log line per file change,
and not a repeat line per idle loop iteration — matching the existing
"keep it high-signal" rule in `docs/OBSIDIAN_LOGGING.md`.

## What this does not change

- No new vault folders, note types, or templates were invented — sync reuses
  the existing Build Log entry shape and the existing `docs/vault-templates/`
  set.
- No existing vault note is reformatted or overwritten; seeding only ever
  writes a template that isn't already present (or is force-overwritten
  explicitly via `--force`).
- No API route was added. The vault is only reachable from wherever
  `OBSIDIAN_VAULT_PATH` resolves to a real local directory — same constraint
  the existing `GET /api/obsidian/notes` route already has (`api/obsidian/notes.ts`).
