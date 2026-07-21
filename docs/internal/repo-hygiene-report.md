# Repo Hygiene Report

A small, honest hygiene summary — not a bot framework. `src/lib/repo/repoHygiene.ts`'s
`buildRepoHygieneSummary()` produces a `RepoHygieneSummary` with six signals, each
one of `healthy | warning | unknown | not_wired`, plus a human-readable message.

## What's real today

- **`build` / `tests` / `lint`** — real, but not self-running. The module never shells
  out to `npm run build` / `npm test` / `npm run lint` itself (pure functions only, per
  this slice's scope). Pass in the result of a run you just did
  (`buildRepoHygieneSummary({ build: "pass", tests: "fail", lint: "pass" })`) and it
  reports `healthy`/`warning` honestly; omit any of them and it reports `unknown` for
  that one rather than guessing.
- **`docTruth`** — real and self-contained. Checks whether files/scripts that a doc
  claims exist (`DocFileReference[]`) actually exist on disk. The shipped default
  (`DEFAULT_DOC_FILE_REFERENCES`) checks one real, currently-true case:
  `docs/internal/chief-v1-governed-loops.md`'s Pre-merge checks section tells
  operators to run `bash scripts/check-governance.sh`, but that script is not tracked
  by git anywhere in this repo's history — it only exists in checkouts where a local
  session happened to create it. A fresh clone is missing it, so this check
  legitimately flips between `healthy` and `warning` depending on the environment —
  that's the point, not a bug in the check.

## What's placeholder / not wired

- **`branchAudit`** — always `not_wired`. Stale branch/PR auditing needs the GitHub
  API, which this module does not call. The real plan for this already exists:
  `docs/internal/agent-bot-compliance-plan.md`'s proposed repo-health bot
  ("stale branch/PR hygiene, weekly summary"). This module intentionally does not
  reimplement that — it just reports honestly that the signal isn't there yet.
- **`securityAudit`** — always `not_wired`. Dependency/security scanning (`npm audit`,
  Dependabot alerts, etc.) is not wired in. Run `npm audit` by hand for now.

Neither of these is faked, estimated, or inferred from other signals — they're a fixed
`not_wired` result with a message explaining what would need to exist for them to
become real.

## How this supports the V1 repo hygiene requirement

V1 needs a trustworthy way to know the repo's basic health before claiming an
operational baseline. This slice gives that a real, typed shape
(`RepoHygieneSummary`) and a real implementation for the two signals this repo can
honestly compute today (build/test/lint pass-through, and doc→file existence), while
being explicit — via `not_wired`, not silence or a fabricated `healthy` — about the
two signals that still need external wiring (GitHub API for branches/PRs, a security
scanner for dependencies). It deliberately does not attempt to become that bot itself;
`docs/internal/agent-bot-compliance-plan.md` remains the source of truth for that
larger, separately-scoped plan.
