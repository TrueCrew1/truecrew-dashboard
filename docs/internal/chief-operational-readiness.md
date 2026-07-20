# Chief operational readiness summary (V1)

**Source of truth:** `lib/chief/operationalReadiness.ts`  
**API:** `GET /api/chief/operational-readiness` (alias for `GET /api/chief/approvals?view=operational-readiness`)

This slice composes existing V1 truth into one honest answer:

> Is TrueCrew V1 operationally ready, and what is active vs partial vs not wired?

## What it is

A deterministic summary object with:

- `overallStatus` — `ready` | `partial` | `blocked` | `not_wired`
- `domains[]` — Chief, Builder, Librarian, Repo hygiene, Integrations, Reporting
- `blockers`, `warnings`, `partialOrNotWired` — flattened operator-facing signals
- `generatedAt` — ISO timestamp when composed

No external API calls are made. Status is derived from typed catalogs, repo file presence, and env configuration probes.

## Sources

| Source | Used for |
|--------|----------|
| `lib/ops/toolGovernanceCatalog.ts` | Chief / Builder / Librarian tool status |
| `lib/ops/integrationsInventory.ts` | Integration partial vs not_wired inventory |
| `lib/ops/repoHygieneSummary.ts` | CI workflow presence vs in-app repo health |
| `lib/ops/capabilityPresence.ts` | Optional modules (turnover, Builder report) on current branch |
| `docs/internal/chief-v1-governed-loops.md` | Governed-loop context (referenced, not parsed) |
| `docs/V1_TRUTH_MAP.md` | Capability truth alignment (referenced, not parsed) |

## Status derivation

| Domain | Ready | Partial | Blocked | Not wired |
|--------|-------|---------|---------|-----------|
| **Chief** | Tool catalog `active` + core modules present | Missing core modules | — | — |
| **Builder** | — | Proposal factory and/or Builder report module present | — | No proposal factory |
| **Librarian** | — | Catalog `partial` | — | — |
| **Repo hygiene** | In-app repo-health signals wired | CI exists, in-app signals absent | CI workflow missing | — |
| **Integrations** | All inventory entries `active` | Any `partial` / `not_wired` entry | — | — |
| **Reporting** | — | Turnover and/or Builder report module present | — | Neither module on branch |

**Overall status:** `blocked` if any domain is blocked; else `ready` if all domains ready; else `partial` (typical V1 baseline).

## What remains manual / partial / not wired

- **Vault / Supabase env** — Chief stays `ready` with warnings when unset; durable writes are skipped.
- **Slack** — partial integration; webhook unset means notifications no-op.
- **Reporting** — `not_wired` until `lib/chief/dailyTurnover.ts` and/or `lib/build/builderReport.ts` land on the branch.
- **Repo hygiene** — CI runs in GitHub Actions; in-app aggregation is not built.
- **Google Drive workspace** — `not_wired` in integrations inventory.

## How Chief should read it

1. Call the API in live/dev with internal auth, or import `buildOperationalReadinessSummary()` server-side.
2. Treat `overallStatus` as the headline — expect `partial` on current V1 `main`.
3. Use `blockers` for hard stops, `warnings` for env/config gaps, `partialOrNotWired` for scoped limits.
4. Re-run after merging turnover, Builder report, or catalog updates — capability detection updates automatically.
