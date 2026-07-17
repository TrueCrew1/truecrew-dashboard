# Vercel Preview Failure — PR #132

## Summary

PR #132's tip commit (`f165cd0`) is docs-only — it touches `README.md` and two files
under `docs/security/`, nothing build-relevant. A local build at HEAD (`tsc -b &&
vite build`) completed cleanly with no errors or warnings, using the same build
command Vercel is configured to run (`npm run build` per `vercel.json`). Since the
commit that triggered the failing Vercel status doesn't touch any code, config, or
dependency file, the deployment failure is very unlikely to be caused by that
commit's own diff. The most plausible causes are Vercel-side: project/environment
configuration, Git integration settings, or account/platform-level limits — not a
code regression in this repo.

## Facts

- Tip SHA: `f165cd01996510b0bdac7f963e9c9f7f2a9378ee` ("docs: add all-rights-reserved
  license/usage note to README")
- Files changed in the tip commit: `README.md`, `docs/security/PUBLIC_LAUNCH_CHECKLIST.md`,
  `docs/security/PUBLIC_REPO_READINESS_REVIEW.md` — 27 additions / 14 deletions, all
  markdown. No `package.json`, lockfile, `tsconfig*`, `vite.config*`, `vercel.json`,
  `.vercelignore`, or app/router/build script was touched by this commit.
- GitHub's commit-status API reports, for SHA `f165cd0`: CodeRabbit → "Review skipped:
  draft pull request" (success), Vercel → `"Deployment failed."` (failure).
- Build commands run locally at current branch HEAD (`23aec3f`): `npm ci` (511
  packages, clean install) then `npm run build` (`tsc -b && vite build`). Result:
  **pass** — no type errors, Vite build completed in ~2s, emitted `dist/index.html`,
  CSS, and a single JS chunk (471.57 kB / 138.07 kB gzip), no warnings.
- An earlier commit on the same PR branch (not the tip) modified `.gitignore` — adding
  `.env`, `supabase/.temp/`, `supabase/.branches/`, and `.vercel/project.json` entries
  — and untracked `supabase/.temp/*` (Supabase CLI local-link state: project ref + org
  ID, no credential). `.gitignore` changes don't affect Vercel's build step, and this
  wasn't the commit GitHub reported the failure against.
- PR #132's own description separately documents that GitHub Actions is currently
  failing repo-wide due to a free-plan Actions quota ceiling, affecting `main` and
  every open PR identically — a known, unrelated platform-level issue in the same repo
  around the same time.

## Likely Causes (Vercel-Side)

- **Missing or misconfigured Preview environment variables** — e.g. `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, or other build-time vars not set (or scoped out) for Preview
  deployments on this branch, which would fail `vite build` in Vercel's environment even
  though it succeeds locally.
- **Branch/PR-specific preview settings** — PR #132 is a draft PR from
  `security/pre-public-repo-readiness-review`; if the project's Git integration or branch
  patterns changed recently (this PR itself edited `.gitignore` to stop tracking
  `.vercel/project.json`), a Preview-specific misconfiguration is plausible.
- **Git/Vercel integration or webhook issues** — deployment could be failing before the
  build step even runs, independent of repo content.
- **Account/plan/quota/platform limitation** — mirrors the confirmed GitHub Actions
  quota failure on the same repo; an analogous Vercel-side limit (build minutes,
  concurrent builds, plan restriction) hasn't been ruled out.

## Operator Checklist

Do in the Vercel dashboard:

- [ ] Check Preview environment variables for this project — confirm all required keys
      (Supabase URL/anon key, any others `vite build` depends on) are present and scoped
      to Preview deployments, not just Production.
- [ ] Check Git integration settings for this repo/branch — confirm the project is still
      correctly linked and no branch-pattern or ignored-build-step rule is excluding this
      PR's deployments.
- [ ] Open the failing deployment's build logs for SHA `f165cd0` and capture the first
      hard error line — this hasn't been retrieved yet (the Vercel MCP tool call for logs
      was not completed in this session), so the actual root cause is still unconfirmed.
- [ ] Check account/plan limits or warnings (build minutes, concurrency, quota) given the
      already-confirmed GitHub Actions quota failure on this same repo around the same
      time.

## Repo-Side Status

- The backend live-rail slice (`api/data/index.ts`, `api/tasks/index.ts`,
  `src/context/DataContext.tsx`, `src/lib/api/client.ts`) is present, tracked, and fully
  committed on the current branch with zero uncommitted diff — not staged WIP.
- No local build failure was found at HEAD; `npm run build` passes cleanly.
- No code change has been made in response to this Vercel failure. Based on the evidence
  gathered so far, **no repo-side code fix is currently justified** — the failure profile
  (docs-only commit, clean local build, Vercel-reported failure) points to a Vercel-side
  cause, not a code regression.

## Next Steps

Once the actual Vercel build log (or the relevant dashboard setting) has been pulled:

- If the log shows a missing/invalid environment variable at build time → fix in Vercel
  project settings, not in this repo.
- If the log shows an actual build/type error not reproduced locally → re-run
  `npm run build` against the exact PR #132 tip commit (not just current branch HEAD) to
  rule out any branch-state drift before assuming a Vercel-only cause.
- If the log points to an account/plan/quota limit → this is an operational/billing
  decision, out of scope for a code fix.
- Only after one of the above is confirmed should any repo-side change be considered.
