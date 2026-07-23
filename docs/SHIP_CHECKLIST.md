# Ship checklist (True Crew dashboard)

Minimal gate before calling work **shippable**. Run `npm run verify` first. Approver: skim this against the PR summary — not a ceremony for every typo fix.

## Must pass

- [ ] `npm run verify` succeeds (lint + test + build)
- [ ] CI green on the PR
- [ ] No secrets or `.env*` files (except `.env.example` placeholders) in the diff
- [ ] Touched operator flows still show real **error / empty** states (no silent failures)
- [ ] PR follows `docs/PR_SUMMARY_TEMPLATE.md`

## Guardrails

- [ ] No fabricated product claims, APIs, or integrations — ask if uncertain
- [ ] Scope matches the ask (no drive-by refactors)
- [ ] No M&S Painting customer-app code landed here by accident (Chief context seeds are OK)

## Security (when touching auth / API / deploy)

- [ ] Internal API auth still required where expected
- [ ] Webhook / deploy workflows not weakened

## After merge (if needed)

- [ ] Run **Ops to run** from the PR (or confirm None)
- [ ] Log to Obsidian when vault is configured (`npm run obsidian:log`)

## Not required every PR

- Live Supabase smoke, Vercel dashboard clicks, or branch cleanup
  (see `docs/BRANCH_CLEANUP_PLAN.md` only when doing hygiene work)
