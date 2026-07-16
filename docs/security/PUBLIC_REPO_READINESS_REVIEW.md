# Public Repo Readiness Review — Secrets & Sensitive Data

**Date:** 2026-07-16
**Scope:** current working tree (`main`), all 84 remote branches (350 total commits
across all refs; 323 unique commits scanned by gitleaks after fetching every branch),
and targeted manual pattern checks gitleaks' generic rules can miss (Supabase JWTs,
provider token prefixes, private-key blocks, connection strings).
**Verdict: safe to make public from a secrets perspective** — see caveats below.

## What was scanned

1. **Current working tree** — `gitleaks dir .` (no findings) plus a manual pass over
   `.env*`, `*.local`, `*.example`, config files (`vercel.json`, `netlify.toml`,
   `supabase/config.toml`, `.coderabbit.yaml`), deployment/provider config
   (`.vercel/`, `supabase/`), docs/runbooks (`docs/`, `knowledge/`), scripts
   (`scripts/`), and test fixtures (`tests/`, seed migrations).
2. **Full commit history, every branch** — fetched all 84 branches from `origin`
   (`git fetch origin '+refs/heads/*:refs/remotes/origin/*'`) and ran
   `gitleaks git . --log-opts="--all"` (323 commits, ~6.9 MB scanned).
3. **Manual supplementary checks across all history** — JWT-shaped strings
   (`eyJ...`), AWS key IDs (`AKIA...`), private-key PEM blocks, common provider
   token prefixes (`ghp_`, `sk-`, `xox...`), and `*_SECRET=`/`*_KEY=`/`*_TOKEN=`
   assignments with non-placeholder-looking values.
4. **Non-secret sensitivity pass** — email addresses, phone-number patterns, and
   hardcoded infrastructure hostnames/IDs across the current tree.

Tooling: [gitleaks](https://github.com/gitleaks/gitleaks) v8 (built from source via
`go install github.com/zricethezav/gitleaks/v8@latest`, no pre-installed secret
scanner was available in this environment). Raw JSON reports saved to the session
scratchpad (not committed — see note at the end of this file).

## Findings

### A. Safe / placeholder only

- `.env.example` — every value is an obvious placeholder (`your-project-id`,
  `your-service-role-key`, `your-github-webhook-secret`, `your-internal-api-secret`,
  `your-anon-key`). This is the intended pattern (real values live in Vercel project
  settings / local `.env.local`, which is gitignored and was never committed — see
  below).
- `docs/OBSERVABILITY.md` (only ever existed on the unmerged
  `wip/pre-cleanup-safety-snapshot-2026-07-11` branch, not on `main`) —
  `-H "x-internal-key: YOUR_INTERNAL_API_SECRET"` in a curl example. Gitleaks' generic
  `curl-auth-header` rule flags this pattern regardless of whether the value is real;
  `YOUR_INTERNAL_API_SECRET` in all-caps with the same `YOUR_...` convention as
  `.env.example` is unambiguously a placeholder, not a leaked value.
- `scripts/planner-smoke-test.ts` — `const INTERNAL_API_SECRET = env.INTERNAL_API_SECRET;`
  reads from the environment at runtime; no literal value is present.
- Mock customer/contact data across `src/data/mockData.ts`, test fixtures, and seed
  migrations (`alex@brightpath.example`, `jane@example.com`, `sam@northwind.example`,
  `(555) 000-0000` in `index.legacy.html`) — all use RFC 2606 reserved fake domains
  (`.example`) or the reserved fictional `555` phone prefix. Intentional placeholder
  data, not real customer PII.
- `i@izs.me` in `package-lock.json` — third-party npm package (`tar`) author contact
  from public npm registry metadata, unrelated to True Crew.

### B. Sensitive but non-secret

- **`supabase/.temp/*` — tracked in git, present on `main` right now.** Introduced in
  commit `130bb36`, still at `HEAD`. Contains:
  - `project-ref` / `linked-project.json` → real Supabase project ref
    (`fmomafwhcuothygmuiwa`) and real organization ID/slug (`hbugwsxfuzggwtbqtyic`).
  - `pooler-url` → the real Postgres pooler hostname/region
    (`postgres.fmomafwhcuothygmuiwa@aws-1-us-west-2.pooler.supabase.com:5432/postgres`)
    — **no password is embedded in this string.**
  - `cli-latest`, `gotrue-version`, `postgres-version`, `rest-version`,
    `storage-version`, `storage-migration` → Supabase CLI/service version
    fingerprints. Low sensitivity (server-side patching is Supabase's
    responsibility, not this repo's), but unnecessary to expose.
  - **This is standard Supabase CLI local-link state** (`supabase link` /
    `supabase db pull` write these files) that the CLI's own convention is to
    gitignore, not commit. No credential is present, but the project ref + org ID
    are real infrastructure identifiers this repo doesn't need to publish. Not a
    secret-rotation issue — no rotation needed — but worth removing before going
    public. **Remediated in this PR** (see below).
  - Reasoning for why this doesn't block public-readiness: `VITE_SUPABASE_URL`
    (which also encodes the project ref) is already designed to be public per
    `.env.example`'s own comment ("Public Supabase anon key... future client auth")
    — Supabase's security model puts the real access boundary at Row Level Security
    + the service-role key (kept server-side only, in Vercel env vars, never in this
    repo), not at hiding the project ref. Still worth cleaning up as unnecessary
    exposure of internal tooling state.
- `knowledge/decisions/auth-fix-secret-rotation.md`,
  `knowledge/decisions/vercel-preview-secret-scope.md`,
  `knowledge/sources/pr-78-vercel-preview-secret-scope-card.md` — internal process
  notes discussing that `INTERNAL_API_SECRET` was rotated and that Vercel Preview
  intentionally doesn't hold the secret (a documented, deliberate decision, not a
  bug). No actual secret values appear in these files — they describe the *process*,
  not the credential.
