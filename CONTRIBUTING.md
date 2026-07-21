# Contributing

This is a closed, view-only repository owned by True Crew LLC. See the
"License and usage" section in [README.md](README.md) for the full usage
policy — this document only covers how changes are made.

## We are not accepting unsolicited external contributions at this time

This project is not open source and does not run an open contribution
process. Do not open a pull request unless you have prior agreement with
True Crew LLC to do so. Unsolicited PRs will be closed.

If you believe you've found a bug or security issue and want to flag it,
open an issue or email **contact@truecrewllc.com** — do not submit code
unprompted.

## How changes are made (internal)

All changes go through pull requests — no direct pushes to `main`.

The default tool chain for this repo is:

- **Chief** — the in-app agent/approval router (`docs/AGENT_WORKFLOW.md`,
  `docs/AGENT_RUNBOOK.md`). Every agent-originated change routes through
  Chief's approval gates before anything state-changing merges.
- **Claude Code** — the primary coding agent for implementation work in
  this repo.
- **CodeRabbit** — automated PR review.

See `docs/TOOL_CATALOG.md` and `docs/AGENT_TOOL_LANES.md` for the full
governance of which tools/agents may do what, and
`docs/PR_SUMMARY_TEMPLATE.md` for the required PR description format.

## Reporting problems

For bugs, security concerns, or anything else, use GitHub Issues or email
**contact@truecrewllc.com**.
