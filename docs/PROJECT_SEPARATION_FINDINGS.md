# Project separation findings — True Crew vs M&S Painting

**Audit date:** 2026-07-22  
**Policy:** reference findings only — no refactors in the hygiene baseline.

## Intended split

| Lane | Repo | Role |
|------|------|------|
| True Crew **platform** | `truecrew-dashboard` (+ lead magnets) | Command center, Chief, gates, knowledge |
| M&S Painting **customer app** | `ms-painting` | Jobs, invoices, crews, inventory |
| Lead magnets | `discovery-form`, `true-crew-shift-handoff`, `handoff-template`, `PCR-Readiness` | Marketing / standalone tools |

No shared runtime packages or submodules. Cross-links should be **product context**, not code imports.

## This repo

| Path | Note |
|------|------|
| `src/data/mockData.ts` | Seeds `projectId: "ms-painting"` for Chief demos — keep as context seed; do not import live M&S schema |
| `src/components/chief/msPaintingApprovals.ts` / `chiefContext.ts` | Intentional scoped context — generalize when a second customer appears |
| `docs/CHIEF_CONTEXT_SWITCHING.md` | Documents the split correctly |

## `ms-painting` (fix there, not here)

- Migration comments still say “True Crew v1 …”
- Rebrand/deploy docs use machine-local paths
- Founder tester seed (`TRUE_CREW_*`) is OK if documented; customer UI must not show “True Crew” (smoke script guards this)

## What not to do

- Monorepo “just because” both use Supabase/React  
- Copy M&S schema into dashboard migrations (or the reverse)  
- Point either production env at the other’s Supabase  
- Remove Chief’s `ms-painting` context without a replacement — it is intentional UX  
