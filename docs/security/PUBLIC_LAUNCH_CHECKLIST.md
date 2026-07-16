# Public Launch Checklist

Practical, operator-facing checklist for changing this repository's GitHub
visibility from private to public. Pulls together the findings from
`docs/security/PUBLIC_REPO_READINESS_REVIEW.md` (secrets) and
`docs/security/BRANCH_AUDIT_REPORT.md` (branch/PR hygiene) into one place.

## 1. Secrets review

**Status: done.** See `docs/security/PUBLIC_REPO_READINESS_REVIEW.md` for full
detail — current tree and full history across all 84 branches (323 commits)
scanned with gitleaks plus manual pattern sweeps. **No real or likely secret was
found anywhere.** Verdict: **safe to make public from a secrets perspective.**

## 2. `.gitignore` / temp-file hygiene

**Status: done.** `supabase/.temp/` (Supabase CLI local-link state — real project
ref and org ID, no credential) was tracked on `main` and has been untracked.
`.gitignore` now also covers `supabase/.branches/`, `.vercel/project.json`, and a
plain `.env` (in addition to the pre-existing `*.local` / `.env.local.bak.*`
coverage). No other tracked local/runtime artifacts were found in this pass —
`.claude/`, `.vscode/`, and `.vercel/README.txt` were checked and contain no
secrets or local-only state worth untracking.

## 3. Stale branch review

**Status: audited, not acted on.** See `docs/security/BRANCH_AUDIT_REPORT.md` for
the full breakdown of all 84 remote branches:

- 10 branches are merged into `main` with no open PR (their work is already in
  `main`'s history regardless of branch deletion) — lowest-risk cleanup candidates.
- 44 branches back a currently **open** PR — do not touch.
- 3 branches have no open PR but were touched in the last 48 hours — do not touch
  without confirming they're not in-progress work.
- 27 branches have no open PR and no recent activity — review candidates, but
  **not confirmed abandoned** (closed-PR history wasn't checked for these branch
  names in this pass).

This is a hygiene item, **not a security blocker.** A public repo with a lot of
stale branches isn't a safety problem, just noisy for anyone browsing it.

## 4. Branch / PR tidiness

**Status: flagged, not a blocker.** 44 open PRs currently exist, several dating
back to PR #1 (2026-06-26, still open ~3 weeks later). Worth a pass through the PR
queue before/soon after going public — closing anything genuinely superseded (after
verifying its feature landed elsewhere, per `docs/AGENT_RUNBOOK.md`'s Scope
Guardrail) makes the repo easier for outside contributors or readers to follow. Not
required before flipping visibility; a public repo with an active-looking PR queue
isn't unusual.

## 5. License check

**Status: missing — flagged, not invented.** No `LICENSE` file exists, and
`package.json` has no `"license"` field (it does have `"private": true`, which is
npm's "don't publish to the npm registry" flag — unrelated to GitHub repo
visibility; don't confuse the two). Without a license file, GitHub's default
all-rights-reserved copyright applies once public: visitors can view and fork, but
have no legal right to use, modify, or redistribute the code. If that's the intent
(e.g. "public for visibility, not for reuse"), no action is needed — just know
that's the effective default. If you want to explicitly allow (or explicitly
restrict) reuse, add a `LICENSE` file — but the choice of license is a business/
legal decision this review isn't making for you.

## 6. README / public-facing docs check

**Status: reviewed, no changes needed.** `README.md` was read in full — it's a
straightforward technical overview (stack table, quick start, env var table, API/
app route tables) with no internal-only wording, no personal contact info beyond
the intentional `contact@truecrewllc.com`, and no staging/internal URLs that
shouldn't be public. Safe as-is.

## 7. `SECURITY.md`

**Status: added.** `SECURITY.md` was missing; added a small, practical policy
(private reporting via `contact@truecrewllc.com`, scope, no public disclosure of
active exploits before a fix). GitHub surfaces this automatically once public
under the repo's "Security" tab.

## 8. CI status note

GitHub Actions is currently failing repo-wide (`build` job) because **the
account/org is over its free-plan Actions quota** — confirmed by the failure
pattern (job fails in ~3–4 seconds with no runner ever assigned) affecting `main`
and every open PR identically, not something caused by any specific branch's code.
**This is not a security issue and not something this review's changes caused or
can fix from within the repo** — it needs either a paid Actions plan/minutes
top-up, or waiting for the quota to reset, handled outside this repo. Vercel
preview deployments are unaffected and currently green.

## 9. Final manual steps to make the repository public

These require the GitHub UI and repository owner/admin permissions — not something
this review can or should do:

1. Go to `https://github.com/TrueCrew1/truecrew-dashboard/settings`.
2. Scroll to the **Danger Zone** section at the bottom.
3. Click **Change repository visibility** → select **Public** → follow the
   confirmation prompts (typing the repo name to confirm).
4. **Before clicking through:** re-read the reminder below — visibility changes
   affect more than just the code.

### What "public" actually exposes

Per GitHub's own visibility rules, making a repository public exposes, to anyone:

- All code and file history across **every branch**, not just `main` — including
  all 84 branches currently in this repo and their commit history.
- All **issues** and their comments.
- All **pull requests**, including the 44 currently open ones, their diffs, and
  all review comments (including CodeRabbit's automated review comments).
- **GitHub Actions run logs and history** (once Actions is working again) —
  anything printed to CI logs becomes visible, which is one more reason the
  secrets review in this pass covered history, not just the current tree.
- Repository insights (contributors, commit graph, traffic details visible only to
  the owner remain owner-only, but everything else above is world-readable).

None of this changes what this review already found (no secrets in tracked files
or history) — it's a reminder that "public" is broader than just today's `main`
branch, which is exactly why this review scanned all 84 branches rather than just
the default one.

## Summary verdict

**Safe to make public from a secrets perspective.** Remaining items (license
choice, stale-branch/PR cleanup, CI quota) are operational/business decisions, not
security blockers.
