# DeepSeek — repo triage prompt

**Where to run this:** manually, outside VS Code — the DeepSeek web chat
(`chat.deepseek.com`) or David's own local DeepSeek API script. Not connected
to this repo, this editor, or any Chief-system agent. Copy the block below,
paste your own repo excerpts where indicated, and run it as a normal chat
turn.

**What happens to the output:** paste it back into the conversation with
Claude Code (or into a `drafts/` file per `docs/AGENT_RUNBOOK.md`'s Research
filing steps). DeepSeek never edits the repo directly — any fix it surfaces
still becomes a real PR through Claude Code, reviewed by CodeRabbit, and
gated through Chief like any other change. See
`docs/agents/CHIEF_OPERATING_SYSTEM.md` § Routing example 3.

---

## Prompt

```
You are doing a one-time triage pass on a codebase called truecrew-dashboard.
You have no access to the repo directly — I will paste in relevant file
listings, diffs, or file contents below this prompt. Work only from what I
paste; don't assume anything about files you haven't seen.

Context on the project:
- It's a SaaS command center for maintenance/field-ops supervisors, built on
  Vercel (SPA + serverless /api routes), Supabase Postgres, GitHub webhooks
  for PR/CI automation, and an Obsidian vault for knowledge/logging.
- Active work streams right now: an auth fix, a Maintenance feature area, and
  a "Chief" governance/approvals feature (in-app approval boards, queues,
  agent routing) under src/components/chief/ and api/chief/.
- All PRs go through CodeRabbit as an automated review gate
  (.coderabbit.yaml) before a human approves and merges.
- Only Claude Code (running inside the repo) is authorized to make actual
  code changes — you are producing a triage report for a human to relay
  back, not making edits yourself.

Task: scan what I paste in and produce a triage report in exactly this
4-part structure:

A. Stranded/duplicate code
   - Dead code, unused exports, or feature logic that appears to duplicate
     another implementation of the same thing (e.g. two auth fixes, two
     approval-card builders). Cite file paths/line ranges from what I pasted.

B. Test coverage gaps
   - Logic that looks load-bearing (approval gates, auth checks, data
     fetching fallbacks) with no corresponding test file or obvious test
     coverage in what I pasted.

C. Config/integration risks
   - Env vars referenced in code but not documented (or vice versa), feature
     flags that look permanently off, or integration points (Supabase,
     Vercel, GitHub webhooks) that look fragile or under-guarded.

D. Top 3 recommended fixes
   - Ranked by risk-reduction per unit of effort. Each one: what to change,
     why it matters, and how confident you are given the limited context I
     gave you.

Be explicit about anything you're inferring vs. anything you can't determine
from what was pasted — don't guess at code you haven't seen.

--- PASTE REPO EXCERPTS BELOW THIS LINE ---
```