- `contact@truecrewllc.com` — the company's real, intentionally public-facing
  contact email (used in commit attribution and docs). Expected for a company repo,
  not a leak.
- A handful of historical commits carry the git author email
  `your-github-email@example.com` / `your-real-github-email@example.com` (literal
  placeholder text left in local git config at the time of those commits). Not a
  secret and not new information — the real contact address already appears
  elsewhere in the repo — but worth knowing before going public in case that reads
  oddly in commit history.

### C. Likely secret in current tree

**None found.**

### D. Likely secret in git history

**None found**, across all 84 branches / 323 commits scanned by gitleaks, plus the
manual JWT/AWS-key/private-key/token-prefix sweep described above. No `.env` (or any
non-`.example` variant), no service-role key, no API token, no private key, no
database password appears anywhere in this repository's tracked history.

### E. Public-readiness blockers

**None.** No real or likely secret was found in the current tree or in history on
any branch.

## Recommended pre-public checklist

- [x] **Untrack `supabase/.temp/`** and add it to `.gitignore` — done in this PR
  (working-tree-only change; no credential was exposed, so no history rewrite or
  rotation is needed for this item).
- [ ] **Decide whether to also purge `supabase/.temp/` from history.** Not required
  (no secret), but if you want a clean slate before going public, it only touches
  one commit on `main` (`130bb36`) plus the WIP snapshot branch — a small,
  low-risk `git-filter-repo --path supabase/.temp --invert-paths` run. Say the word
  and this can be scoped out as a follow-up; not done here since the task
  instructions reserve history rewrites for confirmed secrets.
- [ ] **Prune or archive stale branches before going public.** 84 remote branches
  currently exist, many `wip/`, `cursor/`, and one-off `feat/*` branches that never
  merged. None contain secrets (per this scan), but a public repo with 80+ dead
  branches is noisy for anyone browsing it. Not a security issue — a housekeeping
  one.
- [ ] **Review commit messages for internal shorthand** before publishing widely —
  e.g. `130bb36 feat(operator): [SHORT SLICE NAME]` looks like an unfilled commit
  template placeholder. Harmless, just untidy for public view.
- [ ] Confirm Vercel Preview's `INTERNAL_API_SECRET` gap (documented, intentional
  per `knowledge/decisions/vercel-preview-secret-scope.md`) is still the desired
  behavior once the repo — and therefore the PR/CI history describing it — is public.
- [ ] After making the repo public, turn on GitHub's push-protection / secret
  scanning (Settings → Code security) as an ongoing safety net — see § Prevention.

## Prevention — keeping it clean going forward

- `.gitignore` already covers `*.local` (which catches `.env.local`) and
  `.env.local.bak.*`. This PR adds explicit `.env` and `supabase/.temp/` /
  `supabase/.branches/` entries so a plain `.env` file or a re-run of `supabase
  link` can't slip back in un-ignored.
- **Local scanning before commits:** run `gitleaks git . --log-opts="--all"` (or
  `gitleaks protect --staged` as a pre-commit check) periodically, especially before
  any planned visibility change. No `gitleaks` binary was pre-installed in this
  environment — it was built locally via
  `go install github.com/zricethezav/gitleaks/v8@latest`. GitHub's built-in secret
  scanning (free for public repos, available to enable now on this private repo
  under Settings → Code security) is a good standing complement once public.
- Never commit `supabase/.temp/`, `supabase/.branches/`, `.vercel/project.json`, or
  any real `.env*` file (only `.env.example` should ever be tracked) — the CLI tools
  that generate these files exist precisely so the real values stay local/in the
  hosting provider's env var UI, not in git.

## Note on raw scan output

The raw gitleaks JSON reports (working tree scan, `main`-only history scan, and
all-branches history scan) were written to this session's scratchpad directory,
not into the repo, since they're one-off run artifacts rather than something that
needs to live in version control. Re-run the commands in this document to regenerate
them at any time.
