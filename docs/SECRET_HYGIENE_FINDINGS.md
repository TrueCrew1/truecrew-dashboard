# Secret & local-config hygiene findings

**Audit date:** 2026-07-22  
**Policy:** findings + safe ignore/untrack only. Do **not** rotate secrets from an agent pass — humans rotate in Vercel / Supabase / Azure / Resend if exposure is confirmed.

## Summary

No live API keys, JWTs, Slack tokens, or `sk-` / `sbp_` / `xox*` values were found in tracked source. Issues are machine-specific paths, local tooling crumbs, and risky workflow input patterns.

## This repo — findings

| Path | Nature | Action |
|------|--------|--------|
| `.vercel/` (was tracking `README.txt`) | Local Vercel link folder | **Baseline:** gitignored + stop tracking |
| `lib/obsidian/config.ts` → `DEFAULT_VAULT_PATH` | Founder macOS vault path | Not a secret; prefer `OBSIDIAN_VAULT_PATH` in `.env.local` (follow-up) |
| `.env.example` | Placeholders only | Keep as-is |
| `sync-llm-env-vercel.yml` / `sync-slack-webhook-vercel.yml` | Secrets via `workflow_dispatch` inputs | Follow-up: prefer dashboard / Actions secrets (inputs can leak in logs) |
| `tests/auth.test.ts` | `"test-secret-value"` | Fine |

## Sibling repos (out of band)

| Repo | Note |
|------|------|
| `ms-painting` | Machine paths in `scripts/rebrand-ms-painting.mjs` and `docs/deployment-vercel.md` — fix there |
| `handoff-template` | Large export zip in git — review |
| `true-crew-shift-handoff` | Incomplete tree vs README |
| `discovery-form` | `.env.example` placeholders OK |

No dedicated “document library” GitHub repo found under `TrueCrew1`.

## Rotate only if you know exposure happened

`INTERNAL_API_SECRET` / `VITE_INTERNAL_KEY`, Supabase service role (per project), `AZURE_OPENAI_API_KEY`, `GITHUB_WEBHOOK_SECRET`, `SLACK_WEBHOOK_URL`, Resend keys. Never paste new secrets into PRs.
