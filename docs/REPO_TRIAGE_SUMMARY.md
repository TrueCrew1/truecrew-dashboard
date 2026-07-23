# Repo triage summary

**Audit date:** 2026-07-22  
**Scope:** `TrueCrew1/truecrew-dashboard` hygiene baseline (+ read-only look at sibling org repos).  
**Status:** Reference snapshot. Not a required checklist for routine PRs — use [SHIP_CHECKLIST.md](./SHIP_CHECKLIST.md) and `npm run verify` for that.

Related:

- [BRANCH_CLEANUP_PLAN.md](./BRANCH_CLEANUP_PLAN.md)
- [SECRET_HYGIENE_FINDINGS.md](./SECRET_HYGIENE_FINDINGS.md)
- [PROJECT_SEPARATION_FINDINGS.md](./PROJECT_SEPARATION_FINDINGS.md)

---

## Inventory (org)

| Repo | Role |
|------|------|
| `truecrew-dashboard` | True Crew command center (this repo) |
| `ms-painting` | M&S Painting customer app — keep separate |
| `discovery-form`, `true-crew-shift-handoff`, `handoff-template`, `PCR-Readiness` | Lead magnets / tools |
| Document library | Not found as a `TrueCrew1` GitHub repo (likely Obsidian / `knowledge/` / Drive) |

---

## Clone-to-run (this repo)

| Check | Status |
|-------|--------|
| README → install → run | Prerequisites, clone, `dev` / `dev:vercel` |
| `.env.example` | Present |
| `npm run verify` | lint + test + build |
| CI | lint + test + build on PRs to `main` and pushes to `main` / `cursor/**` |

Sibling notes (out of band): `ms-painting` has no CI and thin agent docs; `true-crew-shift-handoff` README claims `index.html` but the tree is incomplete — fix in those repos, not here.

---

## Branch health (this repo)

- Default: `main`
- ~67 remotes, **~52 open PRs** at audit — main debt is PR volume, not 45-day abandoned tips
- Plan only (no deletes from agents): [BRANCH_CLEANUP_PLAN.md](./BRANCH_CLEANUP_PLAN.md)

---

## Secret hygiene

No live keys found in tracked source. See [SECRET_HYGIENE_FINDINGS.md](./SECRET_HYGIENE_FINDINGS.md).

Baseline actions included here: ignore `.vercel/` / local agent configs; stop tracking `.vercel/README.txt`.

---

## Separation (True Crew vs M&S)

Package/deploy separation is clean. Chief may seed an `ms-painting` **context** in this repo; the customer app stays in `ms-painting`. Details: [PROJECT_SEPARATION_FINDINGS.md](./PROJECT_SEPARATION_FINDINGS.md).

---

## Founder follow-ups (optional, not blocking this baseline)

1. Triage/close duplicate open PRs; delete already-merged heads (start with #186).
2. Confirm `main` branch protection in GitHub UI.
3. Fix or archive incomplete satellite repos.
4. Rotate secrets only if you know they were exposed — none proven in the scan.
